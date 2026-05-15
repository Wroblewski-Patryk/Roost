(function () {
  function createRelationshipWorkbench({ state, elements, helpers }) {
    const {
      relationshipSummary,
      relationshipContext,
      relationshipSearch,
      relationshipSourceFilter,
      relationshipQueue,
      relationshipProviderList,
      relationshipDriveList
    } = elements;
    const {
      areaLabel,
      bindInlineNavigation,
      escapeHtml,
      isSignedIn,
      providerLabel,
      renderCompactList,
      scopeEditorHtml
    } = helpers;

    function mappingAreaId(mapping) {
      return mapping.areaId || mapping.operatingAreaId || "";
    }

    function areaNameById(areaId) {
      const area = state.operatingModel.areas.find((item) => item.id === areaId);
      return area ? areaLabel(area) : "Unassigned";
    }

    function relationshipGraphNodeMap() {
      return new Map((state.relationshipGraph.nodes || []).map((node) => [node.id, node]));
    }

    function relationshipGraphNodeLabel(nodeMap, nodeId) {
      const node = nodeMap.get(nodeId);
      return node?.label || nodeId;
    }

    function confidenceLabel(confidence) {
      return {
        direct: "Direct",
        provider_hierarchy: "Provider hierarchy",
        route_inferred: "Route inferred",
        needs_review: "Needs review",
        unsupported: "Unsupported"
      }[confidence] || "Relationship";
    }

    function relationshipProvenance(row) {
      const confidence = row.confidence || (row.needsReview ? "needs_review" : "provider_hierarchy");
      const sourceLabel = relationshipSourceName(row.sourceLabel || row.provider || row.source || "Workspace");
      const details = {
        direct: {
          source: "CompanyCore graph",
          evidence: `Stored edge from ${sourceLabel}`,
          aiLabel: "AI-safe",
          aiDetail: "Can be used as workspace context.",
          tone: "safe"
        },
        provider_hierarchy: {
          source: row.source === "drive" ? "Google Drive" : "Provider hierarchy",
          evidence: `Derived from ${sourceLabel}`,
          aiLabel: "AI-safe with source",
          aiDetail: "Use with provider provenance attached.",
          tone: "safe"
        },
        route_inferred: {
          source: "Route inference",
          evidence: `Inferred from ${sourceLabel}`,
          aiLabel: "Review context",
          aiDetail: "Use only with confidence label visible.",
          tone: "review"
        },
        needs_review: {
          source: "Owner review",
          evidence: "Missing or ambiguous operating-area scope",
          aiLabel: "Not AI-safe yet",
          aiDetail: "Assign or resolve before agents rely on it.",
          tone: "blocked"
        },
        unsupported: {
          source: "Unsupported family",
          evidence: "Known relation type without approved workflow",
          aiLabel: "Do not infer",
          aiDetail: "Agents must not invent this relationship.",
          tone: "blocked"
        }
      };
      return details[confidence] || {
        source: sourceLabel,
        evidence: "Workspace relationship signal",
        aiLabel: "Review context",
        aiDetail: "Confirm provenance before agent use.",
        tone: "review"
      };
    }

    function relationshipSourceName(source) {
      return {
        ExternalContainerMapping: "Provider mapping",
        ExternalFieldMapping: "Provider field mapping",
        GoogleDriveFile: "Google Drive file",
        OperatingModelTable: "CompanyCore table",
        graph: "CompanyCore graph",
        provider: "Provider mapping",
        drive: "Google Drive",
        google_drive: "Google Drive",
        clickup: "ClickUp"
      }[String(source || "")] || providerLabel(source) || String(source || "Workspace");
    }

    function provenanceBadgesHtml(provenance) {
      return `
        <div class="provenance-badges" aria-label="Source and AI safety">
          <span class="provenance-badge provenance-badge-source">${escapeHtml(provenance.source)}</span>
          <span class="provenance-badge">${escapeHtml(provenance.evidence)}</span>
          <span class="ai-safety-badge ai-safety-${escapeHtml(provenance.tone)}">${escapeHtml(provenance.aiLabel)}</span>
        </div>
        <span class="provenance-detail">${escapeHtml(provenance.aiDetail)}</span>
      `;
    }

    function relationshipGraphRows() {
      const graph = state.relationshipGraph;
      const nodeMap = relationshipGraphNodeMap();
      const edgeRows = (graph.edges || []).map((edge) => {
        const fromLabel = relationshipGraphNodeLabel(nodeMap, edge.from);
        const toLabel = relationshipGraphNodeLabel(nodeMap, edge.to);
        const source = edge.sourceModel === "GoogleDriveFile"
          ? "drive"
          : edge.sourceModel === "ExternalContainerMapping" || edge.sourceModel === "ExternalFieldMapping"
            ? "provider"
            : "graph";
        return {
          type: "edge",
          source,
          sourceLabel: edge.sourceModel,
          title: `${fromLabel} -> ${toLabel}`,
          detail: `${edge.label} / ${confidenceLabel(edge.confidence)} / ${relationshipSourceName(edge.sourceModel)} ${edge.sourceField}`,
          provider: edge.sourceModel,
          entityType: edge.sourceField,
          confidence: edge.confidence,
          needsReview: false,
          item: edge,
          searchable: [fromLabel, toLabel, edge.label, edge.confidence, edge.sourceModel, edge.sourceField].filter(Boolean).join(" ").toLowerCase()
        };
      });
      const reviewRows = (graph.reviewItems || []).map((item) => {
        const nodeLabel = relationshipGraphNodeLabel(nodeMap, item.nodeId);
        return {
          type: "review",
          source: "review",
          sourceLabel: item.type,
          title: item.title,
          detail: `${nodeLabel} / ${item.detail}`,
          provider: item.type,
          entityType: item.severity,
          confidence: "needs_review",
          needsReview: true,
          item,
          searchable: [item.title, item.detail, item.type, nodeLabel].filter(Boolean).join(" ").toLowerCase()
        };
      });
      const unsupportedRows = (graph.unsupportedFamilies || []).map((family) => ({
        type: "unsupported",
        source: "unsupported",
        sourceLabel: "Unsupported",
        title: family.family,
        detail: `${family.reason}${family.nextAction ? ` / ${family.nextAction}` : ""}`,
        provider: "unsupported",
        entityType: family.family,
        confidence: "unsupported",
        needsReview: false,
        item: family,
        searchable: [family.family, family.reason, family.nextAction].filter(Boolean).join(" ").toLowerCase()
      }));

      return [...reviewRows, ...edgeRows, ...unsupportedRows];
    }

    function relationshipRows(mappings, driveFolders) {
      return [
        ...mappings.map((mapping) => ({
          type: "mapping",
          source: "provider",
          sourceLabel: providerLabel(mapping.provider),
          title: mapping.name || mapping.externalId || mapping.id,
          provider: mapping.provider,
          entityType: mapping.entityType,
          areaId: mappingAreaId(mapping),
          needsReview: !mappingAreaId(mapping),
          item: mapping
        })),
        ...driveFolders.map((file) => ({
          type: "drive",
          source: "drive",
          sourceLabel: "Google Drive",
          title: file.name,
          provider: "google_drive",
          entityType: "folder",
          areaId: file.operatingAreaId || "",
          needsReview: !file.operatingAreaId,
          item: file
        }))
      ];
    }

    function relationshipMatchesFilters(row) {
      const search = state.relationshipFilters.search.trim().toLowerCase();
      const source = state.relationshipFilters.source;

      if (source === "review" && !row.needsReview) {
        return false;
      }
      if (source === "provider" && row.source !== "provider") {
        return false;
      }
      if (source === "drive" && row.source !== "drive") {
        return false;
      }
      if (source === "direct" && row.confidence !== "direct") {
        return false;
      }
      if (source === "provider_hierarchy" && row.confidence !== "provider_hierarchy") {
        return false;
      }
      if (source === "route_inferred" && row.confidence !== "route_inferred") {
        return false;
      }
      if (source === "unsupported" && row.confidence !== "unsupported") {
        return false;
      }

      const searchable = [
        row.searchable,
        row.title,
        row.provider,
        row.entityType,
        row.confidence,
        row.sourceLabel,
        areaNameById(row.areaId)
      ].filter(Boolean).join(" ").toLowerCase();

      return !search || searchable.includes(search);
    }

    function relationshipContextElement({ mappings, driveFolders, rows, filteredRows, queueCount }) {
      const panel = document.createElement("article");
      panel.className = "relationship-context-card";
      const graph = state.relationshipGraph;
      const summary = graph.summary;
      const status = queueCount > 0
        ? `${queueCount} need review`
        : rows.length > 0 ? "All mapped" : "Ready for imports";
      const heading = graph.status === "ready"
        ? "Workspace relationship graph"
        : "Provider and Drive area mapping";
      const detail = graph.status === "ready"
        ? "Use this review center to inspect direct, provider-derived, route-inferred, needs-review, and unsupported links before agents rely on workspace context."
        : "Use this review center to assign ClickUp structures and imported Drive folders to the right operating areas before agents rely on that context.";
      const graphPills = graph.status === "ready"
        ? `
            <span>${summary?.confidence?.direct ?? 0} direct</span>
            <span>${summary?.confidence?.providerHierarchy ?? 0} provider hierarchy</span>
            <span>${summary?.confidence?.routeInferred ?? 0} route inferred</span>
            <span>${(summary?.confidence?.direct ?? 0) + (summary?.confidence?.providerHierarchy ?? 0)} AI-safe links</span>
            <span>${summary?.unsupportedFamilies ?? 0} unsupported</span>
          `
        : `
            <span>${mappings.length} provider mapping${mappings.length === 1 ? "" : "s"}</span>
            <span>${driveFolders.length} Drive folder${driveFolders.length === 1 ? "" : "s"}</span>
          `;
      panel.innerHTML = `
        <div class="relationship-context-copy">
          <span class="summary-kicker">Relationship context</span>
          <div class="relationship-context-heading">
            <strong>${escapeHtml(heading)}</strong>
            <span class="workbench-index-status">${escapeHtml(status)}</span>
          </div>
          <p>${escapeHtml(detail)}</p>
          <div class="relationship-context-pills" aria-label="Relationship operation context">
            ${graphPills}
            <span>${queueCount} review item${queueCount === 1 ? "" : "s"}</span>
            <span>${filteredRows.length} of ${rows.length} visible</span>
          </div>
        </div>
        <div class="relationship-context-actions">
          <a class="button-link compact" href="/areas" data-link>Open area map</a>
          <a class="button-link secondary compact" href="/settings/integrations" data-link>Integration map</a>
        </div>
      `;
      bindInlineNavigation(panel);
      return panel;
    }

    function relationshipGraphListItemHtml(row) {
      const badge = `<span class="relationship-confidence relationship-confidence-${escapeHtml(row.confidence)}">${escapeHtml(confidenceLabel(row.confidence))}</span>`;
      const provenance = relationshipProvenance(row);
      return `
        <strong>${escapeHtml(row.title)}</strong>
        <span>${escapeHtml(row.detail)}</span>
        ${badge}
        ${provenanceBadgesHtml(provenance)}
      `;
    }

    function relationshipQueueRow(queueItem) {
      const row = document.createElement("article");
      row.className = "relationship-row";
      const copy = document.createElement("div");
      const title = document.createElement("strong");
      const detail = document.createElement("span");
      const editor = document.createElement("div");
      editor.className = "relationship-editor";

      if (queueItem.type === "review") {
        const item = queueItem.item;
        title.textContent = item.title;
        detail.textContent = item.detail;
        const actionPath = item.actionHint?.path || "";
        const mappingMatch = actionPath.match(/external-mappings\/([^/]+)\/scope/);
        const driveMatch = actionPath.match(/google-drive\/files\/([^/]+)\/scope/);
        if (mappingMatch) {
          editor.innerHTML = scopeEditorHtml({
            id: mappingMatch[1],
            selectedAreaId: state.operatingModel.areas[0]?.id,
            type: "mapping",
            label: "Assign area"
          });
        } else if (driveMatch) {
          editor.innerHTML = scopeEditorHtml({
            id: driveMatch[1],
            selectedAreaId: state.operatingModel.areas[0]?.id,
            type: "drive",
            label: "Assign area"
          });
        } else {
          editor.innerHTML = `<span class="relationship-confidence relationship-confidence-needs_review">${escapeHtml(confidenceLabel("needs_review"))}</span>`;
        }
      } else if (queueItem.type === "mapping") {
        const mapping = queueItem.item;
        title.textContent = mapping.name || mapping.externalId || mapping.id;
        detail.textContent = `${providerLabel(mapping.provider)} - ${mapping.entityType}`;
        editor.innerHTML = scopeEditorHtml({
          id: mapping.id,
          selectedAreaId: state.operatingModel.areas[0]?.id,
          type: "mapping",
          label: "Assign area"
        });
      } else {
        const file = queueItem.item;
        title.textContent = file.name;
        detail.textContent = "Google Drive - Folder";
        editor.innerHTML = scopeEditorHtml({
          id: file.id,
          selectedAreaId: state.operatingModel.areas[0]?.id,
          type: "drive",
          label: "Assign area"
        });
      }

      copy.append(title, detail);
      const provenance = document.createElement("div");
      provenance.className = "relationship-provenance";
      provenance.innerHTML = provenanceBadgesHtml(relationshipProvenance(queueItem));
      copy.append(provenance);
      row.append(copy, editor);
      return row;
    }

    function render() {
      relationshipContext.innerHTML = "";
      relationshipQueue.innerHTML = "";
      relationshipProviderList.innerHTML = "";
      relationshipDriveList.innerHTML = "";

      const mappings = state.operatingModel.externalMappings || [];
      const driveFolders = state.googleDrive.files.filter((file) => file.isFolder);
      const graphReady = state.relationshipGraph.status === "ready";
      const rows = graphReady
        ? relationshipGraphRows()
        : relationshipRows(mappings, driveFolders);
      const filteredRows = rows.filter(relationshipMatchesFilters);
      const queueRows = filteredRows.filter((row) => row.needsReview);
      const queueCount = rows.filter((row) => row.needsReview).length;
      relationshipSearch.value = state.relationshipFilters.search;
      relationshipSourceFilter.value = state.relationshipFilters.source;

      relationshipSummary.textContent = isSignedIn()
        ? graphReady
          ? `${filteredRows.length} of ${rows.length} graph relationship${rows.length === 1 ? "" : "s"} shown. ${queueCount} need review.`
          : `${filteredRows.length} of ${rows.length} relationship${rows.length === 1 ? "" : "s"} shown. ${queueCount} need review.`
        : "Sign in to load relationship data.";
      relationshipContext.append(relationshipContextElement({
        mappings,
        driveFolders,
        rows,
        filteredRows,
        queueCount
      }));

      if (queueRows.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty-note";
        if (!isSignedIn()) {
          empty.textContent = "Sign in to load relationship review items.";
        } else if (filteredRows.length === 0) {
          empty.textContent = "No relationships match the current filters.";
        } else {
          empty.textContent = "No filtered relationships need review.";
        }
        relationshipQueue.append(empty);
      } else {
        for (const row of queueRows.slice(0, 12)) {
          relationshipQueue.append(relationshipQueueRow(row));
        }
      }

      if (graphReady) {
        const providerGraphRows = filteredRows.filter((row) => row.source === "provider");
        const driveGraphRows = filteredRows.filter((row) => row.source === "drive");
        const unsupportedRows = filteredRows.filter((row) => row.source === "unsupported");

        renderCompactList(relationshipProviderList, providerGraphRows.slice(0, 80), relationshipGraphListItemHtml, state.relationshipFilters.source === "drive" ? "Provider graph links are hidden by the current filter." : "No provider graph links match the current filters.");
        renderCompactList(relationshipDriveList, [...driveGraphRows, ...unsupportedRows].slice(0, 80), relationshipGraphListItemHtml, state.relationshipFilters.source === "provider" ? "Drive and unsupported graph links are hidden by the current filter." : "No Drive or unsupported graph links match the current filters.");
        return;
      }

      const filteredMappings = filteredRows.filter((row) => row.type === "mapping").map((row) => row.item);
      const filteredDriveFolders = filteredRows.filter((row) => row.type === "drive").map((row) => row.item);

      renderCompactList(relationshipProviderList, filteredMappings.slice(0, 80), (mapping) => `
        <strong>${escapeHtml(mapping.name || mapping.externalId || mapping.id)}</strong>
        <span>${escapeHtml(providerLabel(mapping.provider))} - ${escapeHtml(mapping.entityType)} - ${escapeHtml(areaNameById(mappingAreaId(mapping)))}</span>
        ${provenanceBadgesHtml(relationshipProvenance({
          source: "provider",
          sourceLabel: providerLabel(mapping.provider),
          provider: mapping.provider,
          confidence: mappingAreaId(mapping) ? "provider_hierarchy" : "needs_review",
          needsReview: !mappingAreaId(mapping)
        }))}
        ${mapping.provider === "clickup" && ["space", "folder", "list"].includes(mapping.entityType) ? scopeEditorHtml({
          id: mapping.id,
          selectedAreaId: mappingAreaId(mapping) || state.operatingModel.areas[0]?.id,
          type: "mapping",
          label: "Assign area"
        }) : ""}
      `, state.relationshipFilters.source === "drive" ? "Provider mappings are hidden by the current filter." : "No provider mappings match the current filters.");

      renderCompactList(relationshipDriveList, filteredDriveFolders.slice(0, 80), (file) => `
        <strong>${escapeHtml(file.name)}</strong>
        <span>Google Drive - Folder - ${escapeHtml(areaNameById(file.operatingAreaId))}</span>
        ${provenanceBadgesHtml(relationshipProvenance({
          source: "drive",
          sourceLabel: "Google Drive",
          provider: "google_drive",
          confidence: file.operatingAreaId ? "provider_hierarchy" : "needs_review",
          needsReview: !file.operatingAreaId
        }))}
        ${scopeEditorHtml({
          id: file.id,
          selectedAreaId: file.operatingAreaId || state.operatingModel.areas[0]?.id,
          type: "drive",
          label: "Assign area"
        })}
      `, state.relationshipFilters.source === "provider" ? "Drive folders are hidden by the current filter." : state.googleDrive.configured ? "No Drive folders match the current filters." : "Google Drive is not connected yet.");
    }

    return { render };
  }

  window.CompanyCoreRelationshipWorkbench = {
    create: createRelationshipWorkbench
  };
})();
