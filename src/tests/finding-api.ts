import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { prisma } from "../db/prisma";
import { createAuthToken } from "../auth/token";
import { ensureDefaultDepartments } from "../modules/departments/departments.routes";
import { findingFingerprint, type FindingBody } from "../modules/product-engineering/finding-contract";

export function registerFindingTests(helpers:any) {
  const {request,registerOwner,prepareReviewFixture,decisionFixtureProposal,decisionFixtureProof,refreshCompositionRisk,submissionInput}=helpers;
  const data=(r:any)=>{assert.ok(r.status>=200&&r.status<300,JSON.stringify(r.body));return r.body.data;};
  test("RF-CTX-021 durable observations deduplicate, isolate scope and reject unsafe evidence",async()=>{
    const owner=await registerOwner(`finding-${randomUUID()}@example.test`,"Finding fixture"),w=owner.workspace.id,headers={Authorization:`Bearer ${owner.token}`};
    const post=(url:string,body:any)=>request(url,{method:"POST",headers,body:JSON.stringify(body)});
    const app=await prisma.application.create({data:{workspaceId:w,name:"Finding app",slug:`fixture-${randomUUID()}`}});
    const component=await prisma.applicationArchitectureComponent.create({data:{applicationId:app.id,name:"Parser",type:"backend"}});
    const record=await prisma.companyRecord.create({data:{workspaceId:w,applicationId:app.id,title:"Synthetic parser evidence",key:randomUUID(),recordType:"audit",source:"manual",status:"active",metadata:{result:"Empty input throws"}}});
    const ref=async(type:string,id:string)=>(await prisma.$queryRaw<any[]>`SELECT finding_reference(${w}::uuid,${type},${id}::uuid) AS revision`)[0].revision;
    const body={title:"Empty input failure",classification:"defect",language:"en",taskId:null,componentId:component.id,departmentKey:"09-technologia",requesterId:randomUUID(),recipientId:randomUUID(),scope:"One parser component",excluded:"Other components",observed:"Empty input throws",expected:"Empty input returns validation",reproducibility:{status:"reproduced",steps:["Call parser with empty input"],limitations:"Synthetic local evidence"},sources:[{type:"application",id:app.id,revision:await ref("application",app.id)}],evidence:[{type:"company_record",id:record.id,revision:await ref("company_record",record.id)}],environment:{key:"fixture",build:"fixture-build",applicationRevision:await ref("application",app.id),componentRevision:await ref("component",component.id),contextRevision:"a".repeat(64)},impact:"Empty input cannot be handled",knownRisk:"low",requiredCompetencies:["javascript"],decisionNeed:"none",procedureId:null};
    const root=`/v1/product-engineering/applications/${app.id}/findings`;
    for(const observed of ["\t EMPTY input\n", "ＷＩＤＥ\u00a0letters", "ŁÓDŹ\u2028input\ufeff"]){
      const variant={...body,observed};
      assert.equal((await prisma.$queryRaw<any[]>`SELECT finding_fingerprint(${app.id}::uuid,${JSON.stringify(variant)}::jsonb) AS value`)[0].value,findingFingerprint(app.id,variant as FindingBody));
    }
    assert.equal((await post(root,{requestId:randomUUID(),body})).status,409);
    data(await request(`/v1/workspaces/${w}`,{method:"PATCH",headers,body:JSON.stringify({canonicalLanguage:"en"})}));
    const command={requestId:randomUUID(),body},created=data(await post(root,command)),f=created.record.id;
    assert.equal(data(await post(root,command)).replayed,true);
    assert.equal(data(await post(root,{requestId:randomUUID(),body:{...body,observed:" EMPTY  INPUT throws "}})).record.id,f);
    const read=async()=>data(await request(`/v1/product-engineering/findings/${f}`,{headers}));
    let view=await read();assert.equal(view.occurrences.length,1);assert.equal(view.state,"observed");assert.equal(view.version.actorKind,"user");
    const rosterBefore=await prisma.workforceEntity.findMany({where:{workspaceId:w},select:{id:true,updatedAt:true},orderBy:{id:"asc"}});
    data(await request("/v1/auth/me",{method:"PATCH",headers,body:JSON.stringify({preferredLanguage:"pl"})}));
    assert.equal(data(await request("/v1/auth/me",{headers})).user.preferredLanguage,"pl");
    assert.deepEqual(await prisma.workforceEntity.findMany({where:{workspaceId:w},select:{id:true,updatedAt:true},orderBy:{id:"asc"}}),rosterBefore);
    assert.equal((await read()).expectedVersion,view.expectedVersion);
    const attention=data(await request("/v1/dashboard/command",{headers})).nextActions;
    assert.equal(attention.filter((item:any)=>item.key===`finding_attention:${f}`).length,1,JSON.stringify(attention));
    assert.equal(data(await request(root,{headers})).items.length,1);
    assert.equal((await post(root,{requestId:randomUUID(),body:{...body,observed:"password=synthetic-finding-secret"}})).status,409);
    assert.equal((await post(root,{requestId:randomUUID(),body:{...body,observed:"x".repeat(2001)}})).status,400);
    const other=await registerOwner(`finding-other-${randomUUID()}@example.test`,"Other finding fixture");
    assert.equal((await request(`/v1/product-engineering/findings/${f}`,{headers:{Authorization:`Bearer ${other.token}`}})).status,404);
    assert.equal((await post(`/v1/product-engineering/findings/${f}/actions`,{requestId:randomUUID(),expectedVersion:view.expectedVersion,action:"convert_task",reason:"Attempt to bypass verification"})).status,409);
    for(const action of ["queue_deduplication","deduplicate"]){view=await read();data(await post(`/v1/product-engineering/findings/${f}/actions`,{requestId:randomUUID(),expectedVersion:view.expectedVersion,action,reason:"Deterministic scoped duplicate check"}));}
    view=await read();assert.equal(view.state,"verification_pending");
    await assert.rejects(prisma.$executeRaw`UPDATE finding_versions SET body='{}' WHERE observation_id=${f}::uuid`,/finding_history_immutable/);
    const correction={...body,expected:"Empty input returns a typed validation",correctionReason:"Corrected expected behavior from source evidence"};
    data(await post(`/v1/product-engineering/findings/${f}/versions`,{requestId:randomUUID(),expectedVersion:view.expectedVersion,body:correction}));
    view=await read();assert.equal(view.version.version,2);assert.equal(view.state,"observed");assert.equal(view.versions.length,2);
    assert.equal(await prisma.task.count({where:{workspaceId:w}}),0);
  });

  for(const agentMode of [false,true])test(`RF-CTX-021 ${agentMode?"agent":"human"} verification uses current mandates and one task conversion reservation`,async()=>{
    const f=await prepareReviewFixture(agentMode,false),w=f.workspaceId;await ensureDefaultDepartments(w);
    const pmUser=await prisma.user.create({data:{email:`finding-pm-${randomUUID()}@example.test`,name:"Finding PM",passwordHash:"synthetic-not-a-login"}});
    await prisma.workspaceMembership.create({data:{workspaceId:w,userId:pmUser.id,role:"member"}});
    const pm=agentMode?await prisma.workforceEntity.update({where:{id:f.manager.id},data:{role:"accountable manager",hierarchyLevel:"department_director",department:"09-technologia",skillIndex:["javascript"],authorityScope:["task_accountability"]}}):await prisma.workforceEntity.create({data:{workspaceId:w,name:"Finding PM",slug:randomUUID(),type:"human",source:"user",externalId:pmUser.id,status:"active",role:"accountable manager",hierarchyLevel:"department_director",department:"09-technologia",skillIndex:["javascript"],authorityScope:["task_accountability"]}});
    await prisma.workforceEntity.update({where:{id:f.verifier.id},data:{managerId:pm.id,hierarchyLevel:"specialist",department:"09-technologia"}});
    const dept=await prisma.workspaceDepartment.findUniqueOrThrow({where:{workspaceId_key:{workspaceId:w,key:"09-technologia"}}});
    for(const id of [pm.id,f.verifier.id])await prisma.organizationalDepartmentRelation.create({data:{workspaceId:w,entityType:"workforce",entityId:id,departmentId:dept.id,relationshipRole:"owner"}});
    const pmAuth:Record<string,string>=agentMode?{"X-API-Key":f.managerKey.key}:{Authorization:`Bearer ${createAuthToken({workspaceId:w,userId:pmUser.id})}`};
    const verifierPrincipalId=agentMode?f.verifier.id:f.user.id,pmPrincipalId=agentMode?pm.id:pmUser.id,principalKind=agentMode?"agent":"user";
    const entities=[{type:"application",id:f.app.id},{type:"task",id:f.task.id}];
    await refreshCompositionRisk(f.task.id,f.auth);
    const proposal=await decisionFixtureProposal(f,{authority:{domain:"mandate_change",departmentKey:"09-technologia",requesterId:f.verifier.id,recipientId:pm.id,entities}});data(proposal.response);await decisionFixtureProof(f);
    const decision=data(await request(`/v1/decisions/${proposal.id}/governance`,{headers:f.auth}));
    data(await f.post(`/v1/decisions/${proposal.id}/governance/actions`,{requestId:randomUUID(),expectedVersion:decision.expectedVersion,action:"accept",previewId:decision.previews[0].id}));
    for(const [userId,operation] of [[verifierPrincipalId,"verify_finding"],[pmPrincipalId,"triage_finding"]]){
      const catalog=data(await request("/v1/decisions/mandates",{headers:f.auth}));
      data(await f.post("/v1/decisions/mandates",{requestId:randomUUID(),expectedVersion:catalog.expectedVersion,mandateId:null,body:{holder:{kind:principalKind,id:userId},departmentKey:"09-technologia",entities,decisionDomains:["ordinary_domain"],operations:[operation],exclusions:[],exclusionReason:"No additional exclusions",maxRisk:"medium",startsAt:new Date(Date.now()-1000).toISOString(),endsAt:new Date(Date.now()+3600000).toISOString(),status:"active",sourceDecisionId:proposal.id,reason:"Exact factual verification and triage scope"}}));
    }
    await prisma.workspace.update({where:{id:w},data:{canonicalLanguage:"en"}});
    const component=await prisma.applicationArchitectureComponent.findUniqueOrThrow({where:{id:f.input.contract.singleTask.component.id}});
    const record=await prisma.companyRecord.findUniqueOrThrow({where:{id:f.input.contract.context.company[0].id}});
    const ref=async(type:string,id:string)=>(await prisma.$queryRaw<any[]>`SELECT finding_reference(${w}::uuid,${type},${id}::uuid) AS revision`)[0].revision;
    const body={title:"Parser needs typed validation",classification:"defect",language:"en",taskId:f.task.id,componentId:component.id,departmentKey:"09-technologia",requesterId:f.verifier.id,recipientId:pm.id,scope:"One parser validation result",excluded:"Other application components",observed:"Empty input throws",expected:"Empty input returns typed validation",reproducibility:{status:"reproduced",steps:["Call parser with empty input"],limitations:"Synthetic local evidence"},sources:[{type:"task",id:f.task.id,revision:await ref("task",f.task.id)}],evidence:[{type:"company_record",id:record.id,revision:await ref("company_record",record.id)}],environment:{key:"fixture",build:"fixture-build",applicationRevision:await ref("application",f.app.id),componentRevision:await ref("component",component.id),contextRevision:"b".repeat(64)},impact:"Parser result is missing",knownRisk:"low",requiredCompetencies:["javascript"],decisionNeed:"none",procedureId:null};
    let conflict:{root:string;decisionId:string}|undefined;
    for(const kind of ["self_author","fix_author","rejected","inconclusive"]){
      const fixRecord=kind==="fix_author"?await prisma.companyRecord.create({data:{workspaceId:w,applicationId:f.app.id,title:"Distinct fix authorship evidence",key:randomUUID(),recordType:"audit",source:"manual",status:"active"}}):null;
      const variantBody={...body,evidence:fixRecord?[{type:"company_record",id:fixRecord.id,revision:await ref("company_record",fixRecord.id)}]:body.evidence,environment:{...body.environment,build:`fixture-${kind}`}},created=data(await f.post(`/v1/product-engineering/applications/${f.app.id}/findings`,{requestId:randomUUID(),body:variantBody},kind==="self_author"?f.reviewerAuth:f.auth)),variantRoot=`/v1/product-engineering/findings/${created.record.id}`;
      const read=async()=>data(await request(variantRoot,{headers:f.auth}));
      const act=async(command:any,auth=f.auth)=>f.post(variantRoot+"/actions",{requestId:randomUUID(),expectedVersion:(await read()).expectedVersion,reason:"Variant regression evidence",...command},auth);
      data(await act({action:"queue_deduplication"}));data(await act({action:"deduplicate"}));
      if(kind==="fix_author")data(await f.post(variantRoot+"/occurrences",{requestId:randomUUID(),expectedVersion:(await read()).expectedVersion,purpose:"fix",source:body.sources[0],evidence:variantBody.evidence,explanation:"I authored this fix evidence"},f.reviewerAuth));
      const issued=await f.post(variantRoot+"/grants",{requestId:randomUUID(),expectedVersion:(await read()).expectedVersion,operation:"finding_verify",principal:{kind:principalKind,id:verifierPrincipalId},credentialId:agentMode?f.verifierKey.id:null,validUntil:new Date(Date.now()+600000).toISOString(),reason:"One exact independent verification"});
      if(kind.endsWith("author")){assert.equal(issued.status,409,kind);continue;}
      data(await act({action:"verify",grantId:data(issued).record.id,verification:{verdict:kind,method:"Direct local reproduction",environment:variantBody.environment.build,evidence:body.evidence,observed:body.observed,limitations:"Synthetic local evidence"}},f.reviewerAuth));
      assert.equal((await read()).state,kind);
      assert.equal((await act({action:"queue_triage"},pmAuth)).status,409);
      assert.equal((await act({action:"convert_task"},pmAuth)).status,409);
      if(kind==="inconclusive"){
        const grant=async()=>data(await f.post(variantRoot+"/grants",{requestId:randomUUID(),expectedVersion:(await read()).expectedVersion,operation:"finding_triage",principal:{kind:principalKind,id:pmPrincipalId},credentialId:agentMode?f.managerKey.id:null,validUntil:new Date(Date.now()+600000).toISOString(),reason:"Escalate contradictory verification"})).record.id;
        const command={action:"prepare_adjudication",principal:{kind:principalKind,id:pmPrincipalId},statement:"Assign an independent adjudicator",rationale:"The evidence remains inconclusive",consequences:"Execution remains blocked pending independent evidence",grantId:await grant()};
        const escalation=data(await act(command,pmAuth));
        conflict={root:variantRoot,decisionId:escalation.record.outputId};
        assert.equal((await prisma.decision.findUniqueOrThrow({where:{id:escalation.record.outputId}})).status,"proposed");
        assert.equal((await read()).output,null);
        assert.equal((await act({...command,grantId:await grant()},pmAuth)).status,409);
        await refreshCompositionRisk(f.task.id,f.auth);
        const escalationRoot=`/v1/decisions/${conflict.decisionId}/governance`;
        let escalationView=data(await request(escalationRoot,{headers:f.auth}));
        data(await f.post(escalationRoot+"/actions",{requestId:randomUUID(),expectedVersion:escalationView.expectedVersion,action:"review_impact"}));
        await decisionFixtureProof(f);escalationView=data(await request(escalationRoot,{headers:f.auth}));
        data(await f.post(escalationRoot+"/actions",{requestId:randomUUID(),expectedVersion:escalationView.expectedVersion,action:"accept",previewId:escalationView.previews[0].id}));
      }
    }
    for(const route of ["decision","interview","defer"]){
      const variantBody={...body,decisionNeed:route==="decision"?"money":route==="interview"?"material_unknown":"none",environment:{...body.environment,build:`fixture-${route}`}},created=data(await f.post(`/v1/product-engineering/applications/${f.app.id}/findings`,{requestId:randomUUID(),body:variantBody})),variantId=created.record.id,variantRoot=`/v1/product-engineering/findings/${variantId}`;
      const read=async()=>data(await request(variantRoot,{headers:f.auth}));
      const grant=async(operation:string,principalId:string)=>data(await f.post(variantRoot+"/grants",{requestId:randomUUID(),expectedVersion:(await read()).expectedVersion,operation,principal:{kind:principalKind,id:principalId},credentialId:agentMode?(principalId===pmPrincipalId?f.managerKey.id:f.verifierKey.id):null,validUntil:new Date(Date.now()+600000).toISOString(),reason:"One exact variant operation"})).record.id;
      const act=async(command:any,auth=f.auth)=>f.post(variantRoot+"/actions",{requestId:randomUUID(),expectedVersion:(await read()).expectedVersion,reason:"Variant triage evidence",...command},auth);
      data(await act({action:"queue_deduplication"}));data(await act({action:"deduplicate"}));
      data(await act({action:"verify",grantId:await grant("finding_verify",verifierPrincipalId),verification:{verdict:"confirmed",method:"Direct local reproduction",environment:variantBody.environment.build,evidence:body.evidence,observed:body.observed,limitations:"Synthetic local evidence"}},f.reviewerAuth));
      data(await act({action:"queue_triage",grantId:await grant("finding_triage",pmPrincipalId)},pmAuth));
      if(route==="defer"){
        data(await act({action:"defer",category:"budget",condition:{type:"owner_signal"},grantId:await grant("finding_triage",pmPrincipalId)},pmAuth));
        assert.equal((await read()).state,"deferred");
        const deferral=(await prisma.$queryRaw<any[]>`SELECT id FROM decision_deferrals WHERE target_type='finding' AND target_id=${variantId}::uuid`)[0];
        const grantId=await grant("finding_triage",pmPrincipalId);
        assert.equal((await act({action:"reopen",deferralId:deferral.id,eventType:"owner_signal",grantId},pmAuth)).status,409);
        const governance=data(await request("/v1/decisions/governance",{headers:f.auth}));
        data(await f.post("/v1/decisions/reopening-events",{requestId:randomUUID(),expectedVersion:governance.expectedVersion,deferralId:deferral.id,type:"owner_signal",explanation:"Owner restored the required budget"}));
        data(await act({action:"reopen",deferralId:deferral.id,eventType:"owner_signal",grantId},pmAuth));
        assert.equal((await read()).state,"triage_pending");
        assert.equal((await prisma.$queryRaw<any[]>`SELECT count(*)::int AS n FROM decision_reopening_events WHERE deferral_id=${deferral.id}::uuid`)[0].n,1);
      }else{
        const command=route==="decision"?{action:"prepare_decision",statement:"Owner must approve the parser budget",rationale:"Budget is reserved to the owner",consequences:"The task waits for an exact budget decision"}:{action:"prepare_interview",recommendation:"Confirm the parser assumption before execution",questions:[{field:"parser_assumption",type:"decision",question:"Which parser contract must this task preserve?",requiresHuman:true,options:[]}]};
        data(await act({...command,grantId:await grant("finding_triage",pmPrincipalId)},pmAuth));
        const view=await read();assert.equal(view.state,"triage_pending");assert.ok(route==="decision"?view.output.decisionId:view.output.interviewId);
        assert.equal((await act({action:"convert_decision",grantId:await grant("finding_triage",pmPrincipalId)},pmAuth)).status,409);
        assert.equal((await prisma.$queryRaw<any[]>`SELECT count(*)::int AS n FROM finding_outputs WHERE observation_id=${variantId}::uuid AND task_id IS NOT NULL`)[0].n,0);
        if(route==="interview"){
          const interviewRoot=`/v1/agent-runtime/tasks/${f.task.id}/interviews`;
          const respond=async(action:string,extra:any={})=>f.post(interviewRoot+"/actions/respond",{requestId:randomUUID(),expectedVersion:data(await request(interviewRoot,{headers:f.auth})).expectedVersion,caseId:view.output.interviewId,action,reason:"Owner resolves the exact parser assumption",...extra});
          data(await respond("answer",{answers:[{field:"parser_assumption",value:"Preserve typed validation for empty input"}]}));
          assert.equal((await act({action:"convert_decision",grantId:await grant("finding_triage",pmPrincipalId)},pmAuth)).status,409);
          data(await respond("accept"));
          data(await act({action:"convert_decision",grantId:await grant("finding_triage",pmPrincipalId)},pmAuth));
          assert.equal((await read()).state,"converted_to_decision");
        }else if(route==="decision"){
          await refreshCompositionRisk(f.task.id,f.auth);
          const decisionRoot=`/v1/decisions/${view.output.decisionId}/governance`;
          let decisionView=data(await request(decisionRoot,{headers:f.auth}));
          data(await f.post(decisionRoot+"/actions",{requestId:randomUUID(),expectedVersion:decisionView.expectedVersion,action:"review_impact"}));
          await decisionFixtureProof(f);decisionView=data(await request(decisionRoot,{headers:f.auth}));
          data(await f.post(decisionRoot+"/actions",{requestId:randomUUID(),expectedVersion:decisionView.expectedVersion,action:"accept",previewId:decisionView.previews[0].id}));
          data(await act({action:"convert_decision",grantId:await grant("finding_triage",pmPrincipalId)},pmAuth));
          assert.equal((await read()).state,"converted_to_decision");
        }
      }
    }
    const mergeFindings:string[]=[];
    for(const suffix of ["candidate","retained"]){
      const created=data(await f.post(`/v1/product-engineering/applications/${f.app.id}/findings`,{requestId:randomUUID(),body:{...body,environment:{...body.environment,build:`fixture-merge-${suffix}`}}}));
      const variantRoot=`/v1/product-engineering/findings/${created.record.id}`,read=async()=>data(await request(variantRoot,{headers:f.auth}));
      const act=async(command:any,auth=f.auth)=>f.post(variantRoot+"/actions",{requestId:randomUUID(),expectedVersion:(await read()).expectedVersion,reason:"Explicit scoped duplicate investigation",...command},auth);
      for(const action of ["queue_deduplication","deduplicate"])data(await act({action}));
      const grantId=data(await f.post(variantRoot+"/grants",{requestId:randomUUID(),expectedVersion:(await read()).expectedVersion,operation:"finding_verify",principal:{kind:principalKind,id:verifierPrincipalId},credentialId:agentMode?f.verifierKey.id:null,validUntil:new Date(Date.now()+600000).toISOString(),reason:"Independent duplicate verification"})).record.id;
      data(await act({action:"verify",grantId,verification:{verdict:"confirmed",method:"Direct reproduction of candidate",environment:body.environment.build,evidence:body.evidence,observed:body.observed,limitations:"Explicitly preserve both histories"}},f.reviewerAuth));mergeFindings.push(created.record.id);
    }
    {
      const variantRoot=`/v1/product-engineering/findings/${mergeFindings[0]}`,read=async()=>data(await request(variantRoot,{headers:f.auth}));
      const act=async(command:any,auth=f.auth)=>f.post(variantRoot+"/actions",{requestId:randomUUID(),expectedVersion:(await read()).expectedVersion,reason:"Confirmed scoped duplicate",...command},auth);
      const candidate=data(await act({action:"propose_merge",otherId:mergeFindings[1]}));
      const grantId=data(await f.post(variantRoot+"/grants",{requestId:randomUUID(),expectedVersion:(await read()).expectedVersion,operation:"finding_triage",principal:{kind:principalKind,id:pmPrincipalId},credentialId:agentMode?f.managerKey.id:null,validUntil:new Date(Date.now()+600000).toISOString(),reason:"Explicit merge resolution"})).record.id;
      data(await act({action:"resolve_merge",candidateId:candidate.record.id,verdict:"merge",grantId},pmAuth));assert.equal((await read()).state,"merged");
      assert.equal(data(await request(`/v1/product-engineering/findings/${mergeFindings[1]}`,{headers:f.auth})).verificationCurrent,false);
      const duplicate=data(await f.post(`/v1/product-engineering/applications/${f.app.id}/findings`,{requestId:randomUUID(),body:{...body,environment:{...body.environment,build:"fixture-merge-candidate"}}}));assert.equal(duplicate.record.id,mergeFindings[1]);
      assert.equal((await prisma.$queryRaw<any[]>`SELECT count(*)::int AS n FROM finding_versions WHERE observation_id IN (${mergeFindings[0]}::uuid,${mergeFindings[1]}::uuid)`)[0].n,2);
    }
    const created=data(await f.post(`/v1/product-engineering/applications/${f.app.id}/findings`,{requestId:randomUUID(),body})),id=created.record.id,root=`/v1/product-engineering/findings/${id}`;
    const read=async(headers=f.auth)=>data(await request(root,{headers}));
    const act=async(action:any,headers=f.auth)=>f.post(root+"/actions",{requestId:randomUUID(),expectedVersion:(await read(headers)).expectedVersion,reason:"Exact scoped synthetic finding action",...action},headers);
    data(await act({action:"queue_deduplication"}));data(await act({action:"deduplicate"}));
    const receipt={verdict:"confirmed",method:"Direct parser reproduction",environment:"fixture-build",evidence:body.evidence,observed:body.observed,limitations:"Synthetic local test"};
    assert.equal((await act({action:"verify",verification:receipt},f.reviewerAuth)).status,409);
    const grant=async(operation:string,principalId:string)=>data(await f.post(root+"/grants",{requestId:randomUUID(),expectedVersion:(await read()).expectedVersion,operation,principal:{kind:principalKind,id:principalId},credentialId:agentMode?(principalId===pmPrincipalId?f.managerKey.id:f.verifierKey.id):null,validUntil:new Date(Date.now()+600000).toISOString(),reason:"One exact Finding operation"})).record.id;
    let grantId=await grant("finding_verify",verifierPrincipalId);
    assert.equal((await act({action:"verify",verification:receipt,grantId},f.auth)).status,409);
    const verified=data(await act({action:"verify",verification:receipt,grantId},f.reviewerAuth));assert.ok(verified.record.id);
    assert.equal((await read()).state,"verified");assert.equal((await read()).verificationCurrent,true);
    grantId=await grant("finding_triage",pmPrincipalId);data(await act({action:"queue_triage",grantId},pmAuth));
    grantId=await grant("finding_triage",pmPrincipalId);
    const task={title:"Repair empty parser input",outcome:f.input.contract.objective.outcome,scope:f.input.contract.scope.allowed[0],excluded:f.input.contract.scope.forbidden[0],projectId:f.task.projectId,executorId:f.input.contract.assignment.agentId,procedureId:f.input.contract.procedures.items[0].id,acceptanceCriteria:f.input.contract.acceptance.criteria,requiredTests:f.input.contract.acceptance.tests,dependencies:[],context:body.evidence};
    const prepared=data(await act({action:"prepare_task",task,grantId},pmAuth)),child=prepared.record.outputId;
    assert.equal((await read()).state,"triage_pending");assert.equal((await prisma.task.findUniqueOrThrow({where:{id:child}})).executionReadiness&&((await prisma.task.findUniqueOrThrow({where:{id:child}})).executionReadiness as any).status,"draft");
    assert.equal((await act({action:"prepare_task",task,grantId},pmAuth)).status,409);
    assert.equal((await act({action:"convert_task",grantId:await grant("finding_triage",pmPrincipalId)},pmAuth)).status,409);
    assert.equal((await prisma.$queryRaw<any[]>`SELECT count(*)::int AS n FROM finding_outputs WHERE observation_id=${id}::uuid`)[0].n,1);
    const readyInput=structuredClone(f.input),verifier=await prisma.workforceEntity.findUniqueOrThrow({where:{id:f.verifier.id}});
    readyInput.contract.singleTask.contractId=`roost-task:${child}`;readyInput.contract.singleTask.branch=`codex/task-${child}`;
    readyInput.contract.singleTask.accountableManager={id:pm.id,revision:pm.updatedAt.toISOString()};readyInput.contract.taskRoles.accountableManager=readyInput.contract.singleTask.accountableManager;
    readyInput.contract.taskRoles.verifier={id:verifier.id,revision:verifier.updatedAt.toISOString()};
    const submitRoute=`/v1/agent-runtime/tasks/${child}/actions/submit-for-execution`;
    const submitted=await f.post(submitRoute,await submissionInput(submitRoute,readyInput,f.auth));assert.equal(submitted.status,200,JSON.stringify(submitted.body));
    assert.equal((await prisma.$queryRaw<any[]>`SELECT finding_task_current(${child}::uuid) AS current`)[0].current,false);
    if(!(await read()).verificationCurrent){
      const currentBody={...body,sources:[{...body.sources[0],revision:await ref("task",f.task.id)}],evidence:[{...body.evidence[0],revision:await ref("company_record",record.id)}],environment:{...body.environment,applicationRevision:await ref("application",f.app.id),componentRevision:await ref("component",component.id)},correctionReason:"Refresh exact context after preparing task gates"};
      data(await f.post(root+"/versions",{requestId:randomUUID(),expectedVersion:(await read()).expectedVersion,body:currentBody}));
      data(await act({action:"queue_deduplication"}));data(await act({action:"deduplicate"}));data(await act({action:"verify",verification:{...receipt,evidence:currentBody.evidence},grantId:await grant("finding_verify",verifierPrincipalId)},f.reviewerAuth));data(await act({action:"queue_triage",grantId:await grant("finding_triage",pmPrincipalId)},pmAuth));
      assert.equal((await f.post(submitRoute,await submissionInput(submitRoute,readyInput,f.auth))).status,200);
    }
    const conversion={requestId:randomUUID(),expectedVersion:(await read()).expectedVersion,action:"convert_task",reason:"All native task gates now pass",grantId:await grant("finding_triage",pmPrincipalId)};
    const competingConversion={...conversion,requestId:randomUUID()};
    const race=await Promise.all([f.post(root+"/actions",conversion,pmAuth),f.post(root+"/actions",competingConversion,pmAuth)]);
    assert.deepEqual(race.map((r:any)=>r.status).sort(),[201,409],JSON.stringify(race.map((r:any)=>r.body)));
    assert.equal((await read()).state,"converted_to_task");assert.equal((await prisma.$queryRaw<any[]>`SELECT finding_task_current(${child}::uuid) AS current`)[0].current,true);
    assert.equal(data(await f.post(root+"/actions",race[0].status===201?conversion:competingConversion,pmAuth)).replayed,true);
    const childPin=(await prisma.task.findUniqueOrThrow({where:{id:child}})).executionReadiness as any;
    const queued=await prisma.agentExecution.create({data:{workspaceId:w,taskId:child,applicationId:f.app.id,status:"queued",requestedByType:"user",requestedById:f.input.contract.taskRoles.requester.id,metadata:{executionContract:childPin.contract,readyContextPin:{pinId:childPin.pinId,revision:childPin.revision,compositionSeal:childPin.procedureComposition.seal,riskAdmissionSeal:childPin.riskAdmissionSeal,riskAdmissionCommit:childPin.riskAdmissionCommit}}}});
    if(agentMode){
      const rotated=data(await f.post(`/v1/api-keys/${f.verifierKey.id}/actions/rotate`,{requestId:randomUUID(),expectedVersion:1,expiresAt:new Date(Date.now()+86400000).toISOString()}));
      assert.ok(rotated.id);assert.equal((await read()).verificationCurrent,false);
      assert.equal((await request(root,{headers:f.reviewerAuth})).status,403);
      assert.equal((await prisma.$queryRaw<any[]>`SELECT finding_task_current(${child}::uuid) AS current`)[0].current,false);
    }
    await prisma.workforceEntity.update({where:{id:f.verifier.id},data:{skillIndex:[]}});
    assert.equal((await read()).verificationCurrent,false);
    assert.equal((await act({action:"convert_task",grantId},pmAuth)).status,409);
    const invalidatedQueue=await prisma.agentExecution.findUniqueOrThrow({where:{id:queued.id}});assert.equal(invalidatedQueue.status,"cancelled");assert.ok(invalidatedQueue.contextInvalidatedAt);
    assert.ok(conflict);
    await prisma.workforceEntity.update({where:{id:pm.id},data:{authorityScope:["task_accountability","task_verification"]}});
    let mandateCatalog=data(await request("/v1/decisions/mandates",{headers:f.auth}));
    const previousMandate=mandateCatalog.mandates.find((m:any)=>m.holder.id===verifierPrincipalId&&m.operations.includes("verify_finding"));
    const {id:previousId,workforceId,version,versionId,createdAt,workspaceId,issuer,revision,...previousBody}=previousMandate;
    data(await f.post("/v1/decisions/mandates",{requestId:randomUUID(),expectedVersion:mandateCatalog.expectedVersion,mandateId:previousId,body:{...previousBody,status:"revoked",sourceDecisionId:conflict.decisionId,reason:"Owner appoints the independent adjudicator"}}));
    mandateCatalog=data(await request("/v1/decisions/mandates",{headers:f.auth}));
    data(await f.post("/v1/decisions/mandates",{requestId:randomUUID(),expectedVersion:mandateCatalog.expectedVersion,mandateId:null,body:{...previousBody,holder:{kind:principalKind,id:pmPrincipalId},sourceDecisionId:conflict.decisionId,reason:"Independent adjudication of the exact Finding version"}}));
    const conflictRead=async()=>data(await request(conflict!.root,{headers:f.auth}));
    const conflictGrant=data(await f.post(conflict.root+"/grants",{requestId:randomUUID(),expectedVersion:(await conflictRead()).expectedVersion,operation:"finding_verify",principal:{kind:principalKind,id:pmPrincipalId},credentialId:agentMode?f.managerKey.id:null,validUntil:new Date(Date.now()+600000).toISOString(),reason:"One independent adjudication"})).record.id;
    const adjudication={requestId:randomUUID(),expectedVersion:(await conflictRead()).expectedVersion,action:"adjudicate",grantId:conflictGrant,decisionId:conflict.decisionId,reason:"Owner appointed an independent adjudicator",verification:{...receipt,evidence:[{...body.evidence[0],revision:await ref("company_record",record.id)}]}};
    data(await f.post(conflict.root+"/actions",adjudication,pmAuth));assert.equal((await conflictRead()).state,"verified");
    assert.equal((await f.post(conflict.root+"/actions",{...adjudication,requestId:randomUUID(),expectedVersion:(await conflictRead()).expectedVersion},pmAuth)).status,409);
  });
}
