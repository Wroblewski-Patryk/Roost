"""Validate dated, sanitized RF008 observations; never inspect or launch a host artifact."""
import json
import re
import sys

from validate_direct_codex_qualification import BASE, PROFILE, SCHEMA, load, need, same, validate_profile

OBSERVATION = BASE / 'direct-codex-artifact-preflight-v1.json'
REPORT = BASE / 'direct-codex-artifact-preflight-v1.md'


def shape(value, keys):
    need(type(value) is dict and set(value) == set(keys.split()), 'closed_shape')


def safe_values(value):
    if type(value) is dict:
        for key, item in value.items():
            need(type(key) is str and re.fullmatch(r'[A-Za-z][A-Za-z0-9]*', key), 'key')
            safe_values(item)
    elif type(value) is list:
        need(len(value) <= 32, 'list_bound')
        for item in value:
            safe_values(item)
    elif type(value) is str:
        need(value.isascii() and len(value) <= 160, 'string_bound')
        need(not re.search(r'[:\\@\x00-\x1f]|(?:^|/)\.\.(?:/|$)|^/|(?i:\.codex|auth\.json|config\.toml)', value), 'private_value')
    elif value is not None:
        need(type(value) in (bool, int), 'value_type')
        if type(value) is int:
            need(0 <= value <= 9007199254740991, 'integer_bound')


def digest(value):
    need(type(value) is str and re.fullmatch(r'[0-9a-f]{64}', value), 'digest')


def validate_observation(value):
    safe_values(value)
    shape(value, 'schemaId taskId observedDate verdict scope candidate artifactObservations metadataObservations provenance inventory discovery blockers gates actions docker nextTask')
    need(value['schemaId'] == 'roost-codex-artifact-preflight-v1' and value['taskId'] == 'RF-HERMES-008', 'identity')
    need(value['observedDate'] == '2026-09-13' and value['scope'] == 'offline-static-artifact-observation', 'observation_scope')
    need(value['verdict'] == 'EXACT-CODEX-ARTIFACT-PREFLIGHT-BLOCKED', 'false_ready')
    candidate = value['candidate']
    shape(candidate, 'installationRef relativePath platformFamily candidatesInBoundedScope hostWideUniquenessProven packageVersion desktopApplicationVersion codexVersion format machine elfType size sha256 interpreter neededLibraries linuxViewHashMatched linuxMode linuxExecuteAccess supportedLaunchProven')
    need(candidate['installationRef'] == 'desktop-package-01' and candidate['relativePath'] == 'app/resources/codex', 'candidate_reference')
    need(candidate['platformFamily'] == 'wsl2-linux-x86_64', 'platform')
    need(candidate['candidatesInBoundedScope'] == 1 and candidate['hostWideUniquenessProven'] is False, 'bounded_discovery')
    need(candidate['codexVersion'] is None, 'unbound_codex_version')
    for key in ('packageVersion', 'desktopApplicationVersion'):
        need(type(candidate[key]) is str and re.fullmatch(r'[0-9]+(?:\.[0-9]+){2,3}', candidate[key]), 'package_version')
    need(candidate['linuxMode'] == '0444' and candidate['linuxExecuteAccess'] is False and candidate['supportedLaunchProven'] is False, 'execute_denial')
    need(candidate['linuxViewHashMatched'] is True, 'cross_os_hash')
    artifacts = value['artifactObservations']
    paths = ['app/resources/' + name for name in ('codex','codex.exe','codex-code-mode-host','rg')]
    need(type(artifacts) is list and [r.get('relativePath') for r in artifacts] == paths, 'artifact_inventory')
    for row in artifacts:
        keys = 'relativePath type size sha256 hardlinkCount format machine'
        if row['relativePath'] != paths[1]:
            keys += ' elfType interpreter neededLibraries'
        shape(row, keys)
        need(row['type'] == 'regular' and type(row['size']) is int and 0 < row['size'] <= 536870912, 'artifact_size')
        need(type(row['hardlinkCount']) is int and row['hardlinkCount'] == 1, 'selected_hardlinks')
        digest(row['sha256'])
        if row['relativePath'] == paths[1]:
            need(row['format'] == 'PE' and row['machine'] == 34404, 'windows_excluded')
        else:
            need(row['format'] == 'ELF64-little' and row['machine'] == 62 and row['elfType'] == 3, 'elf_header')
            need(row['interpreter'] is None and row['neededLibraries'] == [], 'observed_loader_chain')
    for key in ('relativePath','format','machine','elfType','size','sha256','interpreter','neededLibraries'):
        need(same(candidate[key], artifacts[0][key]), 'candidate_artifact_mismatch')
    metadata = value['metadataObservations']
    need([r.get('relativePath') for r in metadata] == ['AppxManifest.xml','AppxBlockMap.xml','AppxSignature.p7x','app/resources/owl-electron-app.json'], 'metadata_inventory')
    for row in metadata:
        shape(row, 'relativePath size sha256')
        need(type(row['size']) is int and 0 < row['size'] <= 16777216, 'metadata_size')
        digest(row['sha256'])
    provenance = value['provenance']
    shape(provenance, 'registrationSignatureKind manifestIdentityMatched blockmapComparisons signaturePresent signatureTrustVerified exactCodexVersionBound status')
    need(provenance['registrationSignatureKind'] == 'Store' and provenance['manifestIdentityMatched'] is True and provenance['signaturePresent'] is True, 'local_package_observation')
    need(provenance['signatureTrustVerified'] is False and provenance['exactCodexVersionBound'] is False and provenance['status'] == 'LOCAL_OBSERVATION_ONLY', 'false_provenance')
    comparisons = provenance['blockmapComparisons']
    need([r.get('relativePath') for r in comparisons] == paths, 'blockmap_membership')
    for row, artifact in zip(comparisons, artifacts):
        shape(row, 'relativePath status blocks')
        need(row['status'] == 'MATCH' and type(row['blocks']) is int and row['blocks'] == (artifact['size'] + 65535) // 65536, 'blockmap_comparison')
    inventory = value['inventory']
    shape(inventory, 'manifestBuiltInMemoryOnly manifestPersisted entryCount fileCount directoryCount excludedEntryCount totalFileBytes observedManifestSha256 closed launchClosureProven blockmapListedFiles blockmapMissingFileCount additionalFileCount recognizedAdditionalFiles unknownAdditionalFileCount linkCount hardlinkedFileCount aclReadEntries broadWriteAllowEntryCount immutabilityProven limits stopReasons')
    for key in ('closed','launchClosureProven','immutabilityProven','manifestPersisted'):
        need(inventory[key] is False, 'false_inventory_closure')
    need(inventory['manifestBuiltInMemoryOnly'] is True and inventory['stopReasons'] == ['POLICY_EXCLUSION'], 'inventory_scope')
    digest(inventory['observedManifestSha256'])
    shape(inventory['limits'], 'maxEntries maxBytes maxSeconds')
    need(inventory['limits'] == {'maxEntries':8000,'maxBytes':2200000000,'maxSeconds':120}, 'inventory_limits')
    need(inventory['entryCount'] == inventory['fileCount'] + inventory['directoryCount'] + inventory['excludedEntryCount'] <= inventory['limits']['maxEntries'], 'inventory_counts')
    need(0 < inventory['totalFileBytes'] <= inventory['limits']['maxBytes'], 'inventory_bytes')
    need(inventory['fileCount'] == inventory['blockmapListedFiles'] - inventory['blockmapMissingFileCount'] + inventory['additionalFileCount'], 'blockmap_counts')
    need(inventory['excludedEntryCount'] > 0 and inventory['blockmapMissingFileCount'] > 0 and 0 < inventory['hardlinkedFileCount'] <= inventory['fileCount'], 'incomplete_inventory')
    need(inventory['aclReadEntries'] + inventory['excludedEntryCount'] == inventory['entryCount'], 'acl_counts')
    need(inventory['recognizedAdditionalFiles'] == ['AppxBlockMap.xml','AppxMetadata/CodeIntegrity.cat','AppxSignature.p7x'] and inventory['additionalFileCount'] == 3, 'additional_files')
    need(inventory['unknownAdditionalFileCount'] == inventory['linkCount'] == inventory['broadWriteAllowEntryCount'] == 0, 'inventory_findings')
    shape(value['discovery'], 'linuxConventionalTargets linuxTargetsPresent windowsNpmRoots windowsNpmPackagesPresent desktopPackages outerWireNamedArtifacts versionBoundWireBundleFound privateProfileSearched pathSearchPerformed')
    need(same(value['discovery'], {'linuxConventionalTargets':7,'linuxTargetsPresent':0,'windowsNpmRoots':2,'windowsNpmPackagesPresent':0,'desktopPackages':1,'outerWireNamedArtifacts':0,'versionBoundWireBundleFound':False,'privateProfileSearched':False,'pathSearchPerformed':False}), 'discovery_scope')
    need(value['blockers'] == ['linux_execute_access_missing','exact_codex_version_unbound','signature_trust_unverified','inventory_not_closed','launch_dependency_closure_unproven','version_bound_wire_bundle_missing'], 'missing_blocker')
    shape(value['gates'], 'implementationReady executionSupported pilotReady liveAdmissionAllowed')
    need(all(v is False for v in value['gates'].values()), 'activation')
    shape(value['actions'], 'candidateExecutions modelCalls networkRequests authReads componentChanges privateReceiptsWritten')
    need(all(type(v) is int and v == 0 for v in value['actions'].values()), 'forbidden_action')
    shape(value['docker'], 'before after unchanged')
    for phase in ('before','after'):
        shape(value['docker'][phase], 'containers networks volumes images')
        need(all(type(v) is int for v in value['docker'][phase].values()), 'docker_count')
    need(value['docker']['unchanged'] is True and same(value['docker']['before'], value['docker']['after']), 'docker_changed')
    need(value['nextTask'] == 'RF-HERMES-009', 'next_task')


def main():
    observation = load(OBSERVATION)
    validate_observation(observation)
    profile, schema = load(PROFILE), load(SCHEMA)
    validate_profile(profile, schema)
    report = REPORT.read_text(encoding='utf-8')
    need(observation['verdict'] in report and observation['candidate']['sha256'] in report, 'report_binding')
    need(report.count('Exactly one recommended next atomic task:') == 1 and '**RF-HERMES-009' in report, 'report_next_task')
    need(not re.search(r'(?i)(\b[a-z]:[\\/]|/home/|/mnt/|BEGIN .*PRIVATE KEY)', report), 'report_privacy')
    for target in re.findall(r'\[[^\]]+\]\(([^)]+)\)', report):
        need('://' not in target and '#' not in target, 'report_link')
        dest = (REPORT.parent / target).resolve()
        need(dest.name != 'design-qa.md' and dest.is_relative_to(BASE.parent.parent) and dest.is_file(), 'report_link_scope')
    return {'result':'PASS','scope':'static_observation_only','verdict':observation['verdict'],'candidateExecutions':0,'runtimeQualified':False,'profileRevision':profile['revision']}


if __name__ == '__main__':
    try:
        print(json.dumps(main()))
    except (ValueError, KeyError, TypeError, OSError, RecursionError):
        print(json.dumps({'result':'FAIL','scope':'static_observation_only'}))
        sys.exit(1)
