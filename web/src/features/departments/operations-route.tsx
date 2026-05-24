import { DragEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import { userErrorMessage } from "../../api/errors";
import { CcButton } from "../../components/cc-button";
import { CcField } from "../../components/cc-field";
import { CcNotice } from "../../components/cc-notice";
import { CcResourceSelector, type CcResourceSelectorGroup } from "../../components/cc-resource-selector";
import { CcTextInput } from "../../components/cc-text-input";
import { Shell } from "../../layout/shell";
import { useOwnerPacket } from "../../hooks/use-owner-packet";
import { useLanguage } from "../../i18n/i18n";
import { CoreAreaKey, OperationsDepartment, OperationsPacket, OperationsStatusColumn, OperationsTaskList, OperationsWorkItem } from "../../types";
import { departmentLabel } from "./department-labels";

type OperationsView = "tasks" | "calendar";
type CalendarMode = "day" | "week" | "month";
type TaskPriorityFilter = "all" | string;
type TaskDateFilter = "all" | "overdue" | "today" | "week" | "unscheduled";

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

function formatLongDate(value: Date) {
  return new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric", year: "numeric" }).format(value);
}

function formatWeekday(value: Date) {
  return new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric" }).format(value);
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

function endOfWeek(value = new Date()) {
  return addDays(startOfWeek(value), 6);
}

function daysInMonth(value: Date) {
  const first = new Date(value.getFullYear(), value.getMonth(), 1);
  const days = new Date(value.getFullYear(), value.getMonth() + 1, 0).getDate();
  return Array.from({ length: days }, (_, index) => new Date(first.getFullYear(), first.getMonth(), index + 1));
}

function addDays(value: Date, amount: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + amount);
  return next;
}

function addMonths(value: Date, amount: number) {
  const next = new Date(value);
  next.setMonth(next.getMonth() + amount, 1);
  return next;
}

function inputMonth(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
}

function inputWeek(value: Date) {
  const date = startOfWeek(value);
  const yearStart = startOfWeek(new Date(date.getFullYear(), 0, 4));
  const week = Math.floor((date.getTime() - yearStart.getTime()) / 604800000) + 1;
  return `${date.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function weekFromInput(value: string) {
  const match = /^(\d{4})-W(\d{2})$/.exec(value);
  if (!match) return startOfWeek();
  const year = Number(match[1]);
  const week = Number(match[2]);
  const firstWeekStart = startOfWeek(new Date(year, 0, 4));
  return addDays(firstWeekStart, (week - 1) * 7);
}

function monthFromInput(value: string) {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return new Date();
  return new Date(year, month - 1, 1);
}

function statusTone(status?: string) {
  if (status === "blocked") return "roost-task-card--blocked";
  if (status === "done" || status === "archived") return "roost-task-card--done";
  if (status === "in_progress") return "roost-task-card--progress";
  return "";
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

function taskMatchesDateFilter(row: OperationsWorkItem, dateFilter: TaskDateFilter) {
  if (dateFilter === "all") return true;
  const calendarDate = row.task.startDate || row.task.dueDate;
  if (!calendarDate) return dateFilter === "unscheduled";
  const dueDate = startOfDay(new Date(calendarDate));
  const today = startOfDay();
  if (dateFilter === "overdue") return dueDate.getTime() < today.getTime() && row.task.status !== "done" && row.task.status !== "archived";
  if (dateFilter === "today") return sameDay(dueDate, today);
  if (dateFilter === "week") {
    const weekStart = startOfWeek(today);
    const weekEnd = endOfWeek(today);
    return dueDate.getTime() >= weekStart.getTime() && dueDate.getTime() <= weekEnd.getTime();
  }
  return false;
}

function taskCalendarDate(row: OperationsWorkItem) {
  return row.task.startDate || row.task.dueDate || null;
}

function taskMatchesFilters(row: OperationsWorkItem, query: string, priorityFilter: TaskPriorityFilter, dateFilter: TaskDateFilter) {
  const normalizedQuery = query.trim().toLowerCase();
  const priority = (row.task.priority || "normal").toLowerCase();
  const priorityMatch = priorityFilter === "all" || priority === priorityFilter;
  if (!priorityMatch) return false;
  if (!taskMatchesDateFilter(row, dateFilter)) return false;
  if (!normalizedQuery) return true;
  return [
    row.task.title,
    row.task.description,
    row.task.status,
    row.task.priority,
    row.task.source,
    row.hierarchy?.taskList?.name,
    row.hierarchy?.project?.name
  ].filter(Boolean).join(" ").toLowerCase().includes(normalizedQuery);
}

function listDepartmentKey(list: OperationsTaskList) {
  return list.areaAssignment?.department?.key ?? null;
}

function selectableTaskLists(taskLists: OperationsTaskList[]) {
  return taskLists.filter((list) => list.id !== "all" && list.id !== "unassigned");
}

function selectableTaskListIds(taskLists: OperationsTaskList[]) {
  return [
    ...selectableTaskLists(taskLists).map((list) => list.id),
    ...(taskLists.some((list) => list.id === "unassigned") ? ["unassigned"] : [])
  ];
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
  isDragging,
  density = "board",
  draggable = true
}: {
  row: OperationsWorkItem;
  onOpen: () => void;
  onDragStart?: (event: DragEvent<HTMLButtonElement>) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  density?: "board" | "calendar" | "month";
  draggable?: boolean;
}) {
  const isMonth = density === "month";
  const isCalendar = density === "calendar";
  return (
    <button
      className={`roost-task-card grid rounded-company border text-left transition hover:border-primary ${isMonth ? "gap-1 px-2 py-1.5" : isCalendar ? "gap-1.5 p-2.5" : "gap-2 p-3"} ${isDragging ? "opacity-55 ring-2 ring-primary/25" : ""} ${statusTone(row.task.status)}`}
      draggable={draggable}
      data-task-card-id={row.id}
      onClick={onOpen}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      type="button"
    >
      <div className="flex items-start justify-between gap-2">
        <strong className={`${isMonth ? "line-clamp-1 text-xs" : isCalendar ? "line-clamp-2 text-xs leading-4" : "line-clamp-2 text-sm leading-5"} text-company-ink`}>{row.task.title}</strong>
        {draggable ? <i className="ph-bold ph-dots-six-vertical mt-0.5 shrink-0 text-company-muted" aria-hidden="true"></i> : null}
      </div>
      {!isMonth ? <div className="flex flex-wrap gap-1.5">
        <PriorityBadge priority={row.task.priority} />
        {!isCalendar ? <DueBadge dueDate={row.task.dueDate} overdue={row.readiness?.overdue} /> : null}
        {!isCalendar && row.task.description ? <span className="badge badge-ghost badge-sm gap-1"><i className="ph-bold ph-text-align-left" aria-hidden="true"></i></span> : null}
        {!isCalendar && row.evidence?.projectResources?.length ? <span className="badge badge-ghost badge-sm gap-1"><i className="ph-bold ph-paperclip" aria-hidden="true"></i></span> : null}
        {!isCalendar && row.responsibility?.assignedWorkforceEntity ? <span className="badge badge-ghost badge-sm gap-1"><i className="ph-bold ph-user-focus" aria-hidden="true"></i>{row.responsibility.assignedWorkforceEntity.name}</span> : null}
        {!isCalendar && row.task.startDate ? <span className="badge badge-outline badge-sm gap-1"><i className="ph-bold ph-play-circle" aria-hidden="true"></i>{formatDate(row.task.startDate)}</span> : null}
        {row.readiness?.blocked ? <span className="badge badge-error badge-outline badge-sm">{row.readiness.dependencyCount || "!"}</span> : null}
      </div> : null}
      {!isMonth && !isCalendar ? <span className="truncate text-xs text-company-muted">{row.hierarchy?.project?.name || row.hierarchy?.taskList?.name || row.task.source || "native"}</span> : null}
    </button>
  );
}

function OperationsTaskFilterBar({
  query,
  priorityFilter,
  dateFilter,
  visibleCount,
  onQueryChange,
  onPriorityFilterChange,
  onDateFilterChange,
  onClear
}: {
  query: string;
  priorityFilter: TaskPriorityFilter;
  dateFilter: TaskDateFilter;
  visibleCount: number;
  onQueryChange: (value: string) => void;
  onPriorityFilterChange: (value: TaskPriorityFilter) => void;
  onDateFilterChange: (value: TaskDateFilter) => void;
  onClear: () => void;
}) {
  const { t } = useLanguage();
  const hasActiveFilter = query.trim().length > 0 || priorityFilter !== "all" || dateFilter !== "all";
  return (
    <div className="roost-work-panel grid gap-2 rounded-company p-2.5 md:grid-cols-[minmax(0,1fr)_12rem_12rem_auto_auto] md:items-center">
      <label className="input input-bordered input-sm flex min-w-0 items-center gap-2 bg-base-200/40">
        <i className="ph-bold ph-magnifying-glass text-company-muted" aria-hidden="true"></i>
        <span className="sr-only">{t("operations.searchTasks")}</span>
        <input className="grow" onChange={(event) => onQueryChange(event.target.value)} placeholder={t("operations.searchTasks")} type="search" value={query} />
      </label>
      <select aria-label={t("operations.priorityFilter")} className="select select-bordered select-sm" onChange={(event) => onPriorityFilterChange(event.target.value)} value={priorityFilter}>
        <option value="all">{t("operations.allPriorities")}</option>
        {priorityOptions.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
      </select>
      <select aria-label={t("operations.dateFilter")} className="select select-bordered select-sm" onChange={(event) => onDateFilterChange(event.target.value as TaskDateFilter)} value={dateFilter}>
        {(["all", "overdue", "today", "week", "unscheduled"] as TaskDateFilter[]).map((option) => (
          <option key={option} value={option}>{t(`operations.dateFilter.${option}`)}</option>
        ))}
      </select>
      <span className="justify-self-start whitespace-nowrap text-xs font-bold text-company-muted md:justify-self-end">{t("operations.matchingTasks", { count: visibleCount })}</span>
      <button className="btn btn-ghost btn-sm" disabled={!hasActiveFilter} onClick={onClear} type="button">{t("operations.clearTaskFilters")}</button>
    </div>
  );
}

function TaskFields({
  mode,
  taskLists,
  statuses,
  assignmentOptions,
  item,
  defaultTaskListId
}: {
  mode: "create" | "edit";
  taskLists: OperationsTaskList[];
  statuses: OperationsStatusColumn[];
  assignmentOptions?: OperationsPacket["assignmentOptions"];
  item?: OperationsWorkItem;
  defaultTaskListId?: string;
}) {
  const { t } = useLanguage();
  const lists = selectableTaskLists(taskLists);
  const users = assignmentOptions?.users || [];
  const workforceEntities = assignmentOptions?.workforceEntities || [];
  const defaultList = item?.hierarchy?.taskList?.id
    ?? (defaultTaskListId && lists.some((list) => list.id === defaultTaskListId) ? defaultTaskListId : lists[0]?.id)
    ?? "";

  return (
    <section className="grid gap-4">
      <CcField label={t("operations.titleField")} required>
        {({ id, describedBy, invalid }) => (
          <CcTextInput
            aria-describedby={describedBy}
            aria-invalid={invalid}
            autoFocus={mode === "create"}
            defaultValue={item?.task.title || ""}
            id={id}
            name="title"
            required
          />
        )}
      </CcField>

      <label className="form-control">
        <span className="label"><span className="label-text font-bold"><i className="ph-bold ph-text-align-left mr-1" aria-hidden="true"></i>{t("operations.descriptionField")}</span></span>
        <textarea className="textarea textarea-bordered min-h-32 w-full" name="description" defaultValue={item?.task.description || ""}></textarea>
      </label>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="form-control">
          <span className="label"><span className="label-text font-bold">{t("operations.taskListField")}</span></span>
          <select className="select select-bordered w-full" name="taskListId" defaultValue={defaultList}>
            <option value="">{t("operations.unassigned")}</option>
            {lists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}
          </select>
        </label>

        <label className="form-control">
          <span className="label"><span className="label-text font-bold">{t("table.status")}</span></span>
          <select className="select select-bordered w-full" name="status" defaultValue={item?.task.status || statuses[0]?.key || "todo"}>
            {statuses.map((status) => <option key={status.key} value={status.key}>{status.label}</option>)}
          </select>
        </label>

        <label className="form-control">
          <span className="label"><span className="label-text font-bold">{t("table.priority")}</span></span>
          <select className="select select-bordered w-full" name="priority" defaultValue={item?.task.priority || "medium"}>
            {priorityOptions.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
          </select>
        </label>

        <CcField label={t("table.dueDate")}>
          {({ id }) => <CcTextInput id={id} name="dueDate" type="date" defaultValue={inputDate(item?.task.dueDate)} />}
        </CcField>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <CcField label="Start date">
          {({ id }) => <CcTextInput id={id} name="startDate" type="date" defaultValue={inputDate(item?.task.startDate)} />}
        </CcField>
        <CcField label="Estimated end">
          {({ id }) => <CcTextInput id={id} name="estimatedEndDate" type="date" defaultValue={inputDate(item?.task.estimatedEndDate)} />}
        </CcField>
        <CcField label="Duration minutes">
          {({ id }) => (
            <CcTextInput
              id={id}
              min={0}
              name="estimatedDurationMinutes"
              type="number"
              defaultValue={item?.task.estimatedDurationMinutes == null ? "" : String(item.task.estimatedDurationMinutes)}
            />
          )}
        </CcField>
        <CcField label="Recurrence rule">
          {({ id }) => <CcTextInput id={id} name="recurrenceRule" placeholder="FREQ=WEEKLY;INTERVAL=1" defaultValue={item?.task.recurrenceRule || ""} />}
        </CcField>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="form-control">
          <span className="label"><span className="label-text font-bold">Owner</span></span>
          <select className="select select-bordered w-full" name="ownerUserId" defaultValue={item?.responsibility?.ownerUserId || ""}>
            <option value="">Unassigned owner</option>
            {users.map((user) => <option key={user.id} value={user.id}>{user.name || user.email || user.id}</option>)}
          </select>
        </label>
        <label className="form-control">
          <span className="label"><span className="label-text font-bold">Assigned person/agent</span></span>
          <select className="select select-bordered w-full" name="assignedWorkforceEntityId" defaultValue={item?.responsibility?.assignedWorkforceEntityId || ""}>
            <option value="">Unassigned execution</option>
            {workforceEntities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name} ({entity.type || "entity"})</option>)}
          </select>
        </label>
        <label className="form-control">
          <span className="label"><span className="label-text font-bold">Reviewer</span></span>
          <select className="select select-bordered w-full" name="reviewerUserId" defaultValue={item?.responsibility?.reviewerUserId || ""}>
            <option value="">No reviewer</option>
            {users.map((user) => <option key={user.id} value={user.id}>{user.name || user.email || user.id}</option>)}
          </select>
        </label>
      </div>
    </section>
  );
}

function TaskPreviewModal({
  item,
  taskLists,
  statuses,
  assignmentOptions,
  onClose,
  onSaved
}: {
  item: OperationsWorkItem;
  taskLists: OperationsTaskList[];
  statuses: OperationsStatusColumn[];
  assignmentOptions?: OperationsPacket["assignmentOptions"];
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
    const startDate = String(form.get("startDate") || "");
    const estimatedEndDate = String(form.get("estimatedEndDate") || "");
    const estimatedDurationMinutes = String(form.get("estimatedDurationMinutes") || "");
    const taskListId = String(form.get("taskListId") || "");
    const ownerUserId = String(form.get("ownerUserId") || "");
    const assignedWorkforceEntityId = String(form.get("assignedWorkforceEntityId") || "");
    const reviewerUserId = String(form.get("reviewerUserId") || "");
    const recurrenceRule = String(form.get("recurrenceRule") || "");
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
          taskListId: taskListId || null,
          dueDate: dueDate ? new Date(`${dueDate}T00:00:00.000Z`).toISOString() : null,
          startDate: startDate ? new Date(`${startDate}T00:00:00.000Z`).toISOString() : null,
          estimatedEndDate: estimatedEndDate ? new Date(`${estimatedEndDate}T00:00:00.000Z`).toISOString() : null,
          estimatedDurationMinutes: estimatedDurationMinutes ? Number(estimatedDurationMinutes) : null,
          recurrenceRule: recurrenceRule || null,
          ownerUserId: ownerUserId || null,
          assignedWorkforceEntityId: assignedWorkforceEntityId || null,
          reviewerUserId: reviewerUserId || null
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

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <section className="grid gap-4">
            <TaskFields assignmentOptions={assignmentOptions} item={item} mode="edit" statuses={statuses} taskLists={taskLists} />
            {error ? <CcNotice tone="error" title={error} live /> : null}
          </section>

          <aside className="grid content-start gap-3">
            <section className="rounded-company border border-base-300 bg-base-200/50 p-4">
              <h3 className="text-sm font-black uppercase text-company-ink">{t("operations.operationalDetail")}</h3>
              <dl className="mt-3 grid gap-3 text-sm">
                <div><dt className="font-bold text-company-muted">{t("table.list")}</dt><dd>{item.hierarchy?.taskList?.name || t("operations.unassigned")}</dd></div>
                <div><dt className="font-bold text-company-muted">{t("operations.project")}</dt><dd>{item.hierarchy?.project?.name || "-"}</dd></div>
                <div><dt className="font-bold text-company-muted">{t("table.status")}</dt><dd>{item.task.status || "-"}</dd></div>
                <div><dt className="font-bold text-company-muted">Owner</dt><dd>{item.responsibility?.ownerUser?.name || item.responsibility?.ownerUser?.email || "-"}</dd></div>
                <div><dt className="font-bold text-company-muted">Assigned</dt><dd>{item.responsibility?.assignedWorkforceEntity?.name || "-"}</dd></div>
                <div><dt className="font-bold text-company-muted">Schedule</dt><dd>{formatDate(item.task.startDate)} {"->"} {formatDate(item.task.estimatedEndDate || item.task.dueDate)}</dd></div>
                <div><dt className="font-bold text-company-muted">Duration</dt><dd>{item.task.estimatedDurationMinutes ? `${item.task.estimatedDurationMinutes} min` : "-"}</dd></div>
                <div><dt className="font-bold text-company-muted">{t("operations.updated")}</dt><dd>{formatDate(item.task.updatedAt)}</dd></div>
              </dl>
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
  assignmentOptions,
  defaultTaskListId,
  onClose,
  onSaved
}: {
  taskLists: OperationsTaskList[];
  statuses: OperationsStatusColumn[];
  assignmentOptions?: OperationsPacket["assignmentOptions"];
  defaultTaskListId?: string;
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
    const startDate = String(form.get("startDate") || "");
    const estimatedEndDate = String(form.get("estimatedEndDate") || "");
    const estimatedDurationMinutes = String(form.get("estimatedDurationMinutes") || "");
    const taskListId = String(form.get("taskListId") || "");
    const ownerUserId = String(form.get("ownerUserId") || "");
    const assignedWorkforceEntityId = String(form.get("assignedWorkforceEntityId") || "");
    const reviewerUserId = String(form.get("reviewerUserId") || "");
    const recurrenceRule = String(form.get("recurrenceRule") || "");
    setSaveState("saving");
    setError("");

    try {
      await api("/v1/operations/work-items", {
        method: "POST",
        body: JSON.stringify({
          title: String(form.get("title") || ""),
          description: String(form.get("description") || ""),
          status: String(form.get("status") || "todo"),
          priority: String(form.get("priority") || ""),
          taskListId: taskListId || undefined,
          dueDate: dueDate ? new Date(`${dueDate}T00:00:00.000Z`).toISOString() : undefined,
          startDate: startDate ? new Date(`${startDate}T00:00:00.000Z`).toISOString() : undefined,
          estimatedEndDate: estimatedEndDate ? new Date(`${estimatedEndDate}T00:00:00.000Z`).toISOString() : undefined,
          estimatedDurationMinutes: estimatedDurationMinutes ? Number(estimatedDurationMinutes) : undefined,
          recurrenceRule: recurrenceRule || undefined,
          ownerUserId: ownerUserId || undefined,
          assignedWorkforceEntityId: assignedWorkforceEntityId || undefined,
          reviewerUserId: reviewerUserId || undefined
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

        <TaskFields assignmentOptions={assignmentOptions} defaultTaskListId={defaultTaskListId} mode="create" statuses={statuses} taskLists={taskLists} />

        {error ? <CcNotice tone="error" title={error} live /> : null}

        <div className="flex flex-wrap justify-end gap-2">
          <CcButton onClick={onClose} variant="ghost">{t("operations.cancel")}</CcButton>
          <CcButton loading={saveState === "saving"} type="submit" variant="primary">{t("operations.createTask")}</CcButton>
        </div>
      </form>
    </div>
  );
}

function TaskListFields({
  list,
  departments
}: {
  list?: OperationsTaskList | null;
  departments: OperationsDepartment[];
}) {
  const { t } = useLanguage();
  return (
    <>
      <CcField label={t("operations.listName")} required>
        {({ id }) => <CcTextInput autoFocus={!list} id={id} name="name" defaultValue={list?.name || ""} required />}
      </CcField>
      <label className="form-control">
        <span className="label"><span className="label-text font-bold">{t("operations.descriptionField")}</span></span>
        <textarea className="textarea textarea-bordered min-h-24 w-full" name="description" defaultValue={list?.description || ""}></textarea>
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="form-control">
          <span className="label"><span className="label-text font-bold">{t("table.status")}</span></span>
          <select className="select select-bordered w-full" name="status" defaultValue={list?.status || "active"}>
            {["active", "paused", "archived"].map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        <label className="form-control">
          <span className="label"><span className="label-text font-bold">{t("operations.departmentAssignment")}</span></span>
          <select className="select select-bordered w-full" name="departmentKey" defaultValue={list?.areaAssignment?.department?.key || ""}>
            <option value="">{t("operations.noDepartment")}</option>
            {departments.map((department) => <option key={department.key} value={department.key}>{departmentLabel(department.key, t)}</option>)}
          </select>
        </label>
      </div>
    </>
  );
}

function TaskListModal({
  list,
  departments,
  onClose,
  onSaved
}: {
  list?: OperationsTaskList | null;
  departments: OperationsDepartment[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useLanguage();
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState("");
  const isCreate = !list;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaveState("saving");
    setError("");

    try {
      const payload = {
        name: String(form.get("name") || ""),
        description: String(form.get("description") || ""),
        status: String(form.get("status") || "active")
      };
      const departmentKey = String(form.get("departmentKey") || "") || null;
      if (isCreate) {
        const response = await api<{ data?: OperationsTaskList }>("/v1/task-lists", {
          method: "POST",
          body: JSON.stringify({ ...payload, source: "companycore" })
        });
        if (response.data?.id && departmentKey) {
          await api(`/v1/operations/task-lists/${response.data.id}`, {
            method: "PATCH",
            body: JSON.stringify({ departmentKey })
          });
        }
      } else {
        await api(`/v1/operations/task-lists/${list!.id}`, {
          method: "PATCH",
          body: JSON.stringify({ ...payload, departmentKey })
        });
      }
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
            <p className="text-xs font-black uppercase text-primary">{list?.source || t("state.native")}</p>
            <h2 className="text-2xl font-black text-company-ink" id="operations-list-modal-title">{t(isCreate ? "operations.createList" : "operations.editList")}</h2>
          </div>
          <CcButton ariaLabel={t("operations.closeTask")} onClick={onClose} size="sm" variant="ghost">
            <i className="ph-bold ph-x" aria-hidden="true"></i>
            <span className="sr-only">{t("operations.closeTask")}</span>
          </CcButton>
        </div>
        <TaskListFields departments={departments} list={list} />
        {error ? <CcNotice tone="error" title={error} live /> : null}
        <div className="flex flex-wrap justify-end gap-2 border-t border-base-300 pt-4">
          <CcButton onClick={onClose} variant="ghost">{t("operations.cancel")}</CcButton>
          <CcButton loading={saveState === "saving"} type="submit" variant="primary">{t(isCreate ? "operations.createList" : "operations.saveList")}</CcButton>
        </div>
      </form>
    </div>
  );
}

function WorkflowSettingsModal({
  statuses,
  onClose
}: {
  statuses: OperationsStatusColumn[];
  onClose: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-neutral/55 p-4" role="dialog" aria-modal="true" aria-labelledby="operations-workflow-settings-title">
      <section className="grid max-h-[92vh] w-full max-w-3xl gap-5 overflow-y-auto rounded-company border border-base-300 bg-base-100 p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-primary">{t("operations.workflowSettings.eyebrow")}</p>
            <h2 className="text-2xl font-black text-company-ink" id="operations-workflow-settings-title">{t("operations.workflowSettings.title")}</h2>
            <p className="mt-1 max-w-2xl text-sm text-company-muted">{t("operations.workflowSettings.description")}</p>
          </div>
          <CcButton ariaLabel={t("operations.closeTask")} onClick={onClose} size="sm" variant="ghost">
            <i className="ph-bold ph-x" aria-hidden="true"></i>
            <span className="sr-only">{t("operations.closeTask")}</span>
          </CcButton>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-company border border-base-300 bg-base-200/50 p-4">
            <h3 className="text-sm font-black uppercase text-company-ink">{t("operations.workflowSettings.statuses")}</h3>
            <div className="mt-3 grid gap-2">
              {statuses.map((status, index) => (
                <div className="grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-2 rounded-company border border-base-300 bg-base-100 px-3 py-2" key={status.key}>
                  <span className="text-xs font-black text-company-muted">{index + 1}</span>
                  <span className="truncate font-bold text-company-ink">{status.label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-company border border-base-300 bg-base-200/50 p-4">
            <h3 className="text-sm font-black uppercase text-company-ink">{t("operations.workflowSettings.priorities")}</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {priorityOptions.map((priority) => <PriorityBadge key={priority} priority={priority} />)}
            </div>
            <p className="mt-4 text-sm leading-6 text-company-muted">{t("operations.workflowSettings.mappingNote")}</p>
          </section>
        </div>

        <div className="rounded-company border border-dashed border-base-300 bg-base-200/40 p-4 text-sm text-company-muted">
          {t("operations.workflowSettings.writeGuard")}
        </div>
      </section>
    </div>
  );
}

function OperationsListSelector({
  taskLists,
  departments,
  selectedListIds,
  setSelectedListIds,
  setSelectedList,
  onCreateList
}: {
  taskLists: OperationsTaskList[];
  departments: OperationsDepartment[];
  selectedListIds: string[];
  setSelectedListIds: (listIds: string[]) => void;
  setSelectedList: (list: OperationsTaskList) => void;
  onCreateList: () => void;
}) {
  const { t } = useLanguage();
  const unassignedList = taskLists.find((list) => list.id === "unassigned");
  const realLists = selectableTaskLists(taskLists);
  const selectableListIds = selectableTaskListIds(taskLists);
  const groups: CcResourceSelectorGroup[] = departments.map((department) => ({
    id: department.key,
    title: departmentLabel(department.key, t),
    items: realLists.filter((list) => listDepartmentKey(list) === department.key).map((list) => ({
      id: list.id,
      title: list.name,
      detail: list.areaAssignment?.department?.key ? departmentLabel(list.areaAssignment.department.key, t) : list.project?.name || list.source || t("state.native"),
      actionLabel: t("operations.editList"),
      actionIcon: "ph-gear-six",
      onAction: () => setSelectedList(list)
    }))
  })).filter((group) => group.items.length > 0);
  const noDepartment = realLists.filter((list) => !listDepartmentKey(list));

  return (
    <CcResourceSelector
      allDetail={t("operations.visibleResources", { count: selectableListIds.length })}
      allLabel={t("operations.allTasks")}
      clearLabel={t("operations.clearLists")}
      createLabel={t("operations.newList")}
      emptyLabel={t("operations.noMatchingLists")}
      groups={groups}
      onCreate={onCreateList}
      onSelectedIdsChange={setSelectedListIds}
      searchLabel={t("operations.searchLists")}
      searchPlaceholder={t("operations.searchLists")}
      selectedIds={selectedListIds}
      title={t("operations.lists")}
      ungroupedItems={[
        ...noDepartment.map((list) => ({
          id: list.id,
          title: list.name,
          detail: list.project?.name || list.source || t("state.native"),
          actionLabel: t("operations.editList"),
          actionIcon: "ph-gear-six",
          onAction: () => setSelectedList(list)
        })),
        ...(unassignedList ? [{
          id: unassignedList.id,
          title: unassignedList.name,
          detail: t("operations.unassigned"),
          actionLabel: t("operations.editList"),
          actionIcon: "ph-gear-six",
          onAction: () => setSelectedList(unassignedList)
        }] : [])
      ]}
      ungroupedTitle={t("operations.unassigned")}
    />
  );
}

function OperationsBoard({
  rows,
  statuses,
  selectedListIds,
  hasSelectableLists,
  setSelectedTask,
  onCreateTask,
  onRefresh,
  onOpenWorkflowSettings,
  taskQuery,
  priorityFilter,
  dateFilter,
  onTaskQueryChange,
  onPriorityFilterChange,
  onDateFilterChange,
  onClearTaskFilters
}: {
  rows: OperationsWorkItem[];
  statuses: OperationsStatusColumn[];
  selectedListIds: string[];
  hasSelectableLists: boolean;
  setSelectedTask: (task: OperationsWorkItem) => void;
  onCreateTask: (defaultTaskListId?: string) => void;
  onRefresh: () => void;
  onOpenWorkflowSettings: () => void;
  taskQuery: string;
  priorityFilter: TaskPriorityFilter;
  dateFilter: TaskDateFilter;
  onTaskQueryChange: (value: string) => void;
  onPriorityFilterChange: (value: TaskPriorityFilter) => void;
  onDateFilterChange: (value: TaskDateFilter) => void;
  onClearTaskFilters: () => void;
}) {
  const { t } = useLanguage();
  const [draggedTaskId, setDraggedTaskId] = useState("");
  const [dragOverStatus, setDragOverStatus] = useState("");
  const [moveError, setMoveError] = useState("");
  const selectedSet = new Set(selectedListIds);
  const visibleRows = rows.filter((row) => {
    const listId = row.hierarchy?.taskList?.id || "unassigned";
    return selectedSet.has(listId);
  });
  const allSelected = selectedListIds.length > 0 && visibleRows.length === rows.length;
  const selectedLabel = !hasSelectableLists
    ? t("operations.noTaskLists")
    : selectedListIds.length === 0
    ? t("operations.noListsSelected")
    : allSelected
      ? t("operations.allTasks")
      : t("operations.selectedLists", { count: selectedSet.size });
  const hasActiveTaskFilter = taskQuery.trim().length > 0 || priorityFilter !== "all" || dateFilter !== "all";

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

  return (
    <div className="roost-work-surface grid h-full min-h-0 min-w-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-3 rounded-company p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-black text-company-ink">{selectedLabel}</h2>
            <p className="line-clamp-1 text-sm text-company-muted">{t("operations.boardDescription")}</p>
          </div>
          <div className="flex gap-2">
            <CcButton onClick={onOpenWorkflowSettings} iconLeft="ph-sliders-horizontal" size="sm" variant="outline">{t("operations.workflowSettings.short")}</CcButton>
            <CcButton onClick={() => onCreateTask(selectedListIds.length === 1 ? selectedListIds[0] : undefined)} iconLeft="ph-plus" size="sm" variant="primary">{t("operations.newTask")}</CcButton>
          </div>
        </div>

        {moveError ? <CcNotice tone="error" title={moveError} live /> : null}
        <OperationsTaskFilterBar
          dateFilter={dateFilter}
          onClear={onClearTaskFilters}
          onDateFilterChange={onDateFilterChange}
          onPriorityFilterChange={onPriorityFilterChange}
          onQueryChange={onTaskQueryChange}
          priorityFilter={priorityFilter}
          query={taskQuery}
          visibleCount={visibleRows.length}
        />

        {!hasSelectableLists ? (
          <div className="roost-empty-state grid min-h-0 place-items-center rounded-company p-8 text-center">
            <div>
              <i className="ph-bold ph-list-plus text-3xl text-company-muted" aria-hidden="true"></i>
              <h3 className="mt-3 font-black text-company-ink">{t("operations.noTaskLists")}</h3>
              <p className="mt-1 text-sm text-company-muted">{t("operations.noTaskLists.detail")}</p>
              <CcButton className="mt-4" iconLeft="ph-plus" onClick={() => onCreateTask()} variant="primary">{t("operations.newTask")}</CcButton>
            </div>
          </div>
        ) : selectedListIds.length === 0 ? (
          <div className="roost-empty-state grid min-h-0 place-items-center rounded-company p-8 text-center">
            <div>
              <i className="ph-bold ph-check-square-offset text-3xl text-company-muted" aria-hidden="true"></i>
              <h3 className="mt-3 font-black text-company-ink">{t("operations.noListsSelected")}</h3>
              <p className="mt-1 text-sm text-company-muted">{t("operations.noListsSelected.detail")}</p>
            </div>
          </div>
        ) : hasActiveTaskFilter && visibleRows.length === 0 ? (
          <div className="roost-empty-state grid min-h-0 place-items-center rounded-company p-8 text-center">
            <div>
              <i className="ph-bold ph-funnel-x text-3xl text-company-muted" aria-hidden="true"></i>
              <h3 className="mt-3 font-black text-company-ink">{t("operations.noMatchingTasks")}</h3>
              <p className="mt-1 text-sm text-company-muted">{t("operations.noMatchingTasks.detail")}</p>
              <CcButton className="mt-4" iconLeft="ph-x-circle" onClick={onClearTaskFilters} variant="outline">{t("operations.clearTaskFilters")}</CcButton>
            </div>
          </div>
        ) : (
        <div className="grid min-h-0 auto-cols-[minmax(15rem,1fr)] grid-flow-col gap-3 overflow-x-auto pb-3 xl:auto-cols-[minmax(16rem,1fr)]">
          {statuses.map((status) => {
            const columnRows = visibleRows.filter((row) => row.task.status === status.key);
            const draggedTask = draggedTaskId ? visibleRows.find((row) => row.id === draggedTaskId) : null;
            const isDropTarget = dragOverStatus === status.key && !!draggedTask && draggedTask.task.status !== status.key;
            return (
              <section
                className={`grid min-h-0 grid-rows-[auto_minmax(0,1fr)] rounded-company p-3 transition ${isDropTarget ? "border border-primary bg-primary/10 shadow-company-soft ring-2 ring-primary/20" : "roost-work-panel"}`}
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
                    <div className="roost-empty-state grid min-h-24 place-items-center rounded-company px-3 text-center text-sm text-company-muted">
                      {t("operations.emptyColumn")}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
        )}
    </div>
  );
}

function CalendarTaskPill({ row, onOpen, density = "calendar" }: { row: OperationsWorkItem; onOpen: () => void; density?: "calendar" | "month" }) {
  return <TaskCard density={density} draggable={false} row={row} onOpen={onOpen} />;
}

function CalendarColumn({
  title,
  rows,
  setSelectedTask,
  isToday = false
}: {
  title: string;
  rows: OperationsWorkItem[];
  setSelectedTask: (task: OperationsWorkItem) => void;
  isToday?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <section className={`roost-work-panel grid min-h-0 min-w-40 grid-rows-[auto_minmax(0,1fr)] rounded-company p-3 lg:min-w-0 ${isToday ? "ring-1 ring-primary/35" : ""}`}>
      <div className="flex items-center justify-between gap-2 pb-3">
        <h3 className="text-sm font-black text-company-ink">{title}</h3>
        {isToday ? <span className="badge badge-primary badge-sm">{t("operations.calendar.today")}</span> : null}
      </div>
      <div className="grid content-start gap-2 overflow-y-auto pr-1">
        {rows.length ? rows.map((row) => (
          <CalendarTaskPill key={row.id} row={row} onOpen={() => setSelectedTask(row)} />
        )) : (
          <div className="roost-empty-state grid min-h-24 place-items-center rounded-company px-3 text-center text-sm text-company-muted">
            {t("operations.emptyCalendar")}
          </div>
        )}
      </div>
    </section>
  );
}

function CalendarUnscheduledPanel({ rows, setSelectedTask }: { rows: OperationsWorkItem[]; setSelectedTask: (task: OperationsWorkItem) => void }) {
  const { t } = useLanguage();
  if (!rows.length) return null;

  return (
    <aside className="roost-work-panel grid max-h-52 content-start gap-2 overflow-y-auto rounded-company p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-company-ink">{t("operations.unscheduled")}</h3>
          <p className="text-xs text-company-muted">{t("operations.unscheduledHint")}</p>
        </div>
        <span className="badge badge-outline badge-sm">{rows.length}</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        {rows.slice(0, 10).map((row) => (
          <CalendarTaskPill density="calendar" key={row.id} row={row} onOpen={() => setSelectedTask(row)} />
        ))}
      </div>
    </aside>
  );
}

function OperationsCalendar({
  rows,
  selectedListIds,
  hasSelectableLists,
  taskQuery,
  priorityFilter,
  dateFilter,
  setSelectedTask,
  onCreateTask,
  onOpenWorkflowSettings,
  onTaskQueryChange,
  onPriorityFilterChange,
  onDateFilterChange,
  onClearTaskFilters
}: {
  rows: OperationsWorkItem[];
  selectedListIds: string[];
  hasSelectableLists: boolean;
  taskQuery: string;
  priorityFilter: TaskPriorityFilter;
  dateFilter: TaskDateFilter;
  setSelectedTask: (task: OperationsWorkItem) => void;
  onCreateTask: () => void;
  onOpenWorkflowSettings: () => void;
  onTaskQueryChange: (value: string) => void;
  onPriorityFilterChange: (value: TaskPriorityFilter) => void;
  onDateFilterChange: (value: TaskDateFilter) => void;
  onClearTaskFilters: () => void;
}) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<CalendarMode>("week");
  const [anchorDate, setAnchorDate] = useState(() => startOfDay());
  const calendarLabels: Record<CalendarMode, string> = {
    day: t("operations.calendar.day"),
    week: t("operations.calendar.week"),
    month: t("operations.calendar.month")
  };
  const modeIcons: Record<CalendarMode, string> = {
    day: "ph-calendar-blank",
    week: "ph-columns",
    month: "ph-calendar-dots"
  };
  const step = mode === "day" ? 1 : mode === "week" ? 7 : 1;
  const datedRows = rows.filter((row) => taskCalendarDate(row));
  const unscheduledRows = rows.filter((row) => !taskCalendarDate(row));
  const dayRows = datedRows.filter((row) => sameDay(new Date(taskCalendarDate(row)!), anchorDate));
  const weekStart = startOfWeek(anchorDate);
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + index);
    return day;
  });
  const monthDays = daysInMonth(anchorDate);
  const monthOffset = monthDays[0] ? ((monthDays[0].getDay() || 7) - 1) : 0;
  const rangeLabel = mode === "day"
    ? formatLongDate(anchorDate)
    : mode === "week"
      ? `${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(weekDays[0])} - ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(weekDays[6])}`
      : new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(anchorDate);
  const hasActiveTaskFilter = taskQuery.trim().length > 0 || priorityFilter !== "all" || dateFilter !== "all";

  function moveRange(direction: -1 | 1) {
    setAnchorDate((current) => mode === "month" ? addMonths(current, direction) : addDays(current, step * direction));
  }

  function updateDateInput(value: string) {
    if (!value) return;
    setAnchorDate(startOfDay(new Date(`${value}T00:00:00`)));
  }

  return (
    <section className="roost-work-surface grid h-full min-h-0 grid-rows-[auto_auto_auto_minmax(0,1fr)_auto] gap-4 rounded-company p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-company-ink">{t("operations.calendarTitle")}</h2>
          <p className="text-sm text-company-muted">{rangeLabel}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <CcButton onClick={onOpenWorkflowSettings} iconLeft="ph-sliders-horizontal" size="sm" variant="outline">{t("operations.workflowSettings.short")}</CcButton>
          <CcButton onClick={onCreateTask} iconLeft="ph-plus" size="sm" variant="primary">{t("operations.newTask")}</CcButton>
          <div className="join" aria-label={t("operations.calendar.viewSwitch")}>
            {(["day", "week", "month"] as CalendarMode[]).map((option) => (
              <button
                aria-label={calendarLabels[option]}
                className={`tooltip btn join-item btn-sm w-11 ${mode === option ? "btn-primary" : "btn-outline"}`}
                data-tip={calendarLabels[option]}
                key={option}
                onClick={() => setMode(option)}
                title={calendarLabels[option]}
                type="button"
              >
                <i className={`ph-bold ${modeIcons[option]}`} aria-hidden="true"></i>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="roost-work-panel flex flex-wrap items-center justify-between gap-2 rounded-company p-2">
        <div className="join">
          <button aria-label={t("operations.calendar.previous")} className="btn btn-outline btn-sm join-item" onClick={() => moveRange(-1)} title={t("operations.calendar.previous")} type="button">
            <i className="ph-bold ph-caret-left" aria-hidden="true"></i>
          </button>
          <button className="btn btn-outline btn-sm join-item min-w-36 cursor-default justify-start md:min-w-56" type="button">
            <i className="ph-bold ph-clock-counter-clockwise" aria-hidden="true"></i>
            <span className="truncate">{rangeLabel}</span>
          </button>
          <button aria-label={t("operations.calendar.next")} className="btn btn-outline btn-sm join-item" onClick={() => moveRange(1)} title={t("operations.calendar.next")} type="button">
            <i className="ph-bold ph-caret-right" aria-hidden="true"></i>
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {mode === "month" ? (
            <input aria-label={t("operations.calendar.pickMonth")} className="input input-bordered input-sm w-36" onChange={(event) => setAnchorDate(monthFromInput(event.target.value))} type="month" value={inputMonth(anchorDate)} />
          ) : mode === "week" ? (
            <input aria-label={t("operations.calendar.pickWeek")} className="input input-bordered input-sm w-36" onChange={(event) => setAnchorDate(weekFromInput(event.target.value))} type="week" value={inputWeek(anchorDate)} />
          ) : (
            <input aria-label={t("operations.calendar.pickDay")} className="input input-bordered input-sm w-36" onChange={(event) => updateDateInput(event.target.value)} type="date" value={inputDate(anchorDate.toISOString())} />
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => {
            setAnchorDate(startOfDay());
            setMode("day");
          }} type="button">{t("operations.calendar.today")}</button>
        </div>
      </div>

      <OperationsTaskFilterBar
        dateFilter={dateFilter}
        onClear={onClearTaskFilters}
        onDateFilterChange={onDateFilterChange}
        onPriorityFilterChange={onPriorityFilterChange}
        onQueryChange={onTaskQueryChange}
        priorityFilter={priorityFilter}
        query={taskQuery}
        visibleCount={rows.length}
      />

      {!hasSelectableLists ? (
        <div className="roost-empty-state grid min-h-0 place-items-center rounded-company p-8 text-center">
          <div>
            <i className="ph-bold ph-calendar-plus text-3xl text-company-muted" aria-hidden="true"></i>
            <h3 className="mt-3 font-black text-company-ink">{t("operations.noTaskLists")}</h3>
            <p className="mt-1 text-sm text-company-muted">{t("operations.noTaskLists.detail")}</p>
            <CcButton className="mt-4" iconLeft="ph-plus" onClick={onCreateTask} variant="primary">{t("operations.newTask")}</CcButton>
          </div>
        </div>
      ) : selectedListIds.length === 0 ? (
        <div className="roost-empty-state grid min-h-0 place-items-center rounded-company p-8 text-center">
          <div>
            <i className="ph-bold ph-calendar-x text-3xl text-company-muted" aria-hidden="true"></i>
            <h3 className="mt-3 font-black text-company-ink">{t("operations.noListsSelected")}</h3>
            <p className="mt-1 text-sm text-company-muted">{t("operations.noListsSelected.detail")}</p>
          </div>
        </div>
      ) : hasActiveTaskFilter && rows.length === 0 ? (
        <div className="roost-empty-state grid min-h-0 place-items-center rounded-company p-8 text-center">
          <div>
            <i className="ph-bold ph-funnel-x text-3xl text-company-muted" aria-hidden="true"></i>
            <h3 className="mt-3 font-black text-company-ink">{t("operations.noMatchingTasks")}</h3>
            <p className="mt-1 text-sm text-company-muted">{t("operations.noMatchingTasks.detail")}</p>
            <CcButton className="mt-4" iconLeft="ph-x-circle" onClick={onClearTaskFilters} variant="outline">{t("operations.clearTaskFilters")}</CcButton>
          </div>
        </div>
      ) : mode === "day" ? (
        <div className="roost-work-panel grid min-h-0 grid-cols-[4.5rem_minmax(0,1fr)] overflow-y-auto rounded-company">
          <div className="border-b border-base-300/70 bg-base-200/35 px-3 py-4 text-xs font-black text-company-muted">{formatWeekday(anchorDate)}</div>
          <div className="grid gap-2 border-b border-base-300 p-3">
            {dayRows.length ? dayRows.map((row) => <CalendarTaskPill key={row.id} row={row} onOpen={() => setSelectedTask(row)} />) : (
              <div className="roost-empty-state grid min-h-24 place-items-center rounded-company px-3 text-center text-sm text-company-muted">{t("operations.emptyCalendar")}</div>
            )}
          </div>
          {Array.from({ length: 12 }, (_, index) => index + 8).map((hour) => (
            <div className="contents" key={hour}>
              <div className="border-b border-base-300/70 bg-base-200/35 px-3 py-4 text-xs font-black text-company-muted">{`${hour}:00`}</div>
              <div className="border-b border-base-300 p-3"></div>
            </div>
          ))}
        </div>
      ) : null}

      {mode === "week" ? (
        <div className="grid min-h-0 auto-cols-[minmax(10rem,1fr)] grid-flow-col gap-3 overflow-x-auto lg:grid-flow-row lg:grid-cols-7 lg:auto-cols-auto">
          {weekDays.map((day) => {
            const dayRows = datedRows.filter((row) => sameDay(new Date(taskCalendarDate(row)!), day));
            return <CalendarColumn isToday={sameDay(day, new Date())} key={day.toISOString()} title={formatWeekday(day)} rows={dayRows} setSelectedTask={setSelectedTask} />;
          })}
        </div>
      ) : null}

      {mode === "month" ? (
        <div className="grid min-h-0 grid-cols-7 gap-2 overflow-y-auto">
          {Array.from({ length: monthOffset }, (_, index) => (
            <div aria-hidden="true" className="roost-work-panel-muted min-h-24 rounded-company opacity-60" key={`blank-${index}`}></div>
          ))}
          {monthDays.map((day) => {
            const dayRows = datedRows.filter((row) => sameDay(new Date(taskCalendarDate(row)!), day));
            return (
              <div className="roost-work-panel grid min-h-24 content-start rounded-company p-2 text-left" key={day.toISOString()}>
                <span className="text-sm font-black text-company-ink">{day.getDate()}</span>
                {dayRows.length ? (
                  <span className="mt-2 grid gap-1">
                    <span className="flex flex-wrap gap-1">
                      <span className="badge badge-primary badge-sm">{dayRows.length}</span>
                      {dayRows.some((row) => row.readiness?.blocked) ? <span className="badge badge-error badge-sm">!</span> : null}
                      {dayRows.some((row) => row.readiness?.overdue) ? <span className="badge badge-warning badge-sm"><i className="ph-bold ph-clock" aria-hidden="true"></i></span> : null}
                    </span>
                    {dayRows.slice(0, 2).map((row) => <CalendarTaskPill density="month" key={row.id} row={row} onOpen={() => setSelectedTask(row)} />)}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {selectedListIds.length ? <CalendarUnscheduledPanel rows={unscheduledRows} setSelectedTask={setSelectedTask} /> : null}
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
  const [isCreateListOpen, setIsCreateListOpen] = useState(false);
  const [isWorkflowSettingsOpen, setIsWorkflowSettingsOpen] = useState(false);
  const [taskQuery, setTaskQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriorityFilter>("all");
  const [dateFilter, setDateFilter] = useState<TaskDateFilter>("all");
  const packet = useOwnerPacket<OperationsPacket>(`/v1/operations/work-items?limit=200&refresh=${refreshKey}`, true, t);
  const rows = useMemo(() => (packet.data?.workItems || []).map((item) => ({ ...item, id: item.task.id })), [packet.data?.workItems]);
  const taskLists = packet.data?.taskLists || [];
  const departments = packet.data?.departments || [];
  const assignmentOptions = packet.data?.assignmentOptions;
  const statuses = packet.data?.statuses?.length ? packet.data.statuses : fallbackStatuses;
  const selectableListIds = selectableTaskListIds(taskLists);
  const selectedSet = new Set(selectedListIds);
  const taskFilteredRows = useMemo(() => rows.filter((row) => taskMatchesFilters(row, taskQuery, priorityFilter, dateFilter)), [rows, taskQuery, priorityFilter, dateFilter]);
  const filteredRows = taskFilteredRows.filter((row) => selectedSet.has(row.hierarchy?.taskList?.id || "unassigned"));

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

  function clearTaskFilters() {
    setTaskQuery("");
    setPriorityFilter("all");
    setDateFilter("all");
  }

  return (
    <Shell activeArea="04-operacje">
      {packet.status === "loading" ? <CcNotice tone="loading" title={t("table.loading.title")} detail={t("table.loading.detail")} /> : null}
      {packet.status === "error" ? <CcNotice tone="error" title={packet.error || t("operations.packetError")} live /> : null}

      {packet.status === "ready" ? (
        <section className="grid h-[calc(100vh-12.5rem)] min-h-[34rem] gap-4 xl:grid-cols-[17rem_minmax(0,1fr)]">
          <OperationsListSelector
            departments={departments}
            onCreateList={() => setIsCreateListOpen(true)}
            selectedListIds={selectedListIds}
            setSelectedList={setSelectedList}
            setSelectedListIds={setSelectedListIds}
            taskLists={taskLists}
          />
          {activeView === "calendar" ? (
            <OperationsCalendar
              rows={filteredRows}
              selectedListIds={selectedListIds}
              hasSelectableLists={selectableListIds.length > 0}
              taskQuery={taskQuery}
              priorityFilter={priorityFilter}
              dateFilter={dateFilter}
              setSelectedTask={setSelectedTask}
              onCreateTask={() => openCreateTask(selectedListIds.length === 1 ? selectedListIds[0] : undefined)}
              onOpenWorkflowSettings={() => setIsWorkflowSettingsOpen(true)}
              onTaskQueryChange={setTaskQuery}
              onPriorityFilterChange={setPriorityFilter}
              onDateFilterChange={setDateFilter}
              onClearTaskFilters={clearTaskFilters}
            />
          ) : (
            <OperationsBoard
              rows={taskFilteredRows}
              statuses={statuses}
              selectedListIds={selectedListIds}
              hasSelectableLists={selectableListIds.length > 0}
              setSelectedTask={setSelectedTask}
              onCreateTask={openCreateTask}
              onRefresh={refresh}
              onOpenWorkflowSettings={() => setIsWorkflowSettingsOpen(true)}
              taskQuery={taskQuery}
              priorityFilter={priorityFilter}
              dateFilter={dateFilter}
              onTaskQueryChange={setTaskQuery}
              onPriorityFilterChange={setPriorityFilter}
              onDateFilterChange={setDateFilter}
              onClearTaskFilters={clearTaskFilters}
            />
          )}
        </section>
      ) : null}

      {selectedTask ? <TaskPreviewModal assignmentOptions={assignmentOptions} item={selectedTask} statuses={statuses} taskLists={taskLists} onClose={() => setSelectedTask(null)} onSaved={refresh} /> : null}
      {isCreateTaskOpen ? <TaskCreateModal assignmentOptions={assignmentOptions} taskLists={taskLists} statuses={statuses} defaultTaskListId={createTaskListId || undefined} onClose={() => setIsCreateTaskOpen(false)} onSaved={refresh} /> : null}
      {isCreateListOpen ? <TaskListModal departments={departments} onClose={() => setIsCreateListOpen(false)} onSaved={refresh} /> : null}
      {selectedList ? <TaskListModal list={selectedList} departments={departments} onClose={() => setSelectedList(null)} onSaved={refresh} /> : null}
      {isWorkflowSettingsOpen ? <WorkflowSettingsModal statuses={statuses} onClose={() => setIsWorkflowSettingsOpen(false)} /> : null}
    </Shell>
  );
}
