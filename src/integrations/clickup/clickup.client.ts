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

type ClickUpTasksResponse = {
  tasks?: ClickUpTask[];
  last_page?: boolean;
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

  private safeSummary(input: { id?: string | number | null; name?: string | null }) {
    if (input.id === undefined || input.id === null || !input.name) {
      return null;
    }

    return {
      id: String(input.id),
      name: input.name
    };
  }

  private async request<T>(pathOrUrl: string | URL): Promise<T> {
    const url = pathOrUrl instanceof URL
      ? pathOrUrl
      : new URL(`${clickUpBaseUrl}${pathOrUrl}`);

    const response = await fetch(url, {
      headers: {
        Authorization: this.token,
        "Content-Type": "application/json"
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

    return response.json() as Promise<T>;
  }
}
