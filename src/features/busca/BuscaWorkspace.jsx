// BuscaWorkspace — replica exata de ModeOportunidades (design/govgo/mode_oportunidades.jsx)
// com dados reais da API via GovGoSearchApi + GovGoSearchUiAdapter
// O box de busca fica no SearchRail (AppShell), este componente só renderiza o workspace de abas.

const { useState: uSo, useEffect: uEf } = React;

// ─── Normaliza item real da API → shape do design ────────────────────────────
function toEditaisShape(results) {
  return results.map(item => ({
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
  }));
}

// ─── Tabela de editais (grid idêntico ao design) ─────────────────────────────
function EditaisTable({ editais, onOpen }) {
  return (
    <div style={{ background: "var(--paper)", border: "1px solid var(--hairline)", borderRadius: 10, overflow: "hidden" }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "44px 56px minmax(0,2.2fr) 1fr 56px 150px 140px 120px",
        fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase",
        letterSpacing: ".04em", fontWeight: 600,
        padding: "10px 16px", background: "var(--rail)", borderBottom: "1px solid var(--hairline)",
        alignItems: "center",
      }}>
        <span></span>
        <span>Rank</span>
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
              gridTemplateColumns: "44px 56px minmax(0,2.2fr) 1fr 56px 150px 140px 120px",
              padding: "12px 16px", borderBottom: "1px solid var(--hairline-soft)",
              alignItems: "center", cursor: "pointer",
              background: "var(--paper)", fontSize: 13,
            }}
            onMouseEnter={ev => ev.currentTarget.style.background = "var(--surface-sunk)"}
            onMouseLeave={ev => ev.currentTarget.style.background = "var(--paper)"}
          >
            <span style={{ color: "var(--ink-3)", display: "inline-flex" }}><Icon.bookmark size={14} /></span>
            <span className="mono" style={{ color: "var(--ink-2)", fontWeight: 500 }}>{String(e.rank).padStart(2, "0")}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: "var(--ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.org}</div>
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

function EmptyState({ query }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, flexDirection: "column", gap: 12, color: "var(--ink-3)", padding: 48 }}>
      <div style={{ fontSize: 14, fontWeight: 500 }}>Nenhum resultado para "{query}"</div>
      <div style={{ fontSize: 12 }}>Tente outros termos ou ajuste os filtros.</div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
function BuscaWorkspace() {
  const defaultQuery = "alimentação hospitalar";

  const [tabs, setTabs] = uSo([
    { id: "t1", title: defaultQuery, icon: React.createElement(Icon.search, { size: 12 }), tone: "orange", count: null, kind: "busca", closable: false },
    { id: "t2", title: "Compra de produtos de padaria", icon: React.createElement(Icon.starFill, { size: 12 }), tone: "orange", kind: "favorito" },
    { id: "t3", title: "Alimentação escolar integral", icon: React.createElement(Icon.starFill, { size: 12 }), tone: "blue", kind: "favorito" },
    { id: "t4", title: "Boletim diário — Saúde/SP", icon: React.createElement(Icon.brief, { size: 12 }), tone: "blue", kind: "boletim" },
  ]);
  const [activeTab, setActiveTab] = uSo("t1");

  const [searchState, setSearchState] = uSo({
    query: defaultQuery,
    loading: false,
    results: null,
    error: null,
    count: null,
  });

  const [editalMap, setEditalMap] = uSo({});

  const current = tabs.find(t => t.id === activeTab) || tabs[0];

  const runSearch = (query, searchType) => {
    const q = query || searchState.query;
    const form = window.GovGoSearchContracts
      ? { ...window.GovGoSearchContracts.createDefaultSearchForm(), query: q, searchType: searchType || "keyword" }
      : { query: q, searchType: "keyword", limit: 10 };

    setSearchState(s => ({ ...s, query: q, loading: true, error: null }));

    const apiCall = window.GovGoSearchApi
      ? window.GovGoSearchApi.runSearch(form)
      : fetch("/api/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: q, search_type: "keyword", limit: 10 }) }).then(r => r.json());

    apiCall.then(response => {
      const normalized = window.GovGoSearchUiAdapter
        ? window.GovGoSearchUiAdapter.normalizeResponse(response)
        : { results: response.results || [], error: response.error };

      if (normalized.error) {
        setSearchState(s => ({ ...s, loading: false, error: normalized.error }));
        return;
      }

      const editais = toEditaisShape(normalized.results || []);
      const count = editais.length;
      setSearchState(s => ({ ...s, loading: false, results: editais, count, query: q }));
      setTabs(prev => prev.map(t => t.kind === "busca" && t.id === activeTab ? { ...t, count, title: q } : t));
    }).catch(err => {
      setSearchState(s => ({ ...s, loading: false, error: String(err) }));
    });
  };

  uEf(() => { runSearch(defaultQuery, "keyword"); }, []);

  uEf(() => {
    window._govgoBuscaSearch = (query, searchType) => {
      if (current?.kind === "busca") {
        runSearch(query, searchType);
      } else {
        const id = "t" + Date.now();
        setTabs(prev => [...prev, { id, title: query, icon: React.createElement(Icon.search, { size: 12 }), tone: "orange", count: null, kind: "busca" }]);
        setActiveTab(id);
        runSearch(query, searchType);
      }
    };
    return () => { window._govgoBuscaSearch = null; };
  });

  const openEdital = (e) => {
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
                  ? `Editais aderentes a "${searchState.query}"`
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
                  : "Carregando…"
              }
              actions={
                <>
                  <Button kind="ghost" size="sm" icon={React.createElement(Icon.filter, { size: 14 })}>6 filtros</Button>
                  <Button size="sm" icon={React.createElement(Icon.download, { size: 14 })}>Exportar</Button>
                  {current?.kind === "busca"
                    ? <Button kind="primary" size="sm" icon={React.createElement(Icon.starFill, { size: 14 })}>Salvar busca</Button>
                    : <Button kind="primary" size="sm" icon={React.createElement(Icon.bell, { size: 14 })}>Alertas</Button>}
                </>
              }
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "12px 14px", background: "var(--paper)", border: "1px solid var(--hairline)", borderRadius: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 11.5, color: "var(--ink-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", alignSelf: "center", marginRight: 4 }}>Filtros ativos</span>
              <Chip tone="blue" onRemove={() => {}}>Status: Aberto</Chip>
              <Chip tone="blue" onRemove={() => {}}>UF: CE, SP, BA, RS, GO…</Chip>
              <Chip tone="blue" onRemove={() => {}}>Modalidade: Pregão, Concorrência</Chip>
              <Chip tone="orange" onRemove={() => {}}>Similaridade ≥ 0.85</Chip>
              <Chip tone="blue" onRemove={() => {}}>Valor {">"} R$ 100k</Chip>
              <span style={{ flex: 1 }} />
              <Button kind="ghost" size="sm" icon={React.createElement(Icon.plus, { size: 12 })}>Adicionar filtro</Button>
            </div>
            {current?.kind === "busca" ? (
              searchState.loading ? (
                <LoadingState />
              ) : searchState.error ? (
                <ErrorState message={searchState.error} onRetry={() => runSearch(searchState.query)} />
              ) : searchState.results && searchState.results.length > 0 ? (
                <EditaisTable editais={searchState.results} onOpen={openEdital} />
              ) : searchState.results && searchState.results.length === 0 ? (
                <EmptyState query={searchState.query} />
              ) : null
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

