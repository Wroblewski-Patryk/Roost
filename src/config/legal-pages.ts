function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]!));
}

/** Operator identity is configured by each installation, never shipped in Git. */
export function renderLegalPage(template: string, values: NodeJS.ProcessEnv) {
  const operator = values.ROOST_OPERATOR_NAME?.trim() || "the workspace administrator";
  const email = values.ROOST_OPERATOR_CONTACT_EMAIL?.trim();
  const contact = email && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)
    ? `<a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>`
    : "your workspace administrator";
  return template.replace(/\{\{(OPERATOR|CONTACT)\}\}/g, (_match, key: string) => key === "OPERATOR" ? escapeHtml(operator) : contact);
}
