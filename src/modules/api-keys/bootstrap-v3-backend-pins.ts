// Migration 87 source pins. UNAPPLIED / NATIVE UNQUALIFIED.
export const v3HistoricalMigrationsDigest="1d74b2ebd6baf4f5ca46e00ede1a0be78ba1489eece4e709feca709ba2f4114f";
export const v3UpgradePins={
  "bootstrap_lifecycle_write_guard": {
    "old": "5a20ef2f1215d86cbaec27f129d83eb608b16e92afb074e1e18b0490fc328cf1",
    "hash": "e5f14f57191657d15ff664bb7e23ec881c8e79322e027a742e1543c2eac12d47"
  },
  "transport_authority_write_guard": {
    "old": "e163de3fae49ccc6786b498e2a58eab9a3299980b77dd58cef18ed6eba461574",
    "hash": "e107daca96f86b997f5bd17a3ac717dbd31ad7993152f8658eaa54c592c700b0"
  },
  "decision_attestation_child_guard": {
    "old": "e6a1b2d70ab4f8bfede11f867b8f6634a8eb3b97cf3859068018ccf760eb1326",
    "hash": "6269e0d1d6fb897d05b89cf77d6feee470e9ad62bd11982e58263342cc31ee23"
  },
  "bootstrap_proof_child_guard": {
    "old": "add2057543ac4f3c2fb800c77250f567356559a75346ba8619d4f9ed9be8634a",
    "hash": "fe96dbcd89f549879c7f7946e99481de10ce38f728affe524bc1ceac57a4b415"
  },
  "decision_attestation_seal_guard": {
    "old": "4636d50fc5a36103c3a58a1b791aa6d3d3a90a8a600cd18cc582457b1455f010",
    "hash": "9db1737ce54c406046fd24fae57313ac9ef92888f90c8ca9021f501eb3a772a4"
  },
  "bootstrap_lifecycle_audit": {
    "old": "777af3c2456ed0cd2bf7383ee0d96f138465b0ba8c5d21c0cdb0a60964bc3a94",
    "hash": "894363ab2874bf0d60c1ea95f0c333e119cc5aefd709ac6aaa5d5aa8375a1361"
  },
  "transport_authority_audit_append": {
    "old": "e3cde4107de28c82d88ffd9780811ef8ec7463eaa3fa7b1ed75ca39c04f2afdc",
    "hash": "d3596d6e64d2b84783cc1d70873db3153109194bb3d247f73fa6c099d6af18a3"
  },
  "bootstrap_proof_audit": {
    "old": "0769f3cf3f90d4b4e50cf7f1fd3ce298fc9ff081c12d530267aab6e83c71e158",
    "hash": "6f622068db48a814ad65b50da104c6a66caa74cffb26381eb37a70c031bc7c24"
  },
  "transport_bootstrap_advance": {
    "old": "098c585bc0ff2e67f4f7de330c0da524d3cf5fb8ea1ae0d3684bd81a15f3c17f",
    "hash": "73aba7e3d4d0b1891e6e2eec9ba40cefee13ea7b7fcfa1f0b86f70c557f5a93d"
  },
  "decision_attestation_audit": {
    "old": "524ae686d6d97955e3fee6f97cc2e91918ac8817e2119d2e4e712a18972f943b",
    "hash": "c921b73f4474eb2e91dafc73d846bb83b51aefb722f10eafbe8f29f43bbf23f2"
  },
  "transport_bootstrap_source_lock": {
    "old": "c4115545454b641c20aa355e713f03bb3534a6506d4faef93e4a5209ad3a5510",
    "hash": "ff72fdaba362881bdd25aa24361dbf50ebaad37afe6aeaf6170c05b2d1094abc"
  },
  "decision_attestation_lock": {
    "old": "3316c5fbc4af10d15f83bde791aa7cf578f94875e224f8b7e35904099c44bee1",
    "hash": "3f26ed4475664c3d002557efea8b2a5ae190b6bdeea4fd9f46e296a4e96ba281"
  }
} as const;
export const v3CatalogManifest={
  "version": "bootstrap-v3-catalog-v1",
  "functions": [
    {
      "name": "agent_credential_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "7f2eb8cc9f3890a0029d6227256f8c11a39197e706b1dffb30a1da9d656091d9"
    },
    {
      "name": "bootstrap_completion_audit",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "e783b2bd62440e012358d736396cfc26724fc57ec01245eca2c2dd6d683e2367"
    },
    {
      "name": "bootstrap_completion_commit_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "a944669bae34fe94ec0fd461fd6d76d04e574f4941455b22e2aa904023682d38"
    },
    {
      "name": "bootstrap_completion_event_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "95a2ac9db0740d6ab824d22f0b426116ec499c32b37ca3107dbbf04936b417c9"
    },
    {
      "name": "bootstrap_completion_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "d6cb659e75b5c52b422d52e07a03d9ff87f75e5ac6decb381819542ce62bd58b"
    },
    {
      "name": "bootstrap_completion_no_mutation",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "ba32b3a8185073eb7697649d4e3136ae4a31b067983728686d02eb54b2e513bd"
    },
    {
      "name": "bootstrap_completion_proof",
      "args": "v jsonb, s jsonb, p jsonb, xid text, lo bigint, hi bigint",
      "defaults": null,
      "result": "jsonb",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "66d2e3174e35e9a7e96e6047f8302534d52c36719d4f1c17e78360e73202c153"
    },
    {
      "name": "bootstrap_completion_sources",
      "args": "attempt uuid, handoff uuid",
      "defaults": null,
      "result": "text",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "06ee8db29cf80935ac4eb10edad5821aa8df9c7112632e50d8d48128af66ecb0"
    },
    {
      "name": "bootstrap_dispatch_audit",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "049913aa90cb3be7091b3b57c3260f2293d68e37ad80f451ab9042816e7081d0"
    },
    {
      "name": "bootstrap_dispatch_commit_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "6fe7a62063a74ab7affb6909834d38876d098f98b99dbe76437078afcad17a0c"
    },
    {
      "name": "bootstrap_dispatch_event_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "29b4134dbdf0168c0b76ab49d347db967f86076f0d1611bce24680a03f1e0e41"
    },
    {
      "name": "bootstrap_dispatch_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "251e3b20376bbc549214cdc841b86c1a1e388cff28c123c6549489f4e740a656"
    },
    {
      "name": "bootstrap_dispatch_lock",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "b502d1d59fc6228b652a88dead01e92c001ce7f1bc8e8d6b97d89051ce17fc41"
    },
    {
      "name": "bootstrap_issuer_append_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "aa4bcd1ec0f820e963f469f11796f90b1e34ae93455bd39aa329d87ee1a93d02"
    },
    {
      "name": "bootstrap_issuer_audit_append",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "edff80b8a8b110b214effb303ca02f4bf82ec747546e8c646196bf75d2087d9b"
    },
    {
      "name": "bootstrap_issuer_immutable",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "f15d850128f5dcf4d2940e66b8a003ea5b3755180947d65380880343a073b9b8"
    },
    {
      "name": "bootstrap_issuer_key_fence",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "a9d88bdb4e104758a211a33c4e44141be7b9c91abd5c68f78154d7c0cacf4334"
    },
    {
      "name": "bootstrap_lifecycle_anchors_current",
      "args": "i jsonb",
      "defaults": null,
      "result": "boolean",
      "language": "plpgsql",
      "volatility": "s",
      "hash": "be37bc5fd821c6f07956629c32d79404b08bf36ec532b0547697f63d917be2ee"
    },
    {
      "name": "bootstrap_lifecycle_audit",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "894363ab2874bf0d60c1ea95f0c333e119cc5aefd709ac6aaa5d5aa8375a1361"
    },
    {
      "name": "bootstrap_lifecycle_channel_bound",
      "args": "i jsonb",
      "defaults": null,
      "result": "boolean",
      "language": "plpgsql",
      "volatility": "s",
      "hash": "82069ba74dc070c6ab791d7e678ffd5023f7c1ea713782ecca2193d9ab7fcb9c"
    },
    {
      "name": "bootstrap_lifecycle_commit_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "e16fb9ed6af5426d4bac8e9f931b7b22a48637ebbf2f4759d0493a30ecfdef7c"
    },
    {
      "name": "bootstrap_lifecycle_current",
      "args": "i jsonb",
      "defaults": null,
      "result": "boolean",
      "language": "plpgsql",
      "volatility": "s",
      "hash": "fc59bc67572fe7f04985e5eba40d66b3d7d54cc3b6ca4b0bb74195194ff5c52b"
    },
    {
      "name": "bootstrap_lifecycle_digest",
      "args": "v jsonb",
      "defaults": null,
      "result": "text",
      "language": "plpgsql",
      "volatility": "i",
      "hash": "b49ce8711054c2359505cb7881a586ab22ba04d48a08529fdcf43138e83e97d8"
    },
    {
      "name": "bootstrap_lifecycle_event_protect",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "0e33f487311284b679436ef5f9c1abcdc3e448a038c9013039618ac9c948eeed"
    },
    {
      "name": "bootstrap_lifecycle_immutable",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "2b8315af80e29504186f86c2521f72ce660d1e3eac5e224d97b36c14d8fead7a"
    },
    {
      "name": "bootstrap_lifecycle_json",
      "args": "v jsonb",
      "defaults": null,
      "result": "text",
      "language": "plpgsql",
      "volatility": "i",
      "hash": "d8a4bd53221d5a9a76b53ec4804f9ac4ae424ea4ab260171415feffcc2799be7"
    },
    {
      "name": "bootstrap_lifecycle_receipt_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "9233c0f06c0d373e3ebfaabda6ce87cdf935f4b4af3153eaf6e928492584cfa6"
    },
    {
      "name": "bootstrap_lifecycle_shape",
      "args": "i jsonb",
      "defaults": null,
      "result": "boolean",
      "language": "plpgsql",
      "volatility": "i",
      "hash": "90aa1488e4a7df5ae90411af06732f56cd647146bbdd653a12919a19ee118269"
    },
    {
      "name": "bootstrap_lifecycle_write_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "e5f14f57191657d15ff664bb7e23ec881c8e79322e027a742e1543c2eac12d47"
    },
    {
      "name": "bootstrap_proof_audit",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "6f622068db48a814ad65b50da104c6a66caa74cffb26381eb37a70c031bc7c24"
    },
    {
      "name": "bootstrap_proof_bytes",
      "args": "v jsonb, depth integer",
      "defaults": null,
      "result": "bytea",
      "language": "plpgsql",
      "volatility": "i",
      "hash": "9d57f9e2a06f3cb2d48e1f6d6ac3f72bc2f3c24e8569445c5a882cacaf468343"
    },
    {
      "name": "bootstrap_proof_child_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "fe96dbcd89f549879c7f7946e99481de10ce38f728affe524bc1ceac57a4b415"
    },
    {
      "name": "bootstrap_proof_commit_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "4d0866b5650627ae57edbbda71c41ebab1fbcaa3da76e1ccad59c70b44541e48"
    },
    {
      "name": "bootstrap_proof_digest",
      "args": "v jsonb",
      "defaults": null,
      "result": "text",
      "language": "plpgsql",
      "volatility": "i",
      "hash": "f0a7ae78abfde878c83e99e65cc615d81fc944d7d420cf45b542ffd230d30866"
    },
    {
      "name": "bootstrap_proof_event_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "3b83a29d0cb4563a545dee3634d1ff665db429bc430f51842a7feb69b6342365"
    },
    {
      "name": "bootstrap_proof_immutable",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "f93cd343c364e4867ed2cca8d118c3f30e0cc663079e4212424103bedc1c5f5f"
    },
    {
      "name": "bootstrap_proof_lifecycle",
      "args": "w uuid, installation uuid, host uuid, ig uuid, hg uuid, ir uuid, hr uuid",
      "defaults": null,
      "result": "boolean",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "e6311e9a1ba9d32a374c7c0aad897ae84fdb37778a4c13608efbdc92af3bf87e"
    },
    {
      "name": "bootstrap_proof_operation",
      "args": "table_name text, operation uuid",
      "defaults": null,
      "result": "jsonb",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "f8df120cf8d8e362f955f31e48271317e1eba74a531c1810453cf43928b0db29"
    },
    {
      "name": "bootstrap_proof_owner",
      "args": "w uuid, d uuid, revision bigint, field text, value jsonb",
      "defaults": null,
      "result": "uuid",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "8cede83d10437ea905d290cf37a048999d4311d1d66f4e8da9b524bb806a02d3"
    },
    {
      "name": "bootstrap_proof_public_material",
      "args": "m jsonb",
      "defaults": null,
      "result": "boolean",
      "language": "plpgsql",
      "volatility": "i",
      "hash": "96e881ca09dd15ad6d24f55c1c4033ded8d40bc07d05b20570bf435abe92923c"
    },
    {
      "name": "bootstrap_proof_receipt_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "821299f74e2e7529f96d5ef7dfb283061adb3caa207432e26433876489b878e6"
    },
    {
      "name": "bootstrap_proof_reference",
      "args": "w uuid, ref jsonb, at_time timestamp with time zone, generation jsonb",
      "defaults": null,
      "result": "jsonb",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "50781a187c4040db74b43774fc20ec05b29deec28ef931437e5fc79568fc50ee"
    },
    {
      "name": "bootstrap_proof_replay",
      "args": "records jsonb",
      "defaults": null,
      "result": "jsonb",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "1b10b297a6fcd12b7230368053361bd5ce94846c638c541d677d717cc56af2b1"
    },
    {
      "name": "bootstrap_proof_reserved_key_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "3b977190d14217f6a34f5d2e591c82a88aa5a079442b5c887b2f937ae31ea51b"
    },
    {
      "name": "bootstrap_proof_shape",
      "args": "v jsonb, keys text[]",
      "defaults": null,
      "result": "boolean",
      "language": "plpgsql",
      "volatility": "i",
      "hash": "b9750de78235c9e8abe30e34457bd80cf8a545114e20e79d41f9f0b5df816b42"
    },
    {
      "name": "bootstrap_proof_source_lock",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "3d596cfd463f32b7579d336b1ec481653e22f0920a2359cc140e9e0e1b9d6cf0"
    },
    {
      "name": "bootstrap_proof_sources",
      "args": "w uuid",
      "defaults": null,
      "result": "text",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "399447a9dd178a04c00181eb68d35968c4c19302bf2f3a18f6303e351779892a"
    },
    {
      "name": "bootstrap_proof_time",
      "args": "v jsonb",
      "defaults": null,
      "result": "boolean",
      "language": "plpgsql",
      "volatility": "i",
      "hash": "ab2f4b26162552cce8e453bf9b542a1092c25af69b0d4e590d6197c56c455341"
    },
    {
      "name": "bootstrap_v3_active",
      "args": "",
      "defaults": null,
      "result": "uuid",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "f497e5edba747103fa46df0a423d2a8fbe020a57ca0e2503c78490c66b3e2f72"
    },
    {
      "name": "bootstrap_v3_advance",
      "args": "op uuid, slot text, guard_role text",
      "defaults": null,
      "result": "bigint",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "13d8246de9570fe12d380decff444713560dc32030aa1705201e1fc1841aec88"
    },
    {
      "name": "bootstrap_v3_after",
      "args": "tbl text, new_row jsonb",
      "defaults": null,
      "result": "void",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "217a53b997e188f42075728c976f6fd0a891bc25f06f94e7b753d7d34ef28d67"
    },
    {
      "name": "bootstrap_v3_assert",
      "args": "ok boolean, reason text",
      "defaults": null,
      "result": "void",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "10c710ce2201472bc7cad26421f2f479fce8dd298dcad21735d11d3bcf496340"
    },
    {
      "name": "bootstrap_v3_authorize",
      "args": "p jsonb",
      "defaults": null,
      "result": "void",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "545d6f474291a21ac2d504534f9a0d2cfbf78290ca3ba6f785a716ff124d518d"
    },
    {
      "name": "bootstrap_v3_binding",
      "args": "role text, rkey text, r jsonb, p jsonb",
      "defaults": null,
      "result": "text",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "242a320843edc81f7a495372547ceec8b1b4afa31af051eb6b8135b62e02e92d"
    },
    {
      "name": "bootstrap_v3_capture",
      "args": "tbl text, action text, new_row jsonb, old_row jsonb",
      "defaults": null,
      "result": "void",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "863d39d143733f7fd9aa124349af59b33b9996b34757794cd239151893178374"
    },
    {
      "name": "bootstrap_v3_catalog",
      "args": "",
      "defaults": null,
      "result": "boolean",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "6942747c342aa78272fae0d0da033974984363a6aefd526cf5d4166c09bbe541"
    },
    {
      "name": "bootstrap_v3_check",
      "args": "op uuid, through_phase text",
      "defaults": null,
      "result": "jsonb",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "068a39f83c2d4b281df19f49ee92305795b4fb36845d7b5cd3f9c9781651d3bb"
    },
    {
      "name": "bootstrap_v3_commit_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "c16618cf6f1c9256803b9924784ddd9b4313eaaa91fa5edc6cd6b002431da050"
    },
    {
      "name": "bootstrap_v3_epoch_observe",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "d11ed05076b355a89b6853d325d865cf72331848f75f7f56fc036c36e33bdd66"
    },
    {
      "name": "bootstrap_v3_event_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "7301228572d6a908e4f8662f708358f4f203bb4178e5d89c0ff821c1706a4692"
    },
    {
      "name": "bootstrap_v3_evidence",
      "args": "op uuid, through_phase text, observed_frame jsonb",
      "defaults": null,
      "result": "jsonb",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "97e9dd2008996d6bcf7efbc275c15f4ea711d6d13788a4a1ccac17fcb1140397"
    },
    {
      "name": "bootstrap_v3_expected",
      "args": "op uuid, slot text",
      "defaults": null,
      "result": "jsonb",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "c42a0e3742e0d4eec5bcd4f8073e003e32332bef3bca323dfbb3a9b0f1eba10c"
    },
    {
      "name": "bootstrap_v3_foreign_observe",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "8c8fc6afad838ac042cfd647b6fe4785fac004603b8f90c5ba229e8b6dcab5f7"
    },
    {
      "name": "bootstrap_v3_guard",
      "args": "tbl text, action text, new_row jsonb, old_row jsonb",
      "defaults": null,
      "result": "jsonb",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "aad5b333af49d8cf97c7cddef463b7d25545b061d167292a2b7002705bc07f9a"
    },
    {
      "name": "bootstrap_v3_id",
      "args": "op uuid, slot text",
      "defaults": null,
      "result": "uuid",
      "language": "plpgsql",
      "volatility": "i",
      "hash": "7081b7342ec24c253ec91220e9dfeda623a57450ccc48bc964ca8a51bd95e8d8"
    },
    {
      "name": "bootstrap_v3_immutable",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "12492f6f70260bbe3477a1d3492625d760a552a6d052e8983b0edde2011a50af"
    },
    {
      "name": "bootstrap_v3_insert",
      "args": "op uuid, slot text",
      "defaults": null,
      "result": "void",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "3048b2c8677aa1bd1b5dfb14fec1d48d2987a976e7a3ac4a676822b193d546ed"
    },
    {
      "name": "bootstrap_v3_interval_receipts",
      "args": "lo bigint, hi bigint",
      "defaults": null,
      "result": "jsonb",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "f933102b070c1c4d8ee25387f7071ebb9981fc82eda4730b6d81db69cab02b62"
    },
    {
      "name": "bootstrap_v3_inventory",
      "args": "p jsonb",
      "defaults": null,
      "result": "jsonb",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "7464e761f74aedb9629944b5e26dda3b887ae442079c218a69424edfab82138c"
    },
    {
      "name": "bootstrap_v3_lineage",
      "args": "ev jsonb",
      "defaults": null,
      "result": "text",
      "language": "plpgsql",
      "volatility": "i",
      "hash": "3fe7c774b6f7e2adf9d5860381ad4d049f3b707a2583cd4140a8b7aae0d8441e"
    },
    {
      "name": "bootstrap_v3_mode",
      "args": "write_mode boolean",
      "defaults": null,
      "result": "bigint",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "42171c25c8bb4c036f67dd6ed1a7b887bf3dc272af042c28a19b7cc2fddd3b93"
    },
    {
      "name": "bootstrap_v3_native_digest",
      "args": "v jsonb",
      "defaults": null,
      "result": "text",
      "language": "plpgsql",
      "volatility": "i",
      "hash": "522a0a66f41d3a53fca09945504d7a3ec15798133f2d924f7dfee98e7c089fde"
    },
    {
      "name": "bootstrap_v3_native_receipt",
      "args": "r bootstrap_v3_receipts",
      "defaults": null,
      "result": "jsonb",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "8722e60ea35e1b63bb0c9c50ea80d672a0c6780331af0df15bfde85b9b824c30"
    },
    {
      "name": "bootstrap_v3_next",
      "args": "op uuid",
      "defaults": null,
      "result": "jsonb",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "5f5a3dd8f1f210abc9eb17986e4b0753d10cf05bee94921cc6e172b62c14b2da"
    },
    {
      "name": "bootstrap_v3_operation_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "eeaf75ba4ed60f9b6935922fd7717b4acc8e1c9cb024c87241c7b7050423c3d1"
    },
    {
      "name": "bootstrap_v3_own_audit",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "37d1b603e8302d217c51d709e0421d11add89c0b3948592d20b86dc990d1d6c8"
    },
    {
      "name": "bootstrap_v3_own_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "7662ef5cb49e43f107504511bf08d56ae59331ec348590fbdc3eb0e7d7a9153b"
    },
    {
      "name": "bootstrap_v3_phase_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "f1741d5c984e944c8d627d7b44b58dfaaf97832c250a760d9959ff4fafaeb53a"
    },
    {
      "name": "bootstrap_v3_read",
      "args": "op uuid, through_phase text",
      "defaults": null,
      "result": "jsonb",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "f2617fb5bc15bcb4a144eceea5dd786331177eae90c058ca82858e13d1483224"
    },
    {
      "name": "bootstrap_v3_recipe",
      "args": "p jsonb, heads jsonb",
      "defaults": null,
      "result": "jsonb",
      "language": "plpgsql",
      "volatility": "i",
      "hash": "7b85100c4a1c6555368cada57c5fa9d81aece861c04feadc6e380e121a7ee1ce"
    },
    {
      "name": "bootstrap_v3_root",
      "args": "op uuid, slot text",
      "defaults": null,
      "result": "text",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "2c18315482c2914177fc6a750397d76bddfde5e27197c28d3d77e110aaad86ef"
    },
    {
      "name": "bootstrap_v3_table",
      "args": "role text",
      "defaults": null,
      "result": "text",
      "language": "plpgsql",
      "volatility": "i",
      "hash": "f7cf3db4c160c7f61b31f0ee8d04aea1ec4bcabefa7af5dff7394fd941b9827e"
    },
    {
      "name": "bootstrap_v3_wire",
      "args": "v jsonb, node_id integer, depth integer",
      "defaults": null,
      "result": "boolean",
      "language": "plpgsql",
      "volatility": "i",
      "hash": "c63890f24c327ca92f46bf55a3ce9eb3cf8e2dc76de20413016eb5ed5a43945c"
    },
    {
      "name": "bootstrap_v3_wire_schema",
      "args": "",
      "defaults": null,
      "result": "jsonb",
      "language": "sql",
      "volatility": "i",
      "hash": "a4d7aba4ccee1f6d3ae60586c27cfe0178906d16fc84ac4ffd8472a81746c8c0"
    },
    {
      "name": "bootstrap_v3_write",
      "args": "p jsonb, requested_phase text",
      "defaults": null,
      "result": "jsonb",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "249310ccfe3dfee912231e004daea3e837cc7a4e900221bc8d6b37f9013f67ef"
    },
    {
      "name": "decision_acceptance_authority_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "730ccffe2dca6553e7ebe1eda8f68e214d66001d5e19539e4625487a1dc04045"
    },
    {
      "name": "decision_acceptance_effects",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "8b7446b44338d47f7bccbb5d8b81ff4ab67da2a1b0d5eb8a83a736928599c3ed"
    },
    {
      "name": "decision_attention_history_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "cb0266bd1ccf52df016fdfcd14d671d926c9cfc0ef752c1ecb94b7792dbd1950"
    },
    {
      "name": "decision_attestation_attempt_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "ef2f6cd1d2dc5569bf6c50a059ea6fb5dd6bf5086dc0e932e6d478730e2f92f4"
    },
    {
      "name": "decision_attestation_audit",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "c921b73f4474eb2e91dafc73d846bb83b51aefb722f10eafbe8f29f43bbf23f2"
    },
    {
      "name": "decision_attestation_child_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "6269e0d1d6fb897d05b89cf77d6feee470e9ad62bd11982e58263342cc31ee23"
    },
    {
      "name": "decision_attestation_commit_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "68221dd2a44f15fa08ea6771aaa2735c72c3bf29519dbed083108e293c935e87"
    },
    {
      "name": "decision_attestation_digest",
      "args": "digest_domain text, v jsonb",
      "defaults": null,
      "result": "text",
      "language": "plpgsql",
      "volatility": "i",
      "hash": "275d991dc732caf991025221a92e31151662013cb3487941cb6b7d5435499027"
    },
    {
      "name": "decision_attestation_event_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "c97c96627eba504363149524b3d97a2beb9b20d55f9bed8b628e6a827b439461"
    },
    {
      "name": "decision_attestation_immutable",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "ea3d53a259a1681551c2b4ba99bb473117e98b1e1ceab5116225a9384155d9d9"
    },
    {
      "name": "decision_attestation_key_current",
      "args": "k uuid",
      "defaults": null,
      "result": "boolean",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "65f247f46b6ee8d85acb6d713b916ce7bde9f6b2592224cffddb15cabd2986a0"
    },
    {
      "name": "decision_attestation_lineage",
      "args": "ticket uuid, through_fence bigint",
      "defaults": null,
      "result": "boolean",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "01276244ab6282efb7cda6c8dca7d082a397a9bcbe81fc0b33e01aca28058321"
    },
    {
      "name": "decision_attestation_lock",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "3f26ed4475664c3d002557efea8b2a5ae190b6bdeea4fd9f46e296a4e96ba281"
    },
    {
      "name": "decision_attestation_owner",
      "args": "d uuid, a uuid",
      "defaults": null,
      "result": "boolean",
      "language": "plpgsql",
      "volatility": "s",
      "hash": "64fa386f9b487018daabf4b45ffd243f0238038511612dd87b578c3c0b1bc8b6"
    },
    {
      "name": "decision_attestation_receipt_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "30f0bb78b49e66c81035e125e8ed6af9174077cd056c22461532dc10ae93428b"
    },
    {
      "name": "decision_attestation_revision",
      "args": "d uuid",
      "defaults": null,
      "result": "bigint",
      "language": "plpgsql",
      "volatility": "s",
      "hash": "1505af5767871b6e7a875baf40334654e9e10a7c29c80d0ffbe4bf90d7916b01"
    },
    {
      "name": "decision_attestation_root_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "a4cd6e824ed4ab359d83790a0ba028f2f9f6edc8b408078eb58f576f0aa17dd0"
    },
    {
      "name": "decision_attestation_seal_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "9db1737ce54c406046fd24fae57313ac9ef92888f90c8ca9021f501eb3a772a4"
    },
    {
      "name": "decision_authority_epoch",
      "args": "w uuid, snapshot jsonb",
      "defaults": null,
      "result": "text",
      "language": "sql",
      "volatility": "s",
      "hash": "74dc6a6b2d4a904a9ef2d45e0e0b9cff7f3cfa48426e6b30efce94620955af54"
    },
    {
      "name": "decision_authority_invalidate",
      "args": "w uuid",
      "defaults": null,
      "result": "void",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "87e6633ffc44b688cd5b2185e7c9335b7e9528927f774fb8f5fc77268f4b5827"
    },
    {
      "name": "decision_authority_source_changed",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "a38b042179fdbef54e473c909b6d7f2c8b997ca400595df590da790d7f3c2133"
    },
    {
      "name": "decision_authority_task_current",
      "args": "t uuid",
      "defaults": null,
      "result": "boolean",
      "language": "sql",
      "volatility": "s",
      "hash": "5b0fe714c631b149c9d0731ce2d4c02a73c15394855bafd9864e0e72334c47cd"
    },
    {
      "name": "decision_downstream",
      "args": "w uuid, roots jsonb",
      "defaults": null,
      "result": "jsonb",
      "language": "plpgsql",
      "volatility": "s",
      "hash": "58ebe45e426f7dcb32246597312c63f0c365af0f8646cbd4f8e91095077a94e6"
    },
    {
      "name": "decision_grant_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "eb6dbd5a0bd13d7def38821178f176f92e74ee8a32159e429d7763a76bc2f28d"
    },
    {
      "name": "decision_grant_receipt",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "611aa19391a772e8e2f1dcabec3e1d37590196067cd09aa4c76e214764c25957"
    },
    {
      "name": "decision_history_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "3ff434abf07cee6a586a951c0c89a829d6f77c521cf84eeddf253f363dfa78d1"
    },
    {
      "name": "decision_impact",
      "args": "w uuid, roots jsonb",
      "defaults": null,
      "result": "jsonb",
      "language": "plpgsql",
      "volatility": "s",
      "hash": "9cfbeee8d67ae2b0920b6b3e2d97942441de7afc88968fb11ce6e367fba54b59"
    },
    {
      "name": "decision_node",
      "args": "w uuid, k text, n uuid",
      "defaults": null,
      "result": "jsonb",
      "language": "plpgsql",
      "volatility": "s",
      "hash": "22d1f16c5d336c71eff4d81e455e48ff665c9c79fdfb1babfd1505270a8e078a"
    },
    {
      "name": "decision_node_table",
      "args": "k text",
      "defaults": null,
      "result": "text",
      "language": "sql",
      "volatility": "i",
      "hash": "0854114b289ccbed07cdbbc8331620a53e933dbb74e6153feeb375b5f22baf07"
    },
    {
      "name": "decision_primary_owner",
      "args": "w uuid, u uuid",
      "defaults": null,
      "result": "boolean",
      "language": "sql",
      "volatility": "s",
      "hash": "d48244aa8a383bc05652e46ed9e73cf0933da23908c68d548ad8eb6fefe420fc"
    },
    {
      "name": "decision_register_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "174ec9882376db75403f8fea4edff706f0dc15b473556881dcc434c601d40728"
    },
    {
      "name": "decision_register_receipt",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "2c74f4ede9773bcd432ac2a37501390519ac116a8c0a19a1d4ee11e88bc6ba86"
    },
    {
      "name": "decision_source_changed",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "bed305f21fd0c92c5c88f5f6d245d1086b341051d8b16c7987624e8c0e37f5e1"
    },
    {
      "name": "decision_state",
      "args": "d uuid",
      "defaults": null,
      "result": "text",
      "language": "sql",
      "volatility": "s",
      "hash": "f1f6fd20b55b8101b9f243eaccc6c17b79773abd7d63092a185924cbf963e439"
    },
    {
      "name": "decision_worker",
      "args": "w uuid, p uuid",
      "defaults": null,
      "result": "jsonb",
      "language": "sql",
      "volatility": "s",
      "hash": "9d102d2d3bd2d60ba391f9ff422f696e2e582b77245be69816bd5ec8543947c9"
    },
    {
      "name": "finding_authored",
      "args": "f uuid, k text, p uuid",
      "defaults": null,
      "result": "boolean",
      "language": "sql",
      "volatility": "s",
      "hash": "1d8304862caf7ab29e28785ecda5c3c6dfa196a0cec4e9f9705cf2e3ebfc46e7"
    },
    {
      "name": "finding_authority_current",
      "args": "w uuid, a jsonb, b jsonb, app uuid",
      "defaults": null,
      "result": "boolean",
      "language": "plpgsql",
      "volatility": "s",
      "hash": "c2698869ba9b36aa612cc56dce479481b4aa93b072b1e2137d8b091cddeb1448"
    },
    {
      "name": "finding_canonical",
      "args": "f uuid",
      "defaults": null,
      "result": "uuid",
      "language": "plpgsql",
      "volatility": "s",
      "hash": "d8aee5b629bb9ee2954976f6be6b367636069b7250844686c4ea035f4456ae0c"
    },
    {
      "name": "finding_context",
      "args": "f uuid",
      "defaults": null,
      "result": "jsonb",
      "language": "sql",
      "volatility": "s",
      "hash": "4ac6f33334ea3eb998cdbe03a62da229d5f53b522c6b71c3c240bab0be935bc0"
    },
    {
      "name": "finding_grant_scope",
      "args": "w uuid, s jsonb, u uuid, k uuid",
      "defaults": null,
      "result": "text",
      "language": "plpgsql",
      "volatility": "s",
      "hash": "6c14ab42dfa2e770c654ba3d1ab4786209d02d3686b80e88cd8854ef61feca00"
    },
    {
      "name": "finding_head",
      "args": "f uuid",
      "defaults": null,
      "result": "finding_journal",
      "language": "sql",
      "volatility": "s",
      "hash": "da1105ea96ebb94f72d7ec45ff78dece591b00c642114487efc640b5cc202051"
    },
    {
      "name": "finding_invalidate",
      "args": "w uuid",
      "defaults": null,
      "result": "void",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "48388dd7b97c35f09029b4746d42cf8b8f2840c4e862ae6e1da404aac4d661f2"
    },
    {
      "name": "finding_latest",
      "args": "f uuid",
      "defaults": null,
      "result": "finding_versions",
      "language": "sql",
      "volatility": "s",
      "hash": "357471c11c2549217022be4bd2526cae2cb87391a861cf5594f26617a4b11746"
    },
    {
      "name": "finding_principal",
      "args": "w uuid, k text, p uuid, c uuid",
      "defaults": null,
      "result": "boolean",
      "language": "sql",
      "volatility": "s",
      "hash": "b0ac46c5e66f786070c7353abbde4da3a505d8757059181d8f5a485f68d9d922"
    },
    {
      "name": "finding_reference",
      "args": "w uuid, k text, p uuid",
      "defaults": null,
      "result": "text",
      "language": "plpgsql",
      "volatility": "s",
      "hash": "dbf47f24bab5d48b0ee903b65d1e102eefc381325ef22bcca00fbf97f44458ef"
    },
    {
      "name": "finding_source_changed",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "cd02512077ea6f9a5a850bcb5b92f86040634c25dbef00a811e8a2daa2525926"
    },
    {
      "name": "finding_task_current",
      "args": "t uuid",
      "defaults": null,
      "result": "boolean",
      "language": "sql",
      "volatility": "s",
      "hash": "6ba1caae13a5f7175b2b26681b4a8bb7dfe482068c821ed3a34ad8a7066b7399"
    },
    {
      "name": "finding_verification_current",
      "args": "jid uuid",
      "defaults": null,
      "result": "boolean",
      "language": "sql",
      "volatility": "s",
      "hash": "b8b49b460f77985e60ffdacff29531965310f442b3b9adad4da18f2d60ef7aa6"
    },
    {
      "name": "interview_authority_allows",
      "args": "w uuid, u uuid, b jsonb, a jsonb",
      "defaults": null,
      "result": "boolean",
      "language": "plpgsql",
      "volatility": "s",
      "hash": "342ef33517f76978acee90a79ad1baf23bf096003c52670f9945897936b538d2"
    },
    {
      "name": "native_capability_blocked",
      "args": "w uuid, t uuid, a uuid, op text, principal uuid, credential uuid, host uuid",
      "defaults": null,
      "result": "boolean",
      "language": "sql",
      "volatility": "s",
      "hash": "70083a364b4cfd60d5e622b2c5c3cb04124fbfb2d2c8a3ed34d483c10684d5b7"
    },
    {
      "name": "native_suspension_active",
      "args": "s uuid",
      "defaults": null,
      "result": "boolean",
      "language": "sql",
      "volatility": "s",
      "hash": "b9c3b61d9895d687c035bec71172dd8a6e24710ae3e23d2915abc4d190a79944"
    },
    {
      "name": "ready_source_invalidate",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "08b7c660374067b26443b04f71868b8c52d7bfb484d6cf86a9e4c44027f28ffa"
    },
    {
      "name": "ready_source_lock",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "e0abbfb892d4ca5fffdb05596f67a4d3ac38cdb6f4ba866f42967b1612168d83"
    },
    {
      "name": "runtime_source_references",
      "args": "input jsonb",
      "defaults": null,
      "result": "jsonb",
      "language": "sql",
      "volatility": "s",
      "hash": "cf554532305986702b3650474c99be7a33c0c7dea30eb598b111d28a6a4dd964"
    },
    {
      "name": "task_admission_invalidate",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "8f04ba8ac70c801355535f6d7e279f4e96604076c5fc48bd48ad79a7acf1888b"
    },
    {
      "name": "task_admission_seal",
      "args": "t uuid, op text",
      "defaults": null,
      "result": "text",
      "language": "plpgsql",
      "volatility": "s",
      "hash": "56ae4e88d6fe1f8bbd12f9c19059a411da979d29f5a8d05e52924677c11e3b35"
    },
    {
      "name": "task_capability_base",
      "args": "g task_capability_grants",
      "defaults": null,
      "result": "text",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "ed4ff993d32a1bab2f36b9c824301326b7ccb3e518552843e03e54f0cad52495"
    },
    {
      "name": "task_capability_base_before_suspension",
      "args": "g task_capability_grants",
      "defaults": null,
      "result": "text",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "3244f2acad8dc97dd7b8b82e4221d5f6f5fc1b25573778749a8ff2a3b0a4a6c2"
    },
    {
      "name": "task_capability_status",
      "args": "g task_capability_grants",
      "defaults": null,
      "result": "text",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "d8cba2a446b966c537aacb1b8a964d53e9c1800342d6dcb13da509de0c55f97b"
    },
    {
      "name": "task_composition_refs",
      "args": "t uuid, op text, use_pin boolean",
      "defaults": "true",
      "result": "jsonb",
      "language": "plpgsql",
      "volatility": "s",
      "hash": "441fdbe701bef879590392f25a6fd17a49c0b09ef919bf75626e1c34842d0635"
    },
    {
      "name": "task_interview_decision_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "7f1afd76ee82203236531f0d939a96ebf0cf98c6ec23bf8692187e774507b4d3"
    },
    {
      "name": "task_interview_owner",
      "args": "w uuid, u uuid",
      "defaults": null,
      "result": "boolean",
      "language": "sql",
      "volatility": "s",
      "hash": "7ada0272da828ec70f20884db8b256a10c3928ae058cad0da1c28cf755135a20"
    },
    {
      "name": "task_interview_proposal_receipt",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "c2c5c323265ec9bd3845172f10d65ff3a713ab83d3b2623838d3fa366be0fa28"
    },
    {
      "name": "task_interview_status",
      "args": "c uuid",
      "defaults": null,
      "result": "text",
      "language": "sql",
      "volatility": "s",
      "hash": "c13fae41c68f4f7f855220248c0b7be5c1f39e9d8617033be31133affb95f2a1"
    },
    {
      "name": "task_risk_current",
      "args": "target uuid",
      "defaults": null,
      "result": "uuid",
      "language": "sql",
      "volatility": "s",
      "hash": "a2e7bfe41a9b0972a0c0f9fc5c0d50aab7b5d324a1c60f52c77d9def02e3515c"
    },
    {
      "name": "task_risk_invalidate",
      "args": "workspace uuid",
      "defaults": null,
      "result": "void",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "d375fea26dd68d3983fa8e59b1a77b6e7613dc2a75075896450d7984f8c382a9"
    },
    {
      "name": "task_risk_source_changed",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "c748e66fc1cb5eb24a24021247b1e38170ec4bd3be4c469ae7464a98394c57dd"
    },
    {
      "name": "task_risk_sources",
      "args": "target uuid",
      "defaults": null,
      "result": "jsonb",
      "language": "sql",
      "volatility": "s",
      "hash": "93f8b1687a0517a0ee7a98cd6d6f41cca0bdf2384afdf6af232eaa769bcda927"
    },
    {
      "name": "task_risk_version",
      "args": "target uuid",
      "defaults": null,
      "result": "text",
      "language": "sql",
      "volatility": "s",
      "hash": "909b88d56b542a99b21e778e2f9ae45ccc1f00315a3f0379f113b6c8fb8e4055"
    },
    {
      "name": "transport_authority_audit_append",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "d3596d6e64d2b84783cc1d70873db3153109194bb3d247f73fa6c099d6af18a3"
    },
    {
      "name": "transport_authority_audit_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "0af0f069680a5e127145f4b270b4b0fa19c0f2e4adc105098ac59e00ea26176b"
    },
    {
      "name": "transport_authority_commit_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "0a78fe29e909efbd803a4cc711bfcbfca3e70e8fc43bec80d740b64ef1ec7f31"
    },
    {
      "name": "transport_authority_immutable",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "117db056493e5821048c41d58e45c079488c07e5764da783e460a5ee9a0a8322"
    },
    {
      "name": "transport_authority_write_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "e107daca96f86b997f5bd17a3ac717dbd31ad7993152f8658eaa54c592c700b0"
    },
    {
      "name": "transport_bootstrap_advance",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "73aba7e3d4d0b1891e6e2eec9ba40cefee13ea7b7fcfa1f0b86f70c557f5a93d"
    },
    {
      "name": "transport_bootstrap_shape",
      "args": "s jsonb",
      "defaults": null,
      "result": "boolean",
      "language": "plpgsql",
      "volatility": "i",
      "hash": "81bbce725a37df09d6eecdae0e1d05e3107de43458c3d7a7ffa00793c70e6e94"
    },
    {
      "name": "transport_bootstrap_source_lock",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "ff72fdaba362881bdd25aa24361dbf50ebaad37afe6aeaf6170c05b2d1094abc"
    },
    {
      "name": "trusted_provider_ticket_key_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "db5ac76c0bb160e5de7394bf10839002f4aa23ac4d9527115a814cf481c429ef"
    },
    {
      "name": "worker_credential_decision_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "f522bb0432c2ee37c33b5ca8fb54d7b53aba5794ee9c613c217c8dcc06f2e23c"
    },
    {
      "name": "worker_credential_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "5713d29bd29ba9235a40474d655bdaaeb4fe3249ea02134ce30e42f1ccd31f72"
    },
    {
      "name": "worker_credential_invalidate",
      "args": "kid uuid",
      "defaults": null,
      "result": "void",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "cda04d26d464a7a8a7e295b882c7fa620e60ef8a55fcc804fb3ca0716b65259d"
    },
    {
      "name": "worker_credential_revoked_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "4830814496e856b96434d14b364ca0a19b007389acfc2f5e0043d1a78f705a28"
    },
    {
      "name": "worker_credential_scope_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "c851671bff89f03fe1b8b9a15cf27f00d9bd2e70e6ad58a725c3c43b6ad7a456"
    },
    {
      "name": "worker_handoff_ack_commit_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "7c35f31278976eba2c03eaf20534345546249f39b84be7dd47d7df02302b4a13"
    },
    {
      "name": "worker_handoff_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "601072af3e07ec0c63898ccf7c8a4825f27fc94005d73a47978c4b6decaa4321"
    },
    {
      "name": "worker_handoff_owner_current",
      "args": "h worker_credential_handoffs",
      "defaults": null,
      "result": "boolean",
      "language": "sql",
      "volatility": "s",
      "hash": "cd731c71d6f52ce95507f0ce351d7153a2867fdc82e216edeb1212f7ccd4b4f5"
    },
    {
      "name": "worker_host_credentials_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "20750ccb12821ad5fca92cde6f3a5efcfe4c5a81af296d2c5612f6bd75268d99"
    },
    {
      "name": "worker_identity_host_anchor_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "f2923857223a80e2d8a4445f24f689096c59e872941db5c858fd312b8b2675a7"
    },
    {
      "name": "worker_identity_installation_anchor_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "db6249db0a763747b03010eb4a877f9b69bd117967c93728f751d98b9d180db8"
    },
    {
      "name": "worker_identity_lifecycle_audit_append",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "1fa98c744a879f3235f33fd05c9cc52c8d3a5baf8e4f5650515296387de5533f"
    },
    {
      "name": "worker_identity_lifecycle_guard",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "feb0f558c45cd7a6365d65bc0fe4a02e2201a7cc47ba05b479e92378ab5cc186"
    },
    {
      "name": "worker_identity_lifecycle_immutable",
      "args": "",
      "defaults": null,
      "result": "trigger",
      "language": "plpgsql",
      "volatility": "v",
      "hash": "83e3f30afd20675752d27dd459d093abe21672e76ca8460ca629df82e1e44d11"
    }
  ],
  "triggers": [
    {
      "table": "agent_hosts",
      "name": "aa_decision_attestation_fence",
      "function": "decision_attestation_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "agent_hosts",
      "name": "aaa_proof_source_fence",
      "function": "bootstrap_proof_source_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "agent_hosts",
      "name": "decision_attestation_no_truncate",
      "function": "decision_attestation_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "agent_hosts",
      "name": "lifecycle_host_anchor_guard",
      "function": "worker_identity_host_anchor_guard",
      "kind": 31,
      "deferred": false
    },
    {
      "table": "agent_hosts",
      "name": "lifecycle_host_no_truncate",
      "function": "worker_identity_lifecycle_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "agent_hosts",
      "name": "proof_source_no_truncate",
      "function": "bootstrap_proof_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "agent_hosts",
      "name": "transport_bootstrap_source_fence",
      "function": "transport_bootstrap_source_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "agent_hosts",
      "name": "transport_bootstrap_source_no_truncate",
      "function": "transport_authority_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "agent_hosts",
      "name": "worker_host_credentials_guard",
      "function": "worker_host_credentials_guard",
      "kind": 19,
      "deferred": false
    },
    {
      "table": "agent_hosts",
      "name": "zz_decision_attestation_audit",
      "function": "decision_attestation_audit",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "agent_hosts",
      "name": "zzzz_bootstrap_v3_source",
      "function": "bootstrap_v3_foreign_observe",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "api_keys",
      "name": "aa_decision_attestation_fence",
      "function": "decision_attestation_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "api_keys",
      "name": "aaa_proof_source_fence",
      "function": "bootstrap_proof_source_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "api_keys",
      "name": "agent_credential_guard",
      "function": "agent_credential_guard",
      "kind": 31,
      "deferred": false
    },
    {
      "table": "api_keys",
      "name": "decision_attestation_no_truncate",
      "function": "decision_attestation_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "api_keys",
      "name": "finding_source_changed",
      "function": "finding_source_changed",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "api_keys",
      "name": "proof_source_no_truncate",
      "function": "bootstrap_proof_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "api_keys",
      "name": "transport_bootstrap_source_fence",
      "function": "transport_bootstrap_source_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "api_keys",
      "name": "transport_bootstrap_source_no_truncate",
      "function": "transport_authority_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "api_keys",
      "name": "worker_credential_guard",
      "function": "worker_credential_guard",
      "kind": 31,
      "deferred": false
    },
    {
      "table": "api_keys",
      "name": "worker_credential_revoked_guard",
      "function": "worker_credential_revoked_guard",
      "kind": 17,
      "deferred": false
    },
    {
      "table": "api_keys",
      "name": "worker_credential_scope_guard",
      "function": "worker_credential_scope_guard",
      "kind": 7,
      "deferred": false
    },
    {
      "table": "api_keys",
      "name": "zz_decision_attestation_audit",
      "function": "decision_attestation_audit",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "api_keys",
      "name": "zzzz_bootstrap_v3_source",
      "function": "bootstrap_v3_foreign_observe",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "bootstrap_issuer_history",
      "name": "aa_decision_attestation_fence",
      "function": "decision_attestation_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "bootstrap_issuer_history",
      "name": "aaa_proof_source_fence",
      "function": "bootstrap_proof_source_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "bootstrap_issuer_history",
      "name": "bootstrap_issuer_append_guard",
      "function": "bootstrap_issuer_append_guard",
      "kind": 7,
      "deferred": false
    },
    {
      "table": "bootstrap_issuer_history",
      "name": "bootstrap_issuer_audit_append",
      "function": "bootstrap_issuer_audit_append",
      "kind": 5,
      "deferred": false
    },
    {
      "table": "bootstrap_issuer_history",
      "name": "bootstrap_issuer_history_immutable",
      "function": "bootstrap_issuer_immutable",
      "kind": 58,
      "deferred": false
    },
    {
      "table": "bootstrap_issuer_history",
      "name": "decision_attestation_no_truncate",
      "function": "decision_attestation_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "bootstrap_issuer_history",
      "name": "proof_reserved_key",
      "function": "bootstrap_proof_reserved_key_guard",
      "kind": 23,
      "deferred": false
    },
    {
      "table": "bootstrap_issuer_history",
      "name": "proof_source_no_truncate",
      "function": "bootstrap_proof_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "bootstrap_issuer_history",
      "name": "transport_bootstrap_source_fence",
      "function": "transport_bootstrap_source_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "bootstrap_issuer_history",
      "name": "transport_bootstrap_source_no_truncate",
      "function": "transport_authority_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "bootstrap_issuer_history",
      "name": "zz_decision_attestation_audit",
      "function": "decision_attestation_audit",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "bootstrap_issuer_history",
      "name": "zzzz_bootstrap_v3_source",
      "function": "bootstrap_v3_foreign_observe",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "bootstrap_proof_attachments",
      "name": "proof_child_audit",
      "function": "bootstrap_proof_audit",
      "kind": 5,
      "deferred": false
    },
    {
      "table": "bootstrap_proof_attachments",
      "name": "proof_child_commit",
      "function": "bootstrap_proof_commit_guard",
      "kind": 5,
      "deferred": true
    },
    {
      "table": "bootstrap_proof_attachments",
      "name": "proof_child_guard",
      "function": "bootstrap_proof_child_guard",
      "kind": 7,
      "deferred": false
    },
    {
      "table": "bootstrap_proof_attachments",
      "name": "proof_child_immutable",
      "function": "bootstrap_proof_immutable",
      "kind": 58,
      "deferred": false
    },
    {
      "table": "bootstrap_proof_attachments",
      "name": "zzzz_bootstrap_v3_source",
      "function": "bootstrap_v3_foreign_observe",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "bootstrap_proof_key_history",
      "name": "proof_child_audit",
      "function": "bootstrap_proof_audit",
      "kind": 5,
      "deferred": false
    },
    {
      "table": "bootstrap_proof_key_history",
      "name": "proof_child_commit",
      "function": "bootstrap_proof_commit_guard",
      "kind": 5,
      "deferred": true
    },
    {
      "table": "bootstrap_proof_key_history",
      "name": "proof_child_guard",
      "function": "bootstrap_proof_child_guard",
      "kind": 7,
      "deferred": false
    },
    {
      "table": "bootstrap_proof_key_history",
      "name": "proof_child_immutable",
      "function": "bootstrap_proof_immutable",
      "kind": 58,
      "deferred": false
    },
    {
      "table": "bootstrap_proof_key_history",
      "name": "zzzz_bootstrap_v3_source",
      "function": "bootstrap_v3_foreign_observe",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "bootstrap_proof_ticket_links",
      "name": "proof_child_audit",
      "function": "bootstrap_proof_audit",
      "kind": 5,
      "deferred": false
    },
    {
      "table": "bootstrap_proof_ticket_links",
      "name": "proof_child_commit",
      "function": "bootstrap_proof_commit_guard",
      "kind": 5,
      "deferred": true
    },
    {
      "table": "bootstrap_proof_ticket_links",
      "name": "proof_child_guard",
      "function": "bootstrap_proof_child_guard",
      "kind": 7,
      "deferred": false
    },
    {
      "table": "bootstrap_proof_ticket_links",
      "name": "proof_child_immutable",
      "function": "bootstrap_proof_immutable",
      "kind": 58,
      "deferred": false
    },
    {
      "table": "bootstrap_proof_ticket_links",
      "name": "zzzz_bootstrap_v3_source",
      "function": "bootstrap_v3_foreign_observe",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "bootstrap_proof_write_receipts",
      "name": "proof_receipt_guard",
      "function": "bootstrap_proof_receipt_guard",
      "kind": 7,
      "deferred": false
    },
    {
      "table": "bootstrap_proof_write_receipts",
      "name": "proof_receipt_immutable",
      "function": "bootstrap_proof_immutable",
      "kind": 58,
      "deferred": false
    },
    {
      "table": "bootstrap_v3_catalog_manifest",
      "name": "bootstrap_v3_manifest_immutable",
      "function": "bootstrap_v3_immutable",
      "kind": 62,
      "deferred": false
    },
    {
      "table": "bootstrap_v3_commitments",
      "name": "bootstrap_v3_automatic_only",
      "function": "bootstrap_v3_immutable",
      "kind": 7,
      "deferred": false
    },
    {
      "table": "bootstrap_v3_commitments",
      "name": "bootstrap_v3_no_mutation",
      "function": "bootstrap_v3_immutable",
      "kind": 58,
      "deferred": false
    },
    {
      "table": "bootstrap_v3_epoch_claims",
      "name": "bootstrap_v3_automatic_only",
      "function": "bootstrap_v3_immutable",
      "kind": 7,
      "deferred": false
    },
    {
      "table": "bootstrap_v3_epoch_claims",
      "name": "bootstrap_v3_no_mutation",
      "function": "bootstrap_v3_immutable",
      "kind": 58,
      "deferred": false
    },
    {
      "table": "bootstrap_v3_epochs",
      "name": "bootstrap_v3_automatic_only",
      "function": "bootstrap_v3_immutable",
      "kind": 7,
      "deferred": false
    },
    {
      "table": "bootstrap_v3_epochs",
      "name": "bootstrap_v3_no_mutation",
      "function": "bootstrap_v3_immutable",
      "kind": 58,
      "deferred": false
    },
    {
      "table": "bootstrap_v3_mutations",
      "name": "bootstrap_v3_automatic_only",
      "function": "bootstrap_v3_immutable",
      "kind": 7,
      "deferred": false
    },
    {
      "table": "bootstrap_v3_mutations",
      "name": "bootstrap_v3_no_mutation",
      "function": "bootstrap_v3_immutable",
      "kind": 58,
      "deferred": false
    },
    {
      "table": "bootstrap_v3_operations",
      "name": "bootstrap_v3_commit_guard",
      "function": "bootstrap_v3_commit_guard",
      "kind": 5,
      "deferred": true
    },
    {
      "table": "bootstrap_v3_operations",
      "name": "bootstrap_v3_no_mutation",
      "function": "bootstrap_v3_immutable",
      "kind": 58,
      "deferred": false
    },
    {
      "table": "bootstrap_v3_operations",
      "name": "bootstrap_v3_operation_audit",
      "function": "bootstrap_v3_own_audit",
      "kind": 5,
      "deferred": false
    },
    {
      "table": "bootstrap_v3_operations",
      "name": "bootstrap_v3_operation_guard",
      "function": "bootstrap_v3_operation_guard",
      "kind": 7,
      "deferred": false
    },
    {
      "table": "bootstrap_v3_phases",
      "name": "bootstrap_v3_no_mutation",
      "function": "bootstrap_v3_immutable",
      "kind": 58,
      "deferred": false
    },
    {
      "table": "bootstrap_v3_phases",
      "name": "bootstrap_v3_phase_guard",
      "function": "bootstrap_v3_phase_guard",
      "kind": 7,
      "deferred": false
    },
    {
      "table": "bootstrap_v3_receipts",
      "name": "bootstrap_v3_automatic_only",
      "function": "bootstrap_v3_immutable",
      "kind": 7,
      "deferred": false
    },
    {
      "table": "bootstrap_v3_receipts",
      "name": "bootstrap_v3_no_mutation",
      "function": "bootstrap_v3_immutable",
      "kind": 58,
      "deferred": false
    },
    {
      "table": "bootstrap_v3_seal_audit",
      "name": "bootstrap_v3_no_mutation",
      "function": "bootstrap_v3_immutable",
      "kind": 58,
      "deferred": false
    },
    {
      "table": "bootstrap_v3_seal_audit",
      "name": "bootstrap_v3_own_audit",
      "function": "bootstrap_v3_own_audit",
      "kind": 5,
      "deferred": false
    },
    {
      "table": "bootstrap_v3_seal_audit",
      "name": "bootstrap_v3_own_guard",
      "function": "bootstrap_v3_own_guard",
      "kind": 7,
      "deferred": false
    },
    {
      "table": "bootstrap_v3_seals",
      "name": "bootstrap_v3_no_mutation",
      "function": "bootstrap_v3_immutable",
      "kind": 58,
      "deferred": false
    },
    {
      "table": "bootstrap_v3_seals",
      "name": "bootstrap_v3_own_audit",
      "function": "bootstrap_v3_own_audit",
      "kind": 5,
      "deferred": false
    },
    {
      "table": "bootstrap_v3_seals",
      "name": "bootstrap_v3_own_guard",
      "function": "bootstrap_v3_own_guard",
      "kind": 7,
      "deferred": false
    },
    {
      "table": "decision_acceptances",
      "name": "a_decision_acceptance_authority",
      "function": "decision_acceptance_authority_guard",
      "kind": 7,
      "deferred": false
    },
    {
      "table": "decision_acceptances",
      "name": "aa_decision_attestation_fence",
      "function": "decision_attestation_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "decision_acceptances",
      "name": "aaa_proof_source_fence",
      "function": "bootstrap_proof_source_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "decision_acceptances",
      "name": "b_decision_grant_guard",
      "function": "decision_grant_guard",
      "kind": 7,
      "deferred": false
    },
    {
      "table": "decision_acceptances",
      "name": "decision_acceptance_effects",
      "function": "decision_acceptance_effects",
      "kind": 5,
      "deferred": false
    },
    {
      "table": "decision_acceptances",
      "name": "decision_attestation_no_truncate",
      "function": "decision_attestation_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "decision_acceptances",
      "name": "decision_grant_receipt",
      "function": "decision_grant_receipt",
      "kind": 5,
      "deferred": true
    },
    {
      "table": "decision_acceptances",
      "name": "decision_history_guard",
      "function": "decision_history_guard",
      "kind": 31,
      "deferred": false
    },
    {
      "table": "decision_acceptances",
      "name": "proof_source_no_truncate",
      "function": "bootstrap_proof_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "decision_acceptances",
      "name": "transport_bootstrap_source_fence",
      "function": "transport_bootstrap_source_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "decision_acceptances",
      "name": "transport_bootstrap_source_no_truncate",
      "function": "transport_authority_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "decision_acceptances",
      "name": "zz_decision_attestation_audit",
      "function": "decision_attestation_audit",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "decision_acceptances",
      "name": "zzzz_bootstrap_v3_source",
      "function": "bootstrap_v3_foreign_observe",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "decision_attestation_key_history",
      "name": "aa_decision_attestation_fence",
      "function": "decision_attestation_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "decision_attestation_key_history",
      "name": "aaa_proof_source_fence",
      "function": "bootstrap_proof_source_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "decision_attestation_key_history",
      "name": "decision_attestation_child_guard",
      "function": "decision_attestation_child_guard",
      "kind": 31,
      "deferred": false
    },
    {
      "table": "decision_attestation_key_history",
      "name": "decision_attestation_no_truncate",
      "function": "decision_attestation_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "decision_attestation_key_history",
      "name": "proof_reserved_key",
      "function": "bootstrap_proof_reserved_key_guard",
      "kind": 23,
      "deferred": false
    },
    {
      "table": "decision_attestation_key_history",
      "name": "proof_source_no_truncate",
      "function": "bootstrap_proof_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "decision_attestation_key_history",
      "name": "zz_decision_attestation_audit",
      "function": "decision_attestation_audit",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "decision_attestation_key_history",
      "name": "zzzz_bootstrap_v3_source",
      "function": "bootstrap_v3_foreign_observe",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "decision_attestation_write_receipts",
      "name": "decision_attestation_commit_guard",
      "function": "decision_attestation_commit_guard",
      "kind": 5,
      "deferred": true
    },
    {
      "table": "decision_attestation_write_receipts",
      "name": "decision_attestation_receipt_guard",
      "function": "decision_attestation_receipt_guard",
      "kind": 31,
      "deferred": false
    },
    {
      "table": "decision_attestation_write_receipts",
      "name": "decision_attestation_receipts_no_truncate",
      "function": "decision_attestation_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "decision_authority_events",
      "name": "aa_decision_attestation_fence",
      "function": "decision_attestation_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "decision_authority_events",
      "name": "decision_attestation_child_guard",
      "function": "decision_attestation_child_guard",
      "kind": 31,
      "deferred": false
    },
    {
      "table": "decision_authority_events",
      "name": "decision_attestation_no_truncate",
      "function": "decision_attestation_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "decision_authority_events",
      "name": "zz_decision_attestation_audit",
      "function": "decision_attestation_audit",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "decision_authority_events",
      "name": "zzzz_bootstrap_v3_source",
      "function": "bootstrap_v3_foreign_observe",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "decision_owner_auth_evidence",
      "name": "aa_decision_attestation_fence",
      "function": "decision_attestation_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "decision_owner_auth_evidence",
      "name": "decision_attestation_child_guard",
      "function": "decision_attestation_child_guard",
      "kind": 31,
      "deferred": false
    },
    {
      "table": "decision_owner_auth_evidence",
      "name": "decision_attestation_no_truncate",
      "function": "decision_attestation_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "decision_owner_auth_evidence",
      "name": "zz_decision_attestation_audit",
      "function": "decision_attestation_audit",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "decision_owner_auth_evidence",
      "name": "zzzz_bootstrap_v3_source",
      "function": "bootstrap_v3_foreign_observe",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "decision_revisions",
      "name": "aa_decision_attestation_fence",
      "function": "decision_attestation_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "decision_revisions",
      "name": "aaa_proof_source_fence",
      "function": "bootstrap_proof_source_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "decision_revisions",
      "name": "decision_attestation_no_truncate",
      "function": "decision_attestation_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "decision_revisions",
      "name": "decision_history_guard",
      "function": "decision_history_guard",
      "kind": 31,
      "deferred": false
    },
    {
      "table": "decision_revisions",
      "name": "proof_source_no_truncate",
      "function": "bootstrap_proof_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "decision_revisions",
      "name": "transport_bootstrap_source_fence",
      "function": "transport_bootstrap_source_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "decision_revisions",
      "name": "transport_bootstrap_source_no_truncate",
      "function": "transport_authority_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "decision_revisions",
      "name": "worker_credential_decision_guard",
      "function": "worker_credential_decision_guard",
      "kind": 7,
      "deferred": false
    },
    {
      "table": "decision_revisions",
      "name": "zz_decision_attestation_audit",
      "function": "decision_attestation_audit",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "decision_revisions",
      "name": "zzzz_bootstrap_v3_source",
      "function": "bootstrap_v3_foreign_observe",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "decisions",
      "name": "aa_decision_attestation_fence",
      "function": "decision_attestation_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "decisions",
      "name": "aaa_proof_source_fence",
      "function": "bootstrap_proof_source_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "decisions",
      "name": "decision_attestation_no_truncate",
      "function": "decision_attestation_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "decisions",
      "name": "decision_attestation_root_guard",
      "function": "decision_attestation_root_guard",
      "kind": 31,
      "deferred": false
    },
    {
      "table": "decisions",
      "name": "decision_register_guard",
      "function": "decision_register_guard",
      "kind": 31,
      "deferred": false
    },
    {
      "table": "decisions",
      "name": "decision_register_receipt",
      "function": "decision_register_receipt",
      "kind": 5,
      "deferred": true
    },
    {
      "table": "decisions",
      "name": "decision_source_changed",
      "function": "decision_source_changed",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "decisions",
      "name": "proof_source_no_truncate",
      "function": "bootstrap_proof_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "decisions",
      "name": "ready_source_changed",
      "function": "ready_source_invalidate",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "decisions",
      "name": "ready_source_fence",
      "function": "ready_source_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "decisions",
      "name": "task_interview_decision_guard",
      "function": "task_interview_decision_guard",
      "kind": 31,
      "deferred": false
    },
    {
      "table": "decisions",
      "name": "task_interview_proposal_receipt",
      "function": "task_interview_proposal_receipt",
      "kind": 5,
      "deferred": true
    },
    {
      "table": "decisions",
      "name": "task_risk_source_changed",
      "function": "task_risk_source_changed",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "decisions",
      "name": "transport_bootstrap_source_fence",
      "function": "transport_bootstrap_source_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "decisions",
      "name": "transport_bootstrap_source_no_truncate",
      "function": "transport_authority_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "decisions",
      "name": "zz_decision_attestation_audit",
      "function": "decision_attestation_audit",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "decisions",
      "name": "zzzz_bootstrap_v3_source",
      "function": "bootstrap_v3_foreign_observe",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "events",
      "name": "bootstrap_completion_event_guard",
      "function": "bootstrap_completion_event_guard",
      "kind": 31,
      "deferred": false
    },
    {
      "table": "events",
      "name": "bootstrap_dispatch_event_guard",
      "function": "bootstrap_dispatch_event_guard",
      "kind": 31,
      "deferred": false
    },
    {
      "table": "events",
      "name": "bootstrap_lifecycle_event_protect",
      "function": "bootstrap_lifecycle_event_protect",
      "kind": 27,
      "deferred": false
    },
    {
      "table": "events",
      "name": "bootstrap_lifecycle_no_truncate",
      "function": "bootstrap_lifecycle_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "events",
      "name": "bootstrap_v3_event_guard",
      "function": "bootstrap_v3_event_guard",
      "kind": 31,
      "deferred": false
    },
    {
      "table": "events",
      "name": "decision_attention_history_guard",
      "function": "decision_attention_history_guard",
      "kind": 27,
      "deferred": false
    },
    {
      "table": "events",
      "name": "decision_attestation_event_guard",
      "function": "decision_attestation_event_guard",
      "kind": 31,
      "deferred": false
    },
    {
      "table": "events",
      "name": "decision_attestation_events_no_truncate",
      "function": "decision_attestation_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "events",
      "name": "proof_event_guard",
      "function": "bootstrap_proof_event_guard",
      "kind": 31,
      "deferred": false
    },
    {
      "table": "events",
      "name": "proof_events_no_truncate",
      "function": "bootstrap_proof_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "ready_source_fence",
      "name": "bootstrap_v3_epoch_observe",
      "function": "bootstrap_v3_epoch_observe",
      "kind": 17,
      "deferred": false
    },
    {
      "table": "trusted_provider_ticket_keys",
      "name": "aa_decision_attestation_fence",
      "function": "decision_attestation_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "trusted_provider_ticket_keys",
      "name": "aaa_proof_source_fence",
      "function": "bootstrap_proof_source_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "trusted_provider_ticket_keys",
      "name": "bootstrap_issuer_key_fence",
      "function": "bootstrap_issuer_key_fence",
      "kind": 31,
      "deferred": false
    },
    {
      "table": "trusted_provider_ticket_keys",
      "name": "decision_attestation_no_truncate",
      "function": "decision_attestation_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "trusted_provider_ticket_keys",
      "name": "lifecycle_installation_anchor_guard",
      "function": "worker_identity_installation_anchor_guard",
      "kind": 31,
      "deferred": false
    },
    {
      "table": "trusted_provider_ticket_keys",
      "name": "lifecycle_installation_no_truncate",
      "function": "worker_identity_lifecycle_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "trusted_provider_ticket_keys",
      "name": "proof_reserved_key",
      "function": "bootstrap_proof_reserved_key_guard",
      "kind": 23,
      "deferred": false
    },
    {
      "table": "trusted_provider_ticket_keys",
      "name": "proof_source_no_truncate",
      "function": "bootstrap_proof_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "trusted_provider_ticket_keys",
      "name": "transport_bootstrap_source_fence",
      "function": "transport_bootstrap_source_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "trusted_provider_ticket_keys",
      "name": "transport_bootstrap_source_no_truncate",
      "function": "transport_authority_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "trusted_provider_ticket_keys",
      "name": "trusted_provider_ticket_key_guard",
      "function": "trusted_provider_ticket_key_guard",
      "kind": 27,
      "deferred": false
    },
    {
      "table": "trusted_provider_ticket_keys",
      "name": "zz_decision_attestation_audit",
      "function": "decision_attestation_audit",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "trusted_provider_ticket_keys",
      "name": "zzzz_bootstrap_v3_source",
      "function": "bootstrap_v3_foreign_observe",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_attempts",
      "name": "aa_decision_attestation_fence",
      "function": "decision_attestation_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_attempts",
      "name": "aaa_proof_source_fence",
      "function": "bootstrap_proof_source_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_attempts",
      "name": "bootstrap_lifecycle_commit_guard",
      "function": "bootstrap_lifecycle_commit_guard",
      "kind": 21,
      "deferred": true
    },
    {
      "table": "worker_bootstrap_attempts",
      "name": "bootstrap_lifecycle_no_truncate",
      "function": "bootstrap_lifecycle_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_attempts",
      "name": "bootstrap_lifecycle_write_guard",
      "function": "bootstrap_lifecycle_write_guard",
      "kind": 31,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_attempts",
      "name": "decision_attestation_no_truncate",
      "function": "decision_attestation_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_attempts",
      "name": "decision_attestation_seal_guard",
      "function": "decision_attestation_seal_guard",
      "kind": 31,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_attempts",
      "name": "proof_source_no_truncate",
      "function": "bootstrap_proof_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_attempts",
      "name": "z_bootstrap_lifecycle_audit",
      "function": "bootstrap_lifecycle_audit",
      "kind": 21,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_attempts",
      "name": "zz_decision_attestation_audit",
      "function": "decision_attestation_audit",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_attempts",
      "name": "zzzz_bootstrap_v3_source",
      "function": "bootstrap_v3_foreign_observe",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_audit",
      "name": "aa_decision_attestation_fence",
      "function": "decision_attestation_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_audit",
      "name": "bootstrap_lifecycle_no_truncate",
      "function": "bootstrap_lifecycle_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_audit",
      "name": "bootstrap_lifecycle_write_guard",
      "function": "bootstrap_lifecycle_write_guard",
      "kind": 31,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_audit",
      "name": "decision_attestation_no_truncate",
      "function": "decision_attestation_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_audit",
      "name": "z_bootstrap_lifecycle_audit",
      "function": "bootstrap_lifecycle_audit",
      "kind": 21,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_audit",
      "name": "zz_decision_attestation_audit",
      "function": "decision_attestation_audit",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_audit",
      "name": "zzzz_bootstrap_v3_source",
      "function": "bootstrap_v3_foreign_observe",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_completions",
      "name": "aaa_proof_source_fence",
      "function": "bootstrap_proof_source_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_completions",
      "name": "bootstrap_completion_audit",
      "function": "bootstrap_completion_audit",
      "kind": 5,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_completions",
      "name": "bootstrap_completion_commit_guard",
      "function": "bootstrap_completion_commit_guard",
      "kind": 5,
      "deferred": true
    },
    {
      "table": "worker_bootstrap_completions",
      "name": "bootstrap_completion_guard",
      "function": "bootstrap_completion_guard",
      "kind": 31,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_completions",
      "name": "bootstrap_completion_no_truncate",
      "function": "bootstrap_completion_no_mutation",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_completions",
      "name": "proof_source_no_truncate",
      "function": "bootstrap_proof_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_completions",
      "name": "zzzz_bootstrap_v3_source",
      "function": "bootstrap_v3_foreign_observe",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_dispatch_history",
      "name": "aaa_proof_source_fence",
      "function": "bootstrap_proof_source_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_dispatch_history",
      "name": "bootstrap_dispatch_audit",
      "function": "bootstrap_dispatch_audit",
      "kind": 5,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_dispatch_history",
      "name": "bootstrap_dispatch_commit_guard",
      "function": "bootstrap_dispatch_commit_guard",
      "kind": 5,
      "deferred": true
    },
    {
      "table": "worker_bootstrap_dispatch_history",
      "name": "bootstrap_dispatch_guard",
      "function": "bootstrap_dispatch_guard",
      "kind": 31,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_dispatch_history",
      "name": "bootstrap_dispatch_lock",
      "function": "bootstrap_dispatch_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_dispatch_history",
      "name": "bootstrap_dispatch_no_truncate",
      "function": "decision_attestation_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_dispatch_history",
      "name": "proof_source_no_truncate",
      "function": "bootstrap_proof_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_dispatch_history",
      "name": "zzzz_bootstrap_v3_source",
      "function": "bootstrap_v3_foreign_observe",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_heads",
      "name": "aa_decision_attestation_fence",
      "function": "decision_attestation_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_heads",
      "name": "aaa_proof_source_fence",
      "function": "bootstrap_proof_source_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_heads",
      "name": "bootstrap_lifecycle_commit_guard",
      "function": "bootstrap_lifecycle_commit_guard",
      "kind": 21,
      "deferred": true
    },
    {
      "table": "worker_bootstrap_heads",
      "name": "bootstrap_lifecycle_no_truncate",
      "function": "bootstrap_lifecycle_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_heads",
      "name": "bootstrap_lifecycle_write_guard",
      "function": "bootstrap_lifecycle_write_guard",
      "kind": 31,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_heads",
      "name": "decision_attestation_no_truncate",
      "function": "decision_attestation_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_heads",
      "name": "proof_source_no_truncate",
      "function": "bootstrap_proof_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_heads",
      "name": "z_bootstrap_lifecycle_audit",
      "function": "bootstrap_lifecycle_audit",
      "kind": 21,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_heads",
      "name": "zz_decision_attestation_audit",
      "function": "decision_attestation_audit",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_heads",
      "name": "zzzz_bootstrap_v3_source",
      "function": "bootstrap_v3_foreign_observe",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_history",
      "name": "aa_decision_attestation_fence",
      "function": "decision_attestation_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_history",
      "name": "aaa_proof_source_fence",
      "function": "bootstrap_proof_source_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_history",
      "name": "bootstrap_lifecycle_commit_guard",
      "function": "bootstrap_lifecycle_commit_guard",
      "kind": 21,
      "deferred": true
    },
    {
      "table": "worker_bootstrap_history",
      "name": "bootstrap_lifecycle_no_truncate",
      "function": "bootstrap_lifecycle_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_history",
      "name": "bootstrap_lifecycle_write_guard",
      "function": "bootstrap_lifecycle_write_guard",
      "kind": 31,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_history",
      "name": "decision_attestation_attempt_guard",
      "function": "decision_attestation_attempt_guard",
      "kind": 31,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_history",
      "name": "decision_attestation_no_truncate",
      "function": "decision_attestation_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_history",
      "name": "proof_source_no_truncate",
      "function": "bootstrap_proof_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_history",
      "name": "z_bootstrap_lifecycle_audit",
      "function": "bootstrap_lifecycle_audit",
      "kind": 21,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_history",
      "name": "zz_decision_attestation_audit",
      "function": "decision_attestation_audit",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_history",
      "name": "zzzz_bootstrap_v3_source",
      "function": "bootstrap_v3_foreign_observe",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_lifecycle_events",
      "name": "aa_decision_attestation_fence",
      "function": "decision_attestation_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_lifecycle_events",
      "name": "aaa_proof_source_fence",
      "function": "bootstrap_proof_source_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_lifecycle_events",
      "name": "bootstrap_lifecycle_commit_guard",
      "function": "bootstrap_lifecycle_commit_guard",
      "kind": 21,
      "deferred": true
    },
    {
      "table": "worker_bootstrap_lifecycle_events",
      "name": "bootstrap_lifecycle_no_truncate",
      "function": "bootstrap_lifecycle_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_lifecycle_events",
      "name": "bootstrap_lifecycle_write_guard",
      "function": "bootstrap_lifecycle_write_guard",
      "kind": 31,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_lifecycle_events",
      "name": "decision_attestation_no_truncate",
      "function": "decision_attestation_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_lifecycle_events",
      "name": "proof_source_no_truncate",
      "function": "bootstrap_proof_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_lifecycle_events",
      "name": "z_bootstrap_lifecycle_audit",
      "function": "bootstrap_lifecycle_audit",
      "kind": 21,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_lifecycle_events",
      "name": "zz_decision_attestation_audit",
      "function": "decision_attestation_audit",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_lifecycle_events",
      "name": "zzzz_bootstrap_v3_source",
      "function": "bootstrap_v3_foreign_observe",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_tickets",
      "name": "aa_decision_attestation_fence",
      "function": "decision_attestation_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_tickets",
      "name": "aaa_proof_source_fence",
      "function": "bootstrap_proof_source_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_tickets",
      "name": "bootstrap_lifecycle_commit_guard",
      "function": "bootstrap_lifecycle_commit_guard",
      "kind": 21,
      "deferred": true
    },
    {
      "table": "worker_bootstrap_tickets",
      "name": "bootstrap_lifecycle_no_truncate",
      "function": "bootstrap_lifecycle_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_tickets",
      "name": "bootstrap_lifecycle_write_guard",
      "function": "bootstrap_lifecycle_write_guard",
      "kind": 31,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_tickets",
      "name": "decision_attestation_no_truncate",
      "function": "decision_attestation_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_tickets",
      "name": "proof_source_no_truncate",
      "function": "bootstrap_proof_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_tickets",
      "name": "transport_bootstrap_source_fence",
      "function": "transport_bootstrap_source_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_tickets",
      "name": "transport_bootstrap_source_no_truncate",
      "function": "transport_authority_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_tickets",
      "name": "z_bootstrap_lifecycle_audit",
      "function": "bootstrap_lifecycle_audit",
      "kind": 21,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_tickets",
      "name": "zz_decision_attestation_audit",
      "function": "decision_attestation_audit",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_tickets",
      "name": "zzzz_bootstrap_v3_source",
      "function": "bootstrap_v3_foreign_observe",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_write_receipts",
      "name": "bootstrap_lifecycle_no_truncate",
      "function": "bootstrap_lifecycle_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "worker_bootstrap_write_receipts",
      "name": "bootstrap_lifecycle_receipt_guard",
      "function": "bootstrap_lifecycle_receipt_guard",
      "kind": 31,
      "deferred": false
    },
    {
      "table": "worker_credential_handoffs",
      "name": "aa_decision_attestation_fence",
      "function": "decision_attestation_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "worker_credential_handoffs",
      "name": "aaa_proof_source_fence",
      "function": "bootstrap_proof_source_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "worker_credential_handoffs",
      "name": "decision_attestation_no_truncate",
      "function": "decision_attestation_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "worker_credential_handoffs",
      "name": "proof_source_no_truncate",
      "function": "bootstrap_proof_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "worker_credential_handoffs",
      "name": "worker_handoff_ack_commit_guard",
      "function": "worker_handoff_ack_commit_guard",
      "kind": 21,
      "deferred": true
    },
    {
      "table": "worker_credential_handoffs",
      "name": "worker_handoff_guard",
      "function": "worker_handoff_guard",
      "kind": 31,
      "deferred": false
    },
    {
      "table": "worker_credential_handoffs",
      "name": "zz_decision_attestation_audit",
      "function": "decision_attestation_audit",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "worker_credential_handoffs",
      "name": "zzzz_bootstrap_v3_source",
      "function": "bootstrap_v3_foreign_observe",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "worker_identity_lifecycle",
      "name": "aa_decision_attestation_fence",
      "function": "decision_attestation_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "worker_identity_lifecycle",
      "name": "aaa_proof_source_fence",
      "function": "bootstrap_proof_source_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "worker_identity_lifecycle",
      "name": "decision_attestation_no_truncate",
      "function": "decision_attestation_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "worker_identity_lifecycle",
      "name": "lifecycle_append_guard",
      "function": "worker_identity_lifecycle_guard",
      "kind": 7,
      "deferred": false
    },
    {
      "table": "worker_identity_lifecycle",
      "name": "lifecycle_audit_append",
      "function": "worker_identity_lifecycle_audit_append",
      "kind": 5,
      "deferred": false
    },
    {
      "table": "worker_identity_lifecycle",
      "name": "lifecycle_history_immutable",
      "function": "worker_identity_lifecycle_immutable",
      "kind": 27,
      "deferred": false
    },
    {
      "table": "worker_identity_lifecycle",
      "name": "lifecycle_history_no_truncate",
      "function": "worker_identity_lifecycle_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "worker_identity_lifecycle",
      "name": "proof_source_no_truncate",
      "function": "bootstrap_proof_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "worker_identity_lifecycle",
      "name": "transport_bootstrap_source_fence",
      "function": "transport_bootstrap_source_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "worker_identity_lifecycle",
      "name": "transport_bootstrap_source_no_truncate",
      "function": "transport_authority_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "worker_identity_lifecycle",
      "name": "zz_decision_attestation_audit",
      "function": "decision_attestation_audit",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "worker_identity_lifecycle",
      "name": "zzzz_bootstrap_v3_source",
      "function": "bootstrap_v3_foreign_observe",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "worker_transport_audit",
      "name": "transport_authority_no_truncate",
      "function": "transport_authority_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "worker_transport_audit",
      "name": "transport_authority_write_guard",
      "function": "transport_authority_write_guard",
      "kind": 31,
      "deferred": false
    },
    {
      "table": "worker_transport_audit",
      "name": "z_transport_authority_audit",
      "function": "transport_authority_audit_append",
      "kind": 21,
      "deferred": false
    },
    {
      "table": "worker_transport_audit",
      "name": "zzzz_bootstrap_v3_source",
      "function": "bootstrap_v3_foreign_observe",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "worker_transport_bootstrap_grants",
      "name": "aa_decision_attestation_fence",
      "function": "decision_attestation_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "worker_transport_bootstrap_grants",
      "name": "decision_attestation_no_truncate",
      "function": "decision_attestation_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "worker_transport_bootstrap_grants",
      "name": "transport_authority_commit_guard",
      "function": "transport_authority_commit_guard",
      "kind": 5,
      "deferred": true
    },
    {
      "table": "worker_transport_bootstrap_grants",
      "name": "transport_authority_no_truncate",
      "function": "transport_authority_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "worker_transport_bootstrap_grants",
      "name": "transport_authority_write_guard",
      "function": "transport_authority_write_guard",
      "kind": 31,
      "deferred": false
    },
    {
      "table": "worker_transport_bootstrap_grants",
      "name": "z_transport_authority_audit",
      "function": "transport_authority_audit_append",
      "kind": 21,
      "deferred": false
    },
    {
      "table": "worker_transport_bootstrap_grants",
      "name": "zz_decision_attestation_audit",
      "function": "decision_attestation_audit",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "worker_transport_bootstrap_grants",
      "name": "zzzz_bootstrap_v3_source",
      "function": "bootstrap_v3_foreign_observe",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "worker_transport_generations",
      "name": "aa_decision_attestation_fence",
      "function": "decision_attestation_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "worker_transport_generations",
      "name": "decision_attestation_no_truncate",
      "function": "decision_attestation_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "worker_transport_generations",
      "name": "transport_authority_commit_guard",
      "function": "transport_authority_commit_guard",
      "kind": 5,
      "deferred": true
    },
    {
      "table": "worker_transport_generations",
      "name": "transport_authority_no_truncate",
      "function": "transport_authority_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "worker_transport_generations",
      "name": "transport_authority_write_guard",
      "function": "transport_authority_write_guard",
      "kind": 31,
      "deferred": false
    },
    {
      "table": "worker_transport_generations",
      "name": "z_transport_authority_audit",
      "function": "transport_authority_audit_append",
      "kind": 21,
      "deferred": false
    },
    {
      "table": "worker_transport_generations",
      "name": "zz_decision_attestation_audit",
      "function": "decision_attestation_audit",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "worker_transport_generations",
      "name": "zzzz_bootstrap_v3_source",
      "function": "bootstrap_v3_foreign_observe",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "worker_transport_heads",
      "name": "aa_decision_attestation_fence",
      "function": "decision_attestation_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "worker_transport_heads",
      "name": "decision_attestation_no_truncate",
      "function": "decision_attestation_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "worker_transport_heads",
      "name": "transport_authority_no_truncate",
      "function": "transport_authority_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "worker_transport_heads",
      "name": "transport_authority_write_guard",
      "function": "transport_authority_write_guard",
      "kind": 31,
      "deferred": false
    },
    {
      "table": "worker_transport_heads",
      "name": "z_transport_authority_audit",
      "function": "transport_authority_audit_append",
      "kind": 21,
      "deferred": false
    },
    {
      "table": "worker_transport_heads",
      "name": "zz_decision_attestation_audit",
      "function": "decision_attestation_audit",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "worker_transport_heads",
      "name": "zzzz_bootstrap_v3_source",
      "function": "bootstrap_v3_foreign_observe",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "worker_transport_history",
      "name": "a_transport_bootstrap_advance",
      "function": "transport_bootstrap_advance",
      "kind": 5,
      "deferred": false
    },
    {
      "table": "worker_transport_history",
      "name": "aa_decision_attestation_fence",
      "function": "decision_attestation_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "worker_transport_history",
      "name": "decision_attestation_no_truncate",
      "function": "decision_attestation_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "worker_transport_history",
      "name": "transport_authority_commit_guard",
      "function": "transport_authority_commit_guard",
      "kind": 5,
      "deferred": true
    },
    {
      "table": "worker_transport_history",
      "name": "transport_authority_no_truncate",
      "function": "transport_authority_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "worker_transport_history",
      "name": "transport_authority_write_guard",
      "function": "transport_authority_write_guard",
      "kind": 31,
      "deferred": false
    },
    {
      "table": "worker_transport_history",
      "name": "z_transport_authority_audit",
      "function": "transport_authority_audit_append",
      "kind": 21,
      "deferred": false
    },
    {
      "table": "worker_transport_history",
      "name": "zz_decision_attestation_audit",
      "function": "decision_attestation_audit",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "worker_transport_history",
      "name": "zzzz_bootstrap_v3_source",
      "function": "bootstrap_v3_foreign_observe",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "worker_transport_write_audit",
      "name": "transport_write_audit_guard",
      "function": "transport_authority_audit_guard",
      "kind": 31,
      "deferred": false
    },
    {
      "table": "worker_transport_write_audit",
      "name": "transport_write_audit_no_truncate",
      "function": "transport_authority_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "workspace_memberships",
      "name": "aa_decision_attestation_fence",
      "function": "decision_attestation_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "workspace_memberships",
      "name": "aaa_proof_source_fence",
      "function": "bootstrap_proof_source_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "workspace_memberships",
      "name": "decision_attestation_no_truncate",
      "function": "decision_attestation_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "workspace_memberships",
      "name": "decision_authority_fence",
      "function": "ready_source_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "workspace_memberships",
      "name": "decision_authority_source_changed",
      "function": "decision_authority_source_changed",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "workspace_memberships",
      "name": "finding_source_changed",
      "function": "finding_source_changed",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "workspace_memberships",
      "name": "proof_source_no_truncate",
      "function": "bootstrap_proof_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "workspace_memberships",
      "name": "ready_source_changed",
      "function": "ready_source_invalidate",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "workspace_memberships",
      "name": "ready_source_fence",
      "function": "ready_source_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "workspace_memberships",
      "name": "task_admission_invalidate",
      "function": "task_admission_invalidate",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "workspace_memberships",
      "name": "task_risk_source_changed",
      "function": "task_risk_source_changed",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "workspace_memberships",
      "name": "transport_bootstrap_source_fence",
      "function": "transport_bootstrap_source_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "workspace_memberships",
      "name": "transport_bootstrap_source_no_truncate",
      "function": "transport_authority_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "workspace_memberships",
      "name": "zz_decision_attestation_audit",
      "function": "decision_attestation_audit",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "workspace_memberships",
      "name": "zzzz_bootstrap_v3_source",
      "function": "bootstrap_v3_foreign_observe",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "workspaces",
      "name": "aa_decision_attestation_fence",
      "function": "decision_attestation_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "workspaces",
      "name": "aaa_proof_source_fence",
      "function": "bootstrap_proof_source_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "workspaces",
      "name": "decision_attestation_no_truncate",
      "function": "decision_attestation_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "workspaces",
      "name": "decision_authority_fence",
      "function": "ready_source_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "workspaces",
      "name": "decision_authority_source_changed",
      "function": "decision_authority_source_changed",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "workspaces",
      "name": "finding_source_changed",
      "function": "finding_source_changed",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "workspaces",
      "name": "proof_source_no_truncate",
      "function": "bootstrap_proof_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "workspaces",
      "name": "transport_bootstrap_source_fence",
      "function": "transport_bootstrap_source_lock",
      "kind": 30,
      "deferred": false
    },
    {
      "table": "workspaces",
      "name": "transport_bootstrap_source_no_truncate",
      "function": "transport_authority_immutable",
      "kind": 34,
      "deferred": false
    },
    {
      "table": "workspaces",
      "name": "zz_decision_attestation_audit",
      "function": "decision_attestation_audit",
      "kind": 29,
      "deferred": false
    },
    {
      "table": "workspaces",
      "name": "zzzz_bootstrap_v3_source",
      "function": "bootstrap_v3_foreign_observe",
      "kind": 29,
      "deferred": false
    }
  ],
  "columns": [
    {
      "table": "bootstrap_v3_operations",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "workspace_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "attachment_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "writer_xid",
          "type": "text",
          "generated": ""
        },
        {
          "name": "plan",
          "type": "jsonb",
          "generated": ""
        },
        {
          "name": "plan_digest",
          "type": "text",
          "generated": ""
        },
        {
          "name": "anchor",
          "type": "jsonb",
          "generated": ""
        },
        {
          "name": "from_fence",
          "type": "bigint",
          "generated": ""
        }
      ]
    },
    {
      "table": "bootstrap_v3_phases",
      "columns": [
        {
          "name": "operation_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "ordinal",
          "type": "integer",
          "generated": ""
        },
        {
          "name": "phase",
          "type": "text",
          "generated": ""
        },
        {
          "name": "frame",
          "type": "jsonb",
          "generated": ""
        }
      ]
    },
    {
      "table": "bootstrap_v3_seals",
      "columns": [
        {
          "name": "attempt_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "operation_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "workspace_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "record",
          "type": "jsonb",
          "generated": ""
        }
      ]
    },
    {
      "table": "bootstrap_v3_seal_audit",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "operation_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "workspace_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "attempt_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "record",
          "type": "jsonb",
          "generated": ""
        }
      ]
    },
    {
      "table": "bootstrap_v3_mutations",
      "columns": [
        {
          "name": "sequence",
          "type": "bigint",
          "generated": ""
        },
        {
          "name": "operation_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "writer_xid",
          "type": "text",
          "generated": ""
        },
        {
          "name": "epoch",
          "type": "bigint",
          "generated": ""
        },
        {
          "name": "table_name",
          "type": "text",
          "generated": ""
        },
        {
          "name": "row_key",
          "type": "text",
          "generated": ""
        },
        {
          "name": "before_digest",
          "type": "text",
          "generated": ""
        },
        {
          "name": "after_digest",
          "type": "text",
          "generated": ""
        },
        {
          "name": "record",
          "type": "jsonb",
          "generated": ""
        }
      ]
    },
    {
      "table": "bootstrap_v3_receipts",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "operation_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "mutation_sequence",
          "type": "bigint",
          "generated": ""
        },
        {
          "name": "family",
          "type": "text",
          "generated": ""
        },
        {
          "name": "event_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "native_table",
          "type": "text",
          "generated": ""
        },
        {
          "name": "native_key",
          "type": "text",
          "generated": ""
        },
        {
          "name": "native_digest",
          "type": "text",
          "generated": ""
        },
        {
          "name": "record",
          "type": "jsonb",
          "generated": ""
        }
      ]
    },
    {
      "table": "bootstrap_v3_epoch_claims",
      "columns": [
        {
          "name": "revision",
          "type": "bigint",
          "generated": ""
        },
        {
          "name": "operation_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "writer_xid",
          "type": "text",
          "generated": ""
        },
        {
          "name": "slot",
          "type": "text",
          "generated": ""
        },
        {
          "name": "guard",
          "type": "text",
          "generated": ""
        }
      ]
    },
    {
      "table": "bootstrap_v3_epochs",
      "columns": [
        {
          "name": "revision",
          "type": "bigint",
          "generated": ""
        },
        {
          "name": "writer_xid",
          "type": "text",
          "generated": ""
        },
        {
          "name": "operation_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "slot",
          "type": "text",
          "generated": ""
        },
        {
          "name": "guard",
          "type": "text",
          "generated": ""
        },
        {
          "name": "event_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "previous_revision",
          "type": "bigint",
          "generated": ""
        }
      ]
    },
    {
      "table": "bootstrap_v3_commitments",
      "columns": [
        {
          "name": "operation_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "record",
          "type": "jsonb",
          "generated": ""
        },
        {
          "name": "receipt",
          "type": "jsonb",
          "generated": ""
        }
      ]
    },
    {
      "table": "bootstrap_v3_catalog_manifest",
      "columns": [
        {
          "name": "id",
          "type": "boolean",
          "generated": ""
        },
        {
          "name": "record",
          "type": "jsonb",
          "generated": ""
        }
      ]
    },
    {
      "table": "worker_bootstrap_tickets",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "workspace_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "host_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "owner_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "decision_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "request_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "generation",
          "type": "integer",
          "generated": ""
        },
        {
          "name": "credential_epoch",
          "type": "integer",
          "generated": ""
        },
        {
          "name": "target_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "predecessor_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "binding_digest",
          "type": "text",
          "generated": ""
        },
        {
          "name": "ticket_digest",
          "type": "text",
          "generated": ""
        },
        {
          "name": "record",
          "type": "jsonb",
          "generated": ""
        },
        {
          "name": "record_digest",
          "type": "text",
          "generated": ""
        },
        {
          "name": "expires_at",
          "type": "timestamp with time zone",
          "generated": ""
        },
        {
          "name": "lifecycle_identity",
          "type": "jsonb",
          "generated": ""
        }
      ]
    },
    {
      "table": "worker_bootstrap_attempts",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "ticket_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "workspace_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "host_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "generation",
          "type": "integer",
          "generated": ""
        },
        {
          "name": "credential_epoch",
          "type": "integer",
          "generated": ""
        },
        {
          "name": "predecessor_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "previous_generation",
          "type": "integer",
          "generated": "s"
        },
        {
          "name": "record",
          "type": "jsonb",
          "generated": ""
        },
        {
          "name": "record_digest",
          "type": "text",
          "generated": ""
        },
        {
          "name": "lifecycle_version",
          "type": "text",
          "generated": ""
        },
        {
          "name": "attestation_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "attestation_seal",
          "type": "jsonb",
          "generated": ""
        },
        {
          "name": "attestation_committed_at",
          "type": "timestamp with time zone",
          "generated": ""
        },
        {
          "name": "attestation_mutation_digest",
          "type": "text",
          "generated": ""
        }
      ]
    },
    {
      "table": "worker_bootstrap_history",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "attempt_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "revision",
          "type": "integer",
          "generated": ""
        },
        {
          "name": "state",
          "type": "text",
          "generated": ""
        },
        {
          "name": "record",
          "type": "jsonb",
          "generated": ""
        },
        {
          "name": "record_digest",
          "type": "text",
          "generated": ""
        },
        {
          "name": "previous_revision",
          "type": "integer",
          "generated": ""
        },
        {
          "name": "previous_digest",
          "type": "text",
          "generated": ""
        },
        {
          "name": "previous_state",
          "type": "text",
          "generated": ""
        }
      ]
    },
    {
      "table": "worker_bootstrap_heads",
      "columns": [
        {
          "name": "workspace_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "host_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "attempt_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "history_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "generation",
          "type": "integer",
          "generated": ""
        },
        {
          "name": "credential_epoch",
          "type": "integer",
          "generated": ""
        },
        {
          "name": "revision",
          "type": "integer",
          "generated": ""
        },
        {
          "name": "record_digest",
          "type": "text",
          "generated": ""
        },
        {
          "name": "state",
          "type": "text",
          "generated": ""
        }
      ]
    },
    {
      "table": "worker_bootstrap_audit",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "ticket_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "history_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "event_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "record_digest",
          "type": "text",
          "generated": ""
        }
      ]
    },
    {
      "table": "worker_bootstrap_lifecycle_events",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "ticket_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "revision",
          "type": "integer",
          "generated": ""
        },
        {
          "name": "previous_digest",
          "type": "text",
          "generated": ""
        },
        {
          "name": "record",
          "type": "jsonb",
          "generated": ""
        },
        {
          "name": "record_digest",
          "type": "text",
          "generated": ""
        },
        {
          "name": "attempt_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "history_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "writer_xid",
          "type": "text",
          "generated": ""
        }
      ]
    },
    {
      "table": "worker_transport_generations",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "workspace_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "host_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "installation_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "credential_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "identity",
          "type": "jsonb",
          "generated": ""
        },
        {
          "name": "identity_digest",
          "type": "text",
          "generated": ""
        },
        {
          "name": "purpose",
          "type": "text",
          "generated": ""
        }
      ]
    },
    {
      "table": "worker_transport_bootstrap_grants",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "generation_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "purpose",
          "type": "text",
          "generated": ""
        },
        {
          "name": "ticket_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "decision_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "acceptance_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "record",
          "type": "jsonb",
          "generated": ""
        },
        {
          "name": "record_digest",
          "type": "text",
          "generated": ""
        }
      ]
    },
    {
      "table": "worker_transport_history",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "workspace_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "host_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "generation_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "revision",
          "type": "integer",
          "generated": ""
        },
        {
          "name": "record_digest",
          "type": "text",
          "generated": ""
        },
        {
          "name": "previous_revision",
          "type": "integer",
          "generated": ""
        },
        {
          "name": "previous_digest",
          "type": "text",
          "generated": ""
        },
        {
          "name": "previous_high_water",
          "type": "integer",
          "generated": ""
        },
        {
          "name": "previous_state",
          "type": "text",
          "generated": ""
        },
        {
          "name": "previous_generation_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "certificate_epoch",
          "type": "integer",
          "generated": ""
        },
        {
          "name": "high_water_epoch",
          "type": "integer",
          "generated": ""
        },
        {
          "name": "state",
          "type": "text",
          "generated": ""
        },
        {
          "name": "request_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "decision_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "decision_revision",
          "type": "integer",
          "generated": ""
        },
        {
          "name": "decision_intent_digest",
          "type": "text",
          "generated": ""
        },
        {
          "name": "owner_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "current_pin",
          "type": "text",
          "generated": ""
        },
        {
          "name": "staged_pin",
          "type": "text",
          "generated": ""
        },
        {
          "name": "record",
          "type": "jsonb",
          "generated": ""
        },
        {
          "name": "signature",
          "type": "text",
          "generated": ""
        },
        {
          "name": "purpose",
          "type": "text",
          "generated": ""
        },
        {
          "name": "writer_xid",
          "type": "text",
          "generated": ""
        }
      ]
    },
    {
      "table": "worker_transport_heads",
      "columns": [
        {
          "name": "workspace_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "host_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "history_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "revision",
          "type": "integer",
          "generated": ""
        },
        {
          "name": "record_digest",
          "type": "text",
          "generated": ""
        },
        {
          "name": "certificate_epoch",
          "type": "integer",
          "generated": ""
        },
        {
          "name": "high_water_epoch",
          "type": "integer",
          "generated": ""
        },
        {
          "name": "state",
          "type": "text",
          "generated": ""
        },
        {
          "name": "purpose",
          "type": "text",
          "generated": ""
        }
      ]
    },
    {
      "table": "worker_transport_audit",
      "columns": [
        {
          "name": "history_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "event_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "record_digest",
          "type": "text",
          "generated": ""
        }
      ]
    },
    {
      "table": "decision_authority_events",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "workspace_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "decision_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "revision",
          "type": "bigint",
          "generated": ""
        },
        {
          "name": "action",
          "type": "text",
          "generated": ""
        },
        {
          "name": "source_table",
          "type": "text",
          "generated": ""
        },
        {
          "name": "source_row",
          "type": "text",
          "generated": ""
        },
        {
          "name": "source_digest",
          "type": "text",
          "generated": ""
        },
        {
          "name": "previous_digest",
          "type": "text",
          "generated": ""
        },
        {
          "name": "record_digest",
          "type": "text",
          "generated": ""
        },
        {
          "name": "fence_revision",
          "type": "bigint",
          "generated": ""
        },
        {
          "name": "writer_xid",
          "type": "text",
          "generated": ""
        },
        {
          "name": "at",
          "type": "timestamp with time zone",
          "generated": ""
        },
        {
          "name": "mutation_digest",
          "type": "text",
          "generated": ""
        }
      ]
    },
    {
      "table": "bootstrap_proof_ticket_links",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "attachment_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "ticket_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "attempt_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "workspace_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "host_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "enrollment_generation",
          "type": "integer",
          "generated": ""
        },
        {
          "name": "record",
          "type": "jsonb",
          "generated": ""
        },
        {
          "name": "record_bytes",
          "type": "bytea",
          "generated": ""
        },
        {
          "name": "record_digest",
          "type": "text",
          "generated": ""
        },
        {
          "name": "source_digest",
          "type": "text",
          "generated": ""
        },
        {
          "name": "writer_xid",
          "type": "text",
          "generated": ""
        }
      ]
    },
    {
      "table": "worker_bootstrap_write_receipts",
      "columns": [
        {
          "name": "ticket_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "table_name",
          "type": "text",
          "generated": ""
        },
        {
          "name": "row_id",
          "type": "text",
          "generated": ""
        },
        {
          "name": "writer_xid",
          "type": "text",
          "generated": ""
        },
        {
          "name": "row_digest",
          "type": "text",
          "generated": ""
        },
        {
          "name": "fence_revision",
          "type": "bigint",
          "generated": ""
        },
        {
          "name": "event_id",
          "type": "uuid",
          "generated": ""
        }
      ]
    },
    {
      "table": "decision_attestation_write_receipts",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "workspace_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "table_name",
          "type": "text",
          "generated": ""
        },
        {
          "name": "row_id",
          "type": "text",
          "generated": ""
        },
        {
          "name": "operation",
          "type": "text",
          "generated": ""
        },
        {
          "name": "row_digest",
          "type": "text",
          "generated": ""
        },
        {
          "name": "fence_revision",
          "type": "bigint",
          "generated": ""
        },
        {
          "name": "writer_xid",
          "type": "text",
          "generated": ""
        },
        {
          "name": "event_id",
          "type": "uuid",
          "generated": ""
        }
      ]
    },
    {
      "table": "worker_transport_write_audit",
      "columns": [
        {
          "name": "generation_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "table_name",
          "type": "text",
          "generated": ""
        },
        {
          "name": "row_id",
          "type": "text",
          "generated": ""
        },
        {
          "name": "writer_xid",
          "type": "text",
          "generated": ""
        },
        {
          "name": "row_digest",
          "type": "text",
          "generated": ""
        },
        {
          "name": "fence_revision",
          "type": "bigint",
          "generated": ""
        }
      ]
    },
    {
      "table": "bootstrap_proof_write_receipts",
      "columns": [
        {
          "name": "operation_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "key_operation",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "attachment_operation",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "link_operation",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "event_id",
          "type": "uuid",
          "generated": ""
        },
        {
          "name": "table_name",
          "type": "text",
          "generated": ""
        },
        {
          "name": "record_digest",
          "type": "text",
          "generated": ""
        },
        {
          "name": "source_digest",
          "type": "text",
          "generated": ""
        },
        {
          "name": "writer_xid",
          "type": "text",
          "generated": ""
        },
        {
          "name": "from_fence",
          "type": "bigint",
          "generated": ""
        },
        {
          "name": "to_fence",
          "type": "bigint",
          "generated": ""
        }
      ]
    }
  ],
  "foreignKeys": [
    {
      "table": "bootstrap_v3_operations",
      "target": "workspaces",
      "columns": [
        "workspace_id"
      ],
      "targetColumns": [
        "id"
      ]
    },
    {
      "table": "bootstrap_v3_operations",
      "target": "bootstrap_proof_attachments",
      "columns": [
        "attachment_id"
      ],
      "targetColumns": [
        "id"
      ]
    },
    {
      "table": "bootstrap_v3_phases",
      "target": "bootstrap_v3_operations",
      "columns": [
        "operation_id"
      ],
      "targetColumns": [
        "id"
      ]
    },
    {
      "table": "bootstrap_v3_seals",
      "target": "worker_bootstrap_attempts",
      "columns": [
        "attempt_id"
      ],
      "targetColumns": [
        "id"
      ]
    },
    {
      "table": "bootstrap_v3_seals",
      "target": "bootstrap_v3_operations",
      "columns": [
        "operation_id"
      ],
      "targetColumns": [
        "id"
      ]
    },
    {
      "table": "bootstrap_v3_seals",
      "target": "workspaces",
      "columns": [
        "workspace_id"
      ],
      "targetColumns": [
        "id"
      ]
    },
    {
      "table": "bootstrap_v3_seal_audit",
      "target": "bootstrap_v3_operations",
      "columns": [
        "operation_id"
      ],
      "targetColumns": [
        "id"
      ]
    },
    {
      "table": "bootstrap_v3_seal_audit",
      "target": "workspaces",
      "columns": [
        "workspace_id"
      ],
      "targetColumns": [
        "id"
      ]
    },
    {
      "table": "bootstrap_v3_seal_audit",
      "target": "bootstrap_v3_seals",
      "columns": [
        "attempt_id"
      ],
      "targetColumns": [
        "attempt_id"
      ]
    },
    {
      "table": "bootstrap_v3_mutations",
      "target": "bootstrap_v3_operations",
      "columns": [
        "operation_id"
      ],
      "targetColumns": [
        "id"
      ]
    },
    {
      "table": "bootstrap_v3_receipts",
      "target": "bootstrap_v3_operations",
      "columns": [
        "operation_id"
      ],
      "targetColumns": [
        "id"
      ]
    },
    {
      "table": "bootstrap_v3_receipts",
      "target": "bootstrap_v3_mutations",
      "columns": [
        "mutation_sequence"
      ],
      "targetColumns": [
        "sequence"
      ]
    },
    {
      "table": "bootstrap_v3_receipts",
      "target": "events",
      "columns": [
        "event_id"
      ],
      "targetColumns": [
        "id"
      ]
    },
    {
      "table": "bootstrap_v3_epoch_claims",
      "target": "bootstrap_v3_operations",
      "columns": [
        "operation_id"
      ],
      "targetColumns": [
        "id"
      ]
    },
    {
      "table": "bootstrap_v3_epochs",
      "target": "bootstrap_v3_operations",
      "columns": [
        "operation_id"
      ],
      "targetColumns": [
        "id"
      ]
    },
    {
      "table": "bootstrap_v3_epochs",
      "target": "events",
      "columns": [
        "event_id"
      ],
      "targetColumns": [
        "id"
      ]
    },
    {
      "table": "bootstrap_v3_commitments",
      "target": "bootstrap_v3_operations",
      "columns": [
        "operation_id"
      ],
      "targetColumns": [
        "id"
      ]
    }
  ],
  "exactTriggerTables": [
    "bootstrap_v3_operations",
    "bootstrap_v3_phases",
    "bootstrap_v3_seals",
    "bootstrap_v3_seal_audit",
    "bootstrap_v3_mutations",
    "bootstrap_v3_receipts",
    "bootstrap_v3_epoch_claims",
    "bootstrap_v3_epochs",
    "bootstrap_v3_commitments",
    "bootstrap_v3_catalog_manifest",
    "worker_bootstrap_tickets",
    "worker_bootstrap_attempts",
    "worker_bootstrap_history",
    "worker_bootstrap_heads",
    "worker_bootstrap_audit",
    "worker_bootstrap_lifecycle_events",
    "worker_transport_generations",
    "worker_transport_bootstrap_grants",
    "worker_transport_history",
    "worker_transport_heads",
    "worker_transport_audit",
    "decision_authority_events",
    "bootstrap_proof_ticket_links",
    "workspaces",
    "workspace_memberships",
    "decisions",
    "decision_revisions",
    "decision_acceptances",
    "decision_owner_auth_evidence",
    "worker_identity_lifecycle",
    "agent_hosts",
    "bootstrap_issuer_history",
    "decision_attestation_key_history",
    "trusted_provider_ticket_keys",
    "api_keys",
    "worker_credential_handoffs",
    "worker_bootstrap_dispatch_history",
    "worker_bootstrap_completions",
    "bootstrap_proof_key_history",
    "bootstrap_proof_attachments",
    "worker_bootstrap_write_receipts",
    "decision_attestation_write_receipts",
    "worker_transport_write_audit",
    "bootstrap_proof_write_receipts",
    "events",
    "ready_source_fence"
  ]
} as const;
