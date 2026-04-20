// Mode: Relatorios — NL query + SQL
const { useState: uSr } = React;

function RelatoriosTabs({tabs, active, onActivate, onClose, onNew}) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-end", gap: 2,
      borderBottom: "1px solid var(--hairline)",
      padding: "0 8px", background: "var(--surface-sunk)",
      overflowX: "auto", flexShrink: 0,
    }}>
      {tabs.map(t => {
        const isActive = t.id === active;
        return (
          <div key={t.id} onClick={() => onActivate(t.id)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "9px 12px", marginTop: 6,
              background: isActive ? "var(--paper)" : "transparent",
              border: isActive ? "1px solid var(--hairline)" : "1px solid transparent",
              borderBottom: isActive ? "1px solid var(--paper)" : "1px solid transparent",
              borderRadius: "8px 8px 0 0",
              cursor: "pointer", position: "relative", top: 1,
              fontSize: 12.5, fontWeight: 500,
              color: isActive ? "var(--ink-1)" : "var(--ink-3)",
              maxWidth: 320, minWidth: 0,
            }}>
            <span style={{color: "var(--deep-blue)", display: "inline-flex"}}><Icon.sparkle size={12}/></span>
            <span style={{overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220}}>{t.title}</span>
            {t.count != null && <span className="mono" style={{fontSize: 10.5, color: "var(--ink-3)", fontWeight: 600}}>{t.count}</span>}
            {t.closable !== false && (
              <button onClick={e => { e.stopPropagation(); onClose(t.id); }} style={{
                all: "unset", cursor: "pointer", padding: 2, borderRadius: 3,
                display: "inline-flex", color: "var(--ink-3)", marginLeft: 2,
              }}><Icon.close size={11}/></button>
            )}
          </div>
        );
      })}
      <button onClick={onNew} title="Nova consulta" style={{
        all: "unset", cursor: "pointer",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 30, height: 30, marginTop: 6, borderRadius: 6,
        color: "var(--ink-3)",
      }}><Icon.plus size={14}/></button>
      <span style={{flex: 1}}/>
    </div>
  );
}

function ModeRelatorios() {
  const [q, setQ] = uSr("Top 10 compradores de alimentação hospitalar nos últimos 12 meses");
  const [ran, setRan] = uSr(true);
  const [rTabs, setRTabs] = uSr([
    { id: "r1", title: "Top 10 compradores · alimentação hospitalar", count: "10 " },
    { id: "r2", title: "Fornecedores novos · merenda escolar", count: "48" },
  ]);
  const [activeRTab, setActiveRTab] = uSr("r1");
  const closeRTab = (id) => {
    const next = rTabs.filter(t => t.id !== id);
    setRTabs(next);
    if (activeRTab === id && next[0]) setActiveRTab(next[0].id);
  };
  const addNewRTab = () => {
    const id = "r" + (Date.now() % 100000);
    setRTabs([...rTabs, { id, title: "Nova consulta" }]);
    setActiveRTab(id);
  };
  const runRSearch = () => {
    const id = "r" + (Date.now() % 100000);
    const label = q.length > 60 ? q.slice(0, 57) + "…" : q;
    setRTabs([...rTabs, { id, title: label, count: "—" }]);
    setActiveRTab(id);
    setRan(true);
  };

  const cols = ["Rank", "Órgão", "UF", "Processos", "Valor total"];
  const rows = [
    ["1", "Sec. Saúde / SP", "SP", "1.204", "R$ 4,21 bi"],
    ["2", "Min. da Defesa",  "BR", "842",   "R$ 3,08 bi"],
    ["3", "Min. da Saúde",   "BR", "712",   "R$ 2,91 bi"],
    ["4", "Gov. MG",         "MG", "980",   "R$ 2,24 bi"],
    ["5", "Gov. PR",         "PR", "611",   "R$ 1,80 bi"],
    ["6", "Sec. Educ. / BA", "BA", "523",   "R$ 1,52 bi"],
    ["7", "Sec. Saúde / RJ", "RJ", "489",   "R$ 1,31 bi"],
    ["8", "Sec. Saúde / CE", "CE", "412",   "R$ 1,04 bi"],
    ["9", "Gov. RS",         "RS", "398",   "R$ 0,94 bi"],
    ["10","Gov. GO",         "GO", "361",   "R$ 0,81 bi"],
  ];

  return (
    <div style={{display: "grid", gridTemplateColumns: "320px 1fr", height: "100%", overflow: "hidden"}}>
      {/* Inspector — LEFT: search input + history */}
      <aside style={{borderRight: "1px solid var(--hairline)", background: "var(--paper)", overflowY: "auto"}}>
        <div style={{padding: "12px 10px 10px", borderBottom: "1px solid var(--hairline)"}}>
          <div style={{fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, margin: "0 2px 8px"}}>MODO RELATÓRIOS</div>
          <Input size="sm" placeholder="Pergunte em português…" icon={<Icon.terminal size={14}/>} value={q} onChange={setQ}/>
          <div style={{display: "flex", gap: 6, marginTop: 8, alignItems: "center"}}>
            <Chip tone="blue" icon={<Icon.sparkle size={10}/>}>NL → SQL</Chip>
            <span style={{flex: 1}}/>
            <Button kind="primary" size="sm" onClick={runRSearch}>Executar</Button>
          </div>
        </div>

        <div style={{padding: "0 10px 10px"}}>
          <div style={{fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600, padding: "6px 4px 6px"}}>Recentes</div>
          {DATA.relatorios.map((r, i) => (
            <button key={i} style={{
              all: "unset", cursor: "pointer", display: "block", width: "100%", boxSizing: "border-box",
              padding: "10px 12px", marginBottom: 6,
              background: i === 0 ? "var(--orange-50)" : "var(--paper)",
              border: `1px solid ${i === 0 ? "var(--orange-100)" : "var(--hairline)"}`,
              borderRadius: 8,
            }}>
              <div style={{fontSize: 12.5, color: "var(--ink-1)", fontWeight: 500, lineHeight: 1.4}}>{r.q}</div>
              <div style={{display: "flex", gap: 8, marginTop: 6, fontSize: 11, color: "var(--ink-3)"}}>
                <span>{r.when}</span><span>·</span><span>{r.rows} linhas</span>
              </div>
            </button>
          ))}

          <div style={{fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600, margin: "12px 4px 6px"}}>SQL salvas</div>
          {DATA.sqlHist.map((s, i) => (
            <div key={i} style={{padding: "8px 10px", border: "1px solid var(--hairline)", borderRadius: 8, marginBottom: 6, background: "var(--rail)"}}>
              <div className="mono" style={{fontSize: 11, color: "var(--ink-1)", lineHeight: 1.45, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{s.q}</div>
              <div style={{fontSize: 11, color: "var(--ink-3)", marginTop: 4}}>{s.when}</div>
            </div>
          ))}
        </div>
      </aside>

      <div style={{display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden"}}>
        <RelatoriosTabs tabs={rTabs} active={activeRTab}
          onActivate={setActiveRTab} onClose={closeRTab} onNew={addNewRTab}/>
      <div style={{overflowY: "auto", padding: "20px 24px 40px", flex: 1}}>
        <SectionHead
          eyebrow="Modo Relatórios"
          title="Consultas analíticas em linguagem natural"
          desc="Escreva em português. A GovGo gera SQL, executa e devolve a tabela pronta para exportar."
        />

        {/* NL input card removed — search lives in left sidebar now */}

        {ran && (
          <>
            {/* SQL preview */}
            <div style={{background: "var(--code-bg)", borderRadius: 10, overflow: "hidden", marginBottom: 14}}>
              <div style={{display: "flex", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,.08)"}}>
                <div style={{display: "inline-flex", gap: 6}}>
                  <span style={{width: 10, height: 10, borderRadius: 99, background: "#FF5F57"}}/>
                  <span style={{width: 10, height: 10, borderRadius: 99, background: "#FEBC2E"}}/>
                  <span style={{width: 10, height: 10, borderRadius: 99, background: "#28C840"}}/>
                </div>
                <span style={{marginLeft: 14, fontFamily: "var(--font-mono)", fontSize: 11.5, color: "rgba(255,255,255,.6)"}}>govgo_sql · gerado automaticamente</span>
                <span style={{flex: 1}}/>
                <Button kind="ghost" size="sm" icon={<Icon.download size={12}/>} style={{color: "rgba(255,255,255,.8)"}}>Copiar</Button>
              </div>
              <pre style={{
                margin: 0, padding: "14px 16px",
                fontFamily: "var(--font-mono)", fontSize: 12.5, lineHeight: 1.6,
                color: "#E0EAF9", overflow: "auto",
              }}>
<span style={{color: "#FF5722"}}>SELECT</span>  orgao.nome       <span style={{color: "#9AA5BD"}}>AS</span> orgao,
        orgao.uf         <span style={{color: "#9AA5BD"}}>AS</span> uf,
        <span style={{color: "#FF5722"}}>COUNT</span>(c.id)     <span style={{color: "#9AA5BD"}}>AS</span> processos,
        <span style={{color: "#FF5722"}}>SUM</span>(c.valor)    <span style={{color: "#9AA5BD"}}>AS</span> valor_total
  <span style={{color: "#FF5722"}}>FROM</span>  contratos c
  <span style={{color: "#FF5722"}}>JOIN</span>  orgaos orgao <span style={{color: "#9AA5BD"}}>ON</span> orgao.id = c.orgao_id
 <span style={{color: "#FF5722"}}>WHERE</span>  c.categoria = <span style={{color: "#CDE5CF"}}>'alimentacao_hospitalar'</span>
   <span style={{color: "#FF5722"}}>AND</span>  c.data_publicacao <span style={{color: "#FF5722"}}>&gt;=</span> now() - <span style={{color: "#CDE5CF"}}>interval '12 months'</span>
 <span style={{color: "#FF5722"}}>GROUP BY</span> 1, 2
 <span style={{color: "#FF5722"}}>ORDER BY</span> valor_total <span style={{color: "#FF5722"}}>DESC</span>
 <span style={{color: "#FF5722"}}>LIMIT</span>   10;
              </pre>
            </div>

            {/* Results */}
            <div style={{background: "var(--paper)", border: "1px solid var(--hairline)", borderRadius: 10, overflow: "hidden"}}>
              <div style={{padding: "12px 16px", borderBottom: "1px solid var(--hairline-soft)", display: "flex", alignItems: "center", gap: 10}}>
                <Chip tone="green" icon={<Icon.check size={10}/>}>Executado</Chip>
                <span style={{fontSize: 12, color: "var(--ink-3)"}}>10 linhas · 420 ms</span>
                <span style={{flex: 1}}/>
                <Button kind="ghost" size="sm" icon={<Icon.download size={13}/>}>CSV</Button>
                <Button kind="ghost" size="sm" icon={<Icon.download size={13}/>}>XLSX</Button>
                <Button kind="ghost" size="sm" icon={<Icon.chart size={13}/>}>Visualizar</Button>
                <Button size="sm" icon={<Icon.bookmark size={13}/>}>Salvar</Button>
              </div>
              <div style={{display: "grid",
                gridTemplateColumns: "56px 2fr 80px 120px 160px",
                padding: "8px 16px", background: "var(--rail)", borderBottom: "1px solid var(--hairline-soft)",
                fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".04em", fontWeight: 600}}>
                {cols.map(c => <span key={c} style={{textAlign: c === "Valor total" || c === "Processos" ? "right" : undefined}}>{c}</span>)}
              </div>
              {rows.map((r, i) => (
                <div key={i} style={{display: "grid",
                  gridTemplateColumns: "56px 2fr 80px 120px 160px",
                  padding: "11px 16px", borderBottom: "1px solid var(--hairline-soft)", fontSize: 13,
                  alignItems: "center",
                  background: i === 0 ? "var(--orange-50)" : "var(--paper)"}}>
                  <span className="mono" style={{color: "var(--ink-2)", fontWeight: 500}}>{r[0]}</span>
                  <span style={{color: "var(--ink-1)", fontWeight: i === 0 ? 600 : 500}}>{r[1]}</span>
                  <span className="mono" style={{color: "var(--ink-2)"}}>{r[2]}</span>
                  <span className="mono" style={{textAlign: "right"}}>{r[3]}</span>
                  <span className="mono" style={{textAlign: "right", fontWeight: 600}}>{r[4]}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Inspector relocated to left */}
    </div>
      </div>
  );
}

window.ModeRelatorios = ModeRelatorios;
