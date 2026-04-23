(function registerGovGoSearchUiAdapter() {
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
    return {
      id: (item && item.item_id) || `${item && item.rank ? item.rank : index + 1}-${index}`,
      rank: (item && item.rank) || index + 1,
      title: (item && item.title) || "(sem titulo)",
      organization: (item && item.organization) || "(sem orgao)",
      municipality: (item && item.municipality) || "-",
      uf: (item && item.uf) || "-",
      modality: (item && item.modality) || "-",
      closingDateLabel: formatDate(item && item.closing_date),
      estimatedValueLabel: formatMoney(item && item.estimated_value),
      similarityRatio,
      similarityLabel: formatPercent(similarityRatio),
      raw: (item && item.raw) || {},
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

  window.GovGoSearchUiAdapter = { normalizeResponse };
})();