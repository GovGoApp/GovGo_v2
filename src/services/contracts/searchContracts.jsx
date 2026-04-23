(function registerGovGoSearchContracts() {
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

  const LIMIT_OPTIONS = [5, 10, 20, 30];
  const TOP_CATEGORY_OPTIONS = [5, 10, 15, 20, 30];

  function createDefaultSearchForm() {
    return {
      query: "alimenta\u00e7\u00e3o hospitalar",
      searchType: "keyword",
      limit: 10,
      categorySearchBase: "semantic",
      topCategoriesLimit: 10,
      preprocess: true,
      filterExpired: true,
      useNegation: true,
    };
  }

  function toApiPayload(formState) {
    const form = formState || createDefaultSearchForm();
    return {
      query: String(form.query || "").trim(),
      search_type: String(form.searchType || "keyword"),
      limit: Number(form.limit || 10),
      preprocess: form.preprocess !== false,
      filter_expired: form.filterExpired !== false,
      use_negation: form.useNegation !== false,
      top_categories_limit: Number(form.topCategoriesLimit || 10),
      category_search_base: String(form.categorySearchBase || "semantic"),
      filters: [],
    };
  }

  window.GovGoSearchContracts = {
    SEARCH_TYPES,
    CATEGORY_BASES,
    LIMIT_OPTIONS,
    TOP_CATEGORY_OPTIONS,
    createDefaultSearchForm,
    toApiPayload,
  };
})();