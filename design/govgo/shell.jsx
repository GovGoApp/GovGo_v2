// Shell: top bar, left rail, search rail (Busca), activity rail (Favoritos/Histórico/Boletins)
const { useState: uS, useEffect: uE } = React;
const GOVGO_LOGO_LIGHT_URL = "/src/assets/logos/govgo_logo_light_mode.png";
const GOVGO_LOGO_DARK_URL = "/src/assets/logos/govgo_logo_dark_mode.png";

function TopBar({mode}) {
  const [theme, setTheme] = uS(() => {
    if (typeof document === 'undefined') return 'light';
    return document.documentElement.getAttribute('data-theme') || localStorage.getItem('govgo-theme') || 'light';
  });
  const logoUrl = theme === "dark" ? GOVGO_LOGO_DARK_URL : GOVGO_LOGO_LIGHT_URL;
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('govgo-theme', next); } catch(e){}
  };
  return (
    <header style={{
      height: 56, background: "var(--paper)", borderBottom: "1px solid var(--hairline)",
      display: "flex", alignItems: "center", padding: "0 16px", gap: 16,
      position: "sticky", top: 0, zIndex: 30,
    }}>
      <div style={{display: "flex", alignItems: "center", gap: 10, height: "100%"}}>
        <div style={{height: "100%", display: "flex", alignItems: "stretch", padding: "6px 0"}}>
          <div style={{height: "100%", aspectRatio: "4.2 / 1", overflow: "hidden", display: "flex", alignItems: "stretch"}}>
            <img
              src={logoUrl}
              alt="GovGo"
              style={{
                width: "100%",
                height: "100%",
                display: "block",
                objectFit: "cover",
                objectPosition: "calc(50% - 10px) calc(50% + 4px)",
              }}
            />
          </div>
        </div>
        <span style={{fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 12, color: "var(--ink-3)"}}>v2</span>
        <span style={{
          marginLeft: 4, fontSize: 10, fontWeight: 700, padding: "2px 6px",
          background: "var(--blue-50)", color: "var(--deep-blue)", borderRadius: 4, letterSpacing: ".06em"
        }}>BETA</span>
      </div>
      <div style={{flex: 1}}/>
      <div style={{display: "flex", alignItems: "center", gap: 8}}>
        <Button kind="ghost" size="sm" icon={<Icon.history size={14}/>}>Histórico</Button>
        <button onClick={toggleTheme} title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'} style={{
          all: "unset", cursor: "pointer",
          width: 34, height: 34, borderRadius: 8, display: "inline-flex",
          alignItems: "center", justifyContent: "center", color: "var(--ink-2)",
          border: "1px solid var(--hairline)", background: "var(--paper)",
        }}>
          {theme === 'dark' ? <Icon.sun size={16}/> : <Icon.moon size={16}/>}
        </button>
        <div style={{height: 20, width: 1, background: "var(--hairline)"}}/>
        <span style={{
          fontSize: 11.5, padding: "3px 8px", borderRadius: 999,
          background: "var(--green-50)", color: "var(--green)", fontWeight: 600,
          border: "1px solid var(--green-100)"
        }}>PRO • 82% do uso</span>
        <button style={{
          all: "unset", cursor: "pointer", position: "relative",
          width: 34, height: 34, borderRadius: 8, display: "inline-flex",
          alignItems: "center", justifyContent: "center", color: "var(--ink-2)",
        }}><Icon.bell size={17}/>
          <span style={{position:"absolute", top: 7, right: 8, width: 7, height: 7, borderRadius: "50%", background: "var(--orange)", border: "2px solid var(--paper)"}}/>
        </button>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "linear-gradient(135deg, #0B4A8A, #003A70)",
          color: "white", fontFamily: "var(--font-display)", fontWeight: 600,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontSize: 12,
        }}>RS</div>
      </div>
    </header>
  );
}

function LeftRail({mode, onMode}) {
  const items = [
    { id: "home",          label: "Início",         icon: <Icon.grid size={18}/> },
    { id: "oportunidades", label: "Busca",          icon: <Icon.search size={18}/>, count: "214" },
    { id: "fornecedores",  label: "Empresas",       icon: <Icon.building size={18}/> },
    { id: "mercado",       label: "Radar",          icon: <Icon.radar size={18}/>},
    { id: "relatorios",    label: "Relatórios",     icon: <Icon.terminal size={18}/> },
    { id: "designsystem",  label: "Design",         icon: <Icon.sparkle size={18}/> },
  ];
  return (
    <nav style={{
      width: 72, background: "var(--nav-bg)",
      display: "flex", flexDirection: "column", alignItems: "center", padding: "14px 0",
      gap: 2, borderRight: "1px solid rgba(255,255,255,.04)",
    }}>
      {items.map(it => {
        const active = mode === it.id;
        return (
          <button key={it.id} onClick={() => onMode(it.id)} title={it.label}
            style={{
              all: "unset", cursor: "pointer", width: 56, padding: "10px 0",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
              borderRadius: 10,
              color: active ? "white" : "rgba(255,255,255,.6)",
              background: active ? "rgba(255,87,34,.15)" : "transparent",
              position: "relative",
              transition: "background 140ms, color 140ms",
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,.04)"; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
            {active && <span style={{position:"absolute", left: -14, top: 10, bottom: 10, width: 3, background: "var(--orange)", borderRadius: "0 3px 3px 0"}}/>}
            <span style={{display: "inline-flex"}}>{it.icon}</span>
            <span style={{fontSize: 10.5, fontFamily: "var(--font-display)", fontWeight: 500, letterSpacing: ".01em"}}>{it.label.split(" ")[0]}</span>
            {it.badge && <span style={{
              position: "absolute", top: 6, right: 8, fontSize: 9, padding: "1px 4px",
              background: "var(--orange)", color: "white", borderRadius: 3, fontWeight: 700, letterSpacing: ".04em"
            }}>NEW</span>}
          </button>
        );
      })}
      <div style={{flex: 1}}/>
      <button title="Ajuda" style={{
        all: "unset", cursor: "pointer", width: 40, height: 40,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        color: "rgba(255,255,255,.5)", borderRadius: 10,
      }}><Icon.brief size={16}/></button>
    </nav>
  );
}

function createSearchRailConfig() {
  if (window.GovGoSearchContracts?.createDefaultSearchForm) {
    return window.GovGoSearchContracts.createDefaultSearchForm();
  }

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

function normalizeSearchRailConfig(config) {
  if (window.GovGoSearchContracts?.normalizeFormState) {
    return window.GovGoSearchContracts.normalizeFormState(config);
  }
  return { ...createSearchRailConfig(), ...(config || {}) };
}

function describeSearchRailConfig(config) {
  if (window.GovGoSearchContracts?.describeConfig) {
    return window.GovGoSearchContracts.describeConfig(config);
  }
  return {
    typeLabel: "Semantica",
    approachLabel: "Direta",
    relevanceLabel: "Permissivo",
    sortLabel: "Similaridade",
    minSimilarityLabel: "0.00",
    limitLabel: "10",
    topCategoriesLabel: "10",
  };
}

const FILTER_UF_OPTIONS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
  "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
  "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const FILTER_MODALIDADE_OPTIONS = [
  { value: "1", label: "01 - Leilao - Eletronico" },
  { value: "2", label: "02 - Dialogo Competitivo" },
  { value: "3", label: "03 - Concurso" },
  { value: "4", label: "04 - Concorrencia - Eletronica" },
  { value: "5", label: "05 - Concorrencia - Presencial" },
  { value: "6", label: "06 - Pregao - Eletronico" },
  { value: "7", label: "07 - Pregao - Presencial" },
  { value: "8", label: "08 - Dispensa" },
  { value: "9", label: "09 - Inexigibilidade" },
  { value: "10", label: "10 - Manifestacao de Interesse" },
  { value: "11", label: "11 - Pre-qualificacao" },
  { value: "12", label: "12 - Credenciamento" },
  { value: "13", label: "13 - Leilao - Presencial" },
  { value: "14", label: "14 - Inaplicabilidade da Licitacao" },
];

const FILTER_MODO_OPTIONS = [
  { value: "1", label: "01 - Aberto" },
  { value: "2", label: "02 - Fechado" },
  { value: "3", label: "03 - Aberto-Fechado" },
  { value: "4", label: "04 - Dispensa Com Disputa" },
  { value: "5", label: "05 - Nao se aplica" },
  { value: "6", label: "06 - Fechado-Aberto" },
];

const FILTER_DATE_FIELD_OPTIONS = [
  { value: "encerramento", label: "Encerramento" },
  { value: "abertura", label: "Abertura" },
  { value: "publicacao", label: "Publicacao" },
];

function createDefaultFilterDraft() {
  if (window.GovGoSearchContracts?.createDefaultSearchFilters) {
    return window.GovGoSearchContracts.createDefaultSearchFilters();
  }
  return {
    pncp: "",
    orgao: "",
    cnpj: "",
    uasg: "",
    uf: [],
    municipio: "",
    modalidade: FILTER_MODALIDADE_OPTIONS.map((option) => option.value),
    modo: FILTER_MODO_OPTIONS.map((option) => option.value),
    dateField: "encerramento",
    startDate: "",
    endDate: "",
  };
}

function normalizeSearchRailFilters(filters) {
  if (window.GovGoSearchContracts?.normalizeFilters) {
    return window.GovGoSearchContracts.normalizeFilters(filters);
  }
  return { ...createDefaultFilterDraft(), ...(filters || {}) };
}

function hasActiveSearchRailFilters(filters) {
  if (window.GovGoSearchContracts?.hasActiveFilters) {
    return window.GovGoSearchContracts.hasActiveFilters(filters);
  }
  return false;
}

function MultiSelectField({ options, values, onToggle, onToggleAll, allLabel = "Todos", placeholder, maxHeight = 170 }) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef(null);
  const menuRef = React.useRef(null);
  const [menuRect, setMenuRect] = React.useState(null);
  const allSelected = options.length > 0 && values.length === options.length;

  const syncMenuRect = React.useCallback(() => {
    if (!rootRef.current) {
      return;
    }
    const rect = rootRef.current.getBoundingClientRect();
    setMenuRect({
      left: rect.left,
      top: rect.bottom + 4,
      width: rect.width,
    });
  }, []);

  React.useEffect(() => {
    const handlePointerDown = (event) => {
      if (
        !rootRef.current ||
        rootRef.current.contains(event.target) ||
        menuRef.current?.contains(event.target)
      ) {
        return;
      }
      setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  React.useEffect(() => {
    if (!open) {
      return undefined;
    }

    syncMenuRect();
    const handleReposition = () => syncMenuRect();
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open, syncMenuRect]);

  const selectedLabels = options
    .filter((option) => values.includes(option.value))
    .map((option) => option.label);

  const summary = allSelected
    ? allLabel
    : selectedLabels.length === 0
    ? (placeholder || "Selecione")
    : selectedLabels.length <= 2
    ? selectedLabels.join(", ")
    : `${selectedLabels.length} selecionados`;

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((current) => !current)}
        style={{
          all: "unset",
          boxSizing: "border-box",
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 10px",
          background: "var(--paper)",
          borderRadius: "var(--r-md)",
          border: "1px solid var(--hairline)",
          boxShadow: "var(--shadow-xs)",
          cursor: "pointer",
          color: values.length ? "var(--ink-1)" : "var(--ink-3)",
          fontSize: 12.5,
        }}
      >
        <span style={{
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>{summary}</span>
        <span style={{ display: "inline-flex", color: "var(--ink-3)", transform: open ? "rotate(180deg)" : "none", transition: "transform 140ms" }}>
          <Icon.chevDown size={12}/>
        </span>
      </button>

      {open && menuRect && ReactDOM.createPortal(
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            left: menuRect.left,
            top: menuRect.top,
            width: menuRect.width,
            zIndex: 4000,
            border: "1px solid var(--hairline)",
            borderRadius: "var(--r-md)",
            background: "var(--paper)",
            boxShadow: "var(--shadow-md)",
            overflow: "hidden",
          }}
        >
          <label style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 10px",
            borderBottom: "1px solid var(--hairline-soft)",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--ink-2)",
          }}>
            <input type="checkbox" checked={allSelected} onChange={onToggleAll}/>
            <span>{allLabel}</span>
          </label>
          <div style={{ maxHeight, overflowY: "auto", padding: "6px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
            {options.map((option) => (
              <label key={option.value} style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 0", fontSize: 11.5, color: "var(--ink-1)" }}>
                <input type="checkbox" checked={values.includes(option.value)} onChange={() => onToggle(option.value)}/>
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ---------- Search rail (LEFT in Busca mode) ----------
function SearchRail() {
  const [panelOpen, setPanelOpen] = uS(false);
  const [activePanel, setActivePanel] = uS("filters");
  const [query, setQuery] = uS("");
  const [queryFocus, setQueryFocus] = uS(false);
  const [searchConfig, setSearchConfig] = uS(() => normalizeSearchRailConfig(createSearchRailConfig()));
  const [configReady, setConfigReady] = uS(false);
  const [filterDraft, setFilterDraft] = uS(() => normalizeSearchRailFilters(createDefaultFilterDraft()));
  const [filtersReady, setFiltersReady] = uS(false);
  const [searchInfo, setSearchInfo] = uS({
    loading: false,
    error: "",
    count: null,
    query: "",
  });
  const typeOptions = window.GovGoSearchContracts?.SEARCH_TYPE_OPTIONS || [
    { value: "semantic", label: "Semantica" },
    { value: "keyword", label: "Palavras-chave" },
    { value: "hybrid", label: "Hibrida" },
  ];
  const approachOptions = window.GovGoSearchContracts?.SEARCH_APPROACH_OPTIONS || [
    { value: "direct", label: "Direta" },
    { value: "correspondence", label: "Correspondencia" },
    { value: "category_filtered", label: "Categoria" },
  ];
  const relevanceOptions = window.GovGoSearchContracts?.RELEVANCE_OPTIONS || [
    { value: 1, label: "Permissivo" },
    { value: 2, label: "Flexivel" },
    { value: 3, label: "Restritivo" },
  ];
  const sortOptions = window.GovGoSearchContracts?.SORT_OPTIONS || [
    { value: 1, label: "Similaridade" },
    { value: 2, label: "Data" },
    { value: 3, label: "Valor" },
  ];
  const topCategoryOptions = window.GovGoSearchContracts?.TOP_CATEGORY_OPTIONS || [5, 10, 15, 20, 30, 50];
  const limitPresets = window.GovGoSearchContracts?.LIMIT_PRESETS || [10, 20, 30, 50, 100];
  const minSimilarityRange = window.GovGoSearchContracts?.MIN_SIMILARITY_RANGE || { min: 0, max: 1, step: 0.01 };
  const filterUfOptions = window.GovGoSearchContracts?.FILTER_UF_OPTIONS || FILTER_UF_OPTIONS;
  const filterModalidadeOptions = window.GovGoSearchContracts?.FILTER_MODALIDADE_OPTIONS || FILTER_MODALIDADE_OPTIONS;
  const filterModoOptions = window.GovGoSearchContracts?.FILTER_MODO_OPTIONS || FILTER_MODO_OPTIONS;
  const filterDateFieldOptions = window.GovGoSearchContracts?.FILTER_DATE_FIELD_OPTIONS || FILTER_DATE_FIELD_OPTIONS;
  const configSummary = describeSearchRailConfig(searchConfig);
  const isCategoryMode = searchConfig.searchApproach !== "direct";

  const updateSearchConfig = (patchOrUpdater) => {
    setSearchConfig((current) => {
      const patch = typeof patchOrUpdater === "function" ? patchOrUpdater(current) : patchOrUpdater;
      const next = { ...current, ...(patch || {}) };
      if (patch && Object.prototype.hasOwnProperty.call(patch, "searchType") && !Object.prototype.hasOwnProperty.call(patch, "categorySearchBase")) {
        next.categorySearchBase = patch.searchType;
      }
      return normalizeSearchRailConfig(next);
    });
  };

  uE(() => {
    let cancelled = false;

    const loadSavedConfig = async () => {
      if (!window.GovGoSearchApi?.loadSearchConfig) {
        setConfigReady(true);
        return;
      }

      try {
        const savedConfig = await window.GovGoSearchApi.loadSearchConfig();
        if (!cancelled && savedConfig) {
          setSearchConfig(normalizeSearchRailConfig(savedConfig));
        }
      } catch (_) {
      } finally {
        if (!cancelled) {
          setConfigReady(true);
        }
      }
    };

    loadSavedConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  uE(() => {
    let cancelled = false;

    const loadSavedFilters = async () => {
      if (!window.GovGoSearchApi?.loadSearchFilters) {
        setFiltersReady(true);
        return;
      }

      try {
        const savedFilters = await window.GovGoSearchApi.loadSearchFilters();
        if (!cancelled && savedFilters) {
          const normalized = normalizeSearchRailFilters(savedFilters);
          setFilterDraft({
            ...normalized,
            startDate: "",
            endDate: "",
            date_start: "",
            date_end: "",
          });
        }
      } catch (_) {
      } finally {
        if (!cancelled) {
          setFiltersReady(true);
        }
      }
    };

    loadSavedFilters();
    return () => {
      cancelled = true;
    };
  }, []);

  uE(() => {
    if (!configReady || !window.GovGoSearchApi?.saveSearchConfig) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      window.GovGoSearchApi.saveSearchConfig(searchConfig).catch(() => {});
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [searchConfig, configReady]);

  uE(() => {
    if (!filtersReady || !window.GovGoSearchApi?.saveSearchFilters) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      window.GovGoSearchApi.saveSearchFilters(filterDraft).catch(() => {});
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [filterDraft, filtersReady]);

  uE(() => {
    const handleSearchState = (event) => {
      const detail = event.detail || {};
      setSearchInfo({
        loading: Boolean(detail.loading),
        error: detail.error || "",
        count: detail.count ?? null,
        query: detail.query || "",
      });
      if (detail.config && detail.status !== "idle") {
        setSearchConfig(normalizeSearchRailConfig(detail.config));
      }
      if (detail.filters) {
        setFilterDraft(normalizeSearchRailFilters(detail.filters));
      }
      if (detail.status === "idle" || !detail.query) {
        setQuery("");
        return;
      }
      setQuery(detail.query);
    };

    window.addEventListener("govgo:search-state", handleSearchState);
    return () => window.removeEventListener("govgo:search-state", handleSearchState);
  }, []);

  uE(() => {
    const handleOpenRail = (event) => {
      const panel = event.detail?.panel;
      if (panel === "config" || panel === "filters") {
        setActivePanel(panel);
      }
      setPanelOpen(true);
    };

    window.addEventListener("govgo:search-rail-open", handleOpenRail);
    return () => window.removeEventListener("govgo:search-rail-open", handleOpenRail);
  }, []);

  uE(() => {
    const handleSearchFocus = () => {
      const input = document.querySelector('[name="govgo-search-query"]');
      if (input && typeof input.focus === "function") {
        input.focus();
      }
    };

    window.addEventListener("govgo:search-focus", handleSearchFocus);
    return () => window.removeEventListener("govgo:search-focus", handleSearchFocus);
  }, []);

  const runSearch = (configOverride) => {
    const trimmed = query.trim();
    const normalizedFilters = normalizeSearchRailFilters(filterDraft);
    const hasFilters = hasActiveSearchRailFilters(normalizedFilters);
    if ((!trimmed && !hasFilters) || searchInfo.loading) {
      return;
    }

    const normalizedConfig = normalizeSearchRailConfig({
      ...searchConfig,
      ...(configOverride || {}),
      query: trimmed,
      uiFilters: normalizedFilters,
    });
    setSearchConfig(normalizedConfig);

    if (!window._govgoBuscaSearch) {
      setSearchInfo({ loading: false, error: "Busca indisponivel.", count: null, query: trimmed });
      return;
    }

    setSearchInfo({ loading: true, error: "", count: null, query: trimmed });
    try {
      const request = window._govgoBuscaSearch(trimmed, normalizedConfig);
      if (request && typeof request.catch === "function") {
        request.catch((error) => {
          setSearchInfo({ loading: false, error: String(error), count: null, query: trimmed });
        });
      }
    } catch (error) {
      setSearchInfo({ loading: false, error: String(error), count: null, query: trimmed });
    }
  };

  const handleBuscar = () => runSearch();

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleBuscar();
    }
  };

  const canSearch = (Boolean(query.trim()) || hasActiveSearchRailFilters(filterDraft)) && !searchInfo.loading;
  const sectionLabelStyle = {
    fontSize: 10.5,
    color: "var(--ink-3)",
    textTransform: "uppercase",
    letterSpacing: ".05em",
    fontWeight: 600,
  };
  const setFilterValue = (key, value) => {
    setFilterDraft((current) => ({ ...current, [key]: value }));
  };
  const toggleFilterListValue = (key, value) => {
    setFilterDraft((current) => {
      const values = Array.isArray(current[key]) ? current[key] : [];
      const nextValues = values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value];
      return { ...current, [key]: nextValues };
    });
  };
  const toggleAllFilterListValues = (key, options) => {
    setFilterDraft((current) => {
      const allValues = options.map((option) => option.value);
      const currentValues = Array.isArray(current[key]) ? current[key] : [];
      const nextValues = currentValues.length === allValues.length ? [] : allValues;
      return { ...current, [key]: nextValues };
    });
  };

  return (
    <aside style={{
      minWidth: 0, background: "var(--rail)", borderRight: "1px solid var(--hairline)",
      display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0, height: "100%",
    }}>
      <div style={{padding: "10px 10px 0", background: "transparent"}}>
        <div style={{
          background: "var(--paper)",
          border: "1px solid var(--hairline)",
          borderBottom: "none",
          borderRadius: "8px 8px 0 0",
          padding: "12px 10px 6px",
        }}>
          <div style={{fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, margin: "0 2px 8px"}}>BUSCA</div>
          <div style={{
            position: "relative",
            background: "var(--paper)",
            borderRadius: "var(--r-md)",
            border: `1px solid ${queryFocus ? "var(--deep-blue)" : "var(--hairline)"}`,
            boxShadow: queryFocus ? "var(--ring-focus)" : "var(--shadow-xs)",
            transition: "border-color 120ms, box-shadow 120ms",
          }}>
            <span style={{
              position: "absolute",
              left: 12,
              top: 12,
              color: "var(--ink-3)",
              display: "inline-flex",
              pointerEvents: "none",
            }}>
              <Icon.search size={14}/>
            </span>
            <textarea
              rows={3}
              placeholder="Buscar editais, objeto, palavra-chave..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setQueryFocus(true)}
              onBlur={() => setQueryFocus(false)}
              name="govgo-search-query"
              autoComplete="off"
              spellCheck={false}
              style={{
                all: "unset",
                boxSizing: "border-box",
                width: "100%",
                minHeight: 84,
                resize: "none",
                padding: "10px 104px 10px 34px",
                fontSize: 13.5,
                lineHeight: 1.45,
                fontFamily: "var(--font-body)",
                color: "var(--ink-1)",
              }}
            />
            <div style={{position: "absolute", right: 10, bottom: 10}}>
              <Button kind="primary" size="sm" onClick={handleBuscar} disabled={!canSearch} loading={searchInfo.loading}>Buscar</Button>
            </div>
          </div>
          <div className={`gg-search-progress ${searchInfo.loading ? "is-active" : ""}`} aria-hidden={!searchInfo.loading}>
            <span className="gg-search-progress__bar"/>
          </div>
          {searchInfo.error && (
            <div style={{fontSize: 11.5, color: "var(--risk)", margin: "7px 2px 0", lineHeight: 1.35}}>
              {searchInfo.error}
            </div>
          )}
        </div>
      </div>

      <div style={{flex: 1, minHeight: 0, overflowY: "auto", paddingBottom: 12}}>
        {/* Filters — single collapsible box, smaller font */}
        <div style={{margin: "0 10px 0", background: "var(--paper)", border: "1px solid var(--hairline)", borderTop: "none", borderRadius: "0 0 8px 8px", fontSize: 11.5, overflow: "hidden"}}>
          <div role="tablist" style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 2,
            padding: "0 8px 0 10px",
            background: "var(--surface-sunk)",
            borderBottom: "1px solid var(--hairline-soft)",
            color: "var(--ink-2)",
          }}>
            {[
              { id: "filters", label: "Filtros", icon: <Icon.filter size={14}/> },
              { id: "config", label: "Configuração", icon: <Icon.gear size={14}/> },
            ].map((tab) => {
              const isCurrent = activePanel === tab.id;
              const active = isCurrent && panelOpen;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    if (isCurrent && panelOpen) {
                      setPanelOpen(false);
                      return;
                    }
                    setActivePanel(tab.id);
                    setPanelOpen(true);
                  }}
                  style={{
                    all: "unset",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 12px 9px",
                    marginTop: 6,
                    position: "relative",
                    top: 1,
                    background: active ? "var(--paper)" : "var(--surface-sunk)",
                    border: active ? "1px solid var(--hairline)" : "1px solid transparent",
                    borderBottom: active ? "1px solid var(--paper)" : "1px solid transparent",
                    borderTop: active ? "2px solid var(--orange)" : "2px solid transparent",
                    borderRadius: "8px 8px 0 0",
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: active ? "var(--orange-700)" : "var(--ink-2)",
                  }}
                >
                  <span style={{display: "inline-flex", color: active ? "var(--orange)" : "var(--ink-2)"}}>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
            <span style={{flex: 1}}/>
            <button
              onClick={() => setPanelOpen(!panelOpen)}
              style={{
                all: "unset",
                cursor: "pointer",
                width: 30,
                height: 30,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--ink-3)",
                alignSelf: "center",
              }}
            >
              <span style={{transform: panelOpen ? "rotate(180deg)" : "none", transition: "transform 140ms", display: "inline-flex"}}>
                <Icon.chevDown size={15}/>
              </span>
            </button>
          </div>
          {panelOpen && (
            <div style={{borderTop: "1px solid var(--hairline-soft)", padding: "10px 10px 12px", fontSize: 11.5}}>
              {activePanel === "filters" ? (
                <div>
                  <div style={{...sectionLabelStyle, margin: "2px 0 5px"}}>Nº PNCP</div>
                  <Input size="sm" placeholder="ex.: 2024.12345.1.1.1" value={filterDraft.pncp} onChange={(value) => setFilterValue("pncp", value)}/>

                  <div style={{...sectionLabelStyle, margin: "12px 0 5px"}}>Órgão (contém)</div>
                  <Input size="sm" placeholder="Nome do órgão" value={filterDraft.orgao} onChange={(value) => setFilterValue("orgao", value)}/>

                  <div style={{...sectionLabelStyle, margin: "12px 0 5px"}}>CNPJ do Órgão</div>
                  <Input size="sm" placeholder="Somente números" mono value={filterDraft.cnpj} onChange={(value) => setFilterValue("cnpj", value)}/>

                  <div style={{...sectionLabelStyle, margin: "12px 0 5px"}}>UASG do Órgão</div>
                  <Input size="sm" placeholder="Ex.: 160123" mono value={filterDraft.uasg} onChange={(value) => setFilterValue("uasg", value)}/>

                  <div style={{...sectionLabelStyle, margin: "12px 0 5px"}}>Estado (UF)</div>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(9, minmax(0, 1fr))",
                    gap: 4,
                  }}>
                    {filterUfOptions.map((uf) => {
                      const active = filterDraft.uf.includes(uf);
                      return (
                        <button
                          key={uf}
                          onClick={() => toggleFilterListValue("uf", uf)}
                          style={{
                            all: "unset",
                            cursor: "pointer",
                            boxSizing: "border-box",
                            height: 24,
                            borderRadius: 999,
                            border: `1px solid ${active ? "var(--blue-200)" : "var(--hairline)"}`,
                            background: active ? "var(--blue-50)" : "var(--paper)",
                            color: active ? "var(--deep-blue)" : "var(--ink-2)",
                            fontSize: 11,
                            fontWeight: 600,
                            textAlign: "center",
                            lineHeight: "22px",
                          }}
                        >
                          {uf}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{...sectionLabelStyle, margin: "12px 0 5px"}}>Municípios</div>
                  <Input size="sm" placeholder="Municípios separados por vírgula" value={filterDraft.municipio} onChange={(value) => setFilterValue("municipio", value)}/>

                  <div style={{...sectionLabelStyle, margin: "12px 0 5px"}}>Modalidade</div>
                  <MultiSelectField
                    options={filterModalidadeOptions}
                    values={filterDraft.modalidade}
                    onToggle={(value) => toggleFilterListValue("modalidade", value)}
                    onToggleAll={() => toggleAllFilterListValues("modalidade", filterModalidadeOptions)}
                    placeholder="Selecione modalidades"
                  />

                  <div style={{...sectionLabelStyle, margin: "12px 0 5px"}}>Modo de disputa</div>
                  <MultiSelectField
                    options={filterModoOptions}
                    values={filterDraft.modo}
                    onToggle={(value) => toggleFilterListValue("modo", value)}
                    onToggleAll={() => toggleAllFilterListValues("modo", filterModoOptions)}
                    placeholder="Selecione modos"
                    maxHeight={140}
                  />

                  <div style={{...sectionLabelStyle, margin: "12px 0 5px"}}>Tipo de Período</div>
                  <div style={{display: "flex", flexWrap: "wrap", gap: 4}}>
                    {filterDateFieldOptions.map((option) => (
                      <Chip key={option.value} tone={filterDraft.dateField === option.value ? "blue" : "default"} onClick={() => setFilterValue("dateField", option.value)}>
                        {option.label}
                      </Chip>
                    ))}
                  </div>

                  <div style={{...sectionLabelStyle, margin: "12px 0 5px"}}>Período</div>
                  <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6}}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 10px",
                      background: "var(--paper)",
                      borderRadius: "var(--r-md)",
                      border: "1px solid var(--hairline)",
                      boxShadow: "var(--shadow-xs)",
                    }}>
                      <input
                        type="date"
                        value={filterDraft.startDate}
                        onChange={(event) => setFilterValue("startDate", event.target.value)}
                        style={{
                          all: "unset",
                          flex: 1,
                          minWidth: 0,
                          fontSize: 12.5,
                          fontFamily: "var(--font-body)",
                          color: "var(--ink-1)",
                        }}
                      />
                    </div>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 10px",
                      background: "var(--paper)",
                      borderRadius: "var(--r-md)",
                      border: "1px solid var(--hairline)",
                      boxShadow: "var(--shadow-xs)",
                    }}>
                      <input
                        type="date"
                        value={filterDraft.endDate}
                        onChange={(event) => setFilterValue("endDate", event.target.value)}
                        style={{
                          all: "unset",
                          flex: 1,
                          minWidth: 0,
                          fontSize: 12.5,
                          fontFamily: "var(--font-body)",
                          color: "var(--ink-1)",
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{...sectionLabelStyle, margin: "2px 0 5px"}}>Tipo de busca</div>
                  <div style={{display: "flex", flexWrap: "wrap", gap: 4}}>
                    {typeOptions.map((option) => (
                      <Chip key={option.value} tone={searchConfig.searchType === option.value ? "blue" : "default"} onClick={() => updateSearchConfig({ searchType: option.value })}>
                        {option.label}
                      </Chip>
                    ))}
                  </div>

                  <div style={{...sectionLabelStyle, margin: "12px 0 5px"}}>Abordagem</div>
                  <div style={{display: "flex", flexWrap: "wrap", gap: 4}}>
                    {approachOptions.map((option) => (
                      <Chip key={option.value} tone={searchConfig.searchApproach === option.value ? "blue" : "default"} onClick={() => updateSearchConfig({ searchApproach: option.value })}>
                        {option.label}
                      </Chip>
                    ))}
                  </div>

                  <div style={{...sectionLabelStyle, margin: "12px 0 5px"}}>Relevancia</div>
                  <div style={{display: "flex", flexWrap: "wrap", gap: 4}}>
                    {relevanceOptions.map((option) => (
                      <Chip key={option.value} tone={searchConfig.relevanceLevel === option.value ? "blue" : "default"} onClick={() => updateSearchConfig({ relevanceLevel: option.value })}>
                        {option.label}
                      </Chip>
                    ))}
                  </div>

                  <div style={{...sectionLabelStyle, margin: "12px 0 5px"}}>Ordenacao</div>
                  <div style={{display: "flex", flexWrap: "wrap", gap: 4}}>
                    {sortOptions.map((option) => (
                      <Chip key={option.value} tone={searchConfig.sortMode === option.value ? "blue" : "default"} onClick={() => updateSearchConfig({ sortMode: option.value })}>
                        {option.label}
                      </Chip>
                    ))}
                  </div>

                  <div style={{...sectionLabelStyle, margin: "12px 0 5px"}}>Similaridade minima</div>
                  <div style={{display: "flex", alignItems: "center", gap: 8}}>
                    <span className="mono" style={{fontSize: 11, color: "var(--ink-2)", width: 42}}>{configSummary.minSimilarityLabel}</span>
                    <input type="range" min={minSimilarityRange.min} max={minSimilarityRange.max} step={minSimilarityRange.step} value={searchConfig.minSimilarity} onChange={(event) => updateSearchConfig({ minSimilarity: Number(event.target.value || 0) })} style={{flex: 1, accentColor: "var(--deep-blue)"}}/>
                  </div>

                  <div style={{...sectionLabelStyle, margin: "12px 0 5px", opacity: isCategoryMode ? 1 : 0.45}}>Numero de categorias</div>
                  <div style={{display: "flex", flexWrap: "wrap", gap: 4, opacity: isCategoryMode ? 1 : 0.45}}>
                    {topCategoryOptions.map((value) => (
                      <Chip
                        key={value}
                        tone={searchConfig.topCategoriesLimit === value ? "blue" : "default"}
                        onClick={() => {
                          if (!isCategoryMode) return;
                          updateSearchConfig({ topCategoriesLimit: value });
                        }}
                      >
                        {value}
                      </Chip>
                    ))}
                  </div>

                  <div style={{...sectionLabelStyle, margin: "12px 0 5px"}}>Resultados na tabela</div>
                  <div style={{display: "flex", flexWrap: "wrap", gap: 4}}>
                    {limitPresets.map((value) => (
                      <Chip key={value} tone={searchConfig.limit === value ? "blue" : "default"} onClick={() => updateSearchConfig({ limit: value })}>
                        {value}
                      </Chip>
                    ))}
                  </div>

                  <label style={{display: "flex", alignItems: "center", gap: 8, marginTop: 14}}>
                    <input type="checkbox" checked={searchConfig.filterExpired} onChange={(event) => updateSearchConfig({ filterExpired: event.target.checked })}/>
                    <span style={sectionLabelStyle}>Filtrar encerrados</span>
                  </label>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Favoritos / Histórico / Alertas / Boletins */}
        <Collapsible title="Favoritos" icon={<Icon.starFill size={12}/>} extra={<span style={{fontSize: 11, color: "var(--ink-3)"}}>12</span>} defaultOpen>
          <div style={{display: "flex", flexDirection: "column", gap: 6}}>
            {DATA.favoritos.map(f => (
              <div key={f.id} style={{
                background: "var(--paper)", border: "1px solid var(--hairline)", borderRadius: 8,
                padding: "10px 11px", cursor: "pointer",
              }}>
                <div style={{display: "flex", alignItems: "flex-start", gap: 8}}>
                  <div style={{flex: 1, minWidth: 0}}>
                    <div style={{fontSize: 12.5, fontWeight: 600, color: "var(--ink-1)", lineHeight: 1.3, marginBottom: 2}}>{f.title}</div>
                    <div style={{fontSize: 11, color: "var(--ink-3)"}}>{f.org}</div>
                  </div>
                  <Icon.bookmark size={13} s={1.6}/>
                </div>
                <div style={{display: "flex", alignItems: "center", gap: 6, marginTop: 8}}>
                  <span style={{fontSize: 11, color: f.tone === "orange" ? "var(--orange)" : "var(--deep-blue)", fontWeight: 600}}>{f.date}</span>
                  <Chip tone={f.tone === "orange" ? "orange" : "blue"}>vence em {f.status}</Chip>
                </div>
              </div>
            ))}
          </div>
        </Collapsible>

        <Collapsible title="Histórico" icon={<Icon.history size={13}/>}>
          <div style={{display: "flex", flexDirection: "column", gap: 2}}>
            {DATA.historico.map((h, i) => (
              <button key={i} style={{
                all: "unset", cursor: "pointer",
                padding: "8px 10px", borderRadius: 6,
                display: "flex", alignItems: "center", gap: 8,
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--paper)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <Icon.clock size={13}/>
                <div style={{flex: 1, minWidth: 0, overflow: "hidden"}}>
                  <div style={{fontSize: 12.5, color: "var(--ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{h.q}</div>
                  <div style={{fontSize: 11, color: "var(--ink-3)"}}>{h.when} · {h.hits} resultados</div>
                </div>
              </button>
            ))}
          </div>
        </Collapsible>

        <Collapsible title="Alertas" icon={<Icon.bell size={13}/>} extra={<Chip tone="orange">3</Chip>}>
          <div style={{display: "flex", flexDirection: "column", gap: 6}}>
            {[
              { t:"3 novos editais em Alimentação/SP", when: "há 8 min", tone: "orange" },
              { t:"Vila Vitória publicou em novo CNAE",  when: "há 1 h",   tone: "blue" },
              { t:"Contrato C-4118 vence em 35d",         when: "hoje",     tone: "risk" },
            ].map((a, i) => (
              <div key={i} style={{
                padding: "10px 11px", background: "var(--paper)", border: "1px solid var(--hairline)", borderRadius: 8,
                display: "flex", gap: 10,
              }}>
                <span style={{width: 6, height: 6, borderRadius: 99, marginTop: 6,
                  background: a.tone === "orange" ? "var(--orange)" : a.tone === "risk" ? "var(--risk)" : "var(--deep-blue)" }}/>
                <div style={{flex: 1}}>
                  <div style={{fontSize: 12.5, color: "var(--ink-1)", lineHeight: 1.35}}>{a.t}</div>
                  <div style={{fontSize: 11, color: "var(--ink-3)", marginTop: 2}}>{a.when}</div>
                </div>
              </div>
            ))}
          </div>
        </Collapsible>

        <Collapsible title="Boletins" icon={<Icon.brief size={13}/>} defaultOpen={false}>
          <div style={{fontSize: 12, color: "var(--ink-3)", padding: "6px 2px"}}>
            Relatórios diários das suas buscas e CNPJs favoritos.
          </div>
          <Button size="sm" style={{marginTop: 6, width: "100%", justifyContent: "center"}}>Configurar boletins</Button>
        </Collapsible>
      </div>
    </aside>
  );
}

// ---------- Activity rail (RIGHT, collapsible) ----------
function ActivityRail({open, onToggle}) {
  if (!open) {
    return (
      <aside style={{
        width: 44, borderLeft: "1px solid var(--hairline)", background: "var(--paper)",
        display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 0", gap: 6,
      }}>
        <button onClick={onToggle} title="Expandir" style={{
          all: "unset", cursor: "pointer", width: 32, height: 32, borderRadius: 8,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          color: "var(--deep-blue)", border: "1px solid var(--hairline)",
        }}><Icon.chevLeft size={14}/></button>
        <div style={{width: 1, height: 14, background: "var(--hairline)", margin: "4px 0"}}/>
        {[
          [<Icon.starFill size={15}/>, "Favoritos"],
          [<Icon.history size={15}/>, "Histórico"],
          [<Icon.bell size={15}/>, "Alertas"],
          [<Icon.brief size={15}/>, "Boletins"],
        ].map(([ic, t], i) => (
          <button key={i} title={t} onClick={onToggle} style={{
            all: "unset", cursor: "pointer", width: 32, height: 32, borderRadius: 8,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            color: "var(--ink-3)",
          }}>{ic}</button>
        ))}
      </aside>
    );
  }

  return (
    <aside style={{
      width: 300, borderLeft: "1px solid var(--hairline)", background: "var(--rail)",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <div style={{padding: "10px 14px", borderBottom: "1px solid var(--hairline)", background: "var(--paper)", display: "flex", alignItems: "center", gap: 8}}>
        <div style={{fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 600, color: "var(--ink-1)"}}>Atividade</div>
        <span style={{flex: 1}}/>
        <button onClick={onToggle} title="Recolher" style={{
          all: "unset", cursor: "pointer", width: 28, height: 28, borderRadius: 6,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          color: "var(--ink-3)", border: "1px solid var(--hairline)",
        }}><Icon.chevRight size={13}/></button>
      </div>
      <div style={{flex: 1, overflowY: "auto", paddingBottom: 12}}>
        <Collapsible title="Favoritos" icon={<Icon.starFill size={12}/>} extra={<span style={{fontSize: 11, color: "var(--ink-3)"}}>12</span>}>
          <div style={{display: "flex", flexDirection: "column", gap: 6}}>
            {DATA.favoritos.map(f => (
              <div key={f.id} style={{
                background: "var(--paper)", border: "1px solid var(--hairline)", borderRadius: 8,
                padding: "10px 11px", cursor: "pointer",
              }}>
                <div style={{display: "flex", alignItems: "flex-start", gap: 8}}>
                  <div style={{flex: 1, minWidth: 0}}>
                    <div style={{fontSize: 12.5, fontWeight: 600, color: "var(--ink-1)", lineHeight: 1.3, marginBottom: 2}}>{f.title}</div>
                    <div style={{fontSize: 11, color: "var(--ink-3)"}}>{f.org}</div>
                  </div>
                  <Icon.bookmark size={13} s={1.6}/>
                </div>
                <div style={{display: "flex", alignItems: "center", gap: 6, marginTop: 8}}>
                  <span style={{fontSize: 11, color: f.tone === "orange" ? "var(--orange)" : "var(--deep-blue)", fontWeight: 600}}>{f.date}</span>
                  <Chip tone={f.tone === "orange" ? "orange" : "blue"}>vence em {f.status}</Chip>
                </div>
              </div>
            ))}
          </div>
        </Collapsible>

        <Collapsible title="Histórico" icon={<Icon.history size={13}/>}>
          <div style={{display: "flex", flexDirection: "column", gap: 2}}>
            {DATA.historico.map((h, i) => (
              <button key={i} style={{
                all: "unset", cursor: "pointer",
                padding: "8px 10px", borderRadius: 6,
                display: "flex", alignItems: "center", gap: 8,
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--rail)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <Icon.clock size={13}/>
                <div style={{flex: 1, minWidth: 0, overflow: "hidden"}}>
                  <div style={{fontSize: 12.5, color: "var(--ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{h.q}</div>
                  <div style={{fontSize: 11, color: "var(--ink-3)"}}>{h.when} · {h.hits} resultados</div>
                </div>
              </button>
            ))}
          </div>
        </Collapsible>

        <Collapsible title="Alertas" icon={<Icon.bell size={13}/>} extra={<Chip tone="orange">3</Chip>}>
          <div style={{display: "flex", flexDirection: "column", gap: 6}}>
            {[
              { t:"3 novos editais em Alimentação/SP", when: "há 8 min", tone: "orange" },
              { t:"Vila Vitória publicou em novo CNAE",  when: "há 1 h",   tone: "blue" },
              { t:"Contrato C-4118 vence em 35d",         when: "hoje",     tone: "risk" },
            ].map((a, i) => (
              <div key={i} style={{
                padding: "10px 11px", background: "var(--paper)", border: "1px solid var(--hairline)", borderRadius: 8,
                display: "flex", gap: 10,
              }}>
                <span style={{width: 6, height: 6, borderRadius: 99, marginTop: 6,
                  background: a.tone === "orange" ? "var(--orange)" : a.tone === "risk" ? "var(--risk)" : "var(--deep-blue)" }}/>
                <div style={{flex: 1}}>
                  <div style={{fontSize: 12.5, color: "var(--ink-1)", lineHeight: 1.35}}>{a.t}</div>
                  <div style={{fontSize: 11, color: "var(--ink-3)", marginTop: 2}}>{a.when}</div>
                </div>
              </div>
            ))}
          </div>
        </Collapsible>

        <Collapsible title="Boletins" icon={<Icon.brief size={13}/>} defaultOpen={false}>
          <div style={{fontSize: 12, color: "var(--ink-3)", padding: "6px 2px"}}>
            Relatórios diários das suas buscas e CNPJs favoritos.
          </div>
          <Button size="sm" style={{marginTop: 6, width: "100%", justifyContent: "center"}}>Configurar boletins</Button>
        </Collapsible>
      </div>
    </aside>
  );
}

Object.assign(window, {TopBar, LeftRail, SearchRail, ActivityRail});
