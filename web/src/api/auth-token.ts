export function ownerToken() {
  return window.sessionStorage.getItem("companycoreOwnerToken");
}

export function setOwnerToken(token: string) {
  window.sessionStorage.setItem("companycoreOwnerToken", token);
}

export function taskScopeId() {
  return window.sessionStorage.getItem("companycoreTaskScopeId");
}

export function setTaskScopeId(taskId: string | null | undefined) {
  if (taskId) window.sessionStorage.setItem("companycoreTaskScopeId", taskId);
  else window.sessionStorage.removeItem("companycoreTaskScopeId");
}

export function taskWorkspaceHint() {
  return window.localStorage.getItem("companycoreTaskWorkspaceHint");
}

export function setTaskWorkspaceHint(workspaceId: string | null | undefined) {
  if (workspaceId) window.localStorage.setItem("companycoreTaskWorkspaceHint", workspaceId);
  else window.localStorage.removeItem("companycoreTaskWorkspaceHint");
}

export function clearOwnerToken() {
  window.sessionStorage.removeItem("companycoreOwnerToken");
  window.sessionStorage.removeItem("companycoreTaskScopeId");
}

export function isSignedIn() {
  return Boolean(ownerToken());
}
