// BuscaWorkspace — replica exata de ModeOportunidades (design/govgo/mode_oportunidades.jsx)
// com dados reais da API via GovGoSearchApi + GovGoSearchUiAdapter
// O box de busca fica no SearchRail (AppShell), este componente so renderiza o workspace de abas.

const { useState: uSo, useEffect: uEf } = React;

const EDITAIS_GRID_COLUMNS = "44px 56px minmax(190px,1.15fr) minmax(170px,1fr) minmax(110px,.8fr) 44px 130px 120px 112px";
const HOME_SEARCH_TAB_ID = "search-home";
const WORKSPACE_STORAGE_KEY = "govgo.busca.workspace.v2";
const RESULTS_VIEW_OPTIONS = [
  { value: "table", label: "Tabela", icon: "table" },
  { value: "map", label: "Mapa", icon: "map" },
];
const MAP_METRIC_OPTIONS = [
  { value: "similarity", label: "Similaridade" },
  { value: "value", label: "Valor" },
  { value: "date", label: "Encerramento" },
];
const MAP_FALLBACK_CENTER = [-14.235, -51.9253];

function normalizeSearchViewMode(value) {
  return value === "map" ? "map" : "table";
}

function normalizeMapMetric(value) {
  return value === "value" || value === "date" ? value : "similarity";
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function hashString(value) {
  const text = String(value || "");
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getDaysUntilClosing(dateLabel) {
  const parts = String(dateLabel || "").split("/");
  if (parts.length !== 3) {
    return null;
  }
  const [day, month, year] = parts.map((part) => Number(part));
  if (!day || !month || !year) {
    return null;
  }
  const target = new Date(year, month - 1, day);
  if (Number.isNaN(target.getTime())) {
    return null;
  }
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

function interpolateNumber(start, end, factor) {
  return start + ((end - start) * factor);
}

function buildMapMetricValue(edital, metric) {
  if (metric === "value") {
    return Number(edital?.val || 0);
  }
  if (metric === "date") {
    const days = getDaysUntilClosing(edital?.end);
    return days === null ? null : days;
  }
  return Number(edital?.sim || 0);
}

function describeMapMetric(edital, metric) {
  if (metric === "value") {
    return edital?.val ? fmtBRL(edital.val) : "Valor nao informado";
  }
  if (metric === "date") {
    const days = getDaysUntilClosing(edital?.end);
    if (days === null) {
      return edital?.end || "Data nao informada";
    }
    if (days < 0) {
      return `${Math.abs(days)}d em atraso`;
    }
    return days === 0 ? "Encerra hoje" : `${days}d para encerrar`;
  }
  return `${Math.round(Number(edital?.sim || 0) * 100)}% de similaridade`;
}

function buildMapMetricTone(metric, normalizedValue) {
  const t = Math.max(0, Math.min(1, normalizedValue));
  if (metric === "value") {
    return {
      fill: `hsl(213 ${Math.round(interpolateNumber(62, 78, t))}% ${Math.round(interpolateNumber(72, 40, t))}%)`,
      shadow: `hsla(213, 72%, 28%, ${interpolateNumber(0.18, 0.36, t).toFixed(2)})`,
    };
  }
  if (metric === "date") {
    return {
      fill: `hsl(${Math.round(interpolateNumber(208, 18, t))} ${Math.round(interpolateNumber(56, 90, t))}% ${Math.round(interpolateNumber(60, 56, t))}%)`,
      shadow: `hsla(${Math.round(interpolateNumber(208, 18, t))}, 75%, 28%, ${interpolateNumber(0.18, 0.36, t).toFixed(2)})`,
    };
  }
  return {
    fill: `hsl(24 ${Math.round(interpolateNumber(72, 92, t))}% ${Math.round(interpolateNumber(72, 52, t))}%)`,
    shadow: `hsla(24, 80%, 26%, ${interpolateNumber(0.18, 0.36, t).toFixed(2)})`,
  };
}

function buildMapTooltipHtml(edital, metric) {
  return `
    <div style="display:flex;flex-direction:column;gap:6px;min-width:240px;max-width:300px;white-space:normal;">
      <div style="font-size:12px;font-weight:700;color:var(--ink-1);line-height:1.4;white-space:normal;word-break:break-word;overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;">${escapeHtml(normalizeObjectText(edital?.objeto || edital?.title || ""))}</div>
      <div style="font-size:11.5px;color:var(--ink-2);line-height:1.45;">${escapeHtml(edital?.org || "-")}</div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;font-size:11px;color:var(--ink-3);">
        <span>${escapeHtml(edital?.mun || "-")} · ${escapeHtml(edital?.uf || "-")}</span>
        <span>${escapeHtml(edital?.modal || "-")}</span>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;font-size:11px;color:var(--ink-2);">
        <span><strong>Similaridade:</strong> ${escapeHtml(describeMapMetric(edital, "similarity"))}</span>
        <span><strong>Valor:</strong> ${escapeHtml(describeMapMetric(edital, "value"))}</span>
        <span><strong>Encerramento:</strong> ${escapeHtml(edital?.end || "-")}</span>
      </div>
      <div style="font-size:11px;color:var(--ink-3);"><strong>Pin por ${escapeHtml(MAP_METRIC_OPTIONS.find((option) => option.value === metric)?.label || "Similaridade")}:</strong> ${escapeHtml(describeMapMetric(edital, metric))}</div>
    </div>
  `;
}

function isLikelyBrazilCoordinate(lat, lon) {
  return lat >= -35 && lat <= 6 && lon >= -75 && lon <= -28;
}

function coerceBrazilCoordinatePair(latValue, lonValue) {
  const lat = Number(latValue);
  const lon = Number(lonValue);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { lat: null, lon: null };
  }
  if (isLikelyBrazilCoordinate(lat, lon)) {
    return { lat, lon };
  }
  if (isLikelyBrazilCoordinate(lon, lat)) {
    return { lat: lon, lon: lat };
  }
  return { lat, lon };
}

function resolveMapCoordinatePair(item) {
  const latValue =
    item?.raw?.details?.lat ??
    item?.raw?.details?.latitude ??
    item?.details?.lat ??
    item?.details?.latitude ??
    item?.raw?.lat ??
    item?.raw?.latitude ??
    item?.lat ??
    item?.latitude;

  const lonValue =
    item?.raw?.details?.lon ??
    item?.raw?.details?.longitude ??
    item?.details?.lon ??
    item?.details?.longitude ??
    item?.raw?.lon ??
    item?.raw?.longitude ??
    item?.lon ??
    item?.longitude;

  if (
    latValue === null || latValue === undefined || latValue === "" ||
    lonValue === null || lonValue === undefined || lonValue === ""
  ) {
    return { lat: null, lon: null };
  }

  return coerceBrazilCoordinatePair(latValue, lonValue);
}

function firstDefinedValue(values) {
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value !== null && value !== undefined && value !== "") {
      return value;
    }
  }
  return null;
}

function resolveResultCoordinatePair(item) {
  if (!item || typeof item !== "object") {
    return { lat: null, lon: null };
  }
  const raw = item.raw || {};
  const rawDetails = raw.details || {};
  const details = item.details || rawDetails || {};
  const latValue = firstDefinedValue([
    rawDetails.lat,
    rawDetails.latitude,
    details.lat,
    details.latitude,
    raw.lat,
    raw.latitude,
    item.lat,
    item.latitude,
  ]);
  const lonValue = firstDefinedValue([
    rawDetails.lon,
    rawDetails.longitude,
    details.lon,
    details.longitude,
    raw.lon,
    raw.longitude,
    item.lon,
    item.longitude,
  ]);
  return coerceBrazilCoordinatePair(latValue, lonValue);
}

function jitterLatLon(lat, lon, index, total, seed) {
  if (total <= 1) {
    return { lat, lon };
  }
  const ringIndex = Math.floor(index / 8);
  const slot = index % 8;
  const radiusMeters = 220 + (ringIndex * 120);
  const angle = ((Math.PI * 2) / Math.max(8, total)) * slot + ((seed % 360) * Math.PI / 180);
  const dLat = (radiusMeters * Math.cos(angle)) / 111320;
  const denom = 111320 * Math.max(0.00001, Math.cos(lat * Math.PI / 180));
  const dLon = (radiusMeters * Math.sin(angle)) / denom;
  return {
    lat: lat + dLat,
    lon: lon + dLon,
  };
}

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
    viewMode: "table",
    mapMetric: "similarity",
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
        results: Array.isArray(state.results) ? state.results.map(normalizePersistedEditalResult) : null,
        count: typeof state.count === "number" ? state.count : Array.isArray(state.results) ? state.results.length : null,
        localSort: normalizeResultsSort(state.localSort),
        viewMode: normalizeSearchViewMode(state.viewMode),
        mapMetric: normalizeMapMetric(state.mapMetric),
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
  return results.map((item) => normalizePersistedEditalResult(
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
        municipioCode: item.municipalityCode || item.raw?.municipality_code || item.raw?.details?.ibge_municipio || item.raw?.details?.unidade_orgao_codigo_ibge || "",
        ...coerceBrazilCoordinatePair(
          item.latitude ?? item.raw?.latitude ?? item.raw?.lat ?? item.raw?.details?.lat ?? item.raw?.details?.latitude,
          item.longitude ?? item.raw?.longitude ?? item.raw?.lon ?? item.raw?.details?.lon ?? item.raw?.details?.longitude
        ),
      }
  ));
}

function normalizePersistedEditalResult(item) {
  if (!item || typeof item !== "object") {
    return item;
  }
  const raw = item.raw || {};
  const rawDetails = raw.details || {};
  const details = item.details || rawDetails || {};
  const coerced = resolveResultCoordinatePair(item);
  const municipioCode = firstDefinedValue([
    item.municipioCode,
    item.municipalityCode,
    raw.municipality_code,
    rawDetails.ibge_municipio,
    rawDetails.unidade_orgao_codigo_ibge,
    details.ibge_municipio,
    details.unidade_orgao_codigo_ibge,
  ]) || "";
  return {
    ...item,
    municipioCode,
    lat: coerced.lat,
    lon: coerced.lon,
  };
}

// ─── Tabela de editais (grid identico ao design) ─────────────────────────────
function EditaisTable({ editais, onOpen, currentSort, onSort }) {
  return (
    <div style={{
      flex: 1,
      minHeight: 0,
      display: "flex",
      flexDirection: "column",
      background: "var(--paper)",
      border: "1px solid var(--hairline)",
      borderRadius: 10,
      overflow: "hidden",
    }}>
      <div style={{
        flex: "0 0 auto",
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
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
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

function SearchSummaryStrip({ searchState, viewMode, onChangeView, mapMetric, onChangeMapMetric }) {
  const configSummary = window.GovGoSearchContracts?.describeConfig
    ? window.GovGoSearchContracts.describeConfig(searchState.config)
    : {
      typeLabel: "Semantica",
      approachLabel: "Direta",
      relevanceLabel: "Permissivo",
      sortLabel: "Similaridade",
      minSimilarityLabel: "0.00",
    };
  const activeFilterSummary = window.GovGoSearchContracts?.describeActiveFilters
    ? window.GovGoSearchContracts.describeActiveFilters(searchState.filters)
    : [];
  const metricLabel = MAP_METRIC_OPTIONS.find((option) => option.value === mapMetric)?.label || configSummary.sortLabel;

  return (
    <div style={{
      display: "flex",
      flexWrap: "wrap",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
      padding: "8px 10px",
      background: "var(--paper)",
      border: "1px solid var(--hairline)",
      borderRadius: 10,
      marginBottom: 6,
    }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, flex: 1, minWidth: 220 }}>
        <Chip tone="blue">{configSummary.typeLabel}</Chip>
        <Chip tone="blue">{configSummary.approachLabel}</Chip>
        <Chip tone="blue">{configSummary.relevanceLabel}</Chip>
        <Chip tone="blue">{metricLabel}</Chip>
        {Number(searchState.config?.minSimilarity || 0) > 0 && (
          <Chip tone="orange">&gt;= {configSummary.minSimilarityLabel}</Chip>
        )}
        {activeFilterSummary.map((item) => (
          <Chip key={item.id} tone={item.tone || "blue"}>{item.label}</Chip>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginLeft: "auto", alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
        <div
          role="tablist"
          aria-label="Metrica principal dos resultados"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: 3,
            background: "var(--surface-sunk)",
            border: "1px solid var(--hairline)",
            borderRadius: 9,
          }}
        >
          {MAP_METRIC_OPTIONS.map((option) => {
            const isActive = option.value === mapMetric;
            const icon = option.value === "date"
              ? <Icon.clock size={13} />
              : option.value === "value"
              ? <Icon.chart size={13} />
              : <Icon.sparkle size={13} />;
            return (
              <button
                key={option.value}
                onClick={() => onChangeMapMetric?.(option.value)}
                style={{
                  all: "unset",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "5px 10px",
                  borderRadius: 7,
                  cursor: "pointer",
                  background: isActive ? "var(--paper)" : "transparent",
                  color: isActive ? "var(--orange-700)" : "var(--ink-2)",
                  boxShadow: isActive ? "var(--shadow-xs)" : "none",
                  border: isActive ? "1px solid var(--hairline)" : "1px solid transparent",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <span style={{ display: "inline-flex", color: isActive ? "var(--orange)" : "var(--ink-3)" }}>{icon}</span>
                {option.label}
              </button>
            );
          })}
        </div>
        <div
          role="tablist"
          aria-label="Modo de visualizacao dos resultados"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: 3,
            background: "var(--surface-sunk)",
            border: "1px solid var(--hairline)",
            borderRadius: 9,
          }}
        >
          {RESULTS_VIEW_OPTIONS.map((option) => {
            const isActive = option.value === viewMode;
            const iconName = option.icon;
            return (
              <button
                key={option.value}
                onClick={() => onChangeView?.(option.value)}
                style={{
                  all: "unset",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "5px 10px",
                  borderRadius: 7,
                  cursor: "pointer",
                  background: isActive ? "var(--paper)" : "transparent",
                  color: isActive ? "var(--orange-700)" : "var(--ink-2)",
                  boxShadow: isActive ? "var(--shadow-xs)" : "none",
                  border: isActive ? "1px solid var(--hairline)" : "1px solid transparent",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <span style={{ display: "inline-flex", color: isActive ? "var(--orange)" : "var(--ink-3)" }}>
                  {iconName === "map" ? <Icon.map size={14} /> : <Icon.table size={14} />}
                </span>
                {option.label}
              </button>
            );
          })}
        </div>
        <Button size="sm" style={{ padding: "5px 10px", fontSize: 12 }} icon={React.createElement(Icon.download, { size: 13 })}>Exportar</Button>
        <Button kind="primary" size="sm" style={{ padding: "5px 10px", fontSize: 12 }} icon={React.createElement(Icon.starFill, { size: 13 })}>Salvar</Button>
      </div>
    </div>
  );
}

function SearchResultsMap({ editais, metric, onOpen }) {
  const frameRef = React.useRef(null);
  const hostRef = React.useRef(null);
  const mapRef = React.useRef(null);
  const layerRef = React.useRef(null);
  const lastBoundsKeyRef = React.useRef("");

  const prepared = React.useMemo(() => {
    let basePoints = (Array.isArray(editais) ? editais : [])
      .map((item) => {
        const coords = resolveMapCoordinatePair(item);
        return {
          edital: item,
          lat: coords.lat,
          lon: coords.lon,
          rawValue: buildMapMetricValue(item, metric),
          hash: hashString(`${item?.itemId || item?.id || item?.rank}-${item?.mun}-${item?.uf}`),
        };
      })
      .filter((item) => Number.isFinite(Number(item?.lat)) && Number.isFinite(Number(item?.lon)));

    const normalBrazilHits = basePoints.filter((point) => isLikelyBrazilCoordinate(point.lat, point.lon)).length;
    const swappedBrazilHits = basePoints.filter((point) => isLikelyBrazilCoordinate(point.lon, point.lat)).length;
    if (basePoints.length > 0 && swappedBrazilHits > normalBrazilHits) {
      basePoints = basePoints.map((point) => ({
        ...point,
        lat: point.lon,
        lon: point.lat,
      }));
    }

    const grouped = new Map();
    basePoints.forEach((point) => {
      const key = `${point.lat.toFixed(6)}|${point.lon.toFixed(6)}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key).push(point);
    });

    grouped.forEach((group) => {
      group.sort((left, right) => left.hash - right.hash);
      group.forEach((point, index) => {
        const jittered = jitterLatLon(point.lat, point.lon, index, group.length, point.hash);
        point.displayLat = jittered.lat;
        point.displayLon = jittered.lon;
      });
    });

    const validValues = basePoints
      .map((point) => point.rawValue)
      .filter((value) => value !== null && value !== undefined && Number.isFinite(Number(value)))
      .map(Number);
    const minValue = validValues.length ? Math.min(...validValues) : 0;
    const maxValue = validValues.length ? Math.max(...validValues) : 1;
    const range = maxValue - minValue || 1;

    return basePoints.map((point) => {
      const numericValue = point.rawValue === null || point.rawValue === undefined ? null : Number(point.rawValue);
      let normalizedValue = 0.5;
      if (numericValue !== null && Number.isFinite(numericValue)) {
        if (metric === "date") {
          normalizedValue = (maxValue - numericValue) / range;
        } else {
          normalizedValue = (numericValue - minValue) / range;
        }
      }
      normalizedValue = Math.max(0, Math.min(1, normalizedValue));
      const size = Math.round(interpolateNumber(18, 30, normalizedValue));
      const tone = buildMapMetricTone(metric, normalizedValue);
      return {
        ...point,
        normalizedValue,
        size,
        tone,
      };
    });
  }, [editais, metric]);

  React.useEffect(() => {
    if (!hostRef.current || mapRef.current || !window.L) {
      return undefined;
    }

    const map = window.L.map(hostRef.current, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: true,
    });
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    const layerGroup = window.L.layerGroup().addTo(map);
    map.setView(MAP_FALLBACK_CENTER, 4);

    mapRef.current = map;
    layerRef.current = layerGroup;

    const resizeObserver = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => map.invalidateSize())
      : null;
    resizeObserver?.observe(hostRef.current);

    setTimeout(() => map.invalidateSize(), 0);

    return () => {
      resizeObserver?.disconnect();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      lastBoundsKeyRef.current = "";
    };
  }, []);

  React.useEffect(() => {
    const map = mapRef.current;
    const layerGroup = layerRef.current;
    if (!map || !layerGroup || !window.L) {
      return;
    }

    layerGroup.clearLayers();
    if (!prepared.length) {
      map.setView(MAP_FALLBACK_CENTER, 4);
      lastBoundsKeyRef.current = "";
      return;
    }

    const bounds = [];
    prepared.forEach((point) => {
      const html = `
        <div style="
          width:${point.size}px;
          height:${point.size}px;
          border-radius:999px;
          background:${point.tone.fill};
          border:2px solid rgba(255,255,255,.96);
          box-shadow:0 8px 20px ${point.tone.shadow};
          display:flex;
          align-items:center;
          justify-content:center;
        ">
          <span style="
            width:${Math.max(6, Math.round(point.size * 0.24))}px;
            height:${Math.max(6, Math.round(point.size * 0.24))}px;
            border-radius:999px;
            background:rgba(255,255,255,.96);
          "></span>
        </div>
      `;

      const marker = window.L.marker([point.displayLat, point.displayLon], {
        icon: window.L.divIcon({
          className: "govgo-map-pin-icon",
          html,
          iconSize: [point.size, point.size],
          iconAnchor: [point.size / 2, point.size / 2],
        }),
      });
      marker.bindTooltip(buildMapTooltipHtml(point.edital, metric), {
        sticky: true,
        direction: "top",
        className: "govgo-map-tooltip",
        offset: [0, -Math.round(point.size / 2)],
        opacity: 1,
      });
      marker.on("click", () => onOpen?.(point.edital));
      marker.addTo(layerGroup);
      bounds.push([point.displayLat, point.displayLon]);
    });

    const boundsKey = bounds.map(([lat, lon]) => `${lat.toFixed(5)},${lon.toFixed(5)}`).join("|");
    if (bounds.length === 1) {
      const [lat, lon] = bounds[0];
      if (lastBoundsKeyRef.current !== boundsKey) {
        map.setView([lat, lon], 7);
        lastBoundsKeyRef.current = boundsKey;
      }
    } else if (bounds.length > 1 && lastBoundsKeyRef.current !== boundsKey) {
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 7 });
      lastBoundsKeyRef.current = boundsKey;
    }
    setTimeout(() => map.invalidateSize(), 0);
  }, [prepared, metric, onOpen]);

  if (!window.L) {
    return (
      <div style={{ background: "var(--paper)", border: "1px solid var(--hairline)", borderRadius: 10, padding: 24, color: "var(--ink-3)" }}>
        O mapa ainda nao foi carregado neste ambiente.
      </div>
    );
  }

  if (!prepared.length) {
    return (
      <div style={{
        background: "var(--paper)",
        border: "1px solid var(--hairline)",
        borderRadius: 10,
        padding: 32,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        color: "var(--ink-3)",
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-2)" }}>Nao ha coordenadas suficientes para montar este mapa.</div>
        <div style={{ fontSize: 12 }}>Os resultados continuam disponiveis normalmente na tabela.</div>
      </div>
    );
  }

  return (
    <div ref={frameRef} style={{
      flex: 1,
      height: "100%",
      minHeight: 0,
      display: "flex",
      position: "relative",
      alignSelf: "stretch",
      background: "var(--paper)",
      border: "1px solid var(--hairline)",
      borderRadius: 10,
      overflow: "hidden",
    }}>
      <div ref={hostRef} style={{ width: "100%", height: "100%" }} />
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
  const currentViewMode = normalizeSearchViewMode(currentSearchState.viewMode);
  const currentMapMetric = normalizeMapMetric(currentSearchState.mapMetric || currentResultsSort.field);
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
          viewMode: normalizeSearchViewMode(previousState.viewMode),
          mapMetric: normalizeMapMetric(previousState.mapMetric),
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
            viewMode: normalizeSearchViewMode((prev[targetTabId] || previousState).viewMode),
            mapMetric: normalizeMapMetric((prev[targetTabId] || previousState).mapMetric),
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
          results: editais.map(normalizePersistedEditalResult),
          count,
          localSort: normalizeResultsSort((prev[targetTabId] || previousState).localSort),
          viewMode: normalizeSearchViewMode((prev[targetTabId] || previousState).viewMode),
          mapMetric: normalizeMapMetric((prev[targetTabId] || previousState).mapMetric),
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
          viewMode: normalizeSearchViewMode((prev[targetTabId] || previousState).viewMode),
          mapMetric: normalizeMapMetric((prev[targetTabId] || previousState).mapMetric),
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
        viewMode: "table",
        mapMetric: normalizeMapMetric(getConfigResultsSort(form).field),
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

  const handleChangeResultsView = (viewMode) => {
    if (!currentSearchTabId) {
      return;
    }
    setSearchTabs((prev) => {
      const tabState = prev[currentSearchTabId] || createSearchTabState();
      return {
        ...prev,
        [currentSearchTabId]: {
          ...tabState,
          viewMode: normalizeSearchViewMode(viewMode),
        },
      };
    });
  };

  const handleChangeMapMetric = (metric) => {
    if (!currentSearchTabId) {
      return;
    }
    setSearchTabs((prev) => {
      const tabState = prev[currentSearchTabId] || createSearchTabState();
      const normalizedMetric = normalizeMapMetric(metric);
      return {
        ...prev,
        [currentSearchTabId]: {
          ...tabState,
          mapMetric: normalizedMetric,
          localSort: { field: normalizedMetric, direction: "desc" },
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
          <div
            style={{
              padding: "8px 10px 4px",
              flex: 1,
              minHeight: 0,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <SearchSummaryStrip
              searchState={currentSearchState}
              viewMode={currentViewMode}
              onChangeView={handleChangeResultsView}
              mapMetric={currentMapMetric}
              onChangeMapMetric={handleChangeMapMetric}
            />
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflow: currentViewMode === "map" ? "hidden" : "auto",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {currentSearchState.loading ? (
                <LoadingState />
              ) : currentSearchState.error ? (
                <ErrorState
                  message={currentSearchState.error}
                  onRetry={() => runSearch(currentSearchState.query, { ...currentSearchState.config, uiFilters: currentSearchState.filters }, currentSearchTabId)}
                />
              ) : currentSearchState.results && currentSearchState.results.length > 0 ? (
                currentViewMode === "map" ? (
                  <SearchResultsMap
                    editais={currentDisplayResults}
                    metric={currentMapMetric}
                    onOpen={openEdital}
                  />
                ) : (
                  <EditaisTable
                    editais={currentDisplayResults}
                    onOpen={openEdital}
                    currentSort={currentResultsSort}
                    onSort={handleSortResults}
                  />
                )
              ) : currentSearchState.results && currentSearchState.results.length === 0 ? (
                <EmptyState query={currentSearchState.query} hasFilters={currentHasFilters} />
              ) : (
                <IdleState />
              )}
            </div>
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
