import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type ComponentRow = {
  name: string;
  role: string;
  nextUse: string;
  state: "Ready" | "Next";
};

const componentRows: ComponentRow[] = [
  {
    name: "App shell",
    role: "Route frame, workspace identity, and safe navigation back to the current console.",
    nextUse: "Dashboard and workbench migration",
    state: "Ready"
  },
  {
    name: "Action feedback",
    role: "Local success, error, and recovery messages near the user action.",
    nextUse: "Provider setup and CRUD forms",
    state: "Ready"
  },
  {
    name: "Data table",
    role: "Comparable operational records with clear status, owner, and next step.",
    nextUse: "Tasks, relationships, and data workbenches",
    state: "Next"
  }
];

function hasOwnerSession() {
  return Boolean(window.sessionStorage.getItem("companycoreOwnerToken"));
}

function ReactFoundationApp() {
  const signedIn = hasOwnerSession();

  return (
    <main className="min-h-screen bg-slate-50 text-company-ink">
      <header className="border-b border-company-border bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <a className="flex items-center gap-3 font-black no-underline" href="/dashboard">
            <span className="grid h-9 w-9 place-items-center rounded-company bg-slate-950 text-sm text-white">CC</span>
            <span>
              CompanyCore
              <small className="block text-xs font-black text-company-muted">React foundation</small>
            </span>
          </a>
          <nav className="flex flex-wrap gap-2" aria-label="React foundation navigation">
            <a className="btn btn-ghost btn-sm" href="/dashboard">Current dashboard</a>
            <a className="btn btn-primary btn-sm" href="/settings/integrations">Integrations</a>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-5 px-5 py-8 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-company border border-company-border bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-start gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-company border border-blue-100 bg-blue-50 text-company-blue">
              <i className="ph-bold ph-squares-four text-xl" aria-hidden="true"></i>
            </span>
            <div>
              <p className="mb-1 text-xs font-black uppercase text-company-blue">Framework path</p>
              <h1 className="text-3xl font-black leading-tight">React + Tailwind + DaisyUI foundation</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-company-muted">
                This route proves the new component stack while the current owner console stays intact.
                Future migrations can move one surface at a time into reusable app-shell, table,
                notification, and dashboard primitives.
              </p>
            </div>
          </div>

          <div className={signedIn ? "alert alert-success mb-5" : "alert alert-warning mb-5"} role="status">
            <i className={signedIn ? "ph-bold ph-check-circle text-xl" : "ph-bold ph-warning-circle text-xl"} aria-hidden="true"></i>
            <span>
              {signedIn
                ? "Owner session detected. This private-style React route can read the same browser session boundary as the current console."
                : "Owner session not detected. Sign in through the current console before using private React surfaces."}
            </span>
          </div>

          <div className="stats stats-vertical w-full border border-company-border bg-slate-50 shadow-none sm:stats-horizontal">
            <div className="stat">
              <div className="stat-title">Stack</div>
              <div className="stat-value text-xl">React</div>
              <div className="stat-desc">Vite build target</div>
            </div>
            <div className="stat">
              <div className="stat-title">UI layer</div>
              <div className="stat-value text-xl">DaisyUI</div>
              <div className="stat-desc">Tailwind primitives</div>
            </div>
            <div className="stat">
              <div className="stat-title">Migration</div>
              <div className="stat-value text-xl">Slice</div>
              <div className="stat-desc">No big rewrite</div>
            </div>
          </div>
        </div>

        <aside className="rounded-company border border-company-border bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-xl font-black">Canonical UX rules</h2>
          <ul className="steps steps-vertical">
            <li className="step step-primary">Show what matters now</li>
            <li className="step step-primary">Expose blockers locally</li>
            <li className="step">Move tables into shared components</li>
            <li className="step">Migrate routes one by one</li>
          </ul>
        </aside>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 pb-10">
        <div className="overflow-x-auto rounded-company border border-company-border bg-white shadow-sm">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>Component</th>
                <th>Role</th>
                <th>Next use</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {componentRows.map((row) => (
                <tr key={row.name}>
                  <td className="font-black">{row.name}</td>
                  <td>{row.role}</td>
                  <td>{row.nextUse}</td>
                  <td>
                    <span className={row.state === "Ready" ? "badge badge-success" : "badge badge-warning"}>
                      {row.state}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

const root = document.getElementById("root");

if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <ReactFoundationApp />
    </React.StrictMode>
  );
}
