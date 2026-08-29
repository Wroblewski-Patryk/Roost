import assert from "node:assert/strict";
import test from "node:test";

import { isRouteAssetError, recoverRouteAsset, RouteRecoveryRuntime } from "./route-recovery";

test("recognizes stale lazy-route asset failures", () => {
  assert.equal(isRouteAssetError(new TypeError("Failed to fetch dynamically imported module: /react/assets/route-old.js")), true);
  assert.equal(isRouteAssetError(new Error("Loading chunk 42 failed")), true);
  assert.equal(isRouteAssetError(new Error("Unable to preload CSS for /react/assets/route-old.css")), true);
});

test("does not reload for ordinary render failures", () => {
  assert.equal(isRouteAssetError(new Error("Cannot read properties of undefined")), false);
  assert.equal(isRouteAssetError("request_failed"), false);
});

test("reloads a stale route asset only once for the same location", () => {
  let marker: string | null = null;
  let reloads = 0;
  const runtime: RouteRecoveryRuntime = {
    locationKey: "/areas?area=04-operacje&view=procedures",
    readMarker: () => marker,
    reload: () => { reloads += 1; },
    writeMarker: (value) => { marker = value; }
  };
  const error = new TypeError("Failed to fetch dynamically imported module");

  assert.equal(recoverRouteAsset(error, runtime), true);
  assert.equal(reloads, 1);
  assert.equal(recoverRouteAsset(error, runtime), false);
  assert.equal(reloads, 1);
});
