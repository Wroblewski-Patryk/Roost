export function ownerToken() {
  return window.sessionStorage.getItem("companycoreOwnerToken");
}

export function setOwnerToken(token: string) {
  window.sessionStorage.setItem("companycoreOwnerToken", token);
}

export function clearOwnerToken() {
  window.sessionStorage.removeItem("companycoreOwnerToken");
}

export function isSignedIn() {
  return Boolean(ownerToken());
}
