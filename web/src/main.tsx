import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type IntegrationState = {
  configured: boolean;
  active: boolean;
  oauthClientConfigured?: boolean;
  oauthTokenConfigured?: boolean;
  config?: {
    listIds?: string[];
    selectedFolderIds?: string[];
    rootFolderIds?: string[];
  };
};

type OperatingArea = {
  id: string;
  key: string;
  name: string;
  isSystem?: boolean;
  tables?: Array<{
    id: string;
    name: string;
    apiSlug: string;
    source?: string;
  }>;
};

type ConnectionData = {
  workspace: {
    id: string;
    name: string;
  };
  user?: {
    email?: string;
    name?: string;
  };
  operatingModel: {
    areas: OperatingArea[];
    systemTables: string[];
  };
  capabilities: string[];
  integrations: {
    clickup: IntegrationState;
    googleDrive: IntegrationState;
  };
};

type ConnectionResponse = {
  data: ConnectionData;
};

type DashboardState =
  | { status: "signed-out" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; connection: ConnectionData };

type AttentionItem = {
  title: string;
  detail: string;
  href: string;
  action: string;
  icon: string;
  tone: "warning" | "success" | "info";
};

type ModuleLink = {
  title: string;
  detail: string;
  href: string;
  icon: string;
};

type NoticeTone = "info" | "success" | "warning" | "error";

type TableColumn<Row> = {
  key: string;
  header: string;
  cell: (row: Row) => React.ReactNode;
  className?: string;
};

type OperatingPreviewRow = {
  id: string;
  area: string;
  ownership: string;
  tables: number;
  source: string;
  action: {
    label: string;
    href: string;
  };
};

type TaskRecord = {
  id: string;
  title: string;
  status?: string | null;
  priority?: string | null;
  dueDate?: string | null;
  source?: string | null;
  externalId?: string | null;
  taskList?: {
    id: string;
    name: string;
    externalId?: string | null;
    source?: string | null;
  } | null;
};

type TasksResponse = {
  data: TaskRecord[];
};

type TasksWorkbenchState =
  | { status: "signed-out" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; connection: ConnectionData; tasks: TaskRecord[] };

type TaskFilterState = {
  search: string;
  status: string;
  source: string;
  list: string;
};

type IntegrationWorkbenchState =
  | { status: "signed-out" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; connection: ConnectionData };

type IntegrationGroup = {
  id: string;
  title: string;
  detail: string;
  status: string;
  metric: string;
  icon: string;
  tone: "success" | "warning" | "info";
  primary: {
    label: string;
    href: string;
  };
  secondary: {
    label: string;
    href: string;
  };
};

type IntegrationAreaRow = {
  id: string;
  area: string;
  ownership: string;
  tables: number;
  sources: string;
  companycoreTables: number;
  clickupTables: number;
  action: {
    label: string;
    href: string;
  };
};

type IntegrationFilterState = {
  search: string;
  type: string;
};

const modules: ModuleLink[] = [
  {
    title: "Operating areas",
    detail: "Browse the company structure, departments, and table ownership.",
    href: "/areas",
    icon: "ph-tree-structure"
  },
  {
    title: "Relationships",
    detail: "Review provider and Drive relationships that need owner context.",
    href: "/relationships",
    icon: "ph-git-branch"
  },
  {
    title: "Tasks & adapters",
    detail: "Inspect execution records, ClickUp sync state, and task ownership.",
    href: "/react-tasks",
    icon: "ph-list-checks"
  },
  {
    title: "Integration map",
    detail: "Review provider readiness and implemented data groups.",
    href: "/react-integrations",
    icon: "ph-map-trifold"
  }
];

function ownerToken() {
  return window.sessionStorage.getItem("companycoreOwnerToken");
}

async function loadConnection(token: string): Promise<ConnectionData> {
  const response = await fetch("/v1/connection", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  const body = await response.json() as ConnectionResponse | { error?: string };

  if (!response.ok || !("data" in body)) {
    const message = "error" in body && body.error ? body.error : "connection_failed";
    throw new Error(message);
  }

  return body.data;
}

async function loadTasks(token: string): Promise<TaskRecord[]> {
  const response = await fetch("/v1/tasks", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  const body = await response.json() as TasksResponse | { error?: string };

  if (!response.ok || !("data" in body)) {
    const message = "error" in body && body.error ? body.error : "tasks_failed";
    throw new Error(message);
  }

  return body.data;
}

function useDashboardState(): [DashboardState, () => void] {
  const [reloadKey, setReloadKey] = useState(0);
  const [dashboardState, setDashboardState] = useState<DashboardState>(() => (
    ownerToken() ? { status: "loading" } : { status: "signed-out" }
  ));

  useEffect(() => {
    const token = ownerToken();
    if (!token) {
      setDashboardState({ status: "signed-out" });
      return;
    }

    let cancelled = false;
    setDashboardState({ status: "loading" });
    loadConnection(token)
      .then((connection) => {
        if (!cancelled) {
          setDashboardState({ status: "ready", connection });
        }
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setDashboardState({
            status: "error",
            message: error.message === "invalid_token"
              ? "Your session expired. Sign in again to load the company dashboard."
              : "CompanyCore could not load the owner dashboard. Try again or return to the current dashboard."
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return [dashboardState, () => setReloadKey((value) => value + 1)];
}

function useTasksWorkbenchState(): [TasksWorkbenchState, () => void] {
  const [reloadKey, setReloadKey] = useState(0);
  const [tasksState, setTasksState] = useState<TasksWorkbenchState>(() => (
    ownerToken() ? { status: "loading" } : { status: "signed-out" }
  ));

  useEffect(() => {
    const token = ownerToken();
    if (!token) {
      setTasksState({ status: "signed-out" });
      return;
    }

    let cancelled = false;
    setTasksState({ status: "loading" });
    Promise.all([
      loadConnection(token),
      loadTasks(token)
    ])
      .then(([connection, tasks]) => {
        if (!cancelled) {
          setTasksState({ status: "ready", connection, tasks });
        }
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setTasksState({
            status: "error",
            message: error.message === "invalid_token"
              ? "Your session expired. Sign in again to load the task workbench."
              : "CompanyCore could not load task records. Try again or use the current task adapter."
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return [tasksState, () => setReloadKey((value) => value + 1)];
}

function useIntegrationWorkbenchState(): [IntegrationWorkbenchState, () => void] {
  const [reloadKey, setReloadKey] = useState(0);
  const [integrationState, setIntegrationState] = useState<IntegrationWorkbenchState>(() => (
    ownerToken() ? { status: "loading" } : { status: "signed-out" }
  ));

  useEffect(() => {
    const token = ownerToken();
    if (!token) {
      setIntegrationState({ status: "signed-out" });
      return;
    }

    let cancelled = false;
    setIntegrationState({ status: "loading" });
    loadConnection(token)
      .then((connection) => {
        if (!cancelled) {
          setIntegrationState({ status: "ready", connection });
        }
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setIntegrationState({
            status: "error",
            message: error.message === "invalid_token"
              ? "Your session expired. Sign in again to load the integration map."
              : "CompanyCore could not load the integration map. Try again or use the current integration map."
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return [integrationState, () => setReloadKey((value) => value + 1)];
}

function integrationStatus(integration: IntegrationState, label: string) {
  if (integration.active) {
    return `${label} active`;
  }
  if (integration.configured) {
    return `${label} saved`;
  }
  return `${label} not connected`;
}

function connectionMetrics(connection: ConnectionData) {
  const areas = connection.operatingModel.areas.length;
  const tables = connection.operatingModel.areas.reduce((sum, area) => sum + (area.tables?.length || 0), 0);
  const selectedLists = connection.integrations.clickup.config?.listIds?.length || 0;
  const selectedDriveFolders = [
    ...(connection.integrations.googleDrive.config?.selectedFolderIds || []),
    ...(connection.integrations.googleDrive.config?.rootFolderIds || [])
  ].length;

  return { areas, tables, selectedLists, selectedDriveFolders };
}

function companyAreas(connection: ConnectionData) {
  return connection.operatingModel.areas.filter((area) => area.key !== "main-general");
}

function attentionItems(connection: ConnectionData): AttentionItem[] {
  const items: AttentionItem[] = [];

  if (!connection.integrations.clickup.configured) {
    items.push({
      title: "Connect ClickUp",
      detail: "Task Lists and ClickUp-sourced tasks need a saved connection before execution work is useful.",
      href: "/settings",
      action: "Open ClickUp",
      icon: "ph-plugs",
      tone: "warning"
    });
  }

  if (!connection.integrations.googleDrive.configured) {
    items.push({
      title: "Connect Google Drive",
      detail: "Drive folders and files can be mapped to company areas after OAuth and import.",
      href: "/settings/drive",
      action: "Open Drive",
      icon: "ph-cloud",
      tone: "warning"
    });
  }

  if (items.length === 0) {
    items.push({
      title: "Workspace foundation looks ready",
      detail: "Core provider connections are available. Continue by reviewing operating areas and table ownership.",
      href: "/areas",
      action: "Open areas",
      icon: "ph-check-circle",
      tone: "success"
    });
  }

  items.push({
    title: "React migration lane",
    detail: "This surface is now using shared React primitives, Tailwind tokens, and the CompanyCore DaisyUI theme.",
    href: "/react-dashboard",
    action: "Stay here",
    icon: "ph-squares-four",
    tone: "info"
  });

  return items.slice(0, 4);
}

function operatingPreviewRows(connection: ConnectionData): OperatingPreviewRow[] {
  return companyAreas(connection)
    .slice(0, 6)
    .map((area) => {
      const tables = area.tables || [];
      const source = [...new Set(tables.map((table) => table.source || "companycore"))].join(", ") || "companycore";
      return {
        id: area.id,
        area: area.name,
        ownership: area.key,
        tables: tables.length,
        source,
        action: {
          label: "Open area",
          href: `/areas`
        }
      };
    });
}

function normalizedTaskSource(task: TaskRecord) {
  return task.source || "companycore";
}

function normalizedTaskList(task: TaskRecord) {
  return task.taskList?.name || "No list";
}

function isOpenTask(task: TaskRecord) {
  const status = String(task.status || "todo").toLowerCase();
  return !["archived", "closed", "complete", "completed", "done"].includes(status);
}

function isDueSoon(task: TaskRecord) {
  if (!task.dueDate || !isOpenTask(task)) {
    return false;
  }

  const dueDate = new Date(task.dueDate);
  if (Number.isNaN(dueDate.getTime())) {
    return false;
  }

  const now = new Date();
  const sevenDays = 1000 * 60 * 60 * 24 * 7;
  return dueDate.getTime() <= now.getTime() + sevenDays;
}

function formatTaskDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(date);
}

function uniqueTaskOptions(tasks: TaskRecord[], getValue: (task: TaskRecord) => string) {
  return [...new Set(tasks.map(getValue).filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function taskMetrics(tasks: TaskRecord[]) {
  const openTasks = tasks.filter(isOpenTask);
  const clickUpTasks = tasks.filter((task) => normalizedTaskSource(task) === "clickup");
  const dueSoonTasks = tasks.filter(isDueSoon);
  const listCount = uniqueTaskOptions(tasks, normalizedTaskList).filter((list) => list !== "No list").length;

  return {
    total: tasks.length,
    open: openTasks.length,
    clickUp: clickUpTasks.length,
    dueSoon: dueSoonTasks.length,
    lists: listCount
  };
}

function filteredTasks(tasks: TaskRecord[], filters: TaskFilterState) {
  const query = filters.search.trim().toLowerCase();
  return tasks.filter((task) => {
    const source = normalizedTaskSource(task);
    const list = normalizedTaskList(task);
    const status = task.status || "todo";
    const haystack = [
      task.title,
      status,
      task.priority || "",
      source,
      list,
      formatTaskDate(task.dueDate)
    ].join(" ").toLowerCase();

    return (!query || haystack.includes(query))
      && (!filters.status || status === filters.status)
      && (!filters.source || source === filters.source)
      && (!filters.list || list === filters.list);
  });
}

function providerReadiness(connection: ConnectionData) {
  const clickupReady = connection.integrations.clickup.configured && connection.integrations.clickup.active;
  const driveReady = connection.integrations.googleDrive.oauthClientConfigured && connection.integrations.googleDrive.oauthTokenConfigured;

  if (clickupReady && driveReady) {
    return {
      title: "Core integrations ready",
      detail: "ClickUp and Google Drive are configured enough for operating-area review and agent-safe API inspection.",
      tone: "success" as NoticeTone,
      action: { label: "Open areas", href: "/areas" }
    };
  }

  if (!connection.integrations.clickup.configured) {
    return {
      title: "Connect ClickUp next",
      detail: "Task and workflow visibility needs a saved ClickUp connection before the integration map is complete.",
      tone: "warning" as NoticeTone,
      action: { label: "Open ClickUp setup", href: "/settings" }
    };
  }

  if (!driveReady) {
    return {
      title: "Complete Google Drive next",
      detail: "Drive folders need OAuth client and token readiness before imported files can be mapped to company areas.",
      tone: "warning" as NoticeTone,
      action: { label: "Open Drive setup", href: "/settings/drive" }
    };
  }

  return {
    title: "Review integration ownership",
    detail: "Provider setup exists. Continue by checking area coverage, API capability exposure, and relationship cleanup.",
    tone: "info" as NoticeTone,
    action: { label: "Open current map", href: "/settings/integrations" }
  };
}

function integrationGroups(connection: ConnectionData): IntegrationGroup[] {
  const metrics = connectionMetrics(connection);
  const clickup = connection.integrations.clickup;
  const drive = connection.integrations.googleDrive;
  const apiRoutes = connection.capabilities.length;
  const areas = companyAreas(connection).length;

  return [
    {
      id: "clickup",
      title: "ClickUp tasks",
      detail: "Task Lists, execution records, and provider task ownership.",
      status: integrationStatus(clickup, "ClickUp"),
      metric: `${metrics.selectedLists} selected list${metrics.selectedLists === 1 ? "" : "s"}`,
      icon: "ph-plugs-connected",
      tone: clickup.configured ? "success" : "warning",
      primary: { label: "Setup ClickUp", href: "/settings" },
      secondary: { label: "Review tasks", href: "/react-tasks" }
    },
    {
      id: "drive",
      title: "Google Drive files",
      detail: "OAuth-backed folders and files mapped into company ownership.",
      status: drive.oauthTokenConfigured ? "Drive consent ready" : drive.oauthClientConfigured ? "Drive client saved" : "Drive not connected",
      metric: `${metrics.selectedDriveFolders} selected folder${metrics.selectedDriveFolders === 1 ? "" : "s"}`,
      icon: "ph-cloud",
      tone: drive.oauthTokenConfigured ? "success" : "warning",
      primary: { label: "Setup Drive", href: "/settings/drive" },
      secondary: { label: "Review areas", href: "/areas" }
    },
    {
      id: "api",
      title: "Agent-safe API",
      detail: "Discoverable capabilities for service clients and AI-assisted workflows.",
      status: `${apiRoutes} capabilities`,
      metric: "Bearer and service-key access",
      icon: "ph-key",
      tone: "info",
      primary: { label: "API settings", href: "/settings/api" },
      secondary: { label: "Current map", href: "/settings/integrations" }
    },
    {
      id: "model",
      title: "Operating model",
      detail: "Company areas and tables that explain where records belong.",
      status: `${areas} operating areas`,
      metric: `${metrics.tables} mapped table${metrics.tables === 1 ? "" : "s"}`,
      icon: "ph-tree-structure",
      tone: "success",
      primary: { label: "Open areas", href: "/areas" },
      secondary: { label: "Relationships", href: "/relationships" }
    }
  ];
}

function integrationAreaRows(connection: ConnectionData): IntegrationAreaRow[] {
  return companyAreas(connection)
    .map((area) => {
      const tables = area.tables || [];
      const sources = [...new Set(tables.map((table) => table.source || "companycore"))];
      return {
        id: area.id,
        area: area.name,
        ownership: area.key,
        tables: tables.length,
        sources: sources.join(", ") || "companycore",
        companycoreTables: tables.filter((table) => (table.source || "companycore") === "companycore").length,
        clickupTables: tables.filter((table) => table.source === "clickup").length,
        action: {
          label: "Open area",
          href: "/areas"
        }
      };
    });
}

function filteredIntegrationAreaRows(rows: IntegrationAreaRow[], filters: IntegrationFilterState) {
  const query = filters.search.trim().toLowerCase();
  return rows.filter((row) => {
    const haystack = [
      row.area,
      row.ownership,
      row.sources,
      `${row.tables}`,
      `${row.companycoreTables}`,
      `${row.clickupTables}`
    ].join(" ").toLowerCase();
    const typeMatch = filters.type === "tables"
      ? row.tables > 0
      : filters.type === "clickup"
        ? row.clickupTables > 0
        : filters.type === "companycore"
          ? row.companycoreTables > 0
          : true;

    return (!query || haystack.includes(query)) && typeMatch;
  });
}

function Shell({
  children,
  connection,
  appLabel = "React dashboard"
}: {
  children: React.ReactNode;
  connection?: ConnectionData;
  appLabel?: string;
}) {
  return (
    <main className="min-h-screen bg-base-200 text-base-content" data-theme="companycore">
      <header className="border-b border-base-300 bg-base-100">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <a className="flex items-center gap-3 font-black no-underline" href="/dashboard">
            <span className="grid h-9 w-9 place-items-center rounded-company bg-neutral text-sm text-neutral-content">CC</span>
            <span>
              CompanyCore
              <small className="block text-xs font-black text-company-muted">
                {connection?.workspace.name || appLabel}
              </small>
            </span>
          </a>
          <nav className="flex flex-wrap gap-2" aria-label="React dashboard navigation">
            <a className="btn btn-ghost btn-sm" href="/dashboard">Current dashboard</a>
            <a className="btn btn-ghost btn-sm" href="/react-dashboard">React dashboard</a>
            <a className="btn btn-ghost btn-sm" href="/react-tasks">React tasks</a>
            <a className="btn btn-ghost btn-sm" href="/react-integrations">React integrations</a>
            <a className="btn btn-primary btn-sm" href="/areas">Operating areas</a>
          </nav>
        </div>
      </header>
      {children}
    </main>
  );
}

function StatePanel({ state, onRetry }: { state: DashboardState; onRetry: () => void }) {
  if (state.status === "ready") {
    return null;
  }

  const content = {
    "signed-out": {
      icon: "ph-sign-in",
      className: "alert alert-warning",
      title: "Owner session required",
      detail: "Sign in through the current console to load the React dashboard with live workspace data.",
      action: "Sign in",
      href: "/auth/login"
    },
    loading: {
      icon: "ph-arrows-clockwise",
      className: "alert alert-info",
      title: "Loading company signals",
      detail: "CompanyCore is reading the owner session, integration state, operating areas, and API capability map.",
      action: "",
      href: ""
    },
    error: {
      icon: "ph-warning-circle",
      className: "alert alert-error",
      title: "Dashboard could not load",
      detail: state.status === "error" ? state.message : "",
      action: "Retry",
      href: ""
    }
  }[state.status];

  return (
    <section className="mx-auto w-full max-w-7xl px-5 pt-8">
      <div className={content.className} role="status">
        <i className={`ph-bold ${content.icon} text-xl`} aria-hidden="true"></i>
        <div>
          <strong>{content.title}</strong>
          <p className="text-sm">{content.detail}</p>
        </div>
        {content.href ? (
          <a className="btn btn-sm" href={content.href}>{content.action}</a>
        ) : content.action ? (
          <button className="btn btn-sm" type="button" onClick={onRetry}>{content.action}</button>
        ) : null}
      </div>
    </section>
  );
}

function LocalNotice({
  tone,
  title,
  detail,
  action
}: {
  tone: NoticeTone;
  title: string;
  detail: string;
  action?: { label: string; href: string };
}) {
  const toneClass = {
    info: "alert-info",
    success: "alert-success",
    warning: "alert-warning",
    error: "alert-error"
  }[tone];
  const icon = {
    info: "ph-info",
    success: "ph-check-circle",
    warning: "ph-warning-circle",
    error: "ph-warning-diamond"
  }[tone];

  return (
    <div className={`alert ${toneClass} items-start`} role="status">
      <i className={`ph-bold ${icon} mt-0.5 text-xl`} aria-hidden="true"></i>
      <div>
        <strong>{title}</strong>
        <p className="text-sm leading-6">{detail}</p>
      </div>
      {action ? (
        <a className="btn btn-sm" href={action.href}>{action.label}</a>
      ) : null}
    </div>
  );
}

function DataTable<Row extends { id: string }>({
  columns,
  rows,
  emptyTitle,
  emptyDetail
}: {
  columns: Array<TableColumn<Row>>;
  rows: Row[];
  emptyTitle: string;
  emptyDetail: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-company border border-dashed border-base-300 bg-base-200/45 p-5">
        <LocalNotice
          tone="info"
          title={emptyTitle}
          detail={emptyDetail}
        />
      </div>
    );
  }

  return (
    <div className="react-table-shell overflow-x-auto rounded-company border border-base-300 bg-base-100">
      <table className="table table-zebra table-pin-rows min-w-[640px]">
        <thead>
          <tr>
            {columns.map((column) => (
              <th className={column.className} key={column.key}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => (
                <td className={column.className} key={column.key}>{column.cell(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CommandPanel({ connection }: { connection: ConnectionData }) {
  const metrics = connectionMetrics(connection);
  const missingClickUp = !connection.integrations.clickup.configured;
  const missingDrive = !connection.integrations.googleDrive.configured;
  const priorityTitle = missingClickUp
    ? "Connect ClickUp"
    : missingDrive
      ? "Connect Google Drive"
      : "Review operating map";
  const priorityDetail = missingClickUp
    ? "ClickUp is the next blocker for task and execution visibility."
    : missingDrive
      ? "Google Drive is the next blocker for file and folder ownership."
      : "Core integrations are ready. Continue by reviewing company structure and table ownership.";
  const priorityHref = missingClickUp ? "/settings" : missingDrive ? "/settings/drive" : "/areas";

  return (
    <section className="card border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body gap-5">
        <div className="flex items-start gap-3">
          <span className="dashboard-icon text-primary">
            <i className="ph-bold ph-compass" aria-hidden="true"></i>
          </span>
          <div>
            <p className="eyebrow">Operational cockpit</p>
            <h1 className="text-3xl font-black leading-tight">Dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-company-muted">
              Start here to see the current priority, what is blocked, and which company-management lane needs the next click.
            </p>
          </div>
        </div>

        <div className="rounded-company border border-primary/30 bg-primary/10 p-5">
          <p className="eyebrow">Current priority</p>
          <div className="mt-2 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="text-2xl font-black">{priorityTitle}</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-company-muted">{priorityDetail}</p>
            </div>
            <a className="btn btn-primary" href={priorityHref}>{priorityTitle}</a>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon="ph-buildings" label="Workspace" value={connection.workspace.name} detail="Owner context" />
          <MetricCard icon="ph-plugs-connected" label="ClickUp" value={integrationStatus(connection.integrations.clickup, "ClickUp")} detail={`${metrics.selectedLists} selected list${metrics.selectedLists === 1 ? "" : "s"}`} />
          <MetricCard icon="ph-cloud" label="Google Drive" value={integrationStatus(connection.integrations.googleDrive, "Drive")} detail={`${metrics.selectedDriveFolders} selected folder${metrics.selectedDriveFolders === 1 ? "" : "s"}`} />
          <MetricCard icon="ph-database" label="Data model" value={`${metrics.areas} areas`} detail={`${metrics.tables} tables, ${connection.capabilities.length} capabilities`} />
        </div>
      </div>
    </section>
  );
}

function MetricCard({ icon, label, value, detail }: { icon: string; label: string; value: string; detail: string }) {
  return (
    <article className="rounded-company border border-base-300 bg-base-200/45 p-4">
      <div className="flex items-start gap-3">
        <span className="dashboard-icon dashboard-icon-sm text-primary">
          <i className={`ph-bold ${icon}`} aria-hidden="true"></i>
        </span>
        <div className="min-w-0">
          <p className="eyebrow">{label}</p>
          <strong className="block break-words text-lg leading-tight">{value}</strong>
          <p className="mt-1 text-xs leading-5 text-company-muted">{detail}</p>
        </div>
      </div>
    </article>
  );
}

function AttentionQueue({ items }: { items: AttentionItem[] }) {
  return (
    <aside className="card border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body gap-4">
        <div className="flex items-start gap-3">
          <span className="dashboard-icon text-warning">
            <i className="ph-bold ph-warning-circle" aria-hidden="true"></i>
          </span>
          <div>
            <p className="eyebrow">Action queue</p>
            <h2 className="text-xl font-black">What needs attention</h2>
          </div>
        </div>

        <div className="grid gap-3">
          {items.map((item) => (
            <article className="rounded-company border border-base-300 bg-base-200/45 p-4" key={item.title}>
              <div className="flex items-start gap-3">
                <span className={`dashboard-icon dashboard-icon-sm ${item.tone === "success" ? "text-success" : item.tone === "info" ? "text-info" : "text-warning"}`}>
                  <i className={`ph-bold ${item.icon}`} aria-hidden="true"></i>
                </span>
                <div className="min-w-0">
                  <strong className="block leading-tight">{item.title}</strong>
                  <p className="mt-1 text-sm leading-6 text-company-muted">{item.detail}</p>
                  <a className="btn btn-ghost btn-sm mt-3" href={item.href}>{item.action}</a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </aside>
  );
}

function ModuleLauncher() {
  return (
    <section className="card border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body gap-4">
        <div>
          <p className="eyebrow">Operate</p>
          <h2 className="text-xl font-black">Company map shortcuts</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {modules.map((module) => (
            <a className="rounded-company border border-base-300 bg-base-200/45 p-4 no-underline transition hover:border-primary hover:bg-primary/5" href={module.href} key={module.title}>
              <span className="dashboard-icon dashboard-icon-sm text-primary">
                <i className={`ph-bold ${module.icon}`} aria-hidden="true"></i>
              </span>
              <strong className="mt-3 block">{module.title}</strong>
              <span className="mt-2 block text-sm leading-6 text-company-muted">{module.detail}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function WorkbenchPreview({ connection }: { connection: ConnectionData }) {
  const rows = operatingPreviewRows(connection);
  const columns: Array<TableColumn<OperatingPreviewRow>> = [
    {
      key: "area",
      header: "Operating area",
      cell: (row) => (
        <div>
          <strong className="block">{row.area}</strong>
          <span className="text-xs text-company-muted">{row.ownership}</span>
        </div>
      )
    },
    {
      key: "tables",
      header: "Tables",
      className: "text-right",
      cell: (row) => <span className="font-black">{row.tables}</span>
    },
    {
      key: "source",
      header: "Source",
      cell: (row) => <span className="badge badge-outline">{row.source}</span>
    },
    {
      key: "action",
      header: "Next action",
      cell: (row) => <a className="btn btn-ghost btn-xs" href={row.action.href}>{row.action.label}</a>
    }
  ];

  return (
    <section className="card border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body gap-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <p className="eyebrow">Workbench primitive</p>
            <h2 className="text-xl font-black">Operating model table preview</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-company-muted">
              This is the React/DaisyUI table primitive that will carry dense workbench migrations:
              clear ownership, comparable rows, local empty state, and action placement inside the table surface.
            </p>
          </div>
          <LocalNotice
            tone="success"
            title="Reusable primitive live"
            detail="This table is fed by `/v1/connection` operating-area data, not static mock rows."
          />
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          emptyTitle="No operating areas available"
          emptyDetail="CompanyCore could not find non-system operating areas in the owner connection response."
        />
      </div>
    </section>
  );
}

function MigrationTable() {
  type MigrationRow = {
    id: string;
    name: string;
    role: string;
    status: "Ready" | "Next";
  };
  const rows: MigrationRow[] = [
    { id: "command", name: "Command panel", role: "React component", status: "Ready" },
    { id: "attention", name: "Attention rows", role: "DaisyUI themed cards", status: "Ready" },
    { id: "module", name: "Module launcher", role: "Reusable shortcut grid", status: "Ready" },
    { id: "table", name: "Dense workbench table", role: "Reusable table primitive", status: "Ready" },
    { id: "notification", name: "Local notification", role: "Reusable action feedback primitive", status: "Ready" },
    { id: "workbench", name: "Workbench route migration", role: "Next migration slice", status: "Next" }
  ];
  const columns: Array<TableColumn<MigrationRow>> = [
    {
      key: "name",
      header: "Primitive",
      cell: (row) => <span className="font-black">{row.name}</span>
    },
    {
      key: "role",
      header: "Migration role",
      cell: (row) => row.role
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <span className={row.status === "Ready" ? "badge badge-success" : "badge badge-warning"}>
          {row.status}
        </span>
      )
    }
  ];

  return (
    <section className="card border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body gap-4">
        <div>
          <p className="eyebrow">Migration ledger</p>
          <h2 className="text-xl font-black">React primitive readiness</h2>
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          emptyTitle="No migration primitives"
          emptyDetail="Add at least one primitive before migrating workbench routes."
        />
      </div>
    </section>
  );
}

function TasksStatePanel({ state, onRetry }: { state: TasksWorkbenchState; onRetry: () => void }) {
  if (state.status === "ready") {
    return null;
  }

  const content = {
    "signed-out": {
      tone: "warning" as NoticeTone,
      title: "Owner session required",
      detail: "Sign in through the current console to load the React task workbench with live workspace data.",
      action: { label: "Sign in", href: "/auth/login" }
    },
    loading: {
      tone: "info" as NoticeTone,
      title: "Loading tasks",
      detail: "CompanyCore is reading the owner session, workspace context, and task records.",
      action: undefined
    },
    error: {
      tone: "error" as NoticeTone,
      title: "Task workbench could not load",
      detail: state.status === "error" ? state.message : "",
      action: undefined
    }
  }[state.status];

  return (
    <Shell appLabel="React tasks">
      <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-8">
        <LocalNotice
          tone={content.tone}
          title={content.title}
          detail={content.detail}
          action={content.action}
        />
        {state.status === "error" ? (
          <button className="btn btn-primary w-fit" type="button" onClick={onRetry}>Retry</button>
        ) : null}
      </section>
    </Shell>
  );
}

function TaskFilters({
  filters,
  onChange,
  tasks
}: {
  filters: TaskFilterState;
  onChange: (nextFilters: TaskFilterState) => void;
  tasks: TaskRecord[];
}) {
  const statusOptions = uniqueTaskOptions(tasks, (task) => task.status || "todo");
  const sourceOptions = uniqueTaskOptions(tasks, normalizedTaskSource);
  const listOptions = uniqueTaskOptions(tasks, normalizedTaskList);

  return (
    <section className="card border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body gap-4">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
          <label className="form-control">
            <span className="label">
              <span className="label-text font-bold">Search tasks</span>
            </span>
            <input
              className="input input-bordered"
              type="search"
              value={filters.search}
              onChange={(event) => onChange({ ...filters, search: event.target.value })}
              placeholder="Title, status, priority, list..."
            />
          </label>
          <label className="form-control">
            <span className="label">
              <span className="label-text font-bold">Status</span>
            </span>
            <select
              className="select select-bordered"
              value={filters.status}
              onChange={(event) => onChange({ ...filters, status: event.target.value })}
            >
              <option value="">All statuses</option>
              {statusOptions.map((status) => (
                <option value={status} key={status}>{status}</option>
              ))}
            </select>
          </label>
          <label className="form-control">
            <span className="label">
              <span className="label-text font-bold">Source</span>
            </span>
            <select
              className="select select-bordered"
              value={filters.source}
              onChange={(event) => onChange({ ...filters, source: event.target.value })}
            >
              <option value="">All sources</option>
              {sourceOptions.map((source) => (
                <option value={source} key={source}>{source}</option>
              ))}
            </select>
          </label>
          <label className="form-control">
            <span className="label">
              <span className="label-text font-bold">Task list</span>
            </span>
            <select
              className="select select-bordered"
              value={filters.list}
              onChange={(event) => onChange({ ...filters, list: event.target.value })}
            >
              <option value="">All lists</option>
              {listOptions.map((list) => (
                <option value={list} key={list}>{list}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </section>
  );
}

function TasksTable({ tasks }: { tasks: TaskRecord[] }) {
  const columns: Array<TableColumn<TaskRecord>> = [
    {
      key: "title",
      header: "Task",
      cell: (task) => (
        <div className="max-w-[22rem]">
          <strong className="block break-words">{task.title}</strong>
          <span className="text-xs text-company-muted">{task.externalId ? `External ${task.externalId}` : "CompanyCore record"}</span>
        </div>
      )
    },
    {
      key: "status",
      header: "Status",
      cell: (task) => <span className="badge badge-outline">{task.status || "todo"}</span>
    },
    {
      key: "priority",
      header: "Priority",
      cell: (task) => task.priority ? <span className="font-black">{task.priority}</span> : "-"
    },
    {
      key: "list",
      header: "List",
      cell: (task) => normalizedTaskList(task)
    },
    {
      key: "source",
      header: "Source",
      cell: (task) => (
        <span className={normalizedTaskSource(task) === "clickup" ? "badge badge-primary" : "badge badge-neutral"}>
          {normalizedTaskSource(task)}
        </span>
      )
    },
    {
      key: "due",
      header: "Due",
      cell: (task) => formatTaskDate(task.dueDate)
    }
  ];

  return (
    <DataTable
      columns={columns}
      rows={tasks}
      emptyTitle="No tasks match these filters"
      emptyDetail="Adjust the search or filters, or open the typed task editor to create a CompanyCore task."
    />
  );
}

function TasksWorkbench({ connection, tasks }: { connection: ConnectionData; tasks: TaskRecord[] }) {
  const [filters, setFilters] = useState<TaskFilterState>({
    search: "",
    status: "",
    source: "",
    list: ""
  });
  const metrics = useMemo(() => taskMetrics(tasks), [tasks]);
  const visibleTasks = useMemo(() => filteredTasks(tasks, filters), [tasks, filters]);

  return (
    <Shell connection={connection}>
      <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-8">
        <section className="card border border-base-300 bg-base-100 shadow-sm">
          <div className="card-body gap-5">
            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
              <div className="flex items-start gap-3">
                <span className="dashboard-icon text-primary">
                  <i className="ph-bold ph-list-checks" aria-hidden="true"></i>
                </span>
                <div>
                  <p className="eyebrow">React workbench</p>
                  <h1 className="text-3xl font-black leading-tight">Tasks</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-company-muted">
                    Inspect execution records, ClickUp ownership, open workload, and due-soon risk before editing the canonical task data.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <a className="btn btn-primary" href="/data/tasks">Open task editor</a>
                <a className="btn btn-ghost" href="/tasks-adapter">Current adapter</a>
              </div>
            </div>

            <LocalNotice
              tone={metrics.total === 0 ? "warning" : "success"}
              title={metrics.total === 0 ? "No task records loaded" : "Live task workbench"}
              detail={metrics.total === 0
                ? "This workspace has no task records yet. Create a task in the typed editor or connect ClickUp before reviewing workload."
                : `${visibleTasks.length} of ${metrics.total} tasks are visible after filters. ${metrics.open} are open and ${metrics.dueSoon} are due soon.`}
              action={metrics.total === 0 ? { label: "Create task", href: "/data/tasks" } : undefined}
            />

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <MetricCard icon="ph-stack" label="Total" value={`${metrics.total}`} detail="Task records" />
              <MetricCard icon="ph-circle-notch" label="Open" value={`${metrics.open}`} detail="Not complete or archived" />
              <MetricCard icon="ph-plugs-connected" label="ClickUp" value={`${metrics.clickUp}`} detail="Provider-owned tasks" />
              <MetricCard icon="ph-calendar-check" label="Due soon" value={`${metrics.dueSoon}`} detail="Open within 7 days" />
              <MetricCard icon="ph-list-bullets" label="Lists" value={`${metrics.lists}`} detail="Task list groups" />
            </div>
          </div>
        </section>

        <TaskFilters filters={filters} onChange={setFilters} tasks={tasks} />

        <section className="card border border-base-300 bg-base-100 shadow-sm">
          <div className="card-body gap-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
              <div>
                <p className="eyebrow">Execution table</p>
                <h2 className="text-xl font-black">Current task records</h2>
              </div>
              <span className="badge badge-outline">{visibleTasks.length} visible</span>
            </div>
            <TasksTable tasks={visibleTasks.slice(0, 80)} />
          </div>
        </section>
      </section>
    </Shell>
  );
}

function IntegrationStatePanel({ state, onRetry }: { state: IntegrationWorkbenchState; onRetry: () => void }) {
  if (state.status === "ready") {
    return null;
  }

  const content = {
    "signed-out": {
      tone: "warning" as NoticeTone,
      title: "Owner session required",
      detail: "Sign in through the current console to load the React integration map with live workspace data.",
      action: { label: "Sign in", href: "/auth/login" }
    },
    loading: {
      tone: "info" as NoticeTone,
      title: "Loading integration map",
      detail: "CompanyCore is reading provider readiness, capability exposure, and operating-area ownership.",
      action: undefined
    },
    error: {
      tone: "error" as NoticeTone,
      title: "Integration map could not load",
      detail: state.status === "error" ? state.message : "",
      action: undefined
    }
  }[state.status];

  return (
    <Shell appLabel="React integrations">
      <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-8">
        <LocalNotice
          tone={content.tone}
          title={content.title}
          detail={content.detail}
          action={content.action}
        />
        {state.status === "error" ? (
          <button className="btn btn-primary w-fit" type="button" onClick={onRetry}>Retry</button>
        ) : null}
      </section>
    </Shell>
  );
}

function IntegrationGroupCard({ group }: { group: IntegrationGroup }) {
  const toneClass = group.tone === "success"
    ? "text-success"
    : group.tone === "warning"
      ? "text-warning"
      : "text-info";

  return (
    <article className="rounded-company border border-base-300 bg-base-200/45 p-4">
      <div className="flex items-start gap-3">
        <span className={`dashboard-icon dashboard-icon-sm ${toneClass}`}>
          <i className={`ph-bold ${group.icon}`} aria-hidden="true"></i>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="leading-tight">{group.title}</strong>
            <span className={group.tone === "success" ? "badge badge-success" : group.tone === "warning" ? "badge badge-warning" : "badge badge-info"}>
              {group.status}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-company-muted">{group.detail}</p>
          <p className="mt-2 text-xs font-bold uppercase text-company-muted">{group.metric}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a className="btn btn-primary btn-sm" href={group.primary.href}>{group.primary.label}</a>
            <a className="btn btn-ghost btn-sm" href={group.secondary.href}>{group.secondary.label}</a>
          </div>
        </div>
      </div>
    </article>
  );
}

function IntegrationFilters({
  filters,
  onChange
}: {
  filters: IntegrationFilterState;
  onChange: (nextFilters: IntegrationFilterState) => void;
}) {
  return (
    <section className="card border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body gap-4">
        <div className="grid gap-3 md:grid-cols-[1fr_16rem]">
          <label className="form-control">
            <span className="label">
              <span className="label-text font-bold">Search operating areas</span>
            </span>
            <input
              className="input input-bordered"
              type="search"
              value={filters.search}
              onChange={(event) => onChange({ ...filters, search: event.target.value })}
              placeholder="Area, ownership key, source..."
            />
          </label>
          <label className="form-control">
            <span className="label">
              <span className="label-text font-bold">Coverage</span>
            </span>
            <select
              className="select select-bordered"
              value={filters.type}
              onChange={(event) => onChange({ ...filters, type: event.target.value })}
            >
              <option value="">All coverage</option>
              <option value="tables">Has tables</option>
              <option value="companycore">CompanyCore tables</option>
              <option value="clickup">ClickUp tables</option>
            </select>
          </label>
        </div>
      </div>
    </section>
  );
}

function IntegrationAreaTable({ rows }: { rows: IntegrationAreaRow[] }) {
  const columns: Array<TableColumn<IntegrationAreaRow>> = [
    {
      key: "area",
      header: "Operating area",
      cell: (row) => (
        <div>
          <strong className="block">{row.area}</strong>
          <span className="text-xs text-company-muted">{row.ownership}</span>
        </div>
      )
    },
    {
      key: "tables",
      header: "Tables",
      className: "text-right",
      cell: (row) => <span className="font-black">{row.tables}</span>
    },
    {
      key: "companycore",
      header: "CompanyCore",
      className: "text-right",
      cell: (row) => row.companycoreTables
    },
    {
      key: "clickup",
      header: "ClickUp",
      className: "text-right",
      cell: (row) => row.clickupTables
    },
    {
      key: "sources",
      header: "Sources",
      cell: (row) => <span className="badge badge-outline">{row.sources}</span>
    },
    {
      key: "action",
      header: "Next action",
      cell: (row) => <a className="btn btn-ghost btn-xs" href={row.action.href}>{row.action.label}</a>
    }
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      emptyTitle="No operating-area coverage matches"
      emptyDetail="Adjust the search or coverage filter to inspect the current integration map."
    />
  );
}

function IntegrationWorkbench({ connection }: { connection: ConnectionData }) {
  const [filters, setFilters] = useState<IntegrationFilterState>({
    search: "",
    type: ""
  });
  const readiness = useMemo(() => providerReadiness(connection), [connection]);
  const groups = useMemo(() => integrationGroups(connection), [connection]);
  const rows = useMemo(() => integrationAreaRows(connection), [connection]);
  const visibleRows = useMemo(() => filteredIntegrationAreaRows(rows, filters), [rows, filters]);
  const metrics = connectionMetrics(connection);
  const connectedGroups = groups.filter((group) => group.tone === "success").length;

  return (
    <Shell connection={connection}>
      <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-8">
        <section className="card border border-base-300 bg-base-100 shadow-sm">
          <div className="card-body gap-5">
            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
              <div className="flex items-start gap-3">
                <span className="dashboard-icon text-primary">
                  <i className="ph-bold ph-map-trifold" aria-hidden="true"></i>
                </span>
                <div>
                  <p className="eyebrow">React workbench</p>
                  <h1 className="text-3xl font-black leading-tight">Integration map</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-company-muted">
                    See provider readiness, agent-safe API exposure, and which company areas have integration-owned data paths.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <a className="btn btn-primary" href="/settings/integrations">Current integration map</a>
                <a className="btn btn-ghost" href="/settings/api">API settings</a>
              </div>
            </div>

            <LocalNotice
              tone={readiness.tone}
              title={readiness.title}
              detail={readiness.detail}
              action={readiness.action}
            />

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <MetricCard icon="ph-squares-four" label="Groups" value={`${groups.length}`} detail={`${connectedGroups} ready signals`} />
              <MetricCard icon="ph-tree-structure" label="Areas" value={`${metrics.areas}`} detail="Including system fallback" />
              <MetricCard icon="ph-database" label="Tables" value={`${metrics.tables}`} detail="Mapped table paths" />
              <MetricCard icon="ph-key" label="Capabilities" value={`${connection.capabilities.length}`} detail="Agent-discoverable API" />
              <MetricCard icon="ph-cloud-arrow-up" label="Drive folders" value={`${metrics.selectedDriveFolders}`} detail="Selected import scope" />
            </div>
          </div>
        </section>

        <section className="grid gap-3 lg:grid-cols-2">
          {groups.map((group) => (
            <IntegrationGroupCard group={group} key={group.id} />
          ))}
        </section>

        <IntegrationFilters filters={filters} onChange={setFilters} />

        <section className="card border border-base-300 bg-base-100 shadow-sm">
          <div className="card-body gap-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
              <div>
                <p className="eyebrow">Coverage table</p>
                <h2 className="text-xl font-black">Operating-area integration coverage</h2>
              </div>
              <span className="badge badge-outline">{visibleRows.length} visible</span>
            </div>
            <IntegrationAreaTable rows={visibleRows} />
          </div>
        </section>
      </section>
    </Shell>
  );
}

function ReadyDashboard({ connection }: { connection: ConnectionData }) {
  const items = useMemo(() => attentionItems(connection), [connection]);

  return (
    <Shell connection={connection}>
      <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-8 xl:grid-cols-[1.4fr_0.8fr]">
        <CommandPanel connection={connection} />
        <AttentionQueue items={items} />
      </section>
      <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 pb-10">
        <ModuleLauncher />
        <WorkbenchPreview connection={connection} />
        <MigrationTable />
      </section>
    </Shell>
  );
}

function ReactDashboardApp() {
  const [dashboardState, reload] = useDashboardState();

  if (dashboardState.status === "ready") {
    return <ReadyDashboard connection={dashboardState.connection} />;
  }

  return (
    <Shell>
      <StatePanel state={dashboardState} onRetry={reload} />
    </Shell>
  );
}

function ReactTasksApp() {
  const [tasksState, reload] = useTasksWorkbenchState();

  if (tasksState.status === "ready") {
    return <TasksWorkbench connection={tasksState.connection} tasks={tasksState.tasks} />;
  }

  return <TasksStatePanel state={tasksState} onRetry={reload} />;
}

function ReactIntegrationsApp() {
  const [integrationState, reload] = useIntegrationWorkbenchState();

  if (integrationState.status === "ready") {
    return <IntegrationWorkbench connection={integrationState.connection} />;
  }

  return <IntegrationStatePanel state={integrationState} onRetry={reload} />;
}

function ReactApp() {
  if (window.location.pathname === "/react-tasks") {
    document.title = "CompanyCore React Tasks";
    return <ReactTasksApp />;
  }

  if (window.location.pathname === "/react-integrations") {
    document.title = "CompanyCore React Integrations";
    return <ReactIntegrationsApp />;
  }

  document.title = "CompanyCore React Dashboard";
  return <ReactDashboardApp />;
}

const root = document.getElementById("root");

if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <ReactApp />
    </React.StrictMode>
  );
}
