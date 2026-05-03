import { IntegrationError } from "../errors";

const clickUpBaseUrl = "https://api.clickup.com/api/v2";

export type ClickUpTask = {
  id: string;
  name: string;
  description?: string | null;
  markdown_description?: string | null;
  text_content?: string | null;
  status?: {
    status?: string | null;
    type?: string | null;
  } | null;
  priority?: {
    priority?: string | null;
  } | null;
  due_date?: string | null;
  list?: {
    id?: string | null;
  } | null;
};

export type ClickUpComment = {
  id: string;
  date?: string | null;
  parent?: string | null;
  comment?: Array<{
    text?: string | null;
  }> | string | null;
  comment_text?: string | null;
  user?: {
    id?: string | number | null;
    username?: string | null;
    email?: string | null;
  } | null;
};

export type ClickUpWebhook = {
  id: string;
  endpoint?: string | null;
  events?: string[] | null;
  list_id?: string | number | null;
  folder_id?: string | number | null;
  space_id?: string | number | null;
  task_id?: string | number | null;
  secret?: string | null;
  health?: {
    status?: string | null;
    fail_count?: number | null;
  } | null;
};

export type ClickUpWorkspaceSummary = {
  id: string;
  name: string;
};

export type ClickUpListSummary = {
  id: string;
  name: string;
};

export type ClickUpFolderSummary = {
  id: string;
  name: string;
  lists: ClickUpListSummary[];
};

export type ClickUpSpaceSummary = {
  id: string;
  name: string;
  lists: ClickUpListSummary[];
  folders: ClickUpFolderSummary[];
};

export type ClickUpCustomField = {
  id: string;
  name: string;
  type?: string | null;
  type_config?: Record<string, unknown> | null;
};

export type ClickUpViewSummary = {
  id: string;
  name: string;
  type?: string | null;
  parent?: {
    id?: string | number | null;
    type?: number | null;
  } | null;
};

type ClickUpTasksResponse = {
  tasks?: ClickUpTask[];
  last_page?: boolean;
};

type ClickUpWebhookResponse = {
  webhook?: ClickUpWebhook;
};

type ClickUpWebhooksResponse = {
  webhooks?: ClickUpWebhook[];
};

type ClickUpCommentsResponse = {
  comments?: ClickUpComment[];
};

type ClickUpCommentResponse = {
  id?: string;
  comment?: ClickUpComment;
};

type ClickUpTeamResponse = {
  teams?: Array<{
    id?: string | number | null;
    name?: string | null;
  }>;
};

type ClickUpSpacesResponse = {
  spaces?: Array<{
    id?: string | number | null;
    name?: string | null;
  }>;
};

type ClickUpFoldersResponse = {
  folders?: Array<{
    id?: string | number | null;
    name?: string | null;
  }>;
};

type ClickUpListsResponse = {
  lists?: Array<{
    id?: string | number | null;
    name?: string | null;
  }>;
};

type ClickUpCustomFieldsResponse = {
  fields?: Array<{
    id?: string | null;
    name?: string | null;
    type?: string | null;
    type_config?: Record<string, unknown> | null;
  }>;
};

type ClickUpViewsResponse = {
  views?: Array<{
    id?: string | number | null;
    name?: string | null;
    type?: string | null;
    parent?: {
      id?: string | number | null;
      type?: number | null;
    } | null;
  }>;
  required_views?: Array<{
    id?: string | number | null;
    name?: string | null;
    type?: string | null;
    parent?: {
      id?: string | number | null;
      type?: number | null;
    } | null;
  }>;
};

export class ClickUpClient {
  constructor(private readonly token: string) {}

  async getAuthorizedWorkspaces() {
    const payload = await this.request<ClickUpTeamResponse>("/team");
    return (payload.teams ?? [])
      .map((team) => this.safeSummary(team))
      .filter((team): team is ClickUpWorkspaceSummary => Boolean(team));
  }

  async getSpaces(teamId: string) {
    const payload = await this.request<ClickUpSpacesResponse>(`/team/${encodeURIComponent(teamId)}/space?archived=false`);
    return (payload.spaces ?? [])
      .map((space) => this.safeSummary(space))
      .filter((space): space is { id: string; name: string } => Boolean(space));
  }

  async getFolders(spaceId: string) {
    const payload = await this.request<ClickUpFoldersResponse>(`/space/${encodeURIComponent(spaceId)}/folder?archived=false`);
    return (payload.folders ?? [])
      .map((folder) => this.safeSummary(folder))
      .filter((folder): folder is { id: string; name: string } => Boolean(folder));
  }

  async getFolderLists(folderId: string) {
    const payload = await this.request<ClickUpListsResponse>(`/folder/${encodeURIComponent(folderId)}/list?archived=false`);
    return (payload.lists ?? [])
      .map((list) => this.safeSummary(list))
      .filter((list): list is ClickUpListSummary => Boolean(list));
  }

  async getFolderlessLists(spaceId: string) {
    const payload = await this.request<ClickUpListsResponse>(`/space/${encodeURIComponent(spaceId)}/list?archived=false`);
    return (payload.lists ?? [])
      .map((list) => this.safeSummary(list))
      .filter((list): list is ClickUpListSummary => Boolean(list));
  }

  async getWorkspaceCustomFields(teamId: string) {
    const payload = await this.request<ClickUpCustomFieldsResponse>(`/team/${encodeURIComponent(teamId)}/field`);
    return this.safeCustomFields(payload.fields ?? []);
  }

  async getSpaceCustomFields(spaceId: string) {
    const payload = await this.request<ClickUpCustomFieldsResponse>(`/space/${encodeURIComponent(spaceId)}/field`);
    return this.safeCustomFields(payload.fields ?? []);
  }

  async getFolderCustomFields(folderId: string) {
    const payload = await this.request<ClickUpCustomFieldsResponse>(`/folder/${encodeURIComponent(folderId)}/field`);
    return this.safeCustomFields(payload.fields ?? []);
  }

  async getListCustomFields(listId: string) {
    const payload = await this.request<ClickUpCustomFieldsResponse>(`/list/${encodeURIComponent(listId)}/field`);
    return this.safeCustomFields(payload.fields ?? []);
  }

  async getWorkspaceViews(teamId: string) {
    const payload = await this.request<ClickUpViewsResponse>(`/team/${encodeURIComponent(teamId)}/view`);
    return this.safeViews(payload);
  }

  async getListViews(listId: string) {
    const payload = await this.request<ClickUpViewsResponse>(`/list/${encodeURIComponent(listId)}/view`);
    return this.safeViews(payload);
  }

  async getWorkspaceStructure(teamId: string) {
    const spaces = await this.getSpaces(teamId);
    const result: ClickUpSpaceSummary[] = [];

    for (const space of spaces) {
      const [folderlessLists, folders] = await Promise.all([
        this.getFolderlessLists(space.id),
        this.getFolders(space.id)
      ]);

      const foldersWithLists: ClickUpFolderSummary[] = [];
      for (const folder of folders) {
        foldersWithLists.push({
          ...folder,
          lists: await this.getFolderLists(folder.id)
        });
      }

      result.push({
        ...space,
        lists: folderlessLists,
        folders: foldersWithLists
      });
    }

    return result;
  }

  async getWorkspaceTasks(input: {
    teamId: string;
    listIds: string[];
    includeClosed?: boolean;
    maxPages?: number;
  }) {
    const maxPages = input.maxPages ?? 10;
    const tasks: ClickUpTask[] = [];

    for (let page = 0; page < maxPages; page += 1) {
      const url = new URL(`${clickUpBaseUrl}/team/${input.teamId}/task`);
      url.searchParams.set("page", String(page));
      url.searchParams.set("include_closed", String(input.includeClosed ?? true));
      url.searchParams.set("subtasks", "true");
      url.searchParams.set("include_markdown_description", "true");
      for (const listId of input.listIds) {
        url.searchParams.append("list_ids[]", listId);
      }

      const payload = await this.request<ClickUpTasksResponse>(url);
      const pageTasks = payload.tasks ?? [];
      tasks.push(...pageTasks);

      if (payload.last_page || pageTasks.length === 0) {
        break;
      }
    }

    return tasks;
  }

  async getTask(taskId: string) {
    const url = new URL(`${clickUpBaseUrl}/task/${encodeURIComponent(taskId)}`);
    url.searchParams.set("include_markdown_description", "true");
    return this.request<ClickUpTask>(url);
  }

  async updateTask(taskId: string, input: {
    name?: string;
    description?: string;
    markdown_content?: string;
    status?: string;
    priority?: number | null;
    due_date?: number | null;
    archived?: boolean;
  }) {
    return this.request<ClickUpTask>(`/task/${encodeURIComponent(taskId)}`, {
      method: "PUT",
      body: JSON.stringify(input)
    });
  }

  async createTask(listId: string, input: {
    name: string;
    description?: string;
    markdown_content?: string;
    status?: string;
    priority?: number | null;
    due_date?: number | null;
  }) {
    return this.request<ClickUpTask>(`/list/${encodeURIComponent(listId)}/task`, {
      method: "POST",
      body: JSON.stringify(input)
    });
  }

  async setCustomFieldValue(taskId: string, fieldId: string, value: unknown) {
    return this.request<Record<string, unknown>>(`/task/${encodeURIComponent(taskId)}/field/${encodeURIComponent(fieldId)}`, {
      method: "POST",
      body: JSON.stringify({ value })
    });
  }

  async getTaskComments(taskId: string) {
    const payload = await this.request<ClickUpCommentsResponse>(`/task/${encodeURIComponent(taskId)}/comment`);
    return (payload.comments ?? []).filter((comment): comment is ClickUpComment => Boolean(comment.id));
  }

  async createTaskComment(taskId: string, input: {
    commentText: string;
    notifyAll?: boolean;
  }) {
    const payload = await this.request<ClickUpCommentResponse>(`/task/${encodeURIComponent(taskId)}/comment`, {
      method: "POST",
      body: JSON.stringify({
        comment_text: input.commentText,
        notify_all: input.notifyAll ?? false
      })
    });

    return payload.comment ?? (payload.id ? { id: payload.id, comment_text: input.commentText } : null);
  }

  async getWebhooks(teamId: string) {
    const payload = await this.request<ClickUpWebhooksResponse>(`/team/${encodeURIComponent(teamId)}/webhook`);
    return (payload.webhooks ?? []).filter((webhook): webhook is ClickUpWebhook => Boolean(webhook.id));
  }

  async createWebhook(input: {
    teamId: string;
    endpoint: string;
    events: string[];
    listId?: string;
  }) {
    const payload = await this.request<ClickUpWebhookResponse>(`/team/${encodeURIComponent(input.teamId)}/webhook`, {
      method: "POST",
      body: JSON.stringify({
        endpoint: input.endpoint,
        events: input.events,
        ...(input.listId ? { list_id: input.listId } : {})
      })
    });

    if (!payload.webhook?.id || !payload.webhook.secret) {
      throw new IntegrationError(
        "integration_unavailable",
        502,
        "ClickUp did not return webhook secret material."
      );
    }

    return payload.webhook;
  }

  async updateWebhook(webhookId: string, input: {
    endpoint?: string;
    events?: string[];
    status?: "active" | "inactive";
  }) {
    const payload = await this.request<ClickUpWebhookResponse>(`/webhook/${encodeURIComponent(webhookId)}`, {
      method: "PUT",
      body: JSON.stringify(input)
    });
    return payload.webhook ?? null;
  }

  async deleteWebhook(webhookId: string) {
    await this.request<Record<string, unknown>>(`/webhook/${encodeURIComponent(webhookId)}`, {
      method: "DELETE"
    });
  }

  private safeSummary(input: { id?: string | number | null; name?: string | null }) {
    if (input.id === undefined || input.id === null || !input.name) {
      return null;
    }

    return {
      id: String(input.id),
      name: input.name
    };
  }

  private safeCustomFields(fields: Array<{
    id?: string | null;
    name?: string | null;
    type?: string | null;
    type_config?: Record<string, unknown> | null;
  }>) {
    return fields
      .filter((field): field is ClickUpCustomField => Boolean(field.id && field.name))
      .map((field) => ({
        id: field.id,
        name: field.name,
        type: field.type ?? null,
        type_config: field.type_config ?? null
      }));
  }

  private arrayOrEmpty<T>(value: T[] | unknown): T[] {
    return Array.isArray(value) ? value : [];
  }

  private safeViews(payload: ClickUpViewsResponse) {
    return [
      ...this.arrayOrEmpty<NonNullable<ClickUpViewsResponse["views"]>[number]>(payload.views),
      ...this.arrayOrEmpty<NonNullable<ClickUpViewsResponse["required_views"]>[number]>(payload.required_views)
    ]
      .filter((view): view is ClickUpViewSummary => Boolean(view.id && view.name))
      .map((view) => ({
        id: String(view.id),
        name: view.name,
        type: view.type ?? null,
        parent: view.parent ?? null
      }));
  }

  private async request<T>(pathOrUrl: string | URL, init: RequestInit = {}): Promise<T> {
    const url = pathOrUrl instanceof URL
      ? pathOrUrl
      : new URL(`${clickUpBaseUrl}${pathOrUrl}`);

    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: this.token,
        "Content-Type": "application/json",
        ...(init.headers ?? {})
      }
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new IntegrationError(
          "integration_invalid_token",
          401,
          "ClickUp rejected the configured token."
        );
      }

      if (response.status === 429) {
        throw new IntegrationError(
          "integration_rate_limited",
          429,
          "ClickUp rate limit was reached."
        );
      }

      throw new IntegrationError(
        "integration_unavailable",
        502,
        `ClickUp request failed with status ${response.status}.`
      );
    }

    const text = await response.text();
    return (text ? JSON.parse(text) : {}) as T;
  }
}
