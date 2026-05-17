import { DragEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import { userErrorMessage } from "../../api/errors";
import { CcButton } from "../../components/cc-button";
import { CcField } from "../../components/cc-field";
import { CcNotice } from "../../components/cc-notice";
import { CcTextInput } from "../../components/cc-text-input";
import { Shell } from "../../layout/shell";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { MessageKey, Translate, useLanguage } from "../../i18n/i18n";
import { CoreAreaKey, OperationsDepartment, OperationsPacket, OperationsStatusColumn, OperationsTaskList, OperationsWorkItem } from "../../types";

type OperationsView = "tasks" | "calendar";
type CalendarMode = "today" | "week" | "month";

const fallbackStatuses: OperationsStatusColumn[] = [
  { key: "todo", label: "To do" },
  { key: "in_progress", label: "In progress" },
  { key: "blocked", label: "Blocked" },
  { key: "done", label: "Done" },
  { key: "archived", label: "Archived" }
];

const priorityOptions = ["urgent", "critical", "high", "normal", "medium", "low", "someday"];

function currentOperationsView(): OperationsView {
  return new URLSearchParams(window.location.search).get("view") === "calendar" ? "calendar" : "tasks";
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}

function inputDate(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function startOfDay(value = new Date()) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfWeek(value = new Date()) {
  const date = startOfDay(value);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return date;
}

function sameDay(left: Date, right: Date) {
  return startOfDay(left).getTime() === startOfDay(right).getTime();
}

function daysInCurrentMonth() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return Array.from({ length: days }, (_, index) => new Date(first.getFullYear(), first.getMonth(), index + 1));
}

function dayDistance(value?: string | null) {
  if (!value) return Number.POSITIVE_INFINITY;
  return Math.round((startOfDay(new Date(value)).getTime() - startOfDay().getTime()) / 86_400_000);
}

function statusTone(status?: string) {
  if (status === "blocked") return "border-error/35 bg-error/5";
  if (status === "done" || status === "archived") return "border-success/25 bg-success/5";
  if (status === "in_progress") return "border-primary/35 bg-primary/5";
  return "border-base-300 bg-base-100";
}

function priorityTone(priority?: string | null) {
  const normalized = (priority || "normal").toLowerCase();
  if (normalized === "urgent" || normalized === "critical") return { className: "badge-error", icon: "ph-warning-diamond" };
  if (normalized === "high") return { className: "badge-warning", icon: "ph-flag" };
  if (normalized === "low" || normalized === "someday") return { className: "badge-ghost", icon: "ph-arrow-down" };
  return { className: "badge-primary badge-outline", icon: "ph-dot-outline" };
}

function taskBelongsToList(task: OperationsWorkItem, listId: string) {
  if (listId === "all") return true;
  if (listId === "unassigned") return !task.hierarchy?.taskList?.id;
  return task.hierarchy?.taskList?.id === listId;
}

function missingFieldLabel(field: string) {
  return field.replace(/^task\./, "").replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}

function departmentLabelKey(key: CoreAreaKey): MessageKey {
  if (key === "00-ogolny") return "areas.00.label";
  if (key === "04-operacje") return "areas.04.label";
  if (key === "08-zasoby") return "areas.08.label";
  const number = key.slice(0, 2);
  return `departments.${number}` as MessageKey;
}

function departmentLabel(key: CoreAreaKey, t: Translate) {
  return t(departmentLabelKey(key));
}

function listDepartmentKey(list: OperationsTaskList) {
  return list.areaAssignment?.department?.key ?? null;
}

function PriorityBadge({ priority }: { priority?: string | null }) {
  const tone = priorityTone(priority);
  return (
    <span className={`badge badge-sm gap-1 ${tone.className}`}>
      <i className={`ph-bold ${tone.icon}`} aria-hidden="true"></i>
      {priority || "normal"}
    </span>
  );
}

function DueBadge({ dueDate, overdue }: { dueDate?: string | null; overdue?: boolean }) {
  return (
    <span className={`badge badge-sm gap-1 ${overdue ? "badge-warning" : "badge-outline"}`}>
      <i className="ph-bold ph-calendar-blank" aria-hidden="true"></i>
      {formatDate(dueDate)}
    </span>
  );
}

function TaskCard({
  row,
  onOpen,
  onDragStart,
  onDragEnd,
  isDragging
}: {
  row: OperationsWorkItem;
  onOpen: () => void;
  onDragStart?: (event: DragEvent<HTMLButtonElement>) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
}) {
  return (
    <button
      className={`grid gap-2 rounded-company border p-3 text-left shadow-sm transition hover:border-primary hover:bg-primary/5 hover:shadow-md ${isDragging ? "opacity-55 ring-2 ring-primary/25" : ""} ${statusTone(row.task.status)}`}
      draggable
      data-task-card-id={row.id}
      onClick={onOpen}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      type="button"
    >
      <div className="flex items-start justify-between gap-2">
        <strong className="line-clamp-2 text-sm leading-5 text-company-ink">{row.task.title}</strong>
        <i className="ph-bold ph-dots-six-vertical mt-0.5 shrink-0 text-company-muted" aria-hidden="true"></i>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <PriorityBadge priority={row.task.priority} />
        <DueBadge dueDate={row.task.dueDate} overdue={row.readiness?.overdue} />
        {row.task.description ? <span className="badge badge-ghost badge-sm gap-1"><i className="ph-bold ph-text-align-left" aria-hidden="true"></i></span> : null}
        {row.evidence?.projectResources?.length ? <span className="badge badge-ghost badge-sm gap-1"><i className="ph-bold ph-paperclip" aria-hidden="true"></i></span> : null}
        {row.readiness?.blocked ? <span className="badge badge-error badge-outline badge-sm">{row.readiness.dependencyCount || "!"}</span> : null}
      </div>
      <span className="truncate text-xs text-company-muted">{row.hierarchy?.project?.name || row.hierarchy?.taskList?.name || row.task.source || "native"}</span>
    </button>
  );
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
  const missingFields = item.readiness?.missingFields || [];

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
      <form className="grid max-h-[92vh] w-full max-w-5xl gap-5 overflow-y-auto rounded-company border border-base-300 bg-base-100 p-5 shadow-2xl" onSubmit={onSubmit}>
        <div className="flex items-start justify-between gap-3">
          <div className="grid gap-1">
            <div className="flex flex-wrap gap-2">
              <PriorityBadge priority={item.task.priority} />
              <DueBadge dueDate={item.task.dueDate} overdue={item.readiness?.overdue} />
              <span className="badge badge-outline badge-sm">{item.task.source || t("state.native")}</span>
            </div>
            <h2 className="text-2xl font-black text-company-ink" id="operations-task-modal-title">{t("operations.taskPreview")}</h2>
            <p className="text-sm text-company-muted">{item.hierarchy?.taskList?.name || t("operations.unassigned")}</p>
          </div>
          <CcButton ariaLabel={t("operations.closeTask")} onClick={onClose} size="sm" variant="ghost">
            <i className="ph-bold ph-x" aria-hidden="true"></i>
            <span className="sr-only">{t("operations.closeTask")}</span>
          </CcButton>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <section className="grid gap-4">
            <CcField label={t("operations.titleField")}>
              {({ id }) => <CcTextInput id={id} name="title" defaultValue={item.task.title} required />}
            </CcField>

            <label className="form-control">
              <span className="label"><span className="label-text font-bold"><i className="ph-bold ph-text-align-left mr-1" aria-hidden="true"></i>{t("operations.descriptionField")}</span></span>
              <textarea className="textarea textarea-bordered min-h-32" name="description" defaultValue={item.task.description || ""}></textarea>
            </label>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="form-control">
                <span className="label"><span className="label-text font-bold">{t("table.status")}</span></span>
                <select className="select select-bordered" name="status" defaultValue={item.task.status || "todo"}>
                  {statuses.map((status) => <option key={status.key} value={status.key}>{status.label}</option>)}
                </select>
              </label>
              <label className="form-control">
                <span className="label"><span className="label-text font-bold">{t("table.priority")}</span></span>
                <select className="select select-bordered" name="priority" defaultValue={item.task.priority || "normal"}>
                  {priorityOptions.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                </select>
              </label>
              <CcField label={t("table.dueDate")}>
                {({ id }) => <CcTextInput id={id} name="dueDate" type="date" defaultValue={inputDate(item.task.dueDate)} />}
              </CcField>
            </div>

            {error ? <CcNotice tone="error" title={error} live /> : null}
          </section>

          <aside className="grid content-start gap-3">
            <section className="rounded-company border border-base-300 bg-base-200/50 p-4">
              <h3 className="text-sm font-black uppercase text-company-ink">{t("operations.operationalDetail")}</h3>
              <dl className="mt-3 grid gap-3 text-sm">
                <div><dt className="font-bold text-company-muted">{t("table.list")}</dt><dd>{item.hierarchy?.taskList?.name || t("operations.unassigned")}</dd></div>
                <div><dt className="font-bold text-company-muted">{t("operations.project")}</dt><dd>{item.hierarchy?.project?.name || "-"}</dd></div>
                <div><dt className="font-bold text-company-muted">{t("operations.updated")}</dt><dd>{formatDate(item.task.updatedAt)}</dd></div>
              </dl>
            </section>

            <section className="rounded-company border border-base-300 bg-base-100 p-4">
              <h3 className="text-sm font-black uppercase text-company-ink">{t("operations.readinessTitle")}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {item.readiness?.blocked ? <span className="badge badge-error">{t("state.blocked")}</span> : <span className="badge badge-success">{t("state.ready")}</span>}
                {item.readiness?.overdue ? <span className="badge badge-warning">{t("state.overdue")}</span> : null}
                {item.readiness?.dependencyCount ? <span className="badge badge-outline">{item.readiness.dependencyCount} {t("operations.dependencies")}</span> : null}
              </div>
              {missingFields.length ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {missingFields.map((field) => <span className="badge badge-ghost badge-sm" key={field}>{missingFieldLabel(field)}</span>)}
                </div>
              ) : null}
            </section>
          </aside>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-base-300 pt-4">
          <CcButton onClick={onClose} variant="ghost">{t("operations.cancel")}</CcButton>
          <CcButton loading={saveState === "saving"} type="submit" variant="primary">{t("operations.saveTask")}</CcButton>
        </div>
      </form>
    </div>
  );
}

function TaskCreateModal({
  taskLists,
  statuses,
  defaultTaskListId,
  onClose,
  onSaved
}: {
  taskLists: OperationsTaskList[];
  statuses: OperationsStatusColumn[];
  defaultTaskListId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useLanguage();
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState("");
  const creatableLists = taskLists.filter((list) => list.id !== "all" && list.id !== "unassigned");
  const defaultList = defaultTaskListId && creatableLists.some((list) => list.id === defaultTaskListId)
    ? defaultTaskListId
    : creatableLists[0]?.id || "";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const dueDate = String(form.get("dueDate") || "");
    const taskListId = String(form.get("taskListId") || "");
    setSaveState("saving");
    setError("");

    try {
      await api("/v1/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: String(form.get("title") || ""),
          description: String(form.get("description") || ""),
          status: String(form.get("status") || "todo"),
          priority: String(form.get("priority") || ""),
          taskListId: taskListId || undefined,
          dueDate: dueDate ? new Date(`${dueDate}T00:00:00.000Z`).toISOString() : undefined
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-neutral/35 p-4" role="dialog" aria-modal="true" aria-labelledby="operations-create-task-title">
      <form className="grid max-h-[92vh] w-full max-w-2xl gap-4 overflow-y-auto rounded-company border border-base-300 bg-base-100 p-5 shadow-2xl" onSubmit={onSubmit}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase text-primary">{t("operations.newTask")}</p>
            <h2 className="text-2xl font-black text-company-ink" id="operations-create-task-title">{t("operations.createTask")}</h2>
          </div>
          <CcButton ariaLabel={t("operations.closeTask")} onClick={onClose} size="sm" variant="ghost">
            <i className="ph-bold ph-x" aria-hidden="true"></i>
            <span className="sr-only">{t("operations.closeTask")}</span>
          </CcButton>
        </div>

        <CcField label={t("operations.titleField")} required>
          {({ id, describedBy, invalid }) => <CcTextInput aria-describedby={describedBy} aria-invalid={invalid} autoFocus id={id} name="title" required />}
        </CcField>

        <label className="form-control">
          <span className="label"><span className="label-text font-bold"><i className="ph-bold ph-text-align-left mr-1" aria-hidden="true"></i>{t("operations.descriptionField")}</span></span>
          <textarea className="textarea textarea-bordered min-h-28" name="description"></textarea>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="form-control">
            <span className="label"><span className="label-text font-bold">{t("operations.taskListField")}</span></span>
            <select className="select select-bordered" name="taskListId" defaultValue={defaultList}>
              <option value="">{t("operations.unassigned")}</option>
              {creatableLists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}
            </select>
          </label>

          <label className="form-control">
            <span className="label"><span className="label-text font-bold">{t("table.status")}</span></span>
            <select className="select select-bordered" name="status" defaultValue={statuses[0]?.key || "todo"}>
              {statuses.map((status) => <option key={status.key} value={status.key}>{status.label}</option>)}
            </select>
          </label>

          <label className="form-control">
            <span className="label"><span className="label-text font-bold">{t("table.priority")}</span></span>
            <select className="select select-bordered" name="priority" defaultValue="medium">
              {priorityOptions.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
            </select>
          </label>

          <label className="form-control">
            <span className="label"><span className="label-text font-bold">{t("table.due")}</span></span>
            <input className="input input-bordered" name="dueDate" type="date" />
          </label>
        </div>

        {error ? <CcNotice tone="error" title={error} live /> : null}

        <div className="flex flex-wrap justify-end gap-2">
          <CcButton onClick={onClose} variant="ghost">{t("operations.cancel")}</CcButton>
          <CcButton loading={saveState === "saving"} type="submit" variant="primary">{t("operations.createTask")}</CcButton>
        </div>
      </form>
    </div>
  );
}

function TaskListModal({
  list,
  departments,
  onClose,
  onSaved
}: {
  list: OperationsTaskList;
  departments: OperationsDepartment[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useLanguage();
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaveState("saving");
    setError("");

    try {
      await api(`/v1/operations/task-lists/${list.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: String(form.get("name") || ""),
          description: String(form.get("description") || ""),
          status: String(form.get("status") || "active"),
          departmentKey: String(form.get("departmentKey") || "") || null
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
    <div className="fixed inset-0 z-30 grid place-items-center bg-neutral/55 p-4" role="dialog" aria-modal="true" aria-labelledby="operations-list-modal-title">
      <form className="grid w-full max-w-2xl gap-4 rounded-company border border-base-300 bg-base-100 p-5 shadow-2xl" onSubmit={onSubmit}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-primary">{list.source || t("state.native")}</p>
            <h2 className="text-2xl font-black text-company-ink" id="operations-list-modal-title">{t("operations.editList")}</h2>
          </div>
          <CcButton ariaLabel={t("operations.closeTask")} onClick={onClose} size="sm" variant="ghost">
            <i className="ph-bold ph-x" aria-hidden="true"></i>
            <span className="sr-only">{t("operations.closeTask")}</span>
          </CcButton>
        </div>
        <CcField label={t("operations.listName")}>
          {({ id }) => <CcTextInput id={id} name="name" defaultValue={list.name} required />}
        </CcField>
        <label className="form-control">
          <span className="label"><span className="label-text font-bold">{t("operations.descriptionField")}</span></span>
          <textarea className="textarea textarea-bordered min-h-24" name="description" defaultValue={list.description || ""}></textarea>
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="form-control">
            <span className="label"><span className="label-text font-bold">{t("table.status")}</span></span>
            <select className="select select-bordered" name="status" defaultValue={list.status || "active"}>
              {["active", "paused", "archived"].map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label className="form-control">
            <span className="label"><span className="label-text font-bold">{t("operations.departmentAssignment")}</span></span>
            <select className="select select-bordered" name="departmentKey" defaultValue={list.areaAssignment?.department?.key || ""}>
              <option value="">{t("operations.noDepartment")}</option>
              {departments.map((department) => <option key={department.key} value={department.key}>{departmentLabel(department.key, t)}</option>)}
            </select>
          </label>
        </div>
        {error ? <CcNotice tone="error" title={error} live /> : null}
        <div className="flex flex-wrap justify-end gap-2 border-t border-base-300 pt-4">
          <CcButton onClick={onClose} variant="ghost">{t("operations.cancel")}</CcButton>
          <CcButton loading={saveState === "saving"} type="submit" variant="primary">{t("operations.saveList")}</CcButton>
        </div>
      </form>
    </div>
  );
}

function OperationsBoard({
  rows,
  taskLists,
  departments,
  statuses,
  selectedListIds,
  setSelectedListIds,
  setSelectedTask,
  setSelectedList,
  onCreateTask,
  onRefresh
}: {
  rows: OperationsWorkItem[];
  taskLists: OperationsTaskList[];
  departments: OperationsDepartment[];
  statuses: OperationsStatusColumn[];
  selectedListIds: string[];
  setSelectedListIds: (listIds: string[]) => void;
  setSelectedTask: (task: OperationsWorkItem) => void;
  setSelectedList: (list: OperationsTaskList) => void;
  onCreateTask: (defaultTaskListId?: string) => void;
  onRefresh: () => void;
}) {
  const { t } = useLanguage();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [draggedTaskId, setDraggedTaskId] = useState("");
  const [dragOverStatus, setDragOverStatus] = useState("");
  const [moveError, setMoveError] = useState("");
  const unassignedList = taskLists.find((list) => list.id === "unassigned");
  const realLists = taskLists.filter((list) => list.id !== "all" && list.id !== "unassigned" && rows.some((row) => taskBelongsToList(row, list.id)));
  const selectableListIds = [...realLists.map((list) => list.id), ...(unassignedList ? [unassignedList.id] : [])];
  const selectedSet = new Set(selectedListIds);
  const allSelected = selectableListIds.length > 0 && selectableListIds.every((id) => selectedSet.has(id));
  const groups = departments.map((department) => ({
    id: department.key,
    name: departmentLabel(department.key, t),
    lists: realLists.filter((list) => listDepartmentKey(list) === department.key)
  })).filter((group) => group.lists.length > 0);
  const noDepartment = realLists.filter((list) => !listDepartmentKey(list));
  const visibleRows = rows.filter((row) => {
    const listId = row.hierarchy?.taskList?.id || "unassigned";
    return selectedSet.has(listId);
  });
  const selectedLabel = allSelected ? t("operations.allTasks") : t("operations.selectedLists", { count: selectedSet.size });

  useEffect(() => {
    setOpenGroups((current) => {
      const next = { ...current };
      groups.forEach((group) => {
        if (next[group.id] === undefined) next[group.id] = true;
      });
      if (next.unassigned === undefined) next.unassigned = true;
      return next;
    });
  }, [groups.map((group) => group.id).join("|")]);

  function toggleAllLists(checked: boolean) {
    setSelectedListIds(checked ? selectableListIds : []);
  }

  function toggleList(listId: string, checked: boolean) {
    const next = new Set(selectedSet);
    if (checked) {
      next.add(listId);
    } else {
      next.delete(listId);
    }
    setSelectedListIds(Array.from(next));
  }

  async function moveTaskToStatus(status: string) {
    if (!draggedTaskId) return;
    const task = rows.find((row) => row.id === draggedTaskId);
    if (!task || task.task.status === status) {
      setDraggedTaskId("");
      setDragOverStatus("");
      return;
    }
    setMoveError("");
    try {
      await api(`/v1/operations/work-items/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      onRefresh();
    } catch (error) {
      setMoveError(userErrorMessage(error, t));
    } finally {
      setDraggedTaskId("");
      setDragOverStatus("");
    }
  }

  function startTaskDrag(event: DragEvent<HTMLButtonElement>, taskId: string) {
    setDraggedTaskId(taskId);
    setDragOverStatus("");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", taskId);
  }

  function clearTaskDrag() {
    setDraggedTaskId("");
    setDragOverStatus("");
  }

  function renderListButton(list: OperationsTaskList) {
    const checked = selectedSet.has(list.id);
    return (
      <div className={`grid grid-cols-[2rem_minmax(0,1fr)_2rem] items-stretch rounded-company ${checked ? "bg-primary/10" : "hover:bg-base-200"}`} key={list.id}>
        <label className="grid place-items-center">
          <input className="checkbox checkbox-primary checkbox-xs" checked={checked} onChange={(event) => toggleList(list.id, event.target.checked)} type="checkbox" />
        </label>
        <button className="grid min-w-0 gap-0.5 px-1 py-2 text-left" onClick={() => toggleList(list.id, !checked)} type="button">
          <strong className="truncate text-sm">{list.name}</strong>
          <span className="truncate text-xs text-company-muted">{list.areaAssignment?.department?.key ? departmentLabel(list.areaAssignment.department.key, t) : list.project?.name || list.source || t("state.native")}</span>
        </button>
        <button className="text-company-muted hover:text-company-ink" aria-label={t("operations.editList")} onClick={() => setSelectedList(list)} type="button">
          <i className="ph-bold ph-gear-six" aria-hidden="true"></i>
        </button>
      </div>
    );
  }

  return (
    <section className="grid h-[calc(100vh-12.5rem)] min-h-[34rem] gap-4 xl:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="grid min-h-0 content-start gap-3 overflow-y-auto rounded-company border border-base-300 bg-base-100 p-3">
        <label className="sticky top-0 z-10 grid grid-cols-[2rem_minmax(0,1fr)] items-center rounded-company border border-base-300 bg-base-100/95 px-1 py-2 shadow-sm backdrop-blur hover:bg-base-200" data-list-select-all>
          <input className="checkbox checkbox-primary checkbox-sm" checked={allSelected} onChange={(event) => toggleAllLists(event.target.checked)} type="checkbox" />
          <span className="grid min-w-0 gap-0.5">
            <strong className="block text-sm">{t("operations.allTasks")}</strong>
          </span>
        </label>

        {groups.map((group) => (
          <section className="grid gap-1" key={group.id}>
            <button className="flex items-center justify-between rounded-company px-2 py-1 text-left text-xs font-black uppercase text-company-muted hover:bg-base-200" onClick={() => setOpenGroups((current) => ({ ...current, [group.id]: !current[group.id] }))} type="button">
              {group.name}
              <i className={`ph-bold ${openGroups[group.id] ? "ph-caret-up" : "ph-caret-down"}`} aria-hidden="true"></i>
            </button>
            {openGroups[group.id] ? <div className="grid gap-1">{group.lists.map(renderListButton)}</div> : null}
          </section>
        ))}

        <section className="grid gap-1 border-t border-base-300 pt-2">
          <button className="flex items-center justify-between rounded-company px-2 py-1 text-left text-xs font-black uppercase text-company-muted hover:bg-base-200" onClick={() => setOpenGroups((current) => ({ ...current, unassigned: !current.unassigned }))} type="button">
            {t("operations.unassigned")}
            <i className={`ph-bold ${openGroups.unassigned ? "ph-caret-up" : "ph-caret-down"}`} aria-hidden="true"></i>
          </button>
          {openGroups.unassigned ? (
            <div className="grid gap-1">
              {noDepartment.map(renderListButton)}
              {unassignedList ? renderListButton(unassignedList) : null}
            </div>
          ) : null}
        </section>
      </aside>

      <div className="grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] rounded-company border border-base-300 bg-base-100 p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-black text-company-ink">{selectedLabel}</h2>
            <p className="line-clamp-1 text-sm text-company-muted">{t("operations.boardDescription")}</p>
          </div>
          <div className="flex gap-2">
            <CcButton onClick={() => onCreateTask(selectedListIds.length === 1 ? selectedListIds[0] : undefined)} iconLeft="ph-plus" variant="primary">{t("operations.newTask")}</CcButton>
            <CcButton onClick={onRefresh} iconLeft="ph-arrow-clockwise" variant="outline">{t("operations.refresh")}</CcButton>
          </div>
        </div>

        {moveError ? <CcNotice tone="error" title={moveError} live /> : null}

        <div className="grid min-h-0 auto-cols-[minmax(15rem,1fr)] grid-flow-col gap-3 overflow-x-auto pb-3 xl:auto-cols-[minmax(16rem,1fr)]">
          {statuses.map((status) => {
            const columnRows = visibleRows.filter((row) => row.task.status === status.key);
            const draggedTask = draggedTaskId ? visibleRows.find((row) => row.id === draggedTaskId) : null;
            const isDropTarget = dragOverStatus === status.key && !!draggedTask && draggedTask.task.status !== status.key;
            return (
              <section
                className={`grid min-h-0 grid-rows-[auto_minmax(0,1fr)] rounded-company border p-3 transition ${isDropTarget ? "border-primary bg-primary/10 shadow-company-soft ring-2 ring-primary/20" : "border-base-300 bg-base-200/55"}`}
                data-status-column={status.key}
                key={status.key}
                onDragEnter={() => setDragOverStatus(status.key)}
                onDragOver={(event: DragEvent<HTMLElement>) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  if (dragOverStatus !== status.key) setDragOverStatus(status.key);
                }}
                onDragLeave={(event: DragEvent<HTMLElement>) => {
                  if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                  setDragOverStatus((current) => current === status.key ? "" : current);
                }}
                onDrop={() => void moveTaskToStatus(status.key)}
              >
                <h3 className="pb-3 text-sm font-black uppercase text-company-muted">{status.label}</h3>
                <div className="grid content-start gap-2 overflow-y-auto pr-1">
                  {isDropTarget ? (
                    <div className="grid min-h-20 place-items-center rounded-company border border-dashed border-primary/70 bg-primary/10 px-3 text-center text-sm font-bold text-primary shadow-inner" data-drop-placeholder={status.key}>
                      <span className="flex items-center gap-2">
                        <i className="ph-bold ph-arrow-down" aria-hidden="true"></i>
                        {t("operations.dropHere")}
                      </span>
                    </div>
                  ) : null}
                  {columnRows.length ? columnRows.map((row) => (
                    <TaskCard
                      key={row.id}
                      row={row}
                      isDragging={draggedTaskId === row.id}
                      onOpen={() => setSelectedTask(row)}
                      onDragStart={(event) => startTaskDrag(event, row.id)}
                      onDragEnd={clearTaskDrag}
                    />
                  )) : (
                    <div className="grid min-h-24 place-items-center rounded-company border border-dashed border-base-300 bg-base-100/55 px-3 text-center text-sm text-company-muted">
                      {t("operations.emptyColumn")}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CalendarTaskPill({ row, onOpen }: { row: OperationsWorkItem; onOpen: () => void }) {
  return (
    <button className={`rounded-company border px-3 py-2 text-left text-xs ${statusTone(row.task.status)}`} onClick={onOpen} type="button">
      <strong className="line-clamp-1 block text-company-ink">{row.task.title}</strong>
      <span className="mt-1 flex gap-1"><PriorityBadge priority={row.task.priority} /></span>
    </button>
  );
}

function OperationsCalendarFilters({
  taskLists,
  selectedListIds,
  setSelectedListIds
}: {
  taskLists: OperationsTaskList[];
  selectedListIds: string[];
  setSelectedListIds: (listIds: string[]) => void;
}) {
  const { t } = useLanguage();
  const selectableLists = taskLists.filter((list) => list.id !== "all");
  const selectableIds = selectableLists.map((list) => list.id);
  const selectedSet = new Set(selectedListIds);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedSet.has(id));

  function toggleAll(checked: boolean) {
    setSelectedListIds(checked ? selectableIds : []);
  }

  function toggleList(listId: string, checked: boolean) {
    const next = new Set(selectedSet);
    if (checked) next.add(listId);
    else next.delete(listId);
    setSelectedListIds(Array.from(next));
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-company border border-base-300 bg-base-100 p-2">
      <label className="flex items-center gap-2 rounded-company px-2 py-1 text-sm font-bold hover:bg-base-200">
        <input className="checkbox checkbox-primary checkbox-sm" checked={allSelected} onChange={(event) => toggleAll(event.target.checked)} type="checkbox" />
        {t("operations.allTasks")}
      </label>
      {selectableLists.map((list) => (
        <label className="flex min-w-0 items-center gap-2 rounded-company px-2 py-1 text-sm hover:bg-base-200" key={list.id}>
          <input className="checkbox checkbox-primary checkbox-xs" checked={selectedSet.has(list.id)} onChange={(event) => toggleList(list.id, event.target.checked)} type="checkbox" />
          <span className="max-w-48 truncate">{list.name}</span>
        </label>
      ))}
    </div>
  );
}

function OperationsCalendar({ rows, setSelectedTask, onCreateTask }: { rows: OperationsWorkItem[]; setSelectedTask: (task: OperationsWorkItem) => void; onCreateTask: () => void }) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<CalendarMode>("week");
  const calendarLabels: Record<CalendarMode, string> = {
    today: t("operations.calendar.today"),
    week: t("operations.calendar.week"),
    month: t("operations.calendar.month")
  };
  const datedRows = rows.filter((row) => row.task.dueDate);
  const todayRows = datedRows.filter((row) => sameDay(new Date(row.task.dueDate!), new Date()));
  const weekStart = startOfWeek();
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + index);
    return day;
  });
  const monthDays = daysInCurrentMonth();
  const monthOffset = monthDays[0] ? ((monthDays[0].getDay() || 7) - 1) : 0;

  return (
    <section className="grid h-[calc(100vh-12.5rem)] min-h-[34rem] grid-rows-[auto_minmax(0,1fr)] gap-4 rounded-company border border-base-300 bg-base-100 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-company-ink">{t("operations.calendarTitle")}</h2>
          <p className="text-sm text-company-muted">{t("operations.calendarDescription")}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <CcButton onClick={onCreateTask} iconLeft="ph-plus" variant="primary">{t("operations.newTask")}</CcButton>
          <div className="join">
            {(["today", "week", "month"] as CalendarMode[]).map((option) => (
              <button className={`btn join-item btn-sm ${mode === option ? "btn-primary" : "btn-outline"}`} key={option} onClick={() => setMode(option)} type="button">
                {calendarLabels[option]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {mode === "today" ? (
        <div className="grid min-h-0 grid-cols-[5rem_minmax(0,1fr)] overflow-y-auto rounded-company border border-base-300">
          <div className="border-b border-base-300 bg-base-200/60 px-3 py-4 text-xs font-black text-company-muted">Today</div>
          <div className="grid gap-2 border-b border-base-300 p-3">
            {todayRows.length ? todayRows.map((row) => <CalendarTaskPill key={row.id} row={row} onOpen={() => setSelectedTask(row)} />) : <span className="text-sm text-company-muted">{t("operations.emptyCalendar")}</span>}
          </div>
          {Array.from({ length: 12 }, (_, index) => index + 8).map((hour) => (
            <div className="contents" key={hour}>
              <div className="border-b border-base-300 bg-base-200/60 px-3 py-4 text-xs font-black text-company-muted">{`${hour}:00`}</div>
              <div className="border-b border-base-300 p-3"></div>
            </div>
          ))}
        </div>
      ) : null}

      {mode === "week" ? (
        <div className="grid min-h-0 grid-cols-7 gap-3 overflow-x-auto">
          {weekDays.map((day) => {
            const dayRows = datedRows.filter((row) => sameDay(new Date(row.task.dueDate!), day));
            return (
              <section className="grid min-w-40 content-start gap-2 overflow-y-auto rounded-company border border-base-300 bg-base-200/55 p-3" key={day.toISOString()}>
                <h3 className="text-sm font-black text-company-ink">{new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric" }).format(day)}</h3>
                {dayRows.length ? dayRows.map((row) => <CalendarTaskPill key={row.id} row={row} onOpen={() => setSelectedTask(row)} />) : <span className="text-sm text-company-muted">{t("operations.emptyCalendar")}</span>}
              </section>
            );
          })}
        </div>
      ) : null}

      {mode === "month" ? (
        <div className="grid min-h-0 grid-cols-7 gap-2 overflow-y-auto">
          {Array.from({ length: monthOffset }, (_, index) => (
            <div aria-hidden="true" className="min-h-24 rounded-company border border-base-300/50 bg-base-200/20" key={`blank-${index}`}></div>
          ))}
          {monthDays.map((day) => {
            const dayRows = datedRows.filter((row) => sameDay(new Date(row.task.dueDate!), day));
            return (
              <button className="grid min-h-24 content-start rounded-company border border-base-300 bg-base-200/45 p-2 text-left hover:border-primary hover:bg-primary/5" key={day.toISOString()} onClick={() => dayRows[0] ? setSelectedTask(dayRows[0]) : undefined} type="button">
                <span className="text-sm font-black text-company-ink">{day.getDate()}</span>
                {dayRows.length ? (
                  <span className="mt-2 flex flex-wrap gap-1">
                    <span className="badge badge-primary badge-sm">{dayRows.length}</span>
                    {dayRows.some((row) => row.readiness?.blocked) ? <span className="badge badge-error badge-sm">!</span> : null}
                    {dayRows.some((row) => row.readiness?.overdue) ? <span className="badge badge-warning badge-sm"><i className="ph-bold ph-clock" aria-hidden="true"></i></span> : null}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

export function OperationsRoute() {
  const { t } = useLanguage();
  const activeView = currentOperationsView();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [listSelectionInitialized, setListSelectionInitialized] = useState(false);
  const [selectedTask, setSelectedTask] = useState<OperationsWorkItem | null>(null);
  const [selectedList, setSelectedList] = useState<OperationsTaskList | null>(null);
  const [createTaskListId, setCreateTaskListId] = useState<string | null>(null);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const packet = useOwnerPacket<OperationsPacket>(`/v1/operations/work-items?limit=200&refresh=${refreshKey}`, true, t);
  const rows = useMemo(() => (packet.data?.workItems || []).map((item) => ({ ...item, id: item.task.id })), [packet.data?.workItems]);
  const taskLists = packet.data?.taskLists || [];
  const departments = packet.data?.departments || [];
  const statuses = packet.data?.statuses?.length ? packet.data.statuses : fallbackStatuses;
  const selectableListIds = taskLists.filter((list) => list.id !== "all").map((list) => list.id);
  const selectedSet = new Set(selectedListIds);
  const filteredRows = rows.filter((row) => selectedSet.has(row.hierarchy?.taskList?.id || "unassigned"));

  useEffect(() => {
    if (packet.status !== "ready") return;
    if (!selectableListIds.length) {
      setSelectedListIds([]);
      return;
    }
    if (!listSelectionInitialized) {
      setSelectedListIds(selectableListIds);
      setListSelectionInitialized(true);
      return;
    }
    setSelectedListIds((current) => {
      const validIds = current.filter((id) => selectableListIds.includes(id));
      return validIds.length === current.length ? current : validIds;
    });
  }, [packet.status, selectableListIds.join("|"), listSelectionInitialized]);

  function refresh() {
    setRefreshKey((value) => value + 1);
  }

  function openCreateTask(defaultTaskListId?: string) {
    setCreateTaskListId(defaultTaskListId && defaultTaskListId !== "unassigned" ? defaultTaskListId : null);
    setIsCreateTaskOpen(true);
  }

  return (
    <Shell activeArea="04-operacje">
      {packet.status === "loading" ? <CcNotice tone="loading" title={t("table.loading.title")} detail={t("table.loading.detail")} /> : null}
      {packet.status === "error" ? <CcNotice tone="error" title={packet.error || t("operations.packetError")} live /> : null}
      {packet.status === "ready" && activeView === "calendar" ? (
        <OperationsCalendarFilters taskLists={taskLists} selectedListIds={selectedListIds} setSelectedListIds={setSelectedListIds} />
      ) : null}

      {packet.status === "ready" ? (
        activeView === "calendar" ? (
          <OperationsCalendar rows={filteredRows} setSelectedTask={setSelectedTask} onCreateTask={() => openCreateTask(selectedListIds.length === 1 ? selectedListIds[0] : undefined)} />
        ) : (
          <OperationsBoard
            rows={rows}
            taskLists={taskLists}
            departments={departments}
            statuses={statuses}
            selectedListIds={selectedListIds}
            setSelectedListIds={setSelectedListIds}
            setSelectedTask={setSelectedTask}
            setSelectedList={setSelectedList}
            onCreateTask={openCreateTask}
            onRefresh={refresh}
          />
        )
      ) : null}

      {selectedTask ? <TaskPreviewModal item={selectedTask} statuses={statuses} onClose={() => setSelectedTask(null)} onSaved={refresh} /> : null}
      {isCreateTaskOpen ? <TaskCreateModal taskLists={taskLists} statuses={statuses} defaultTaskListId={createTaskListId || undefined} onClose={() => setIsCreateTaskOpen(false)} onSaved={refresh} /> : null}
      {selectedList ? <TaskListModal list={selectedList} departments={departments} onClose={() => setSelectedList(null)} onSaved={refresh} /> : null}
    </Shell>
  );
}
