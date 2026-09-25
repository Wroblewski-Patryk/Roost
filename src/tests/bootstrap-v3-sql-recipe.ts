import assert from 'node:assert/strict';
import {proofDigest} from '../modules/api-keys/bootstrap-proof-encoding';

// Bounded evaluator for the immutable JSON-building expression only. It does
// not interpret triggers, transactions, SQL queries or PostgreSQL behavior.
export function evaluateSqlRecipeExpression(expression:string,variables:Record<string,unknown>){
 const tokens:string[]=[];let cursor=0;
 while(cursor<expression.length){
  const m=expression.slice(cursor).match(/^\s+|^'(?:[^']|'')*'|^(?:->>|->|\|\||[(),])|^\d+|^[A-Za-z_][A-Za-z0-9_]*/);
  assert.ok(m,`Unsupported SQL recipe token near ${expression.slice(cursor,cursor+40)}`);cursor+=m[0].length;if(m[0].trim())tokens.push(m[0]);
 }
 let position=0;
 function atom():any {
  const token=tokens[position++];assert.ok(token);
  if(token==='('){const value=expr();assert.equal(tokens[position++],')');return value;}
  if(token.startsWith("'"))return token.slice(1,-1).replaceAll("''","'");
  if(token==='NULL')return null;if(token==='true')return true;if(token==='false')return false;
  if(/^\d+$/.test(token))return Number(token);
  if(tokens[position]==='('){position++;const args:any[]=[];
   if(tokens[position]!==')')for(;;){args.push(expr());if(tokens[position]!==',')break;position++;}
   assert.equal(tokens[position++],')');
   if(token==='jsonb_build_array')return args;
   if(token==='jsonb_build_object'){assert.equal(args.length%2,0);return Object.fromEntries(Array.from({length:args.length/2},(_,i)=>[args[i*2],args[i*2+1]]));}
   if(token==='bootstrap_proof_digest'){assert.equal(args.length,1);return proofDigest(args[0]);}
   throw Error(`Unexpected recipe function ${token}`);
  }
  assert.ok(Object.hasOwn(variables,token),token);return variables[token];
 }
 function expr():any {let value=atom();while(['->','->>','||'].includes(tokens[position])){
  const op=tokens[position++],right=atom();value=op==='||'?String(value)+String(right):op==='->>'?String(value[right]):value[right];
 }return value;}
 const result=expr();assert.equal(position,tokens.length);return result as any[][];
}
