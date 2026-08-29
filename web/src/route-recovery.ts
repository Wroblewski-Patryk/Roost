const recoveryStorageKey = "roost:route-asset-recovery";

export type RouteRecoveryRuntime = {
  locationKey: string;
  readMarker: () => string | null;
  reload: () => void;
  writeMarker: (value: string) => void;
};

function errorMessage(error: unknown) {
  if (error instanceof Error) return `${error.name} ${error.message}`;
  return typeof error === "string" ? error : "";
}

export function isRouteAssetError(error: unknown) {
  return /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed|Unable to preload CSS/i.test(errorMessage(error));
}

function browserRecoveryRuntime(): RouteRecoveryRuntime {
  return {
    locationKey: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    readMarker: () => window.sessionStorage.getItem(recoveryStorageKey),
    reload: () => window.location.reload(),
    writeMarker: (value) => window.sessionStorage.setItem(recoveryStorageKey, value)
  };
}

export function recoverRouteAsset(error: unknown, runtime = browserRecoveryRuntime()) {
  if (!isRouteAssetError(error)) return false;

  try {
    if (runtime.readMarker() === runtime.locationKey) return false;
    runtime.writeMarker(runtime.locationKey);
  } catch {
    // Without a durable marker an automatic reload could loop forever.
    // Let the route boundary render its manual recovery state instead.
    return false;
  }

  runtime.reload();
  return true;
}

export function clearRouteAssetRecovery() {
  try {
    window.sessionStorage.removeItem(recoveryStorageKey);
  } catch {
    // Storage is optional; successful route rendering is the real reset.
  }
}

export function installRouteAssetRecovery() {
  function handlePreloadError(event: Event) {
    const error = (event as Event & { payload?: unknown }).payload;
    if (!isRouteAssetError(error)) return;
    if (recoverRouteAsset(error)) event.preventDefault();
  }

  window.addEventListener("vite:preloadError", handlePreloadError);
  return () => window.removeEventListener("vite:preloadError", handlePreloadError);
}
