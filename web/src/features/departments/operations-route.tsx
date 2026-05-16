import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import { userErrorMessage } from "../../api/errors";
import { CcButton } from "../../components/cc-button";
import { CcField } from "../../components/cc-field";
import { CcNotice } from "../../components/cc-notice";
import { CcTextInput } from "../../components/cc-text-input";
import { Shell } from "../../layout/shell";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { useLanguage } from "../../i18n/i18n";
import { OperationsPacket, OperationsStatusColumn, OperationsWorkItem } from "../../types";
import { BlockedActions } from "./shared";

const fallbackStatuses: OperationsStatusColumn[] = [
  { key: "todo", label: "To do" },
  { key: "in_progress", label: "In progress" },
  { key: "blocked", label: "Blocked" },
  { key: "done", label: "Done" },
  { key: "archived", label: "Archived" }
];

function currentOperationsView() {
  const view = new URLSearchParams(window.location.search).get("view");
  return view === "tasks" ? "tasks" : "overview";
}

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function inputDate(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function statusTone(status?: string) {
  if (status === "blocked") {
    return "border-error/35 bg-error/5";
  }
  if (status === "done" || status === "archived") {
    return "border-success/25 bg-success/5";
  }
  if (status === "in_progress") {
    return "border-primary/35 bg-primary/5";
  }
  return "border-base-300 bg-base-100";
}

function taskBelongsToList(task: OperationsWorkItem, listId: string) {
  if (listId === "unassigned") {
    return !task.hierarchy?.taskList?.id;
  }
  return task.hierarchy?.taskList?.id === listId;
}

function TaskPreviewModal({
  item,
  statuses,
  onClose,
  onSaved
}: {
  item: OperationsWorkItem;
  statuses: OperationsStatusColumn[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useLanguage();
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const dueDate = String(form.get("dueDate") || "");
    setSaveState("saving");
    setError("");

    try {
      await api(`/v1/operations/work-items/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: String(form.get("title") || ""),
          description: String(form.get("description") || ""),
          status: String(form.get("status") || "todo"),
          priority: String(form.get("priority") || ""),
          dueDate: dueDate ? new Date(`${dueDate}T00:00:00.000Z`).toISOString() : null
        })
      });
      onSaved();
      onClose();
    } catch (saveError) {
      setSaveState("error");
      setError(userErrorMessage(saveError, t));
    }
  }

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-neutral/55 p-4" role="dialog" aria-modal="true" aria-labelledby="operations-task-modal-title">
      <form className="grid max-h-[92vh] w-full max-w-3xl gap-4 overflow-y-auto rounded-company border border-base-300 bg-base-100 p-5 shadow-2xl" onSubmit={onSubmit}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-primary">{item.task.source || t("state.native")}</p>
            <h2 className="text-2xl font-black text-company-ink" id="operations-task-modal-title">{t("operations.taskPreview")}</h2>
          </div>
          <CcButton ariaLabel={t("operations.closeTask")} onClick={onClose} size="sm" variant="ghost">
            <i className="ph-bold ph-x" aria-hidden="true"></i>
            <span className="sr-only">{t("operations.closeTask")}</span>
          </CcButton>
        </div>

        <CcField label={t("operations.titleField")}>
          {({ id }) => (
            <CcTextInput id={id} name="title" defaultValue={item.task.title} required />
          )}
        </CcField>

        <label className="form-control">
          <span className="label"><span className="label-text font-bold">{t("operations.descriptionField")}</span></span>
          <textarea className="textarea textarea-bordered min-h-32" name="description" defaultValue={item.task.description || ""}></textarea>
        </label>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="form-control">
            <span className="label"><span className="label-text font-bold">{t("table.status")}</span></span>
            <select className="select select-bordered" name="status" defaultValue={item.task.status || "todo"}>
              {statuses.map((status) => (
                <option key={status.key} value={status.key}>{status.label}</option>
              ))}
            </select>
          </label>
          <CcField label={t("table.priority")}>
            {({ id }) => (
              <CcTextInput id={id} name="priority" defaultValue={item.task.priority || ""} />
            )}
          </CcField>
          <CcField label={t("table.dueDate")}>
            {({ id }) => (
              <CcTextInput id={id} name="dueDate" type="date" defaultValue={inputDate(item.task.dueDate)} />
            )}
          </CcField>
        </div>

        <section className="grid gap-3 rounded-company border border-base-300 bg-base-200/50 p-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-black uppercase text-company-muted">{t("table.list")}</p>
            <strong>{item.hierarchy?.taskList?.name || t("operations.unassigned")}</strong>
          </div>
          <div>
            <p className="text-xs font-black uppercase text-company-muted">{t("operations.project")}</p>
            <strong>{item.hierarchy?.project?.name || "-"}</strong>
          </div>
          <div>
            <p className="text-xs font-black uppercase text-company-muted">{t("operations.dependencies")}</p>
            <strong>{item.readiness?.dependencyCount ?? 0}</strong>
          </div>
          <div>
            <p className="text-xs font-black uppercase text-company-muted">{t("operations.updated")}</p>
            <strong>{formatDate(item.task.updatedAt)}</strong>
          </div>
        </section>

        {error ? <CcNotice tone="error" title={error} live /> : null}

        <div className="flex flex-wrap justify-end gap-2">
          <CcButton onClick={onClose} variant="ghost">{t("operations.cancel")}</CcButton>
          <CcButton loading={saveState === "saving"} type="submit" variant="primary">{t("operations.saveTask")}</CcButton>
        </div>
      </form>
    </div>
  );
}

export function OperationsRoute() {
  const { t } = useLanguage();
  const activeView = currentOperationsView();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [selectedTask, setSelectedTask] = useState<OperationsWorkItem | null>(null);
  const packet = useOwnerPacket<OperationsPacket>(`/v1/operations/work-items?limit=200&refresh=${refreshKey}`, true, t);
  const rows = useMemo(() => (packet.data?.workItems || []).map((item) => ({ ...item, id: item.task.id })), [packet.data?.workItems]);
  const taskLists = packet.data?.taskLists || [];
  const statuses = packet.data?.statuses || fallbackStatuses;
  const usableLists = taskLists.filter((list) => list.id === "unassigned" || rows.some((row) => taskBelongsToList(row, list.id)));
  const activeListId = selectedListId || usableLists[0]?.id || "unassigned";
  const activeList = usableLists.find((list) => list.id === activeListId);
  const visibleRows = rows.filter((row) => taskBelongsToList(row, activeListId));

  useEffect(() => {
    if (!selectedListId && usableLists[0]?.id) {
      setSelectedListId(usableLists[0].id);
    }
  }, [selectedListId, usableLists]);

  return (
    <Shell activeArea="04-operacje">
      <section className="rounded-company border border-base-300 bg-base-100 p-5">
        <p className="text-sm font-black uppercase text-primary">{t("areas.04.label")}</p>
        <h1 className="mt-2 text-3xl font-black text-company-ink">{t("operations.title")}</h1>
        <p className="mt-3 max-w-3xl leading-7 text-company-muted">{t("operations.description")}</p>
      </section>

      <div className="tabs tabs-boxed w-fit">
        <a className={`tab ${activeView === "overview" ? "tab-active" : ""}`} href="/areas?area=04-operacje&view=overview">{t("views.04.overview")}</a>
        <a className={`tab ${activeView === "tasks" ? "tab-active" : ""}`} href="/areas?area=04-operacje&view=tasks">{t("views.04.tasks")}</a>
      </div>

      {packet.status === "loading" ? <CcNotice tone="loading" title={t("table.loading.title")} detail={t("table.loading.detail")} /> : null}
      {packet.status === "error" ? <CcNotice tone="error" title={packet.error || t("operations.packetError")} live /> : null}

      {packet.status === "ready" ? (
        <section className="grid gap-4 xl:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="grid content-start gap-2 rounded-company border border-base-300 bg-base-100 p-3">
            <p className="px-2 text-xs font-black uppercase text-company-muted">{t("operations.lists")}</p>
            {usableLists.length ? usableLists.map((list) => (
              <button
                className={[
                  "grid gap-1 rounded-company px-3 py-2 text-left transition",
                  activeListId === list.id ? "bg-primary text-primary-content" : "hover:bg-base-200"
                ].join(" ")}
                key={list.id}
                onClick={() => setSelectedListId(list.id)}
                type="button"
              >
                <strong>{list.name}</strong>
                <span className={activeListId === list.id ? "text-primary-content/70" : "text-company-muted"}>{list.project?.name || list.source || t("state.native")}</span>
              </button>
            )) : (
              <CcNotice tone="info" title={t("operations.noItems")} detail={t("operations.noItems.detail")} />
            )}
          </aside>

          <div className="min-w-0 rounded-company border border-base-300 bg-base-100 p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-company-ink">{activeList?.name || t("operations.unassigned")}</h2>
                <p className="text-sm text-company-muted">{activeList?.description || t("operations.boardDescription")}</p>
              </div>
              <CcButton onClick={() => setRefreshKey((value) => value + 1)} iconLeft="ph-arrow-clockwise" variant="outline">{t("operations.refresh")}</CcButton>
            </div>

            <div className="grid gap-3 overflow-x-auto pb-1 lg:grid-cols-5">
              {statuses.map((status) => {
                const columnRows = visibleRows.filter((row) => row.task.status === status.key);
                return (
                  <section className="min-w-56 rounded-company border border-base-300 bg-base-200/55 p-3" key={status.key}>
                    <h3 className="text-sm font-black uppercase text-company-muted">{status.label}</h3>
                    <div className="mt-3 grid gap-2">
                      {columnRows.map((row) => (
                        <button
                          className={`rounded-company border p-3 text-left shadow-sm transition hover:border-primary hover:bg-primary/5 ${statusTone(row.task.status)}`}
                          key={row.id}
                          onClick={() => setSelectedTask(row)}
                          type="button"
                        >
                          <strong className="block text-sm text-company-ink">{row.task.title}</strong>
                          <span className="mt-2 block text-xs text-company-muted">{row.task.priority || t("state.medium")} / {formatDate(row.task.dueDate)}</span>
                          {row.readiness?.blocked || row.readiness?.overdue ? (
                            <span className="mt-2 flex flex-wrap gap-1">
                              {row.readiness.blocked ? <span className="badge badge-error badge-outline">{t("state.blocked")}</span> : null}
                              {row.readiness.overdue ? <span className="badge badge-warning badge-outline">{t("state.overdue")}</span> : null}
                            </span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      <BlockedActions actions={packet.data?.agentPacket?.blockedActions || packet.data?.blockedActions} />

      {selectedTask ? (
        <TaskPreviewModal
          item={selectedTask}
          statuses={statuses}
          onClose={() => setSelectedTask(null)}
          onSaved={() => setRefreshKey((value) => value + 1)}
        />
      ) : null}
    </Shell>
  );
}
