// BuscaWorkspace — replica exata de ModeOportunidades (design/govgo/mode_oportunidades.jsx)
// com dados reais da API via GovGoSearchApi + GovGoSearchUiAdapter
// O box de busca fica no SearchRail (AppShell), este componente so renderiza o workspace de abas.

const { useState: uSo, useEffect: uEf } = React;

const EDITAIS_GRID_COLUMNS = "44px 56px minmax(190px,1.15fr) minmax(170px,1fr) minmax(110px,.8fr) 44px 130px 120px 112px";
const HOME_SEARCH_TAB_ID = "search-home";
const WORKSPACE_STORAGE_KEY = "govgo.busca.workspace.v2";

function normalizeObjectText(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text || "-";
}

function truncateObjectText(value, max = 170) {
  const text = normalizeObjectText(value);
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 3).trimEnd()}...`;
}

function ObjectCell({ text }) {
  const fullText = normalizeObjectText(text);
  const shortText = truncateObjectText(fullText);
  const [tooltip, setTooltip] = uSo(null);

  const moveTooltip = (event) => {
    if (fullText === "-") {
      return;
    }
    setTooltip({ x: event.clientX + 14, y: event.clientY + 14 });
  };

  return (
    <span
      onMouseEnter={moveTooltip}
      onMouseMove={moveTooltip}
      onMouseLeave={() => setTooltip(null)}
      style={{
        minWidth: 0,
        display: "block",
        cursor: fullText === "-" ? "default" : "help",
      }}
    >
      <span
        style={{
          minWidth: 0,
          display: "-webkit-box",
          color: "var(--ink-2)",
          fontSize: 11.5,
          lineHeight: 1.25,
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          whiteSpace: "normal",
        }}
      >
        {shortText}
      </span>
      {tooltip && (
        <span
          style={{
            position: "fixed",
            left: tooltip.x,
            top: tooltip.y,
            zIndex: 2000,
            width: 360,
            maxWidth: "calc(100vw - 32px)",
            padding: "10px 12px",
            background: "var(--paper)",
            border: "1px solid var(--hairline)",
            borderRadius: 8,
            boxShadow: "var(--shadow-md)",
            color: "var(--ink-1)",
            fontSize: 12.5,
            lineHeight: 1.45,
            whiteSpace: "normal",
            pointerEvents: "none",
          }}
        >
          {fullText}
        </span>
      )}
    </span>
  );
}

function createDefaultSearchFormState() {
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

function createDefaultSearchFiltersState() {
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
    modalidade: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14"],
    modo: ["1", "2", "3", "4", "5", "6"],
    dateField: "encerramento",
    startDate: "",
    endDate: "",
  };
}

function createSearchTabState(overrides) {
  return {
    query: "",
    loading: false,
    results: null,
    error: "",
    count: null,
    localSort: null,
    config: createDefaultSearchFormState(),
    filters: createDefaultSearchFiltersState(),
    ...overrides,
  };
}

function createSearchTab(id, overrides) {
  return {
    id,
    title: "Nova busca",
    icon: React.createElement(Icon.search, { size: 12 }),
    tone: "orange",
    count: null,
    kind: "busca",
    closable: true,
    ...(overrides || {}),
  };
}

function createDetailTab(id, overrides) {
  return {
    id,
    title: "Edital",
    icon: React.createElement(Icon.file, { size: 12 }),
    tone: "blue",
    kind: "edital",
    closable: true,
    ...(overrides || {}),
  };
}

function normalizeSearchFormState(formState) {
  if (window.GovGoSearchContracts?.normalizeFormState) {
    return window.GovGoSearchContracts.normalizeFormState(formState);
  }
  return { ...createDefaultSearchFormState(), ...(formState || {}) };
}

function normalizeSearchFiltersState(filters) {
  if (window.GovGoSearchContracts?.normalizeFilters) {
    return window.GovGoSearchContracts.normalizeFilters(filters);
  }
  return { ...createDefaultSearchFiltersState(), ...(filters || {}) };
}

function hasActiveSearchFiltersState(filters) {
  if (window.GovGoSearchContracts?.hasActiveFilters) {
    return window.GovGoSearchContracts.hasActiveFilters(filters);
  }
  return false;
}

function resolveSearchFormState(query, searchInput) {
  const defaults = createDefaultSearchFormState();
  if (searchInput && typeof searchInput === "object" && !Array.isArray(searchInput)) {
    return normalizeSearchFormState({
      ...defaults,
      ...searchInput,
      query,
      uiFilters: normalizeSearchFiltersState(searchInput.uiFilters),
    });
  }
  if (typeof searchInput === "string" && searchInput) {
    return normalizeSearchFormState({
      ...defaults,
      query,
      searchType: searchInput,
      searchApproach: "direct",
      categorySearchBase: searchInput,
      uiFilters: createDefaultSearchFiltersState(),
    });
  }
  return normalizeSearchFormState({ ...defaults, query, uiFilters: createDefaultSearchFiltersState() });
}

function buildSearchTabTitle(query, filters) {
  if (query) {
    return query;
  }
  return hasActiveSearchFiltersState(filters) ? "Busca filtrada" : "Nova busca";
}

function buildDetailTabTitle(edital) {
  const orgShort = String(edital?.org || "Edital").replace(/^(MUNICIPIO DE |ESTADO DO |EMPRESA |INSTITUTO DE |SEC\. )/, "");
  return `${edital?.uf || "--"} · ${orgShort}`;
}

function buildSearchStateDetail(searchState) {
  const state = searchState || createSearchTabState();
  const hasFilters = hasActiveSearchFiltersState(state.filters);
  let status = "idle";
  if (state.loading) {
    status = "loading";
  } else if (state.error) {
    status = "error";
  } else if (Array.isArray(state.results)) {
    status = state.results.length > 0 ? "success" : "empty";
  } else if (state.query || hasFilters) {
    status = "success";
  }

  return {
    loading: Boolean(state.loading),
    error: state.error || "",
    count: state.count ?? null,
    query: state.query || "",
    status,
    config: state.config || createDefaultSearchFormState(),
    filters: state.filters || createDefaultSearchFiltersState(),
  };
}

function nextTabId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function parseDateLabel(value) {
  const parts = String(value || "").split("/");
  if (parts.length !== 3) {
    return null;
  }

  const [day, month, year] = parts.map((part) => Number(part));
  if (!day || !month || !year) {
    return null;
  }

  return new Date(year, month - 1, day).getTime();
}

function normalizeResultsSort(sort) {
  if (!sort || typeof sort !== "object") {
    return null;
  }

  const validField = sort.field === "similarity" || sort.field === "value" || sort.field === "date"
    ? sort.field
    : null;
  const validDirection = sort.direction === "asc" || sort.direction === "desc"
    ? sort.direction
    : null;

  if (!validField || !validDirection) {
    return null;
  }

  return { field: validField, direction: validDirection };
}

function getDefaultSortDirection(field) {
  if (field === "date") {
    return "asc";
  }
  return "desc";
}

function getConfigResultsSort(config) {
  const sortMode = Number(config?.sortMode || 1);
  if (sortMode === 2) {
    return { field: "date", direction: "asc" };
  }
  if (sortMode === 3) {
    return { field: "value", direction: "desc" };
  }
  return { field: "similarity", direction: "desc" };
}

function resolveResultsSort(searchState) {
  return normalizeResultsSort(searchState?.localSort) || getConfigResultsSort(searchState?.config);
}

function compareNullableValues(a, b, direction) {
  const aMissing = a === null || a === undefined || Number.isNaN(a);
  const bMissing = b === null || b === undefined || Number.isNaN(b);
  if (aMissing && bMissing) {
    return 0;
  }
  if (aMissing) {
    return 1;
  }
  if (bMissing) {
    return -1;
  }
  if (a === b) {
    return 0;
  }
  return direction === "asc" ? (a < b ? -1 : 1) : (a > b ? -1 : 1);
}

function sortEditais(results, sort) {
  if (!Array.isArray(results) || !sort?.field || !sort?.direction) {
    return results || [];
  }

  const withIndex = results.map((item, index) => ({ item, index }));
  withIndex.sort((left, right) => {
    let comparison = 0;
    if (sort.field === "similarity") {
      comparison = compareNullableValues(Number(left.item.sim || 0), Number(right.item.sim || 0), sort.direction);
    } else if (sort.field === "value") {
      comparison = compareNullableValues(Number(left.item.val || 0), Number(right.item.val || 0), sort.direction);
    } else if (sort.field === "date") {
      comparison = compareNullableValues(parseDateLabel(left.item.end), parseDateLabel(right.item.end), sort.direction);
    }

    if (comparison !== 0) {
      return comparison;
    }
    return left.index - right.index;
  });

  return withIndex.map((entry) => entry.item);
}

function SortableHeader({ label, field, currentSort, onSort, align = "left" }) {
  const isActive = currentSort?.field === field;
  const direction = isActive ? currentSort.direction : "desc";
  const justifyContent = align === "right" ? "flex-end" : "flex-start";

  return (
    <button
      onClick={() => onSort(field)}
      title={`Ordenar por ${label}`}
      style={{
        all: "unset",
        width: "100%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent,
        gap: 4,
        cursor: "pointer",
        color: isActive ? "var(--orange)" : "var(--ink-3)",
      }}
    >
      <span>{label}</span>
      <span style={{
        display: "inline-flex",
        opacity: isActive ? 1 : 0.42,
        transform: direction === "asc" ? "rotate(180deg)" : "none",
        transition: "transform 140ms, opacity 140ms",
      }}>
        <Icon.chevDown size={11}/>
      </span>
    </button>
  );
}

function readPersistedWorkspace() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    const tabs = Array.isArray(parsed?.tabs)
      ? parsed.tabs
          .filter((tab) => tab && (tab.kind === "busca" || tab.kind === "edital"))
          .map((tab) => (
            tab.kind === "busca"
              ? createSearchTab(tab.id, {
                  title: tab.title || "Busca",
                  tone: tab.tone || "orange",
                  count: typeof tab.count === "number" ? tab.count : null,
                  closable: tab.closable !== false,
                })
              : createDetailTab(tab.id, {
                  title: tab.title || "Edital",
                  tone: tab.tone || "blue",
                  rank: tab.rank,
                  searchTabId: tab.searchTabId,
                  closable: tab.closable !== false,
                })
          ))
      : [];
    const searchTabs = parsed?.searchTabs && typeof parsed.searchTabs === "object" ? parsed.searchTabs : {};
    const editalMap = parsed?.editalMap && typeof parsed.editalMap === "object" ? parsed.editalMap : {};

    const normalizedSearchTabIds = new Set();
    const normalizedSearchTabsMeta = tabs.filter((tab) => {
      if (tab.kind !== "busca") {
        return false;
      }
      if (tab.kind === "edital") {
        return false;
      }

      const state = searchTabs[tab.id] || {};
      const filters = normalizeSearchFiltersState(state.filters);
      const hasResults = Array.isArray(state.results) && state.results.length > 0;
      const hasQuery = Boolean(String(state.query || "").trim());
      const hasFilters = hasActiveSearchFiltersState(filters);
      const isDraft = !hasResults && !hasQuery && !hasFilters;
      if (isDraft) {
        return false;
      }
      normalizedSearchTabIds.add(tab.id);
      return true;
    });
    const normalizedDetailTabsMeta = tabs.filter((tab) => (
      tab.kind === "edital" && normalizedSearchTabIds.has(tab.searchTabId)
    ));
    const normalizedTabs = [...normalizedSearchTabsMeta, ...normalizedDetailTabsMeta];

    const normalizedSearchTabs = {};
    normalizedTabs.forEach((tab) => {
      if (tab.kind !== "busca") {
        return;
      }
      const state = searchTabs[tab.id] || {};
      normalizedSearchTabs[tab.id] = createSearchTabState({
        ...state,
        loading: false,
        error: state.error || "",
        results: Array.isArray(state.results) ? state.results : null,
        count: typeof state.count === "number" ? state.count : Array.isArray(state.results) ? state.results.length : null,
        localSort: normalizeResultsSort(state.localSort),
        config: normalizeSearchFormState(state.config),
        filters: normalizeSearchFiltersState(state.filters),
      });
    });

    const normalizedEditalMap = {};
    normalizedTabs.forEach((tab) => {
      if (tab.kind === "edital" && editalMap[tab.id]) {
        normalizedEditalMap[tab.id] = editalMap[tab.id];
      }
    });

    const fallbackActive = normalizedTabs[normalizedTabs.length - 1]?.id || null;
    const activeTab = normalizedTabs.find((tab) => tab.id === parsed?.activeTab)?.id || fallbackActive;

    return {
      tabs: normalizedTabs,
      activeTab,
      searchTabs: normalizedSearchTabs,
      editalMap: normalizedEditalMap,
    };
  } catch (_) {
    return null;
  }
}

function persistWorkspaceState(state) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const serializedTabs = Array.isArray(state?.tabs)
      ? state.tabs.map((tab) => ({
          id: tab.id,
          title: tab.title,
          tone: tab.tone,
          count: tab.count ?? null,
          kind: tab.kind,
          closable: tab.closable,
          rank: tab.rank,
          searchTabId: tab.searchTabId,
        }))
      : [];

    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify({
      ...state,
      tabs: serializedTabs,
    }));
  } catch (_) {}
}

// ─── Normaliza item real da API → shape do design ────────────────────────────
function toEditaisShape(results) {
  return results.map((item) => (
    window.GovGoSearchUiAdapter?.toEditalShape
      ? window.GovGoSearchUiAdapter.toEditalShape(item)
      : {
        rank: item.rank,
        org: item.organization || item.title || "-",
        mun: item.municipality || "-",
        uf: item.uf || "-",
        sim: typeof item.similarityRatio === "number" ? item.similarityRatio : 0,
        val: item.raw?.valor_total_estimado ?? item.raw?.valor_global ?? 0,
        end: item.closingDateLabel || "-",
        modal: item.modality || item.raw?.modalidade_nome || "-",
        items: item.raw?.numero_itens ?? 0,
        docs: item.raw?.numero_documentos ?? 0,
        status: item.raw?.situacao_edital || "aberto",
        objeto: item.title || item.raw?.details?.objeto_compra || item.raw?.objeto_compra || "",
        raw: item.raw || null,
        details: item.details || item.raw?.details || null,
        itemId: item.itemId || item.id || item.rank,
      }
  ));
}

// ─── Tabela de editais (grid identico ao design) ─────────────────────────────
function EditaisTable({ editais, onOpen, currentSort, onSort }) {
  return (
    <div style={{ background: "var(--paper)", border: "1px solid var(--hairline)", borderRadius: 10, overflow: "hidden" }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: EDITAIS_GRID_COLUMNS,
        columnGap: 10,
        fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase",
        letterSpacing: ".04em", fontWeight: 600,
        padding: "10px 16px", background: "var(--rail)", borderBottom: "1px solid var(--hairline)",
        alignItems: "center",
      }}>
        <span></span>
        <span>Rank</span>
        <span>Objeto</span>
        <span>Orgao</span>
        <span>Municipio</span>
        <span>UF</span>
        <SortableHeader label="Similaridade" field="similarity" currentSort={currentSort} onSort={onSort} />
        <SortableHeader label="Valor (R$)" field="value" currentSort={currentSort} onSort={onSort} align="right" />
        <SortableHeader label="Encerramento" field="date" currentSort={currentSort} onSort={onSort} align="right" />
      </div>
      {editais.map((e) => {
        const pastDue = (() => {
          try {
            const parts = String(e.end || "").split("/");
            if (parts.length === 3) {
              return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`) < new Date("2026-04-25");
            }
          } catch (_) {}
          return false;
        })();

        return (
          <div key={`${e.rank}-${e.itemId || e.id || e.org}`} onClick={() => onOpen(e)}
            style={{
              display: "grid",
              gridTemplateColumns: EDITAIS_GRID_COLUMNS,
              columnGap: 10,
              padding: "12px 16px", borderBottom: "1px solid var(--hairline-soft)",
              alignItems: "center", cursor: "pointer",
              background: "var(--paper)", fontSize: 13,
            }}
            onMouseEnter={(ev) => { ev.currentTarget.style.background = "var(--surface-sunk)"; }}
            onMouseLeave={(ev) => { ev.currentTarget.style.background = "var(--paper)"; }}
          >
            <span style={{ color: "var(--ink-3)", display: "inline-flex" }}><Icon.bookmark size={14} /></span>
            <span className="mono" style={{ color: "var(--ink-2)", fontWeight: 500 }}>{String(e.rank).padStart(2, "0")}</span>
            <ObjectCell text={e.objeto || e.title || e.raw?.details?.objeto_compra || e.raw?.objeto_compra} />
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontWeight: 600,
                color: "var(--ink-1)",
                fontSize: 10,
                lineHeight: 1.25,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "normal",
              }}>{e.org}</div>
              <div style={{ fontSize: 11.5, color: "var(--ink-3)", display: "flex", gap: 6, marginTop: 2 }}>
                <span>{e.modal}</span>
                {e.items > 0 && <><span>·</span><span>{e.items} itens</span></>}
                {e.docs > 0 && <><span>·</span><span>{e.docs} docs</span></>}
              </div>
            </div>
            <span style={{ color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.mun}</span>
            <span className="mono" style={{ color: "var(--ink-2)", fontWeight: 500 }}>{e.uf}</span>
            <span><ScoreDot score={e.sim} /></span>
            <span className="mono" style={{ textAlign: "right", fontWeight: 500, color: e.val === 0 ? "var(--ink-4)" : "var(--ink-1)" }}>
              {e.val === 0 ? "-" : fmtBRL(e.val).replace("R$ ", "R$\u202F")}
            </span>
            <span className="mono" style={{ textAlign: "right", color: pastDue ? "var(--risk)" : "var(--ink-1)", fontWeight: 500 }}>{e.end}</span>
          </div>
        );
      })}
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, flexDirection: "column", gap: 12, color: "var(--ink-3)", padding: 48 }}>
      <Icon.sparkle size={28} />
      <div style={{ fontSize: 14, fontWeight: 500 }}>Buscando editais...</div>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, flexDirection: "column", gap: 12, color: "var(--risk)", padding: 48 }}>
      <div style={{ fontSize: 14, fontWeight: 500 }}>Erro na busca</div>
      <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{message}</div>
      {onRetry && <Button kind="default" size="sm" onClick={onRetry}>Tentar novamente</Button>}
    </div>
  );
}

function EmptyState({ query, hasFilters }) {
  const title = query
    ? `Nenhum resultado para "${query}"`
    : hasFilters
    ? "Nenhum resultado com os filtros atuais"
    : "Nenhum resultado encontrado";
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, flexDirection: "column", gap: 12, color: "var(--ink-3)", padding: 48 }}>
      <div style={{ fontSize: 14, fontWeight: 500 }}>{title}</div>
      <div style={{ fontSize: 12 }}>Tente outros termos ou ajuste os filtros.</div>
    </div>
  );
}

function IdleState() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, flexDirection: "column", gap: 12, color: "var(--ink-3)", padding: 48, minHeight: 260 }}>
      <Icon.search size={28} />
      <div style={{ fontSize: 14, fontWeight: 500 }}>Digite uma consulta para iniciar a busca</div>
      <div style={{ fontSize: 12 }}>Use o campo no painel esquerdo para buscar editais, objetos ou palavras-chave.</div>
    </div>
  );
}

function SearchSummaryStrip({ searchState, onRefine }) {
  const configSummary = window.GovGoSearchContracts?.describeConfig
    ? window.GovGoSearchContracts.describeConfig(searchState.config)
    : {
      typeLabel: "Semantica",
      approachLabel: "Direta",
      relevanceLabel: "Permissivo",
      sortLabel: "Similaridade",
      minSimilarityLabel: "0.00",
      limitLabel: "10",
      topCategoriesLabel: "10",
    };
  const activeFilterSummary = window.GovGoSearchContracts?.describeActiveFilters
    ? window.GovGoSearchContracts.describeActiveFilters(searchState.filters)
    : [];

  return (
    <div style={{
      display: "flex",
      flexWrap: "wrap",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
      padding: "12px 14px",
      background: "var(--paper)",
      border: "1px solid var(--hairline)",
      borderRadius: 10,
      marginBottom: 14,
    }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, flex: 1, minWidth: 220 }}>
        <Chip tone="blue">{configSummary.typeLabel}</Chip>
        <Chip tone="blue">{configSummary.approachLabel}</Chip>
        <Chip tone="blue">{configSummary.relevanceLabel}</Chip>
        <Chip tone="blue">{configSummary.sortLabel}</Chip>
        {Number(searchState.config?.minSimilarity || 0) > 0 && (
          <Chip tone="orange">≥ {configSummary.minSimilarityLabel}</Chip>
        )}
        {searchState.config?.searchApproach !== "direct" && (
          <Chip tone="blue">Categorias: {configSummary.topCategoriesLabel}</Chip>
        )}
        <Chip tone="blue">Resultados: {configSummary.limitLabel}</Chip>
        {searchState.config?.filterExpired && <Chip tone="blue">Filtra encerrados</Chip>}
        {activeFilterSummary.map((item) => (
          <Chip key={item.id} tone={item.tone || "blue"}>{item.label}</Chip>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
        <Button
          kind="ghost"
          size="sm"
          icon={React.createElement(Icon.filter, { size: 14 })}
          onClick={() => onRefine?.("filters")}
        >
          Refinar busca
        </Button>
        <Button size="sm" icon={React.createElement(Icon.download, { size: 14 })}>Exportar</Button>
        <Button kind="primary" size="sm" icon={React.createElement(Icon.starFill, { size: 14 })}>Salvar busca</Button>
      </div>
    </div>
  );
}

function BuscaWorkspace() {
  const emitSearchState = (detail) => {
    if (typeof window !== "undefined" && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent("govgo:search-state", { detail }));
    }
  };

  const [workspaceSeed] = uSo(() => readPersistedWorkspace());
  const [tabs, setTabs] = uSo(workspaceSeed?.tabs || []);
  const [activeTab, setActiveTab] = uSo(workspaceSeed?.activeTab || null);
  const [searchTabs, setSearchTabs] = uSo(workspaceSeed?.searchTabs || {});
  const [editalMap, setEditalMap] = uSo(workspaceSeed?.editalMap || {});

  const current = tabs.find((tab) => tab.id === activeTab) || tabs[0];
  const currentSearchTabId = current?.kind === "busca"
    ? current.id
    : current?.kind === "edital"
    ? current.searchTabId
    : null;
  const currentSearchState = currentSearchTabId ? (searchTabs[currentSearchTabId] || createSearchTabState()) : createSearchTabState();
  const currentHasFilters = hasActiveSearchFiltersState(currentSearchState.filters);
  const currentResultsSort = resolveResultsSort(currentSearchState);
  const currentDisplayResults = React.useMemo(
    () => sortEditais(currentSearchState.results, currentResultsSort),
    [currentSearchState.results, currentResultsSort.field, currentResultsSort.direction]
  );

  uEf(() => {
    persistWorkspaceState({
      tabs,
      activeTab,
      searchTabs,
      editalMap,
    });
  }, [tabs, activeTab, searchTabs, editalMap]);

  function runSearch(query, searchInput, targetTabId) {
    const previousState = searchTabs[targetTabId] || createSearchTabState();
    const q = query === undefined || query === null
      ? String(previousState.query || "").trim()
      : String(query || "").trim();
    const form = resolveSearchFormState(q, searchInput || { ...previousState.config, uiFilters: previousState.filters });
    const normalizedFilters = normalizeSearchFiltersState(form.uiFilters);
    const hasFilters = hasActiveSearchFiltersState(normalizedFilters);

    if (!q && !hasFilters) {
      setSearchTabs((prev) => ({
        ...prev,
        [targetTabId]: createSearchTabState(),
      }));
      setTabs((prev) => prev.map((tab) => (
        tab.id === targetTabId
          ? { ...tab, title: "Nova busca", count: null }
          : tab
      )));
      return Promise.resolve({ results: [], error: "" });
    }

    const tabTitle = buildSearchTabTitle(q, normalizedFilters);

    setSearchTabs((prev) => ({
      ...prev,
      [targetTabId]: {
        ...(prev[targetTabId] || createSearchTabState()),
        query: q,
        loading: true,
        error: "",
        count: null,
        results: null,
        localSort: normalizeResultsSort(previousState.localSort),
        config: form,
        filters: normalizedFilters,
      },
    }));
    setTabs((prev) => prev.map((tab) => (
      tab.id === targetTabId && tab.kind === "busca"
        ? { ...tab, title: tabTitle, count: null }
        : tab
    )));

    const apiCall = window.GovGoSearchApi
      ? window.GovGoSearchApi.runSearch(form)
      : fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            window.GovGoSearchContracts?.toApiPayload
              ? window.GovGoSearchContracts.toApiPayload(form)
              : { query: q, search_type: "semantic", limit: 10 }
          ),
        }).then((response) => response.json());

    return apiCall.then((response) => {
      const normalized = window.GovGoSearchUiAdapter
        ? window.GovGoSearchUiAdapter.normalizeResponse(response)
        : { results: response.results || [], error: response.error };

      if (normalized.error) {
        setSearchTabs((prev) => ({
          ...prev,
          [targetTabId]: {
            ...(prev[targetTabId] || createSearchTabState()),
            query: q,
            loading: false,
            error: normalized.error,
            count: null,
            results: null,
            localSort: normalizeResultsSort((prev[targetTabId] || previousState).localSort),
            config: form,
            filters: normalizedFilters,
          },
        }));
        return normalized;
      }

      if (window.GovGoSearchUiAdapter?.rememberResponse) {
        window.GovGoSearchUiAdapter.rememberResponse(normalized);
      }

      const editais = toEditaisShape(normalized.results || []);
      const count = editais.length;
      setSearchTabs((prev) => ({
        ...prev,
        [targetTabId]: {
          ...(prev[targetTabId] || createSearchTabState()),
          query: q,
          loading: false,
          error: "",
          results: editais,
          count,
          localSort: normalizeResultsSort((prev[targetTabId] || previousState).localSort),
          config: form,
          filters: normalizedFilters,
        },
      }));
      setTabs((prev) => prev.map((tab) => (
        tab.id === targetTabId && tab.kind === "busca"
          ? { ...tab, count, title: tabTitle }
          : tab
      )));
      return normalized;
    }).catch((error) => {
      const message = String(error);
      setSearchTabs((prev) => ({
        ...prev,
        [targetTabId]: {
          ...(prev[targetTabId] || createSearchTabState()),
          query: q,
          loading: false,
          error: message,
          count: null,
          results: null,
          localSort: normalizeResultsSort((prev[targetTabId] || previousState).localSort),
          config: form,
          filters: normalizedFilters,
        },
      }));
      return { results: [], error: message };
    });
  }

  function openSearchTabAndRun(query, searchInput) {
    const q = String(query || "").trim();
    const form = resolveSearchFormState(q, searchInput);
    const filters = normalizeSearchFiltersState(form.uiFilters);
    const tabId = nextTabId("search");
    const tabTitle = buildSearchTabTitle(q, filters);

    setTabs((prev) => [
      ...prev,
      createSearchTab(tabId, { title: tabTitle, closable: true }),
    ]);
    setSearchTabs((prev) => ({
      ...prev,
      [tabId]: createSearchTabState({
        query: q,
        loading: true,
        error: "",
        count: null,
        results: null,
        localSort: null,
        config: form,
        filters,
      }),
    }));
    setActiveTab(tabId);

    return runSearch(q, form, tabId);
  }

  uEf(() => {
    const pending = window.GovGoSearchUiAdapter?.consumePendingSearch
      ? window.GovGoSearchUiAdapter.consumePendingSearch()
      : null;
    const pendingHasFilters = hasActiveSearchFiltersState(pending?.config?.uiFilters);
    if (pending?.query || pendingHasFilters) {
      openSearchTabAndRun(pending?.query || "", pending?.config || pending?.searchType || null);
    }
  }, []);

  uEf(() => {
    window._govgoBuscaSearch = (query, searchInput) => openSearchTabAndRun(query, searchInput);
    return () => {
      window._govgoBuscaSearch = null;
    };
  });

  uEf(() => {
    emitSearchState(
      buildSearchStateDetail(currentSearchTabId ? currentSearchState : createSearchTabState())
    );
  }, [currentSearchTabId, currentSearchState?.query, currentSearchState?.loading, currentSearchState?.error, currentSearchState?.count, currentSearchState?.results, currentSearchState?.config, currentSearchState?.filters]);

  const openEdital = (edital) => {
    if (!edital) {
      return;
    }

    if (window.GovGoSearchUiAdapter?.rememberEdital) {
      window.GovGoSearchUiAdapter.rememberEdital(edital);
    }

    const searchTabId = current?.kind === "edital" ? current.searchTabId : current?.id;
    if (!searchTabId) {
      return;
    }
    const detailLookup = edital.itemId || edital.id || edital.rank;
    const detailTabId = `detail-${searchTabId}-${detailLookup}`;

    if (tabs.find((tab) => tab.id === detailTabId)) {
      setActiveTab(detailTabId);
      return;
    }

    setTabs((prev) => [
      ...prev,
      createDetailTab(detailTabId, {
        title: buildDetailTabTitle(edital),
        rank: edital.rank,
        searchTabId,
      }),
    ]);
    setEditalMap((prev) => ({ ...prev, [detailTabId]: edital }));
    setActiveTab(detailTabId);
  };

  const closeTab = (id) => {
    const closingTab = tabs.find((tab) => tab.id === id);
    if (!closingTab) {
      return;
    }

    const idsToRemove = new Set([id]);
    if (closingTab.kind === "busca") {
      tabs.forEach((tab) => {
        if (tab.kind === "edital" && tab.searchTabId === closingTab.id) {
          idsToRemove.add(tab.id);
        }
      });
    }

    const nextTabs = tabs.filter((tab) => !idsToRemove.has(tab.id));
    let nextActive = activeTab;
    if (idsToRemove.has(activeTab)) {
      if (closingTab.kind === "edital" && closingTab.searchTabId && nextTabs.find((tab) => tab.id === closingTab.searchTabId)) {
        nextActive = closingTab.searchTabId;
      } else {
        nextActive = nextTabs[nextTabs.length - 1]?.id || null;
      }
    }

    setTabs(nextTabs);
    setActiveTab(nextActive);
    setEditalMap((prev) => {
      const next = { ...prev };
      idsToRemove.forEach((tabId) => delete next[tabId]);
      return next;
    });
    setSearchTabs((prev) => {
      const next = { ...prev };
      if (closingTab.kind === "busca" && closingTab.id !== HOME_SEARCH_TAB_ID) {
        delete next[closingTab.id];
      }
      return next;
    });
  };

  const addNew = () => {
    if (typeof window !== "undefined" && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent("govgo:search-focus"));
    }
  };

  const currentEdital = current?.kind === "edital" ? editalMap[current.id] : null;

  const handleSortResults = (field) => {
    if (!currentSearchTabId) {
      return;
    }

    setSearchTabs((prev) => {
      const tabState = prev[currentSearchTabId] || createSearchTabState();
      const resolvedSort = resolveResultsSort(tabState);
      const nextDirection = resolvedSort.field === field
        ? (resolvedSort.direction === "desc" ? "asc" : "desc")
        : getDefaultSortDirection(field);

      return {
        ...prev,
        [currentSearchTabId]: {
          ...tabState,
          localSort: { field, direction: nextDirection },
        },
      };
    });
  };

  const openSearchRailPanel = (panel) => {
    if (typeof window !== "undefined" && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent("govgo:search-rail-open", { detail: { panel } }));
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <WorkspaceTabs
        tabs={tabs}
        active={activeTab}
        onActivate={setActiveTab}
        onClose={closeTab}
        onNew={addNew}
      />

      <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {current?.kind === "edital" && currentEdital ? (
          <EditalDetail
            edital={currentEdital}
            onBackToSearch={() => {
              if (current.searchTabId) {
                setActiveTab(current.searchTabId);
              }
            }}
          />
        ) : current?.kind === "edital" && !currentEdital ? (
          <div style={{ padding: 32, color: "var(--ink-3)" }}>Carregando edital...</div>
        ) : current?.kind === "busca" ? (
          <div style={{ overflowY: "auto", padding: "18px 24px 40px", flex: 1 }}>
            <SearchSummaryStrip
              searchState={currentSearchState}
              onRefine={(panel) => openSearchRailPanel(panel || "filters")}
            />

            {currentSearchState.loading ? (
              <LoadingState />
            ) : currentSearchState.error ? (
              <ErrorState
                message={currentSearchState.error}
                onRetry={() => runSearch(currentSearchState.query, { ...currentSearchState.config, uiFilters: currentSearchState.filters }, currentSearchTabId)}
              />
            ) : currentSearchState.results && currentSearchState.results.length > 0 ? (
              <EditaisTable
                editais={currentDisplayResults}
                onOpen={openEdital}
                currentSort={currentResultsSort}
                onSort={handleSortResults}
              />
            ) : currentSearchState.results && currentSearchState.results.length === 0 ? (
              <EmptyState query={currentSearchState.query} hasFilters={currentHasFilters} />
            ) : (
              <IdleState />
            )}
          </div>
        ) : (
          <div style={{ overflowY: "auto", padding: "18px 24px 40px", flex: 1 }}>
            <IdleState />
          </div>
        )}
      </div>
    </div>
  );
}

window.BuscaWorkspace = BuscaWorkspace;
