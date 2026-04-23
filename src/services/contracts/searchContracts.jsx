(function registerGovGoSearchContracts() {
  const SEARCH_TYPE_OPTIONS = [
    { value: "semantic", label: "Semantica" },
    { value: "keyword", label: "Palavras-chave" },
    { value: "hybrid", label: "Hibrida" },
  ];

  const SEARCH_APPROACH_OPTIONS = [
    { value: "direct", label: "Direta" },
    { value: "correspondence", label: "Correspondencia" },
    { value: "category_filtered", label: "Categoria" },
  ];

  const RELEVANCE_OPTIONS = [
    { value: 1, label: "Permissivo" },
    { value: 2, label: "Flexivel" },
    { value: 3, label: "Restritivo" },
  ];

  const SORT_OPTIONS = [
    { value: 1, label: "Similaridade" },
    { value: 2, label: "Data" },
    { value: 3, label: "Valor" },
  ];

  const TOP_CATEGORY_OPTIONS = [5, 10, 15, 20, 30, 50];
  const LIMIT_PRESETS = [10, 20, 30, 50, 100];
  const LIMIT_RANGE = { min: 5, max: 1000 };
  const TOP_CATEGORY_RANGE = { min: 1, max: 100 };
  const MIN_SIMILARITY_RANGE = { min: 0, max: 1, step: 0.01 };

  const FILTER_UF_OPTIONS = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
    "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
    "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
  ];

  const FILTER_MODALIDADE_OPTIONS = [
    { value: "1", label: "01 - Pregao" },
    { value: "2", label: "02 - Concorrencia" },
    { value: "3", label: "03 - Concurso" },
    { value: "4", label: "04 - Leilao" },
    { value: "5", label: "05 - Dialogo Competitivo" },
    { value: "6", label: "06 - Dispensa de Licitacao" },
    { value: "7", label: "07 - Inexigibilidade de Licitacao" },
    { value: "8", label: "08 - Credenciamento" },
  ];

  const FILTER_MODO_OPTIONS = [
    { value: "1", label: "01 - Aberto" },
    { value: "2", label: "02 - Fechado" },
    { value: "3", label: "03 - Aberto/Fechado" },
    { value: "4", label: "04 - Fechado/Aberto" },
  ];

  const FILTER_DATE_FIELD_OPTIONS = [
    { value: "encerramento", label: "Encerramento" },
    { value: "abertura", label: "Abertura" },
    { value: "publicacao", label: "Publicacao" },
  ];

  const FILTER_MODALIDADE_VALUES = FILTER_MODALIDADE_OPTIONS.map((option) => option.value);
  const FILTER_MODO_VALUES = FILTER_MODO_OPTIONS.map((option) => option.value);

  const SEARCH_TYPES = [
    { value: "keyword", label: "Keyword" },
    { value: "semantic", label: "Semantica" },
    { value: "hybrid", label: "Hibrida" },
    { value: "correspondence", label: "Correspondencia" },
    { value: "category_filtered", label: "Categoria filtrada" },
  ];

  const CATEGORY_BASES = [
    { value: "semantic", label: "Base semantica" },
    { value: "keyword", label: "Base keyword" },
    { value: "hybrid", label: "Base hibrida" },
  ];

  const VALID_BASE_TYPES = new Set(["semantic", "keyword", "hybrid"]);
  const VALID_APPROACHES = new Set(SEARCH_APPROACH_OPTIONS.map((option) => option.value));
  const VALID_SORTS = new Set(SORT_OPTIONS.map((option) => option.value));
  const VALID_RELEVANCE = new Set(RELEVANCE_OPTIONS.map((option) => option.value));
  const VALID_UFS = new Set(FILTER_UF_OPTIONS);
  const VALID_MODALIDADES = new Set(FILTER_MODALIDADE_VALUES);
  const VALID_MODOS = new Set(FILTER_MODO_VALUES);
  const VALID_DATE_FIELDS = new Set(FILTER_DATE_FIELD_OPTIONS.map((option) => option.value));

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function coerceInteger(value, fallback, min, max) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return fallback;
    }
    return clamp(Math.round(numericValue), min, max);
  }

  function coerceDecimal(value, fallback, min, max, precision) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return fallback;
    }
    const factor = Number.isFinite(precision) ? Math.pow(10, precision) : 1;
    const normalized = clamp(numericValue, min, max);
    return factor > 1 ? Math.round(normalized * factor) / factor : normalized;
  }

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function normalizeDate(value) {
    const text = normalizeText(value);
    if (!text) {
      return "";
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return text;
    }
    const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) {
      return "";
    }
    return `${match[3]}-${match[2]}-${match[1]}`;
  }

  function normalizeMultiValue(value, validSet) {
    const source = Array.isArray(value) ? value : (value == null || value === "" ? [] : [value]);
    const seen = new Set();
    const normalized = [];
    for (const item of source) {
      const text = normalizeText(item);
      if (!text || !validSet.has(text) || seen.has(text)) {
        continue;
      }
      seen.add(text);
      normalized.push(text);
    }
    return normalized;
  }

  function hasPartialSelection(values, total) {
    return Array.isArray(values) && values.length > 0 && values.length < total;
  }

  function optionLabel(options, value, fallback = "") {
    const found = (options || []).find((option) => option.value === value);
    return found ? found.label : fallback;
  }

  function createDefaultSearchForm() {
    return {
      query: "",
      searchType: "semantic",
      searchApproach: "direct",
      relevanceLevel: 1,
      sortMode: 1,
      limit: 10,
      categorySearchBase: "semantic",
      topCategoriesLimit: 10,
      preprocess: true,
      filterExpired: true,
      useNegation: true,
      minSimilarity: 0,
    };
  }

  function createDefaultSearchFilters() {
    return {
      pncp: "",
      orgao: "",
      cnpj: "",
      uasg: "",
      uf: [],
      municipio: "",
      modalidade: [...FILTER_MODALIDADE_VALUES],
      modo: [...FILTER_MODO_VALUES],
      dateField: "encerramento",
      startDate: "",
      endDate: "",
    };
  }

  function normalizeFormState(formState) {
    const defaults = createDefaultSearchForm();
    const form = { ...defaults, ...(formState || {}) };
    const searchType = VALID_BASE_TYPES.has(String(form.searchType || "").trim())
      ? String(form.searchType || "").trim()
      : defaults.searchType;
    const searchApproach = VALID_APPROACHES.has(String(form.searchApproach || "").trim())
      ? String(form.searchApproach || "").trim()
      : defaults.searchApproach;
    const categorySearchBase = VALID_BASE_TYPES.has(String(form.categorySearchBase || "").trim())
      ? String(form.categorySearchBase || "").trim()
      : searchType;
    const relevanceLevel = VALID_RELEVANCE.has(Number(form.relevanceLevel))
      ? Number(form.relevanceLevel)
      : defaults.relevanceLevel;
    const sortMode = VALID_SORTS.has(Number(form.sortMode))
      ? Number(form.sortMode)
      : defaults.sortMode;

    return {
      ...defaults,
      ...form,
      query: normalizeText(form.query),
      searchType,
      searchApproach,
      categorySearchBase,
      relevanceLevel,
      sortMode,
      limit: coerceInteger(form.limit, defaults.limit, LIMIT_RANGE.min, LIMIT_RANGE.max),
      topCategoriesLimit: coerceInteger(
        form.topCategoriesLimit,
        defaults.topCategoriesLimit,
        TOP_CATEGORY_RANGE.min,
        TOP_CATEGORY_RANGE.max
      ),
      minSimilarity: coerceDecimal(
        form.minSimilarity,
        defaults.minSimilarity,
        MIN_SIMILARITY_RANGE.min,
        MIN_SIMILARITY_RANGE.max,
        2
      ),
      preprocess: form.preprocess !== false,
      filterExpired: form.filterExpired !== false,
      useNegation: form.useNegation !== false,
    };
  }

  function normalizeFilters(filterState) {
    const defaults = createDefaultSearchFilters();
    const filter = { ...defaults, ...(filterState || {}) };
    const startDate = normalizeDate(filter.startDate);
    let endDate = normalizeDate(filter.endDate);
    if (startDate && endDate && endDate < startDate) {
      endDate = startDate;
    }

    return {
      ...defaults,
      ...filter,
      pncp: normalizeText(filter.pncp),
      orgao: normalizeText(filter.orgao),
      cnpj: normalizeText(filter.cnpj),
      uasg: normalizeText(filter.uasg),
      uf: normalizeMultiValue(filter.uf, VALID_UFS),
      municipio: normalizeText(filter.municipio),
      modalidade: normalizeMultiValue(filter.modalidade, VALID_MODALIDADES),
      modo: normalizeMultiValue(filter.modo, VALID_MODOS),
      dateField: VALID_DATE_FIELDS.has(String(filter.dateField || "").trim())
        ? String(filter.dateField || "").trim()
        : defaults.dateField,
      startDate,
      endDate,
    };
  }

  function hasActiveFilters(filterState) {
    const filter = normalizeFilters(filterState);
    return Boolean(
      filter.pncp ||
      filter.orgao ||
      filter.cnpj ||
      filter.uasg ||
      filter.uf.length ||
      filter.municipio ||
      hasPartialSelection(filter.modalidade, FILTER_MODALIDADE_VALUES.length) ||
      hasPartialSelection(filter.modo, FILTER_MODO_VALUES.length) ||
      filter.startDate ||
      filter.endDate
    );
  }

  function summarizeSelectedOptions(options, values) {
    const labels = options
      .filter((option) => values.includes(option.value))
      .map((option) => option.label.replace(/^\d+\s*-\s*/, ""));

    if (labels.length <= 2) {
      return labels.join(", ");
    }
    return `${labels.length} selecionados`;
  }

  function formatFilterDate(value) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return "";
    }
    return `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`;
  }

  function describeActiveFilters(filterState) {
    const filter = normalizeFilters(filterState);
    const chips = [];

    if (filter.pncp) {
      chips.push({ id: "pncp", label: `PNCP: ${filter.pncp}`, tone: "blue" });
    }
    if (filter.orgao) {
      chips.push({ id: "orgao", label: `Orgao: ${filter.orgao}`, tone: "blue" });
    }
    if (filter.cnpj) {
      chips.push({ id: "cnpj", label: `CNPJ: ${filter.cnpj}`, tone: "blue" });
    }
    if (filter.uasg) {
      chips.push({ id: "uasg", label: `UASG: ${filter.uasg}`, tone: "blue" });
    }
    if (filter.uf.length) {
      chips.push({ id: "uf", label: `UF: ${filter.uf.join(", ")}`, tone: "blue" });
    }
    if (filter.municipio) {
      chips.push({ id: "municipio", label: `Municipios: ${filter.municipio}`, tone: "blue" });
    }
    if (hasPartialSelection(filter.modalidade, FILTER_MODALIDADE_VALUES.length)) {
      chips.push({
        id: "modalidade",
        label: `Modalidade: ${summarizeSelectedOptions(FILTER_MODALIDADE_OPTIONS, filter.modalidade)}`,
        tone: "blue",
      });
    }
    if (hasPartialSelection(filter.modo, FILTER_MODO_VALUES.length)) {
      chips.push({
        id: "modo",
        label: `Modo: ${summarizeSelectedOptions(FILTER_MODO_OPTIONS, filter.modo)}`,
        tone: "blue",
      });
    }
    if (filter.startDate || filter.endDate) {
      const dateFieldLabel = optionLabel(FILTER_DATE_FIELD_OPTIONS, filter.dateField, "Encerramento");
      const parts = [];
      if (filter.startDate) {
        parts.push(`de ${formatFilterDate(filter.startDate)}`);
      }
      if (filter.endDate) {
        parts.push(`ate ${formatFilterDate(filter.endDate)}`);
      }
      chips.push({
        id: "periodo",
        label: `${dateFieldLabel}: ${parts.join(" ")}`.trim(),
        tone: "orange",
      });
    }

    return chips;
  }

  function resolveApiSearchShape(formState) {
    const form = normalizeFormState(formState);
    const categorySearchBase = VALID_BASE_TYPES.has(form.categorySearchBase)
      ? form.categorySearchBase
      : form.searchType;

    if (form.searchApproach === "correspondence") {
      return { form, searchType: "correspondence", categorySearchBase };
    }

    if (form.searchApproach === "category_filtered") {
      return { form, searchType: "category_filtered", categorySearchBase };
    }

    return { form, searchType: form.searchType, categorySearchBase };
  }

  function toApiFilters(filterState) {
    const filter = normalizeFilters(filterState);
    return {
      pncp: filter.pncp,
      orgao: filter.orgao,
      cnpj: filter.cnpj,
      uasg: filter.uasg,
      uf: filter.uf,
      municipio: filter.municipio,
      modalidade_id: filter.modalidade,
      modo_id: filter.modo,
      date_field: filter.dateField,
      date_start: filter.startDate,
      date_end: filter.endDate,
    };
  }

  function toApiPayload(formState) {
    const { form, searchType, categorySearchBase } = resolveApiSearchShape(formState);
    const uiFilters = toApiFilters(form.uiFilters);
    return {
      query: form.query,
      search_type: searchType,
      limit: form.limit,
      preprocess: form.preprocess !== false,
      filter_expired: form.filterExpired !== false,
      use_negation: form.useNegation !== false,
      top_categories_limit: form.topCategoriesLimit,
      category_search_base: categorySearchBase,
      relevance_level: form.relevanceLevel,
      sort_mode: form.sortMode,
      min_similarity: form.minSimilarity,
      ui_filters: uiFilters,
      filters: [],
    };
  }

  function describeConfig(formState) {
    const form = normalizeFormState(formState);
    return {
      typeLabel: optionLabel(SEARCH_TYPE_OPTIONS, form.searchType, "Semantica"),
      approachLabel: optionLabel(SEARCH_APPROACH_OPTIONS, form.searchApproach, "Direta"),
      relevanceLabel: optionLabel(RELEVANCE_OPTIONS, form.relevanceLevel, "Permissivo"),
      sortLabel: optionLabel(SORT_OPTIONS, form.sortMode, "Similaridade"),
      minSimilarityLabel: form.minSimilarity.toFixed(2),
      limitLabel: String(form.limit),
      topCategoriesLabel: String(form.topCategoriesLimit),
    };
  }

  window.GovGoSearchContracts = {
    SEARCH_TYPES,
    CATEGORY_BASES,
    SEARCH_TYPE_OPTIONS,
    SEARCH_APPROACH_OPTIONS,
    RELEVANCE_OPTIONS,
    SORT_OPTIONS,
    LIMIT_PRESETS,
    LIMIT_RANGE,
    TOP_CATEGORY_OPTIONS,
    TOP_CATEGORY_RANGE,
    MIN_SIMILARITY_RANGE,
    FILTER_UF_OPTIONS,
    FILTER_MODALIDADE_OPTIONS,
    FILTER_MODO_OPTIONS,
    FILTER_DATE_FIELD_OPTIONS,
    createDefaultSearchForm,
    createDefaultSearchFilters,
    normalizeFormState,
    normalizeFilters,
    hasActiveFilters,
    describeActiveFilters,
    resolveApiSearchShape,
    describeConfig,
    toApiPayload,
    toApiFilters,
  };
})();
