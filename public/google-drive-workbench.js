(function () {
  function driveCommandState({ state, fields, isSignedIn, parseIdList }) {
    const selectedFolderIds = parseIdList(fields.googleDriveFolderIds.value || [
      ...(state.googleDrive.config.selectedFolderIds || []),
      ...(state.googleDrive.config.rootFolderIds || [])
    ].join(", "));
    const importedFolders = state.googleDrive.files.filter((file) => file.isFolder);
    const unassignedFolders = importedFolders.filter((file) => !file.operatingAreaId);
    const discoveredFolders = state.googleDrive.discoveredFolders || [];
    const signedIn = isSignedIn();
    const status = !signedIn
      ? "Sign in required"
      : state.googleDrive.oauthTokenConfigured
        ? state.googleDrive.active ? "Drive connected" : "Drive saved, inactive"
        : state.googleDrive.oauthClientConfigured ? "Consent required" : "OAuth client required";
    let priorityTitle = "Drive knowledge is mapped";
    let priorityDetail = "Imported folders are ready to support area review, relationships, and agent-safe company context.";
    if (!signedIn) {
      priorityTitle = "Sign in to connect Drive";
      priorityDetail = "Owner login is required before CompanyCore can save OAuth credentials or import workspace folders.";
    } else if (!state.googleDrive.oauthClientConfigured) {
      priorityTitle = "Save OAuth client";
      priorityDetail = "Start with the Google Cloud client ID and secret so the consent URL can be generated safely.";
    } else if (!state.googleDrive.oauthTokenConfigured) {
      priorityTitle = "Complete Google consent";
      priorityDetail = "Generate the OAuth URL, approve access in Google, then save the returned authorization code.";
    } else if (!selectedFolderIds.length) {
      priorityTitle = "Select folders to import";
      priorityDetail = "Load Drive folders and choose only the roots that should become company knowledge.";
    } else if (!state.googleDrive.files.length) {
      priorityTitle = "Import selected folders";
      priorityDetail = "Run the import so files and folders become visible for review, reconciliation, and agents.";
    } else if (unassignedFolders.length) {
      priorityTitle = "Assign imported folders to areas";
      priorityDetail = "Map unassigned folders to operating areas so imported context has ownership and purpose.";
    }
    const commandCards = [
      {
        label: "OAuth",
        value: state.googleDrive.oauthTokenConfigured ? "Ready" : state.googleDrive.oauthClientConfigured ? "Consent" : "Missing",
        detail: state.googleDrive.oauthClientConfigured ? "Client saved" : "Save client first",
        href: "#googleDrivePanel",
        tone: state.googleDrive.oauthTokenConfigured ? "ready" : signedIn ? "attention" : "blocked"
      },
      {
        label: "Selection",
        value: `${selectedFolderIds.length}`,
        detail: `${discoveredFolders.length} discovered folders`,
        href: "#drive-folder-picker",
        tone: selectedFolderIds.length ? "ready" : state.googleDrive.oauthTokenConfigured ? "attention" : "blocked"
      },
      {
        label: "Imported",
        value: `${state.googleDrive.files.length}`,
        detail: `${importedFolders.length} folders in review`,
        href: "#drive-files-panel",
        tone: state.googleDrive.files.length ? "ready" : selectedFolderIds.length ? "attention" : "blocked"
      },
      {
        label: "Area review",
        value: `${unassignedFolders.length}`,
        detail: unassignedFolders.length ? "folders need ownership" : "folders have context",
        href: unassignedFolders.length ? "#drive-files-panel" : "/areas",
        tone: unassignedFolders.length ? "attention" : state.googleDrive.files.length ? "ready" : "blocked"
      }
    ];

    return {
      commandCards,
      discoveredFolders,
      importedFolders,
      priorityDetail,
      priorityTitle,
      selectedFolderIds,
      status,
      unassignedFolders
    };
  }

  function renderContextPanel({ state, fields, helpers }) {
    const { bindInlineNavigation, escapeHtml, isSignedIn, parseIdList } = helpers;
    const {
      commandCards,
      discoveredFolders,
      priorityDetail,
      priorityTitle,
      selectedFolderIds,
      status,
      unassignedFolders
    } = driveCommandState({ state, fields, isSignedIn, parseIdList });
    const panel = document.createElement("article");
    panel.className = "drive-context-card";
    panel.innerHTML = `
      <div class="drive-context-copy">
        <span class="summary-kicker">Drive import context</span>
        <div class="drive-context-heading">
          <strong>OAuth, folder selection, import, and area review</strong>
          <span class="workbench-index-status">${escapeHtml(status)}</span>
        </div>
        <p>Use this setup surface to connect Google consent, choose folders from Drive, import readable files, and map folders into operating areas for agents.</p>
        <div class="drive-command-summary">
          <div>
            <span class="summary-kicker">Drive import command</span>
            <strong>${escapeHtml(priorityTitle)}</strong>
            <p>${escapeHtml(priorityDetail)}</p>
          </div>
          <div class="drive-command-grid" aria-label="Google Drive import readiness summary">
            ${commandCards.map((card) => `
              <a class="drive-command-card is-${card.tone}" href="${card.href}"${card.href.startsWith("/") ? " data-link" : ""}>
                <small>${escapeHtml(card.label)}</small>
                <strong>${escapeHtml(card.value)}</strong>
                <span>${escapeHtml(card.detail)}</span>
              </a>
            `).join("")}
          </div>
        </div>
        <div class="drive-context-pills" aria-label="Google Drive operation context">
          <span>${state.googleDrive.oauthClientConfigured ? "OAuth client saved" : "OAuth client missing"}</span>
          <span>${state.googleDrive.oauthTokenConfigured ? "Consent saved" : "Consent missing"}</span>
          <span>${selectedFolderIds.length} selected folder${selectedFolderIds.length === 1 ? "" : "s"}</span>
          <span>${discoveredFolders.length} discovered folder${discoveredFolders.length === 1 ? "" : "s"}</span>
          <span>${state.googleDrive.files.length} imported item${state.googleDrive.files.length === 1 ? "" : "s"}</span>
          <span>${unassignedFolders.length} folder${unassignedFolders.length === 1 ? "" : "s"} need review</span>
        </div>
      </div>
      <div class="drive-context-actions">
        <a class="button-link compact" href="#googleDrivePanel">Setup Drive</a>
        <a class="button-link secondary compact" href="#drive-folder-picker">Select folders</a>
        <a class="button-link secondary compact" href="#drive-files-panel">Review import</a>
        <a class="button-link secondary compact" href="/relationships" data-link>Relationships</a>
      </div>
    `;
    bindInlineNavigation(panel);
    return panel;
  }

  window.CompanyCoreGoogleDriveWorkbench = {
    driveCommandState,
    renderContextPanel
  };
})();
