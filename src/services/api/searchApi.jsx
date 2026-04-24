(function registerGovGoSearchApi() {
  async function parseJsonResponse(response, invalidJsonMessage) {
    try {
      return await response.json();
    } catch (error) {
      throw new Error(invalidJsonMessage);
    }
  }

  async function runSearch(formState) {
    if (!window.GovGoSearchContracts) {
      throw new Error("GovGoSearchContracts indisponivel.");
    }

    const response = await fetch("/api/search", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(window.GovGoSearchContracts.toApiPayload(formState)),
    });

    const payload = await parseJsonResponse(response, "A API de Busca retornou um JSON invalido.");

    if (!response.ok && !payload.error) {
      throw new Error(`Falha HTTP ${response.status} ao executar a Busca.`);
    }

    return payload;
  }

  async function loadSearchConfig() {
    const response = await fetch("/api/search-config", {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    const payload = await parseJsonResponse(response, "A API de configuracao retornou um JSON invalido.");

    if (!response.ok) {
      throw new Error(payload.error || `Falha HTTP ${response.status} ao carregar a configuracao.`);
    }

    return payload.config || {};
  }

  async function saveSearchConfig(formState) {
    if (!window.GovGoSearchContracts) {
      throw new Error("GovGoSearchContracts indisponivel.");
    }

    const response = await fetch("/api/search-config", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(window.GovGoSearchContracts.normalizeFormState(formState)),
    });

    const payload = await parseJsonResponse(response, "A API de configuracao retornou um JSON invalido.");

    if (!response.ok) {
      throw new Error(payload.error || `Falha HTTP ${response.status} ao salvar a configuracao.`);
    }

    return payload.config || {};
  }

  async function loadSearchFilters() {
    const response = await fetch("/api/search-filters", {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    const payload = await parseJsonResponse(response, "A API de filtros retornou um JSON invalido.");

    if (!response.ok) {
      throw new Error(payload.error || `Falha HTTP ${response.status} ao carregar os filtros.`);
    }

    return payload.filters || {};
  }

  async function saveSearchFilters(filterState) {
    if (!window.GovGoSearchContracts?.normalizeFilters) {
      throw new Error("GovGoSearchContracts indisponivel.");
    }

    const response = await fetch("/api/search-filters", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(window.GovGoSearchContracts.normalizeFilters(filterState)),
    });

    const payload = await parseJsonResponse(response, "A API de filtros retornou um JSON invalido.");

    if (!response.ok) {
      throw new Error(payload.error || `Falha HTTP ${response.status} ao salvar os filtros.`);
    }

    return payload.filters || {};
  }

  async function loadEditalItems({ pncpId, limit = 500 } = {}) {
    const response = await fetch("/api/edital-items", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pncp_id: pncpId || "",
        limit,
      }),
    });

    const payload = await parseJsonResponse(response, "A API de itens retornou um JSON invalido.");

    if (!response.ok) {
      throw new Error(payload.error || `Falha HTTP ${response.status} ao carregar os itens do edital.`);
    }

    return {
      pncpId: payload.pncp_id || pncpId || "",
      count: payload.count || 0,
      items: Array.isArray(payload.items) ? payload.items : [],
    };
  }

  async function loadEditalDocuments({ pncpId, limit = 200 } = {}) {
    const response = await fetch("/api/edital-documentos", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pncp_id: pncpId || "",
        limit,
      }),
    });

    const payload = await parseJsonResponse(response, "A API de documentos retornou um JSON invalido.");

    if (!response.ok) {
      throw new Error(payload.error || `Falha HTTP ${response.status} ao carregar os documentos do edital.`);
    }

    return {
      pncpId: payload.pncp_id || pncpId || "",
      count: payload.count || 0,
      documents: Array.isArray(payload.documents) ? payload.documents : [],
    };
  }

  async function loadEditalDocumentView({ pncpId, documentUrl, documentName, force = false } = {}) {
    const response = await fetch("/api/edital-document-view", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pncp_id: pncpId || "",
        document_url: documentUrl || "",
        document_name: documentName || "",
        force: !!force,
      }),
    });

    const payload = await parseJsonResponse(response, "A API de visualizacao do documento retornou um JSON invalido.");

    if (!response.ok) {
      throw new Error(payload.error || `Falha HTTP ${response.status} ao carregar o documento.`);
    }

    return payload;
  }

  async function loadEditalDocumentsSummary({ pncpId, force = false, generateIfMissing = true } = {}) {
    const response = await fetch("/api/edital-documents-summary", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pncp_id: pncpId || "",
        force: !!force,
        generate_if_missing: force ? true : !!generateIfMissing,
      }),
    });

    const payload = await parseJsonResponse(response, "A API de resumo dos documentos retornou um JSON invalido.");

    if (!response.ok) {
      throw new Error(payload.error || `Falha HTTP ${response.status} ao carregar o resumo dos documentos.`);
    }

    return payload;
  }

  window.GovGoSearchApi = {
    runSearch,
    loadSearchConfig,
    saveSearchConfig,
    loadSearchFilters,
    saveSearchFilters,
    loadEditalItems,
    loadEditalDocuments,
    loadEditalDocumentView,
    loadEditalDocumentsSummary,
  };
})();
