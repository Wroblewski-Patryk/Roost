/** Fixed PHP only. Caller independently seals the preparse template file/hash,
 * source pins and persisted environment digest. This projection proves exact
 * parser substitutions; it says nothing about health or successful deployment. */
export const composeTemplateQualificationPhp = String.raw`
function roost_compose_template_deny(){throw new Exception('release_compose_template_unproven');}
function roost_compose_template_env($a){
 $normal=$a->environment_variables??null;$preview=$a->environment_variables_preview??[];
 if(!is_iterable($normal)||!is_iterable($preview))roost_compose_template_deny();
 // Preview rows have their own immutable metadata seal. A normal release never
 // resolves values from them, even when the same variable has another value.
 $previewKeys=[];$previewCount=0;foreach($preview as $row){
  if(++$previewCount>256||(!is_array($row)&&!is_object($row)))roost_compose_template_deny();
  $key=is_array($row)?($row['key']??null):($row->key??null);$value=is_array($row)?($row['value']??null):($row->value??null);
  $flag=is_array($row)?($row['is_preview']??null):($row->is_preview??null);
  if(!is_string($key)||strlen($key)>200||!preg_match('/\A[A-Za-z_][A-Za-z0-9_]*\z/D',$key)
   ||!is_string($value)||strlen($value)>65536||str_contains($value,"\0")||array_key_exists($key,$previewKeys)
   ||$flag!==true)roost_compose_template_deny();$previewKeys[$key]=true;
 }
 $out=[];$count=0;foreach($normal as $row){
  if(++$count>256||(!is_array($row)&&!is_object($row)))roost_compose_template_deny();
  $key=is_array($row)?($row['key']??null):($row->key??null);
  $value=is_array($row)?($row['value']??null):($row->value??null); // accessor decrypts inside Coolify
  $flag=is_array($row)?($row['is_preview']??null):($row->is_preview??null);
  if(!is_string($key)||strlen($key)>200||!preg_match('/\A[A-Za-z_][A-Za-z0-9_]*\z/D',$key)
   ||!is_string($value)||strlen($value)>65536||str_contains($value,"\0")||array_key_exists($key,$out)
   ||$flag!==false)roost_compose_template_deny();
  $out[$key]=$value;
 }return $out;
}
function roost_compose_template_reference($value){
 if(!is_string($value))return null;
 if(preg_match('/\A\$\{([A-Za-z_][A-Za-z0-9_]*)(?::-([^\$\{\}\r\n\x00]*))?\}\z/D',$value,$match))
  return ['key'=>$match[1],'hasDefault'=>array_key_exists(2,$match),'default'=>$match[2]??null];
 if(str_contains($value,'$'.'{')||preg_match('/\$[A-Za-z_]/',$value))roost_compose_template_deny();
 return null;
}
function roost_compose_template_name($name,$service,$target){
 return is_string($name)&&preg_match('/\A'.preg_quote($service.'-'.$target,'/').'(?:-[0-9]{6,20})?\z/D',$name)===1;
}
function roost_compose_template_declared($a,$service){
 $raw=$a->docker_compose_raw??null;
 if(!is_string($raw)||$raw===''||strlen($raw)>131072||!class_exists('Symfony\\Component\\Yaml\\Yaml'))roost_compose_template_deny();
 $doc=Symfony\Component\Yaml\Yaml::parse($raw);
 if(!is_array($doc)||!is_array($doc['services']??null)||!is_array($doc['services'][$service]??null))roost_compose_template_deny();
 return $doc['services'][$service];
}
function roost_compose_template_has_name_override($declared){
 if(array_key_exists('container_name',$declared))return true;
 $env=$declared['environment']??[];if(!is_array($env))roost_compose_template_deny();
 if(array_key_exists('COOLIFY_CONTAINER_NAME',$env))return true;
 foreach($env as $key=>$value)if(is_int($key)&&is_string($value)
  &&preg_match('/\ACOOLIFY_CONTAINER_NAME(?:=|\z)/D',$value))return true;
 return false;
}
function roost_compose_qualified_template($a,$live,$template){
 $target=$a->uuid??null;if(!is_string($target)||!preg_match('/\A[A-Za-z0-9][A-Za-z0-9_-]{0,79}\z/D',$target)
  ||!is_array($live)||!is_array($template)||!is_array($live['services']??null)||!is_array($template['services']??null)
  ||count($template['services'])<1||count($template['services'])>12)roost_compose_template_deny();
 $keys=array_keys($template['services']);$actual=array_keys($live['services']);sort($keys);sort($actual);
 if($keys!==$actual)roost_compose_template_deny();$env=roost_compose_template_env($a);$generated=[];
 // Inspect raw physical names BEFORE the existing normalizer removes known
 // generated names. A declared/user override is never silently discarded.
 foreach($template['services'] as $service=>$expected){$observed=$live['services'][$service];
  if(!is_string($service)||!preg_match('/\A[A-Za-z0-9][A-Za-z0-9_-]{0,79}\z/D',$service)
   ||!is_array($expected)||!is_array($observed))roost_compose_template_deny();
  $hasExpected=array_key_exists('container_name',$expected);$hasObserved=array_key_exists('container_name',$observed);
  $coExpected=$expected['environment']['COOLIFY_CONTAINER_NAME']??null;$coObserved=$observed['environment']['COOLIFY_CONTAINER_NAME']??null;
  $needsNames=$hasExpected||$hasObserved||$coExpected!==$coObserved;
  if($needsNames){$declared=roost_compose_template_declared($a,$service);$override=roost_compose_template_has_name_override($declared);
   if($override||array_key_exists('COOLIFY_CONTAINER_NAME',$env)){
    if($hasExpected!==$hasObserved||($hasExpected&&$expected['container_name']!==$observed['container_name']))roost_compose_template_deny();
    if(array_key_exists('container_name',$declared)
     &&(!$hasExpected||$expected['container_name']!==$declared['container_name']))roost_compose_template_deny();
   }else{
    if(!$hasObserved||!roost_compose_template_name($observed['container_name'],$service,$target)
     ||($hasExpected&&!roost_compose_template_name($expected['container_name'],$service,$target)))roost_compose_template_deny();
    if(($coExpected!==null||$coObserved!==null)&&(!is_string($coObserved)||$coObserved!==$observed['container_name']))roost_compose_template_deny();
    if($coExpected!==$coObserved){
     $reference=roost_compose_template_reference($coExpected);
     $original=$reference?($reference['key']==='COOLIFY_CONTAINER_NAME'&&$reference['hasDefault']?$reference['default']:null):$coExpected;
     if(!roost_compose_template_name($original,$service,$target)||!roost_compose_template_name($coObserved,$service,$target)
      ||$coObserved!==$observed['container_name'])roost_compose_template_deny();
     $generated[$service]=true;
    }
   }
  }
 }
 $normalTemplate=roost_compose_normalize($template,$target);$qualified=roost_compose_normalize($live,$target);
 foreach($normalTemplate['services'] as $service=>$expected){
  if(!array_key_exists('environment',$expected))continue;
  $before=$expected['environment'];$after=$qualified['services'][$service]['environment']??null;
  if(!is_array($before)||!is_array($after))roost_compose_template_deny();
  $keys=array_keys($before);$actual=array_keys($after);sort($keys);sort($actual);if($keys!==$actual)roost_compose_template_deny();
  foreach($before as $key=>$value){$observed=$after[$key];$reference=roost_compose_template_reference($value);
   if($key==='COOLIFY_CONTAINER_NAME'&&isset($generated[$service])){
    $qualified['services'][$service]['environment'][$key]=$value;continue;
   }
   if($observed===$value)continue; // unchanged supported expression: preparse only
   if(!$reference||!is_string($observed))roost_compose_template_deny();
   // Match the inspected fixed Coolify parser: a persisted EMPTY string is a
   // persisted override too. Defaults are used only when the key is absent.
   if(array_key_exists($reference['key'],$env))$resolved=$env[$reference['key']];
   elseif($reference['hasDefault'])$resolved=$reference['default'];else roost_compose_template_deny();
   if($observed!==$resolved)roost_compose_template_deny();
   $qualified['services'][$service]['environment'][$key]=$value;
  }
 }
 if(roost_compose_hash($qualified)!==roost_compose_hash($normalTemplate))roost_compose_template_deny();
 return $normalTemplate;
}
`;
