// Mode: Oportunidades — editais search with workspace tabs
const { useState: uSo, useMemo: uMo } = React;

function WorkspaceTabs({tabs, active, onActivate, onClose, onNew}) {
  const scrollRef = React.useRef(null);
  React.useEffect(() => {
    const node = scrollRef.current;
    if (!node) {
      return undefined;
    }

    const handleWheel = (event) => {
      if (node.scrollWidth <= node.clientWidth) {
        return;
      }

      const delta = Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      if (!delta) {
        return;
      }

      node.scrollLeft += delta;
      event.preventDefault();
    };

    node.addEventListener("wheel", handleWheel, { passive: false });
    return () => node.removeEventListener("wheel", handleWheel);
  }, []);

  return (
    <div
      ref={scrollRef}
      style={{
        display: "flex", alignItems: "flex-end", gap: 2,
        borderBottom: "1px solid var(--hairline)",
        padding: "0 0 0 4px", background: "var(--surface-sunk)",
        overflowX: "auto",
        overflowY: "hidden",
        scrollbarWidth: "thin",
        scrollBehavior: "smooth",
      }}>
      {tabs.map(t => {
        const isActive = t.id === active;
        return (
          <div key={t.id} onClick={() => onActivate(t.id)}
            style={{
              flex: "0 0 auto",
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "9px 12px 9px 12px", marginTop: 6,
              background: isActive ? "var(--paper)" : "var(--surface-sunk)",
              border: isActive ? "1px solid var(--hairline)" : "1px solid transparent",
              borderBottom: isActive ? "1px solid var(--paper)" : "1px solid transparent",
              borderTop: isActive ? "2px solid var(--orange)" : "2px solid transparent",
              borderRadius: "8px 8px 0 0",
              cursor: "pointer", position: "relative", top: 1,
              fontSize: 12.5, fontWeight: 500,
              color: isActive ? "var(--orange-700)" : "var(--ink-2)",
              maxWidth: 240, minWidth: 0,
            }}>
            <span style={{
              color: isActive
                ? "var(--orange)"
                : t.tone === "orange"
                ? "var(--orange)"
                : t.tone === "blue"
                ? "var(--deep-blue)"
                : t.tone === "green"
                ? "var(--green)"
                : "var(--ink-3)",
              opacity: isActive ? 1 : 0.84,
              display: "inline-flex",
            }}>
              {React.isValidElement(t.icon) ? t.icon : null}
            </span>
            <span style={{overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160}}>{t.title}</span>
            {t.count != null && <span style={{fontSize: 10.5, color: isActive ? "var(--orange-700)" : "var(--ink-2)", fontFamily: "var(--font-mono)", fontWeight: 600}}>{t.count}</span>}
            {t.closable !== false && (
              <button onClick={e => { e.stopPropagation(); onClose(t.id); }} style={{
                all: "unset", cursor: "pointer", padding: 2, borderRadius: 3,
                display: "inline-flex", color: isActive ? "var(--orange-700)" : "var(--ink-2)", marginLeft: 2,
              }}><Icon.close size={11}/></button>
            )}
          </div>
        );
      })}
      <button onClick={onNew} title="Nova busca" style={{
        flex: "0 0 auto",
        all: "unset", cursor: "pointer",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 30, height: 30, marginTop: 6, borderRadius: 6,
        color: "var(--ink-2)",
      }}><Icon.plus size={14}/></button>
      <span style={{flex: 1}}/>
    </div>
  );
}

const DEFAULT_TABS = [
  { id: "t1", title: "alimentação hospitalar", icon: <Icon.search size={12}/>, tone: "orange", count: 214, kind: "busca" },
  { id: "t2", title: "Compra de produtos de padaria",  icon: <Icon.starFill size={12}/>, tone: "orange", kind: "favorito" },
  { id: "t3", title: "Alimentação escolar integral",   icon: <Icon.starFill size={12}/>, tone: "blue", kind: "favorito" },
  { id: "t4", title: "Boletim diário — Saúde/SP",      icon: <Icon.brief size={12}/>, tone: "blue", kind: "boletim" },
];

function ModeOportunidades() {
  const [tabs, setTabs] = uSo(DEFAULT_TABS);
  const [activeTab, setActiveTab] = uSo("t1");
  const current = tabs.find(t => t.id === activeTab) || tabs[0];
  const sel = current?.kind === "edital" ? DATA.editais.find(e => e.rank === current.rank) : null;

  const close = (id) => {
    const next = tabs.filter(t => t.id !== id);
    setTabs(next);
    if (activeTab === id && next[0]) setActiveTab(next[0].id);
  };
  const addNew = () => {
    const id = "t" + (Date.now() % 100000);
    setTabs([...tabs, { id, title: "Nova busca", icon: <Icon.search size={12}/>, tone: "default", kind: "busca" }]);
    setActiveTab(id);
  };
  const openEdital = (e) => {
    const id = "ed-" + e.rank;
    if (tabs.find(t => t.id === id)) { setActiveTab(id); return; }
    const title = `${e.uf} · ${e.org.replace(/^(MUNICÍPIO DE |ESTADO DO |EMPRESA |INSTITUTO DE |SEC\. )/, "")}`;
    setTabs([...tabs, { id, title, icon: <Icon.file size={12}/>, tone: "blue", kind: "edital", rank: e.rank }]);
    setActiveTab(id);
  };

  return (
    <div style={{display: "flex", flexDirection: "column", height: "100%", overflow: "hidden"}}>
      <WorkspaceTabs tabs={tabs} active={activeTab}
        onActivate={setActiveTab} onClose={close} onNew={addNew}/>

      <div style={{display: "grid", gridTemplateColumns: "1fr", flex: 1, minHeight: 0, overflow: "hidden"}}>
        {current?.kind === "edital" && sel ? (
          <EditalDetail edital={sel}/>
        ) : (
        <div style={{overflowY: "auto", padding: "18px 24px 40px"}}>
          <SectionHead
            eyebrow={current?.kind === "favorito" ? "Favorito" : current?.kind === "boletim" ? "Boletim" : "Busca"}
            title={current?.kind === "busca" ? `Editais aderentes a “${current?.title}”` : current?.title}
            desc={current?.kind === "boletim" ? "Atualização automática diária às 07h · 42 processos monitorados" : "214 processos — atualizado há 2 min · 12 fontes oficiais"}
            actions={
              <>
                <Button kind="ghost" size="sm" icon={<Icon.filter size={14}/>}>6 filtros</Button>
                <Button size="sm" icon={<Icon.download size={14}/>}>Exportar</Button>
                {current?.kind === "busca"
                  ? <Button kind="primary" size="sm" icon={<Icon.starFill size={14}/>}>Salvar busca</Button>
                  : <Button kind="primary" size="sm" icon={<Icon.bell size={14}/>}>Alertas</Button>}
              </>
            }
          />

          <div style={{display: "flex", flexWrap: "wrap", gap: 8, padding: "12px 14px", background: "var(--paper)", border: "1px solid var(--hairline)", borderRadius: 10, marginBottom: 14}}>
            <span style={{fontSize: 11.5, color: "var(--ink-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", alignSelf: "center", marginRight: 4}}>Filtros ativos</span>
            <Chip tone="blue" onRemove={()=>{}}>Status: Aberto</Chip>
            <Chip tone="blue" onRemove={()=>{}}>UF: CE, SP, BA, RS, GO…</Chip>
            <Chip tone="blue" onRemove={()=>{}}>Modalidade: Pregão, Concorrência</Chip>
            <Chip tone="orange" onRemove={()=>{}}>Similaridade ≥ 0.85</Chip>
            <Chip tone="blue" onRemove={()=>{}}>Valor &gt; R$ 100k</Chip>
            <span style={{flex: 1}}/>
            <Button kind="ghost" size="sm" icon={<Icon.plus size={12}/>}>Adicionar filtro</Button>
          </div>

          <div style={{background: "var(--paper)", border: "1px solid var(--hairline)", borderRadius: 10, overflow: "hidden"}}>
            <div style={{display: "grid",
              gridTemplateColumns: "44px 56px minmax(0,2.2fr) 1fr 56px 150px 140px 120px",
              fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".04em", fontWeight: 600,
              padding: "10px 16px", background: "var(--rail)", borderBottom: "1px solid var(--hairline)",
              alignItems: "center",
            }}>
              <span></span><span>Rank</span><span>Órgão</span><span>Município</span><span>UF</span>
              <span style={{color: "var(--orange)"}}>Similaridade ↓</span>
              <span style={{textAlign:"right"}}>Valor (R$)</span>
              <span style={{textAlign:"right"}}>Encerramento</span>
            </div>
            {DATA.editais.map(e => {
              return (
                <div key={e.rank} onClick={() => openEdital(e)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "44px 56px minmax(0,2.2fr) 1fr 56px 150px 140px 120px",
                    padding: "12px 16px", borderBottom: "1px solid var(--hairline-soft)",
                    alignItems: "center", cursor: "pointer",
                    background: "var(--paper)",
                    fontSize: 13,
                  }}>
                  <span style={{color: "var(--ink-3)"}}><Icon.bookmark size={14}/></span>
                  <span className="mono" style={{color: "var(--ink-2)", fontWeight: 500}}>{String(e.rank).padStart(2,"0")}</span>
                  <div style={{minWidth: 0}}>
                    <div style={{fontWeight: 600, color: "var(--ink-1)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{e.org}</div>
                    <div style={{fontSize: 11.5, color: "var(--ink-3)", display:"flex", gap:6, marginTop:2}}>
                      <span>{e.modal}</span>· <span>{e.items} itens</span>· <span>{e.docs} docs</span>
                    </div>
                  </div>
                  <span style={{color: "var(--ink-2)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{e.mun}</span>
                  <span className="mono" style={{color: "var(--ink-2)", fontWeight: 500}}>{e.uf}</span>
                  <span><ScoreDot score={e.sim}/></span>
                  <span className="mono" style={{textAlign: "right", fontWeight: 500, color: e.val === 0 ? "var(--ink-4)" : "var(--ink-1)"}}>
                    {e.val === 0 ? "—" : fmtBRL(e.val).replace("R$ ", "R$\u202F")}
                  </span>
                  <span className="mono" style={{textAlign: "right", color: new Date(e.end.split("/").reverse().join("-")) < new Date("2026-04-25") ? "var(--risk)" : "var(--ink-1)", fontWeight: 500}}>{e.end}</span>
                </div>
              );
            })}
          </div>

          {sel && null}
        </div>
        )}
      </div>
    </div>
  );
}

window.WorkspaceTabs = WorkspaceTabs;
window.ModeOportunidades = ModeOportunidades;
