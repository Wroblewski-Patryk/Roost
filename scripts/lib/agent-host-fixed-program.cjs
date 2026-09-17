"use strict";
// The only admitted non-model class. No executable, arguments or path on wire.
const kind = "synthetic_fixed";
const program = "roost-fixed-effect-v1";
const sourceDigest = "c0004172c3a91332e6a1986c30f126992bb1a9b9fd9fc33204683bc94e1b0c04";
const output = "ROOST-FIXED-EFFECT-V1\n";
const declaration = Object.freeze({ kind, program, sourceDigest });
function matches(value) {
  return value?.kind === kind && value.program === program && value.sourceDigest === sourceDigest;
}
function configuration(value) {
  return matches(value) && Object.keys(value).sort().join() === "kind,program,sourceDigest";
}
module.exports = Object.freeze({ kind, program, sourceDigest, output, declaration, matches, configuration });
