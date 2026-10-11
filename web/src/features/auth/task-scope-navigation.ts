export function taskWorkPath(taskScopeId: string) {
  return `/task-work/${encodeURIComponent(taskScopeId)}`;
}

export function postAuthDestination(taskScopeId: string | null | undefined, ordinaryPath: string) {
  return taskScopeId ? taskWorkPath(taskScopeId) : ordinaryPath;
}
