(function registerGovGoReportsApi() {
  async function parseJsonResponse(response, invalidJsonMessage) {
    try {
      return await response.json();
    } catch (error) {
      throw new Error(invalidJsonMessage);
    }
  }

  async function request(path, options = {}) {
    const response = await fetch(path, {
      method: options.method || "GET",
      credentials: "same-origin",
      headers: {
        "Accept": "application/json",
        ...(options.body ? {"Content-Type": "application/json"} : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const payload = await parseJsonResponse(response, "A API de relatorios retornou um JSON invalido.");
    if (!response.ok) {
      throw new Error(payload.error || `Falha HTTP ${response.status}.`);
    }
    return payload;
  }

  function runReport(payload) {
    return request("/api/reports/run", {
      method: "POST",
      body: payload || {},
    });
  }

  function generateSql(payload) {
    return request("/api/reports/generate-sql", {
      method: "POST",
      body: payload || {},
    });
  }

  function executeSql(payload) {
    return request("/api/reports/execute", {
      method: "POST",
      body: payload || {},
    });
  }

  function loadHistory(limit = 50) {
    return request(`/api/reports/history?limit=${encodeURIComponent(String(limit || 50))}`);
  }

  function loadReport(reportId) {
    return request(`/api/reports/history/${encodeURIComponent(String(reportId || ""))}`);
  }

  function loadWorkspace() {
    return request("/api/reports/workspace");
  }

  function saveWorkspace(payload) {
    return request("/api/reports/workspace", {
      method: "POST",
      body: payload || {},
    });
  }

  function saveReport(payload) {
    return request("/api/reports/save", {
      method: "POST",
      body: payload || {},
    });
  }

  function deleteReport(reportId) {
    return request(`/api/reports/history/${encodeURIComponent(String(reportId || ""))}`, {
      method: "DELETE",
    });
  }

  function deleteChat(chatId) {
    return request(`/api/reports/chats/${encodeURIComponent(String(chatId || ""))}`, {
      method: "DELETE",
    });
  }

  function exportReport(reportId, format = "xlsx") {
    return request(`/api/reports/${encodeURIComponent(String(reportId || ""))}/export?format=${encodeURIComponent(String(format || "xlsx"))}`);
  }

  function downloadBase64File(payload) {
    if (!payload || !payload.contentBase64) {
      throw new Error("Arquivo de relatorio indisponivel.");
    }
    const binary = atob(payload.contentBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], {type: payload.mime || "application/octet-stream"});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = payload.filename || `GovGo_Report.${payload.format || "xlsx"}`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  window.GovGoReportsApi = {
    runReport,
    generateSql,
    executeSql,
    loadHistory,
    loadReport,
    loadWorkspace,
    saveWorkspace,
    saveReport,
    deleteReport,
    deleteChat,
    exportReport,
    downloadBase64File,
  };
})();
