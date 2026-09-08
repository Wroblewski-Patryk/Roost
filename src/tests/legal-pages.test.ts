import assert from "node:assert/strict";
import test from "node:test";
import { renderLegalPage } from "../config/legal-pages";

test("public policy identity defaults to the installation administrator", () => {
  assert.equal(renderLegalPage("{{OPERATOR}} / {{CONTACT}}", {}), "the workspace administrator / your workspace administrator");
});

test("configured policy identity escapes HTML and does not recursively expand tokens", () => {
  const html = renderLegalPage("{{OPERATOR}} / {{CONTACT}}", {
    ROOST_OPERATOR_NAME: '<script>{{CONTACT}}</script>',
    ROOST_OPERATOR_CONTACT_EMAIL: 'operator@example.com'
  });
  assert.equal(html, '&lt;script&gt;{{CONTACT}}&lt;/script&gt; / <a href="mailto:operator@example.com">operator@example.com</a>');
  assert.equal(renderLegalPage("{{CONTACT}}", { ROOST_OPERATOR_CONTACT_EMAIL: "javascript:bad" }), "your workspace administrator");
});
