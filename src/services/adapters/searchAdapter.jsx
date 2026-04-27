(function registerGovGoSearchUiAdapter() {
  const LAST_RESPONSE_STORAGE_KEY = "govgo.v2.search.lastResponse";
  const LAST_EDITAL_STORAGE_KEY = "govgo.v2.search.lastEdital";
  const PENDING_SEARCH_STORAGE_KEY = "govgo.v2.search.pending";

  const moneyFormatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  });

  const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
  });

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function toFiniteNumber(value) {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function safeReadJson(key) {
    try {
      const raw = window.sessionStorage && window.sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function safeWriteJson(key, value) {
    try {
      if (window.sessionStorage) {
        window.sessionStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {}
  }

  function safeRemove(key) {
    try {
      if (window.sessionStorage) {
        window.sessionStorage.removeItem(key);
      }
    } catch (error) {}
  }

  function firstFilled(...values) {
    for (const value of values) {
      if (value !== null && value !== undefined && value !== "") {
        return value;
      }
    }
    return "";
  }

  function normalizeSimilarity(value) {
    const numericValue = toFiniteNumber(value);
    if (numericValue === null) {
      return 0;
    }
    if (numericValue <= 1) {
      return clamp(numericValue, 0, 1);
    }
    return clamp(numericValue / 100, 0, 1);
  }

  function formatPercent(value) {
    return `${Math.round(value * 100)}%`;
  }

  function formatMoney(value) {
    const numericValue = toFiniteNumber(value);
    if (numericValue === null) {
      return "-";
    }
    return moneyFormatter.format(numericValue);
  }

  function formatDate(value) {
    if (!value) {
      return "-";
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      return String(value);
    }
    return dateFormatter.format(parsedDate);
  }

  function normalizeItem(item, index) {
    const similarityRatio = normalizeSimilarity(item && item.similarity);
    const raw = (item && item.raw) || {};
    const details = raw.details || {};
    const latitude = toFiniteNumber(firstFilled(
      item && item.latitude,
      raw.latitude,
      raw.lat,
      details.latitude,
      details.lat
    ));
    const longitude = toFiniteNumber(firstFilled(
      item && item.longitude,
      raw.longitude,
      raw.lon,
      details.longitude,
      details.lon
    ));
    const id = firstFilled(
      item && item.item_id,
      raw.numero_controle,
      raw.numero_controle_pncp,
      raw.id,
      details.numero_controle_pncp,
      `${item && item.rank ? item.rank : index + 1}-${index}`
    );
    return {
      id,
      rank: (item && item.rank) || index + 1,
      title: (item && item.title) || "(sem titulo)",
      organization: (item && item.organization) || "(sem orgao)",
      municipality: (item && item.municipality) || "-",
      uf: (item && item.uf) || "-",
      modality: (item && item.modality) || "-",
      closingDate: item && item.closing_date,
      closingDateLabel: formatDate(item && item.closing_date),
      estimatedValue: item && item.estimated_value,
      estimatedValueLabel: formatMoney(item && item.estimated_value),
      similarityRatio,
      similarityLabel: formatPercent(similarityRatio),
      municipalityCode: firstFilled(
        item && item.municipality_code,
        raw.municipality_code,
        details.ibge_municipio,
        details.unidade_orgao_codigo_ibge,
        details.municipio
      ),
      latitude,
      longitude,
      details,
      raw,
    };
  }

  function countDocuments(details, raw) {
    const fromNumber = toFiniteNumber(firstFilled(
      details && details.numero_documentos,
      raw && raw.numero_documentos,
      raw && raw.document_count
    ));
    if (fromNumber !== null) {
      return fromNumber;
    }

    const lista = firstFilled(details && details.lista_documentos, raw && raw.lista_documentos);
    if (Array.isArray(lista)) {
      return lista.length;
    }
    return 0;
  }

  function toEditalShape(item) {
    const raw = (item && item.raw) || {};
    const details = (item && item.details) || raw.details || {};
    const val = toFiniteNumber(firstFilled(
      item && item.estimatedValue,
      details.valor_total_estimado,
      details.valor_total_homologado,
      raw.valor_total_estimado,
      raw.valor_total_homologado
    ));
    const id = firstFilled(
      item && item.id,
      item && item.itemId,
      raw.numero_controle,
      raw.numero_controle_pncp,
      raw.id,
      details.numero_controle_pncp,
      item && item.rank
    );

    return {
      id: String(id || ""),
      itemId: String(id || ""),
      rank: (item && item.rank) || 0,
      org: firstFilled(item && item.organization, details.orgao_entidade_razao_social, details.orgao, item && item.title, "-"),
      mun: firstFilled(item && item.municipality, details.unidade_orgao_municipio_nome, details.municipio, "-"),
      uf: firstFilled(item && item.uf, details.unidade_orgao_uf_sigla, details.uf, "-"),
      sim: typeof (item && item.similarityRatio) === "number" ? item.similarityRatio : 0,
      val: val === null ? 0 : val,
      end: firstFilled(item && item.closingDateLabel, formatDate(details.data_encerramento_proposta), "-"),
      modal: firstFilled(item && item.modality, details.modalidade_nome, "-"),
      items: toFiniteNumber(firstFilled(details.numero_itens, raw.numero_itens)) || 0,
      docs: countDocuments(details, raw),
      status: firstFilled(details.situacao_edital, raw.situacao_edital, "aberto"),
      title: firstFilled(item && item.title, details.objeto_compra, ""),
      objeto: firstFilled(details.objeto_compra, item && item.title, ""),
      municipioCode: firstFilled(item && item.municipalityCode, raw.municipality_code, details.ibge_municipio, details.unidade_orgao_codigo_ibge, ""),
      lat: toFiniteNumber(firstFilled(item && item.latitude, raw.latitude, raw.lat, details.latitude, details.lat)),
      lon: toFiniteNumber(firstFilled(item && item.longitude, raw.longitude, raw.lon, details.longitude, details.lon)),
      details,
      raw,
    };
  }

  function normalizeResponse(response) {
    const safeResponse = response || {};
    const confidence = toFiniteNumber(safeResponse.confidence);
    const rawResults = Array.isArray(safeResponse.results) ? safeResponse.results : [];
    return {
      source: safeResponse.source || "v2.search_api",
      elapsedLabel: `${safeResponse.elapsed_ms || 0} ms`,
      confidenceLabel: confidence === null ? "-" : `${confidence.toFixed(1)}%`,
      resultCountLabel: String(safeResponse.result_count || 0),
      error: safeResponse.error || "",
      results: rawResults.map(normalizeItem),
      preprocessing: safeResponse.preprocessing || {},
      meta: safeResponse.meta || {},
      request: safeResponse.request || {},
    };
  }

  function rememberResponse(normalizedResponse) {
    const payload = {
      savedAt: new Date().toISOString(),
      query: normalizedResponse && normalizedResponse.request && normalizedResponse.request.query,
      results: (normalizedResponse && normalizedResponse.results) || [],
    };
    window.__govgoSearchLastResponse = payload;
    safeWriteJson(LAST_RESPONSE_STORAGE_KEY, payload);
  }

  function getRememberedResponse() {
    return window.__govgoSearchLastResponse || safeReadJson(LAST_RESPONSE_STORAGE_KEY) || { results: [] };
  }

  function rememberEdital(edital) {
    if (!edital) {
      return;
    }
    const shaped = edital.org ? edital : toEditalShape(edital);
    window.__govgoSearchLastEdital = shaped;
    safeWriteJson(LAST_EDITAL_STORAGE_KEY, shaped);
  }

  function findRememberedEdital(key) {
    const lookup = String(key || "");
    const direct = window.__govgoSearchLastEdital || safeReadJson(LAST_EDITAL_STORAGE_KEY);
    if (direct && (!lookup || String(direct.id) === lookup || String(direct.itemId) === lookup || String(direct.rank) === lookup)) {
      return direct;
    }

    const remembered = getRememberedResponse();
    const results = Array.isArray(remembered.results) ? remembered.results : [];
    const found = results.find((item) => {
      const shaped = toEditalShape(item);
      return (
        String(shaped.id) === lookup ||
        String(shaped.itemId) === lookup ||
        String(shaped.rank) === lookup
      );
    });
    return found ? toEditalShape(found) : null;
  }

  function setPendingSearch(query, searchInput) {
    const pending = { query };
    if (searchInput && typeof searchInput === "object" && !Array.isArray(searchInput)) {
      pending.config = searchInput;
      pending.searchType = searchInput.searchType || "semantic";
    } else {
      pending.searchType = searchInput || "semantic";
    }
    safeWriteJson(PENDING_SEARCH_STORAGE_KEY, pending);
  }

  function consumePendingSearch() {
    const pending = safeReadJson(PENDING_SEARCH_STORAGE_KEY);
    safeRemove(PENDING_SEARCH_STORAGE_KEY);
    return pending;
  }

  window.GovGoSearchUiAdapter = {
    normalizeResponse,
    toEditalShape,
    rememberResponse,
    rememberEdital,
    findRememberedEdital,
    setPendingSearch,
    consumePendingSearch,
  };
})();
