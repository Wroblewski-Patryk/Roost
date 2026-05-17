import { IntegrationError } from "../errors";

const driveBaseUrl = "https://www.googleapis.com/drive/v3";
const docsBaseUrl = "https://docs.googleapis.com/v1";
const sheetsBaseUrl = "https://sheets.googleapis.com/v4";

export type GoogleDriveFileMetadata = {
  id: string;
  name: string;
  description?: string;
  mimeType: string;
  driveId?: string;
  parents?: string[];
  trashed?: boolean;
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
  size?: string;
  headRevisionId?: string;
  md5Checksum?: string;
  modifiedTime?: string;
};

export type GoogleDriveFileListResponse = {
  files?: GoogleDriveFileMetadata[];
  nextPageToken?: string;
  incompleteSearch?: boolean;
};

export type GoogleDriveChangesResponse = {
  changes?: Array<{
    fileId?: string;
    removed?: boolean;
    file?: GoogleDriveFileMetadata;
  }>;
  nextPageToken?: string;
  newStartPageToken?: string;
};

export class GoogleDriveClient {
  constructor(private readonly accessToken: string) {}

  async listFiles(input: {
    query?: string;
    pageToken?: string;
    driveId?: string;
    includeItemsFromAllDrives?: boolean;
    supportsAllDrives?: boolean;
    pageSize?: number;
    fields?: string;
  } = {}) {
    const url = new URL(`${driveBaseUrl}/files`);
    url.searchParams.set("spaces", "drive");
    url.searchParams.set("pageSize", String(input.pageSize ?? 100));
    url.searchParams.set("fields", input.fields ?? [
      "nextPageToken",
      "incompleteSearch",
      "files(id,name,description,mimeType,driveId,parents,trashed,webViewLink,webContentLink,iconLink,thumbnailLink,size,headRevisionId,md5Checksum,modifiedTime)"
    ].join(","));

    if (input.query) {
      url.searchParams.set("q", input.query);
    }
    if (input.pageToken) {
      url.searchParams.set("pageToken", input.pageToken);
    }
    if (input.driveId) {
      url.searchParams.set("driveId", input.driveId);
      url.searchParams.set("corpora", "drive");
    }
    if (input.includeItemsFromAllDrives ?? true) {
      url.searchParams.set("includeItemsFromAllDrives", "true");
    }
    if (input.supportsAllDrives ?? true) {
      url.searchParams.set("supportsAllDrives", "true");
    }

    return this.request<GoogleDriveFileListResponse>(url);
  }

  async getFile(fileId: string) {
    const url = new URL(`${driveBaseUrl}/files/${encodeURIComponent(fileId)}`);
    url.searchParams.set("supportsAllDrives", "true");
    url.searchParams.set("fields", "id,name,description,mimeType,driveId,parents,trashed,webViewLink,webContentLink,iconLink,thumbnailLink,size,headRevisionId,md5Checksum,modifiedTime");
    return this.request<GoogleDriveFileMetadata>(url);
  }

  async createDriveFile(input: {
    name: string;
    mimeType: string;
    parentId?: string;
  }) {
    return this.request<GoogleDriveFileMetadata>(`${driveBaseUrl}/files?supportsAllDrives=true`, {
      method: "POST",
      body: JSON.stringify({
        name: input.name,
        mimeType: input.mimeType,
        ...(input.parentId ? { parents: [input.parentId] } : {})
      })
    });
  }

  async listChanges(input: {
    pageToken: string;
    driveId?: string;
    pageSize?: number;
  }) {
    const url = new URL(`${driveBaseUrl}/changes`);
    url.searchParams.set("pageToken", input.pageToken);
    url.searchParams.set("pageSize", String(input.pageSize ?? 100));
    url.searchParams.set("spaces", "drive");
    url.searchParams.set("includeItemsFromAllDrives", "true");
    url.searchParams.set("supportsAllDrives", "true");
    if (input.driveId) {
      url.searchParams.set("driveId", input.driveId);
    }
    return this.request<GoogleDriveChangesResponse>(url);
  }

  async getStartPageToken(driveId?: string) {
    const url = new URL(`${driveBaseUrl}/changes/startPageToken`);
    url.searchParams.set("supportsAllDrives", "true");
    if (driveId) {
      url.searchParams.set("driveId", driveId);
    }
    return this.request<{ startPageToken: string }>(url);
  }

  async getDocument(documentId: string) {
    return this.request<Record<string, unknown>>(`${docsBaseUrl}/documents/${encodeURIComponent(documentId)}`);
  }

  async downloadFileText(fileId: string) {
    return this.requestText(`${driveBaseUrl}/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`);
  }

  async updateFileMedia(fileId: string, content: string, mimeType: string) {
    return this.request<GoogleDriveFileMetadata>(
      `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=media&supportsAllDrives=true&fields=id,name,description,mimeType,driveId,parents,trashed,webViewLink,webContentLink,iconLink,thumbnailLink,size,headRevisionId,md5Checksum,modifiedTime`,
      {
        method: "PATCH",
        body: content,
        headers: {
          "Content-Type": mimeType
        }
      }
    );
  }

  async updateDocument(documentId: string, requests: unknown[], writeControl?: Record<string, unknown>) {
    return this.request<Record<string, unknown>>(`${docsBaseUrl}/documents/${encodeURIComponent(documentId)}:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({
        requests,
        ...(writeControl ? { writeControl } : {})
      })
    });
  }

  async createSpreadsheet(input: Record<string, unknown>) {
    return this.request<Record<string, unknown>>(`${sheetsBaseUrl}/spreadsheets`, {
      method: "POST",
      body: JSON.stringify(input)
    });
  }

  async getSpreadsheet(spreadsheetId: string) {
    return this.request<Record<string, unknown>>(`${sheetsBaseUrl}/spreadsheets/${encodeURIComponent(spreadsheetId)}`);
  }

  async getSheetValues(spreadsheetId: string, range: string) {
    return this.request<Record<string, unknown>>(`${sheetsBaseUrl}/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`);
  }

  async updateSheetValues(spreadsheetId: string, range: string, input: Record<string, unknown>) {
    return this.request<Record<string, unknown>>(`${sheetsBaseUrl}/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, {
      method: "PUT",
      body: JSON.stringify(input)
    });
  }

  private async request<T>(pathOrUrl: string | URL, init: RequestInit = {}): Promise<T> {
    const url = pathOrUrl instanceof URL ? pathOrUrl : new URL(pathOrUrl);
    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {})
      }
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new IntegrationError(
          "integration_invalid_token",
          401,
          "Google rejected the configured OAuth token."
        );
      }

      if (response.status === 429) {
        throw new IntegrationError(
          "integration_rate_limited",
          429,
          "Google Workspace rate limit was reached."
        );
      }

      throw new IntegrationError(
        "integration_unavailable",
        502,
        `Google Workspace request failed with status ${response.status}.`
      );
    }

    const text = await response.text();
    return (text ? JSON.parse(text) : {}) as T;
  }

  private async requestText(pathOrUrl: string | URL, init: RequestInit = {}) {
    const url = pathOrUrl instanceof URL ? pathOrUrl : new URL(pathOrUrl);
    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        ...(init.headers ?? {})
      }
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new IntegrationError(
          "integration_invalid_token",
          401,
          "Google rejected the configured OAuth token."
        );
      }

      if (response.status === 429) {
        throw new IntegrationError(
          "integration_rate_limited",
          429,
          "Google Workspace rate limit was reached."
        );
      }

      throw new IntegrationError(
        "integration_unavailable",
        502,
        `Google Workspace request failed with status ${response.status}.`
      );
    }

    return response.text();
  }
}
