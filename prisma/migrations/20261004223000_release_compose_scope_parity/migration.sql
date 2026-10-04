BEGIN;
-- Forward-only parity with the server's lexical directory and Compose target
-- admission. No row, grant, credential, trigger or existing migration is changed.
CREATE FUNCTION governed_release_lexical_directory(value TEXT,windows BOOLEAN,absolute BOOLEAN)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE normalized TEXT;body TEXT;part TEXT;parts TEXT[]:=ARRAY[]::TEXT[];root TEXT:='';is_absolute BOOLEAN;
BEGIN
 IF value IS NULL OR value='' OR length(value)>4096 OR value ~ E'[\\x01-\\x1f\\x7f]' THEN RETURN NULL; END IF;
 normalized:=CASE WHEN windows THEN replace(value,chr(92),'/') ELSE value END;
 is_absolute:=CASE WHEN windows THEN normalized ~ '^[A-Za-z]:/' ELSE normalized LIKE '/%' AND normalized NOT LIKE '//%' END;
 IF absolute IS DISTINCT FROM is_absolute THEN RETURN NULL; END IF;
 IF NOT absolute AND (normalized LIKE '/%' OR normalized ~ '^[A-Za-z]:') THEN RETURN NULL; END IF;
 IF windows AND normalized LIKE '/%' OR NOT windows AND strpos(value,chr(92))>0 THEN RETURN NULL; END IF;
 IF absolute THEN
  root:=CASE WHEN windows THEN lower(left(normalized,2))||'/' ELSE '/' END;
  body:=substring(normalized FROM CASE WHEN windows THEN 4 ELSE 2 END);
 ELSE body:=normalized; END IF;
 FOREACH part IN ARRAY string_to_array(body,'/') LOOP
  IF part='' THEN CONTINUE; END IF;
  IF part IN ('.','..') OR windows AND (part ~ '[<>:"|?*]' OR part ~ '[. ]$'
   OR part ~* '^(con|conin[$]|conout[$]|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])([.]|$)') THEN RETURN NULL; END IF;
  parts:=array_append(parts,part);
 END LOOP;
 IF NOT absolute AND cardinality(parts)=0 THEN RETURN NULL; END IF;
 normalized:=root||array_to_string(parts,'/');
 RETURN CASE WHEN windows THEN lower(normalized) ELSE normalized END;
END $$;
CREATE FUNCTION governed_release_canonical_directory_matches(metadata JSONB,canonical_dir TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE windows BOOLEAN;expected TEXT;direct TEXT;root TEXT;relative TEXT;
BEGIN
 IF jsonb_typeof(metadata) IS DISTINCT FROM 'object' OR canonical_dir IS NULL THEN RETURN FALSE; END IF;
 windows:=replace(canonical_dir,chr(92),'/') ~ '^[A-Za-z]:/';
 expected:=governed_release_lexical_directory(canonical_dir,windows,TRUE);
 IF expected IS NULL OR jsonb_typeof(metadata->'localDirectory') IS DISTINCT FROM 'string' THEN RETURN FALSE; END IF;
 direct:=governed_release_lexical_directory(metadata->>'localDirectory',windows,TRUE);
 IF direct IS NOT NULL THEN RETURN direct=expected; END IF;
 IF jsonb_typeof(metadata->'localWorkspaceRoot') IS DISTINCT FROM 'string' THEN RETURN FALSE; END IF;
 root:=governed_release_lexical_directory(metadata->>'localWorkspaceRoot',windows,TRUE);
 relative:=governed_release_lexical_directory(metadata->>'localDirectory',windows,FALSE);
 IF root IS NULL OR relative IS NULL THEN RETURN FALSE; END IF;
 RETURN governed_release_lexical_directory(root||CASE WHEN right(root,1)='/' THEN '' ELSE '/' END||relative,windows,TRUE)=expected;
END $$;
CREATE OR REPLACE FUNCTION governed_release_application_scope(metadata JSONB, manifest JSONB)
RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE cleanup JSONB;targets JSONB;origins JSONB;protected JSONB;owned JSONB;projected JSONB;path_key TEXT;
BEGIN
 IF metadata->>'releasePurpose'='temporary_certification' THEN
  -- Historical certification admission had no manifest requirement. Keep that
  -- legacy case, while a present manifest must remain certification scoped.
  IF manifest IS NULL THEN RETURN TRUE; END IF;
  RETURN COALESCE(manifest->>'schemaVersion'='roost-release-manifest-v1'
   AND manifest->'deployment'->>'provider'='coolify'
   AND manifest->'cleanup'->'archiveRepository'='true'::jsonb
   AND NOT(manifest ? 'purpose'),FALSE);
 END IF;
 IF metadata->>'releasePurpose' IS DISTINCT FROM 'application_release'
  OR jsonb_typeof(manifest) IS DISTINCT FROM 'object'
  OR jsonb_typeof(manifest->'deployment') IS DISTINCT FROM 'object'
  OR jsonb_typeof(manifest->'repository') IS DISTINCT FROM 'object'
  OR manifest->>'schemaVersion' IS DISTINCT FROM 'roost-release-manifest-v2'
  OR manifest->>'purpose' IS DISTINCT FROM 'application_release'
  OR manifest->'deployment'->>'provider' NOT IN ('coolify','coolify_git_set','coolify_compose')
  OR manifest->'deployment'->>'provider' IS NULL THEN RETURN FALSE; END IF;
 cleanup:=manifest->'cleanup';protected:=cleanup->'protectedResourceIds';owned:=cleanup->'ownedResourceIds';
 IF jsonb_typeof(cleanup) IS DISTINCT FROM 'object'
  OR cleanup->'archiveRepository' IS DISTINCT FROM 'false'::jsonb
  OR jsonb_typeof(protected) IS DISTINCT FROM 'array' OR jsonb_typeof(owned) IS DISTINCT FROM 'array'
  THEN RETURN FALSE; END IF;
 IF jsonb_array_length(protected) NOT BETWEEN 1 AND 100 OR jsonb_array_length(owned)>30
  OR EXISTS(SELECT 1 FROM jsonb_array_elements(protected || owned) item
   WHERE jsonb_typeof(item) IS DISTINCT FROM 'string' OR length(btrim(item#>>'{}')) NOT BETWEEN 1 AND 1000)
  OR (SELECT count(DISTINCT value) FROM jsonb_array_elements(protected))<>jsonb_array_length(protected)
  OR (SELECT count(DISTINCT value) FROM jsonb_array_elements(owned))<>jsonb_array_length(owned)
  OR EXISTS(SELECT 1 FROM jsonb_array_elements(owned) item WHERE protected @> jsonb_build_array(item))
  OR NOT(protected @> jsonb_build_array(manifest->'deployment'->>'targetId'))
  OR cleanup->>'coolifyTargetId' IS DISTINCT FROM manifest->'deployment'->>'targetId'
  OR cleanup->>'repositoryUrl' IS DISTINCT FROM manifest->'repository'->>'url'
  OR cleanup->>'canonicalDir' IS DISTINCT FROM manifest->'repository'->>'canonicalDir'
  OR NOT governed_release_canonical_directory_matches(metadata,manifest->'repository'->>'canonicalDir')
  OR metadata->>'deploymentUrl' IS DISTINCT FROM manifest->'deployment'->>'url'
  OR jsonb_typeof(metadata->'localDirectory') IS DISTINCT FROM 'string'
  OR jsonb_typeof(metadata->'deploymentUrl') IS DISTINCT FROM 'string'
  OR jsonb_typeof(manifest->'repository'->'url') IS DISTINCT FROM 'string'
  OR jsonb_typeof(manifest->'repository'->'canonicalDir') IS DISTINCT FROM 'string'
  OR jsonb_typeof(manifest->'deployment'->'url') IS DISTINCT FROM 'string'
  OR jsonb_typeof(manifest->'deployment'->'targetId') IS DISTINCT FROM 'string'
  OR manifest->'repository'->>'url' IS NULL OR manifest->'repository'->>'canonicalDir' IS NULL
  OR manifest->'deployment'->>'url' IS NULL OR manifest->'deployment'->>'targetId' IS NULL
  THEN RETURN FALSE; END IF;
 IF manifest->'deployment'->>'provider'='coolify' THEN RETURN TRUE; END IF;
 targets:=manifest->'deployment'->'targets';origins:=manifest->'deployment'->'publicOrigins';
 path_key:=CASE WHEN manifest->'deployment'->>'provider'='coolify_compose' THEN 'composePath' ELSE 'dockerfile' END;
 IF jsonb_typeof(targets) IS DISTINCT FROM 'array' OR jsonb_typeof(origins) IS DISTINCT FROM 'array'
  OR jsonb_typeof(metadata->'releaseTargets') IS DISTINCT FROM 'array'
  OR jsonb_typeof(metadata->'releasePublicOrigins') IS DISTINCT FROM 'array' THEN RETURN FALSE; END IF;
 IF jsonb_array_length(targets) NOT BETWEEN 1 AND 6 OR jsonb_array_length(origins) NOT BETWEEN 1 AND 8
  OR (SELECT count(DISTINCT value->>'targetId') FROM jsonb_array_elements(targets))<>jsonb_array_length(targets)
  OR (SELECT count(DISTINCT value->>'name') FROM jsonb_array_elements(targets))<>jsonb_array_length(targets)
  OR (SELECT count(DISTINCT value) FROM jsonb_array_elements(origins))<>jsonb_array_length(origins)
  OR metadata->'releasePublicOrigins' IS DISTINCT FROM origins
  OR NOT(origins @> jsonb_build_array(substring(manifest->'deployment'->>'url' FROM '^https://[^/?#]+')))
  OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(targets) t WHERE t->>'targetId'=manifest->'deployment'->>'targetId')
  OR EXISTS(SELECT 1 FROM jsonb_array_elements(targets) t
   WHERE jsonb_typeof(t) IS DISTINCT FROM 'object' OR jsonb_typeof(t->'targetId') IS DISTINCT FROM 'string'
    OR length(btrim(t->>'targetId')) NOT BETWEEN 1 AND 1000 OR jsonb_typeof(t->'name') IS DISTINCT FROM 'string'
    OR length(btrim(t->>'name')) NOT BETWEEN 1 AND 1000 OR jsonb_typeof(t->path_key) IS DISTINCT FROM 'string'
    OR t->>path_key !~ '^/[A-Za-z0-9._/-]+$' OR (t->>path_key)~'(^|/)([.]|[.][.])(/|$)'
    OR (t->>path_key) LIKE '%//%' OR NOT(protected @> jsonb_build_array(t->>'targetId')))
  OR EXISTS(SELECT 1 FROM jsonb_array_elements(origins) origin
   WHERE jsonb_typeof(origin) IS DISTINCT FROM 'string' OR (origin#>>'{}')!~'^https://[^/@?#[:space:]]+(:[0-9]+)?$')
  THEN RETURN FALSE; END IF;
 SELECT jsonb_agg(jsonb_build_object('targetId',t->>'targetId',path_key,t->>path_key) ORDER BY ordinal)
 INTO projected FROM jsonb_array_elements(targets) WITH ORDINALITY AS item(t,ordinal);
 IF metadata->'releaseTargets' IS DISTINCT FROM projected THEN RETURN FALSE; END IF;
 RETURN TRUE;
END $$;

COMMIT;
