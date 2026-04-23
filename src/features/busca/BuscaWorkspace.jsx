// BuscaWorkspace — replica exata de ModeOportunidades (design/govgo/mode_oportunidades.jsx)
// com dados reais da API via GovGoSearchApi + GovGoSearchUiAdapter
// O box de busca fica no SearchRail (AppShell), este componente só renderiza o workspace de abas.

const { useState: uSo, useEffect: uEf } = React;

const EDITAIS_GRID_COLUMNS = "44px 56px minmax(190px,1.15fr) minmax(170px,1fr) minmax(110px,.8fr) 44px 130px 120px 112px";

function normalizeObjectText(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text || "—";
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
    if (fullText === "—") {
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
        cursor: fullText === "—" ? "default" : "help",
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

// ─── Normaliza item real da API → shape do design ────────────────────────────
function toEditaisShape(results) {
  return results.map(item => (
    window.GovGoSearchUiAdapter?.toEditalShape
      ? window.GovGoSearchUiAdapter.toEditalShape(item)
      : {
        rank: item.rank,
        org: item.organization || item.title || "—",
        mun: item.municipality || "—",
        uf: item.uf || "—",
        sim: typeof item.similarityRatio === "number" ? item.similarityRatio : 0,
        val: item.raw?.valor_total_estimado ?? item.raw?.valor_global ?? 0,
        end: item.closingDateLabel || "—",
        modal: item.modality || item.raw?.modalidade_nome || "—",
        items: item.raw?.numero_itens ?? 0,
        docs: item.raw?.numero_documentos ?? 0,
        status: item.raw?.situacao_edital || "aberto",
        objeto: item.title || item.raw?.details?.objeto_compra || item.raw?.objeto_compra || "",
      }
  ));
}

// ─── Tabela de editais (grid idêntico ao design) ─────────────────────────────
function EditaisTable({ editais, onOpen }) {
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
        <span>Órgão</span>
        <span>Município</span>
        <span>UF</span>
        <span style={{ color: "var(--orange)" }}>Similaridade ↓</span>
        <span style={{ textAlign: "right" }}>Valor (R$)</span>
        <span style={{ textAlign: "right" }}>Encerramento</span>
      </div>
      {editais.map(e => {
        const pastDue = (() => {
          try {
            const parts = (e.end || "").split("/");
            if (parts.length === 3) {
              return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`) < new Date("2026-04-25");
            }
          } catch (_) {}
          return false;
        })();
        return (
          <div key={e.rank} onClick={() => onOpen(e)}
            style={{
              display: "grid",
              gridTemplateColumns: EDITAIS_GRID_COLUMNS,
              columnGap: 10,
              padding: "12px 16px", borderBottom: "1px solid var(--hairline-soft)",
              alignItems: "center", cursor: "pointer",
              background: "var(--paper)", fontSize: 13,
            }}
            onMouseEnter={ev => ev.currentTarget.style.background = "var(--surface-sunk)"}
            onMouseLeave={ev => ev.currentTarget.style.background = "var(--paper)"}
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
              {e.val === 0 ? "—" : fmtBRL(e.val).replace("R$ ", "R$\u202F")}
            </span>
            <span className="mono" style={{ textAlign: "right", color: pastDue ? "var(--risk)" : "var(--ink-1)", fontWeight: 500 }}>{e.end}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Estados auxiliares ───────────────────────────────────────────────────────
function LoadingState() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, flexDirection: "column", gap: 12, color: "var(--ink-3)", padding: 48 }}>
      <Icon.sparkle size={28} />
      <div style={{ fontSize: 14, fontWeight: 500 }}>Buscando editais…</div>
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

// ─── Componente principal ─────────────────────────────────────────────────────
function BuscaWorkspace({ navigate }) {
  const emitSearchState = (detail) => {
    if (typeof window !== "undefined" && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent("govgo:search-state", { detail }));
    }
  };

  const [tabs, setTabs] = uSo([
    { id: "t1", title: "Nova busca", icon: React.createElement(Icon.search, { size: 12 }), tone: "orange", count: null, kind: "busca", closable: false },
    { id: "t2", title: "Compra de produtos de padaria", icon: React.createElement(Icon.starFill, { size: 12 }), tone: "orange", kind: "favorito" },
    { id: "t3", title: "Alimentação escolar integral", icon: React.createElement(Icon.starFill, { size: 12 }), tone: "blue", kind: "favorito" },
    { id: "t4", title: "Boletim diário — Saúde/SP", icon: React.createElement(Icon.brief, { size: 12 }), tone: "blue", kind: "boletim" },
  ]);
  const [activeTab, setActiveTab] = uSo("t1");

  const [searchState, setSearchState] = uSo({
    query: "",
    loading: false,
    results: null,
    error: null,
    count: null,
    config: createDefaultSearchFormState(),
    filters: createDefaultSearchFiltersState(),
  });

  const [editalMap, setEditalMap] = uSo({});

  const current = tabs.find(t => t.id === activeTab) || tabs[0];

  const runSearch = (query, searchInput, targetTabId = activeTab) => {
    const q = query === undefined || query === null
      ? String(searchState.query || "").trim()
      : String(query || "").trim();
    const form = resolveSearchFormState(q, searchInput || { ...searchState.config, uiFilters: searchState.filters });
    const normalizedFilters = normalizeSearchFiltersState(form.uiFilters);
    const hasFilters = hasActiveSearchFiltersState(normalizedFilters);
    if (!q && !hasFilters) {
      emitSearchState({
        loading: false,
        error: "",
        count: null,
        query: "",
        status: "idle",
        config: searchState.config,
        filters: searchState.filters,
      });
      return Promise.resolve({ results: [], error: "" });
    }

    const tabTitle = q || "Busca filtrada";

    setSearchState(s => ({
      ...s,
      query: q,
      loading: true,
      error: null,
      config: form,
      filters: normalizedFilters,
    }));
    setTabs(prev => prev.map(t => t.id === targetTabId && t.kind === "busca" ? { ...t, title: tabTitle, count: null } : t));
    emitSearchState({
      loading: true,
      error: "",
      count: null,
      query: q,
      status: "loading",
      config: form,
      filters: normalizedFilters,
    });

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
        }).then(r => r.json());

    return apiCall.then(response => {
      const normalized = window.GovGoSearchUiAdapter
        ? window.GovGoSearchUiAdapter.normalizeResponse(response)
        : { results: response.results || [], error: response.error };

      if (normalized.error) {
        setSearchState(s => ({ ...s, loading: false, error: normalized.error, config: form, filters: normalizedFilters }));
        emitSearchState({
          loading: false,
          error: normalized.error,
          count: null,
          query: q,
          status: "error",
          config: form,
          filters: normalizedFilters,
        });
        return normalized;
      }

      if (window.GovGoSearchUiAdapter?.rememberResponse) {
        window.GovGoSearchUiAdapter.rememberResponse(normalized);
      }

      const editais = toEditaisShape(normalized.results || []);
      const count = editais.length;
      setSearchState(s => ({
        ...s,
        loading: false,
        results: editais,
        count,
        query: q,
        config: form,
        filters: normalizedFilters,
      }));
      setTabs(prev => prev.map(t => t.id === targetTabId && t.kind === "busca" ? { ...t, count, title: tabTitle } : t));
      emitSearchState({
        loading: false,
        error: "",
        count,
        query: q,
        status: count > 0 ? "success" : "empty",
        config: form,
        filters: normalizedFilters,
      });
      return normalized;
    }).catch(err => {
      const message = String(err);
      setSearchState(s => ({ ...s, loading: false, error: message, config: form, filters: normalizedFilters }));
      emitSearchState({
        loading: false,
        error: message,
        count: null,
        query: q,
        status: "error",
        config: form,
        filters: normalizedFilters,
      });
      return { results: [], error: message };
    });
  };

  uEf(() => {
    const pending = window.GovGoSearchUiAdapter?.consumePendingSearch
      ? window.GovGoSearchUiAdapter.consumePendingSearch()
      : null;
    const pendingHasFilters = hasActiveSearchFiltersState(pending?.config?.uiFilters);
    if (pending?.query || pendingHasFilters) {
      runSearch(pending?.query || "", pending.config || pending.searchType || null);
      return;
    }
    emitSearchState({
      loading: false,
      error: "",
      count: null,
      query: "",
      status: "idle",
      config: createDefaultSearchFormState(),
      filters: createDefaultSearchFiltersState(),
    });
  }, []);

  uEf(() => {
    window._govgoBuscaSearch = (query, searchInput) => {
      if (current?.kind === "busca") {
        return runSearch(query, searchInput, activeTab);
      }

      const id = "t" + Date.now();
      const hasIncomingFilters = hasActiveSearchFiltersState(searchInput?.uiFilters);
      setTabs(prev => [...prev, {
        id,
        title: query || (hasIncomingFilters ? "Busca filtrada" : "Nova busca"),
        icon: React.createElement(Icon.search, { size: 12 }),
        tone: "orange",
        count: null,
        kind: "busca",
      }]);
      setActiveTab(id);
      return runSearch(query, searchInput, id);
    };
    return () => { window._govgoBuscaSearch = null; };
  });

  const openEdital = (e) => {
    if (window.GovGoSearchUiAdapter?.rememberEdital) {
      window.GovGoSearchUiAdapter.rememberEdital(e);
    }

    if (navigate) {
      navigate("busca-detalhe", { params: { rank: e.itemId || e.id || e.rank } });
      return;
    }

    const id = "ed-" + e.rank;
    if (tabs.find(t => t.id === id)) { setActiveTab(id); return; }
    const orgShort = e.org.replace(/^(MUNICÍPIO DE |ESTADO DO |EMPRESA |INSTITUTO DE |SEC\. )/, "");
    const title = `${e.uf} · ${orgShort}`;
    setTabs(prev => [...prev, { id, title, icon: React.createElement(Icon.file, { size: 12 }), tone: "blue", kind: "edital", rank: e.rank }]);
    setEditalMap(prev => ({ ...prev, [id]: e }));
    setActiveTab(id);
  };

  const closeTab = (id) => {
    setTabs(prev => {
      const next = prev.filter(t => t.id !== id);
      if (activeTab === id && next.length > 0) setActiveTab(next[next.length - 1].id);
      return next;
    });
    setEditalMap(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  const addNew = () => {
    const id = "t" + Date.now();
    setTabs(prev => [...prev, { id, title: "Nova busca", icon: React.createElement(Icon.search, { size: 12 }), tone: "default", kind: "busca" }]);
    setActiveTab(id);
  };

  const editalForTab = current?.kind === "edital" ? editalMap[current.id] : null;
  const editalForDetail = editalForTab ? {
    rank: editalForTab.rank,
    org: editalForTab.org,
    mun: editalForTab.mun,
    uf: editalForTab.uf,
    sim: editalForTab.sim,
    val: editalForTab.val,
    end: editalForTab.end,
    modal: editalForTab.modal,
    items: editalForTab.items,
    docs: editalForTab.docs,
  } : null;

  const mockEditais = DATA?.editais || [];
  const searchConfigSummary = window.GovGoSearchContracts?.describeConfig
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
  const searchHasActiveFilters = hasActiveSearchFiltersState(searchState.filters);

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
        {current?.kind === "edital" && editalForDetail ? (
          <EditalDetail edital={editalForDetail} />
        ) : current?.kind === "edital" && !editalForDetail ? (
          <div style={{ padding: 32, color: "var(--ink-3)" }}>Carregando edital…</div>
        ) : (
          <div style={{ overflowY: "auto", padding: "18px 24px 40px", flex: 1 }}>
            <SectionHead
              eyebrow={current?.kind === "favorito" ? "Favorito" : current?.kind === "boletim" ? "Boletim" : "Busca"}
              title={
                current?.kind === "busca"
                  ? searchState.query
                    ? `Editais aderentes a "${searchState.query}"`
                    : searchHasActiveFilters
                    ? "Editais aderentes aos filtros selecionados"
                    : "Busca de editais"
                  : current?.title
              }
              desc={
                current?.kind === "boletim"
                  ? "Atualização automática diária às 07h · 42 processos monitorados"
                  : searchState.loading
                  ? "Buscando…"
                  : searchState.error
                  ? "Erro na busca"
                  : searchState.count != null
                  ? `${searchState.count} processos · 12 fontes oficiais`
                  : "Digite uma consulta no painel esquerdo"
              }
              actions={
                <>
                  <Button kind="ghost" size="sm" icon={React.createElement(Icon.filter, { size: 14 })}>Refinar busca</Button>
                  <Button size="sm" icon={React.createElement(Icon.download, { size: 14 })}>Exportar</Button>
                  {current?.kind === "busca"
                    ? <Button kind="primary" size="sm" icon={React.createElement(Icon.starFill, { size: 14 })}>Salvar busca</Button>
                    : <Button kind="primary" size="sm" icon={React.createElement(Icon.bell, { size: 14 })}>Alertas</Button>}
                </>
              }
            />
            {current?.kind === "busca" && (searchState.query || activeFilterSummary.length > 0) && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "12px 14px", background: "var(--paper)", border: "1px solid var(--hairline)", borderRadius: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 11.5, color: "var(--ink-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", alignSelf: "center", marginRight: 4 }}>Configuracao da busca</span>
                <Chip tone="blue">Tipo: {searchConfigSummary.typeLabel}</Chip>
                <Chip tone="blue">Abordagem: {searchConfigSummary.approachLabel}</Chip>
                <Chip tone="blue">Relevancia: {searchConfigSummary.relevanceLabel}</Chip>
                <Chip tone="blue">Ordenacao: {searchConfigSummary.sortLabel}</Chip>
                {Number(searchState.config?.minSimilarity || 0) > 0 && (
                  <Chip tone="orange">Sim. minima: {searchConfigSummary.minSimilarityLabel}</Chip>
                )}
                {searchState.config?.searchApproach !== "direct" && (
                  <Chip tone="blue">Categorias: {searchConfigSummary.topCategoriesLabel}</Chip>
                )}
                <Chip tone="blue">Resultados: {searchConfigSummary.limitLabel}</Chip>
                {searchState.config?.filterExpired && <Chip tone="blue">Filtra encerrados</Chip>}
                {activeFilterSummary.length > 0 && (
                  <span style={{ fontSize: 11.5, color: "var(--ink-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", alignSelf: "center", marginLeft: 8 }}>
                    Filtros
                  </span>
                )}
                {activeFilterSummary.map((item) => (
                  <Chip key={item.id} tone={item.tone || "blue"}>{item.label}</Chip>
                ))}
              </div>
            )}
            {current?.kind === "busca" ? (
              searchState.loading ? (
                <LoadingState />
              ) : searchState.error ? (
                <ErrorState message={searchState.error} onRetry={() => runSearch(searchState.query, { ...searchState.config, uiFilters: searchState.filters })} />
              ) : searchState.results && searchState.results.length > 0 ? (
                <EditaisTable editais={searchState.results} onOpen={openEdital} />
              ) : searchState.results && searchState.results.length === 0 ? (
                <EmptyState query={searchState.query} hasFilters={searchHasActiveFilters} />
              ) : (
                <IdleState />
              )
            ) : (
              <EditaisTable editais={mockEditais} onOpen={openEdital} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

window.BuscaWorkspace = BuscaWorkspace;
