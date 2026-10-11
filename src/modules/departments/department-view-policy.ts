// These shared views have an existing contextual adapter for a model department.
// Other views retain their canonical home until a separate route is qualified.
export const CONTEXTUAL_SHARED_VIEWS = new Set([
  "strategy.goals", "strategy.decisions", "strategy.metrics", "operations.tasks",
  "operations.procedures", "people.directory", "assets.files", "assets.resources",
  "legal.policies", "innovation.projects", "management.risks"
]);
