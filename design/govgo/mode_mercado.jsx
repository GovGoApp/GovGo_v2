// Mode: Mercado — the hero new screen
const { useState: uSm } = React;

function DonutChart({data, size = 160}) {
  const total = data.reduce((s, d) => s + d.val, 0);
  const R = size/2 - 14;
  const C = 2 * Math.PI * R;
  let off = 0;
  const colors = ["#003A70", "#1F6FD4", "#FF5722", "#EA8B4A", "#2E7D32", "#9AA5BD"];
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={R} fill="none" stroke="var(--surface-sunk)" strokeWidth="18"/>
      {data.map((d, i) => {
        const frac = d.val / total;
        const len = frac * C;
        const el = (
          <circle key={i} cx={size/2} cy={size/2} r={R} fill="none"
            stroke={colors[i % colors.length]} strokeWidth="18"
            strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off}
            transform={`rotate(-90 ${size/2} ${size/2})`}/>
        );
        off += len;
        return el;
      })}
      <text x={size/2} y={size/2 - 4} textAnchor="middle" fontFamily="Sora" fontWeight="700" fontSize="20" fill="var(--ink-1)">100%</text>
      <text x={size/2} y={size/2 + 12} textAnchor="middle" fontFamily="IBM Plex Sans" fontSize="10.5" fill="var(--ink-3)">categorias</text>
    </svg>
  );
}

function TimeSeriesChart({data, w = 640, h = 180}) {
  const max = Math.max(...data) * 1.1, min = 0;
  const pts = data.map((v, i) => [40 + (i / (data.length - 1)) * (w - 60), h - 28 - ((v - min) / (max - min)) * (h - 50)]);
  const path = "M" + pts.map(p => p.map(n => n.toFixed(1)).join(" ")).join(" L ");
  const area = path + ` L ${w - 20} ${h - 28} L 40 ${h - 28} Z`;
  const months = ["mai","jun","jul","ago","set","out","nov","dez","jan","fev","mar","abr"];
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#FF5722" stopOpacity=".28"/>
          <stop offset="1" stopColor="#FF5722" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {/* grid */}
      {[0,1,2,3].map(i => (
        <line key={i} x1="40" x2={w-20} y1={30 + i*40} y2={30 + i*40} stroke="var(--hairline-soft)" strokeDasharray="2 4"/>
      ))}
      {/* y labels */}
      {[0,1,2,3,4].map(i => {
        const v = max - (max - min) * (i / 4);
        return <text key={i} x="32" y={34 + i*38} textAnchor="end" fontSize="10" fontFamily="JetBrains Mono" fill="var(--ink-3)">R$ {v.toFixed(0)}bi</text>;
      })}
      <path d={area} fill="url(#areaFill)"/>
      <path d={path} stroke="#FF5722" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 4 : 2.5}
          fill={i === pts.length - 1 ? "white" : "#FF5722"} stroke="#FF5722" strokeWidth="2"/>
      ))}
      {months.map((m, i) => (
        <text key={i} x={pts[i][0]} y={h - 10} textAnchor="middle" fontSize="10" fontFamily="IBM Plex Sans" fill="var(--ink-3)">{m}</text>
      ))}
    </svg>
  );
}

function MercadoTabs({tabs, active, onActivate, onClose, onNew}) {
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
              maxWidth: 260, minWidth: 0,
            }}>
            <span style={{color: "var(--orange)", display: "inline-flex"}}><Icon.chart size={12}/></span>
            <span style={{overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180}}>{t.title}</span>
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
      <button onClick={onNew} title="Nova análise" style={{
        all: "unset", cursor: "pointer",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 30, height: 30, marginTop: 6, borderRadius: 6,
        color: "var(--ink-3)",
      }}><Icon.plus size={14}/></button>
      <span style={{flex: 1}}/>
    </div>
  );
}

function ModeMercado() {
  const [period, setPeriod] = uSm("12m");
  const [category, setCategory] = uSm("alimentacao");
  const [query, setQuery] = uSm("alimentação hospitalar");
  const [mTabs, setMTabs] = uSm([
    { id: "m1", title: "alimentação hospitalar", count: "48k" },
    { id: "m2", title: "merenda escolar integral", count: "12k" },
  ]);
  const [activeMTab, setActiveMTab] = uSm("m1");
  const closeMTab = (id) => {
    const next = mTabs.filter(t => t.id !== id);
    setMTabs(next);
    if (activeMTab === id && next[0]) setActiveMTab(next[0].id);
  };
  const runMSearch = () => {
    const id = "m" + (Date.now() % 100000);
    setMTabs([...mTabs, { id, title: query || "Nova análise", count: "—" }]);
    setActiveMTab(id);
  };
  const addNewMTab = () => {
    const id = "m" + (Date.now() % 100000);
    setMTabs([...mTabs, { id, title: "Nova análise" }]);
    setActiveMTab(id);
  };
  const m = DATA.mercado;

  return (
    <div style={{display: "grid", gridTemplateColumns: "320px 1fr", height: "100%", overflow: "hidden"}}>
      {/* Inspector — now on the LEFT, with search input */}
      <aside style={{borderRight: "1px solid var(--hairline)", background: "var(--paper)", overflowY: "auto"}}>
        <div style={{padding: "12px 10px 10px", borderBottom: "1px solid var(--hairline)"}}>
          <div style={{fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, margin: "0 2px 8px"}}>MODO MERCADO</div>
          <Input size="sm" placeholder="Mercado, categoria, comprador ou UF…" icon={<Icon.chart size={14}/>} value={query} onChange={setQuery}/>
          <div style={{display: "flex", gap: 6, marginTop: 8, alignItems: "center", flexWrap: "wrap"}}>
            <Chip tone="blue">Brasil</Chip>
            <Chip tone="blue">{period}</Chip>
            <span style={{flex: 1}}/>
            <Button kind="primary" size="sm" onClick={runMSearch}>Analisar</Button>
          </div>
        </div>
        <div style={{padding: "0 14px 14px"}}>
          <div style={{fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600, margin: "4px 2px 6px"}}>Score desta análise</div>
          <div style={{
            padding: "14px 14px", background: "linear-gradient(135deg, var(--blue-50), white)",
            border: "1px solid var(--blue-200)", borderRadius: 10,
          }}>
            <div style={{fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".04em", fontWeight: 600}}>GovGo Score</div>
            <div style={{display: "flex", alignItems: "baseline", gap: 6, marginTop: 2}}>
              <span className="display" style={{fontSize: 30, fontWeight: 600, color: "var(--deep-blue)", letterSpacing: "-0.02em"}}>82</span>
              <span style={{color: "var(--ink-3)", fontSize: 12}}>/ 100 · <b style={{color: "var(--green)"}}>Forte</b></span>
            </div>
            <div style={{background: "rgba(0,58,112,.1)", height: 6, borderRadius: 3, marginTop: 8, overflow: "hidden"}}>
              <div style={{width: "82%", height: "100%", background: "linear-gradient(90deg, var(--deep-blue), #1F6FD4)"}}/>
            </div>
          </div>

          <div style={{fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600, margin: "14px 2px 6px"}}>Componentes</div>
          <div style={{display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5}}>
            {[
              ["Tamanho de mercado", 92, "Alta"],
              ["Crescimento a.a.", 78, "Média-alta"],
              ["Fragmentação", 71, "Favorável"],
              ["Dep. 1 comprador", 52, "Atenção"],
              ["Estabilidade preço", 84, "Estável"],
            ].map(([l, v, t]) => (
              <div key={l}>
                <div style={{display: "flex", justifyContent: "space-between", marginBottom: 3}}>
                  <span style={{color: "var(--ink-2)"}}>{l}</span>
                  <span className="mono" style={{fontWeight: 600, color: "var(--ink-1)"}}>{v}</span>
                </div>
                <div style={{background: "var(--surface-sunk)", height: 4, borderRadius: 2}}>
                  <div style={{width: `${v}%`, height: "100%", background: v >= 70 ? "var(--green)" : v >= 50 ? "var(--orange)" : "var(--risk)", borderRadius: 2}}/>
                </div>
              </div>
            ))}
          </div>

          <div style={{height: 1, background: "var(--hairline)", margin: "16px 0"}}/>

          <div style={{fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600, marginBottom: 6}}>Leia depois</div>
          <div style={{display: "flex", flexDirection: "column", gap: 6}}>
            {[
              "Como a merenda escolar de MG mudou em 2026",
              "Os 5 compradores que explicam 40% do mercado",
              "Onde está crescendo o ticket médio em Saúde",
            ].map((t, i) => (
              <button key={i} style={{
                all: "unset", cursor: "pointer", padding: "8px 10px",
                border: "1px solid var(--hairline)", borderRadius: 8,
                fontSize: 12, color: "var(--ink-1)", lineHeight: 1.4,
              }}>{t}</button>
            ))}
          </div>
        </div>
      </aside>

      <div style={{display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden"}}>
        <MercadoTabs tabs={mTabs} active={activeMTab}
          onActivate={setActiveMTab} onClose={closeMTab} onNew={addNewMTab}/>
      <div style={{overflowY: "auto", padding: "20px 24px 40px", flex: 1}}>
        <SectionHead
          eyebrow="Modo Mercado"
          title="Alimentação hospitalar — panorama Brasil"
          desc="Análise consolidada · 12 meses · 48.212 processos observados"
          actions={
            <>
              <Tabs value={period} onChange={setPeriod}
                tabs={[{id:"3m",label:"3m"},{id:"12m",label:"12m"},{id:"24m",label:"24m"},{id:"all",label:"Tudo"}]}/>
              <Button kind="ghost" size="sm" icon={<Icon.download size={14}/>}>Exportar</Button>
              <Button kind="primary" size="sm" icon={<Icon.sparkle size={14}/>}>Gerar briefing</Button>
            </>
          }
        />

        {/* Category chips */}
        <div style={{display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14}}>
          {[
            ["alimentacao", "Alimentação"], ["saude", "Saúde / Hospitalar"], ["transporte", "Transporte"],
            ["ti", "TI e Telecom"], ["obras", "Obras"], ["educacao", "Educação"]
          ].map(([id, l]) => (
            <Chip key={id} active={category === id} onClick={() => setCategory(id)}>{l}</Chip>
          ))}
        </div>

        {/* KPI cards */}
        <div style={{display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16}}>
          {m.kpis.map((k, i) => <KPI key={i} {...k} accent={i === 0 ? "var(--orange)" : undefined}/>)}
        </div>

        {/* Main chart + donut */}
        <div style={{display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 12, marginBottom: 16}}>
          <Card title="Volume publicado por mês" extra={<>
              <Chip tone="orange" icon={<Icon.trend size={11}/>}>+7.4% a.a.</Chip>
              <Button kind="ghost" size="sm" icon={<Icon.dots size={14}/>}/>
            </>}>
            <TimeSeriesChart data={m.serieMensal}/>
          </Card>
          <Card title="Distribuição por categoria">
            <div style={{display: "flex", gap: 14, alignItems: "center"}}>
              <DonutChart data={m.categorias}/>
              <div style={{flex: 1, display: "flex", flexDirection: "column", gap: 7, fontSize: 12.5}}>
                {m.categorias.map((c, i) => {
                  const colors = ["#003A70", "#1F6FD4", "#FF5722", "#EA8B4A", "#2E7D32", "#9AA5BD"];
                  return (
                    <div key={c.name} style={{display: "grid", gridTemplateColumns: "10px 1fr 40px", gap: 8, alignItems: "center"}}>
                      <span style={{width: 10, height: 10, borderRadius: 2, background: colors[i]}}/>
                      <span style={{color: "var(--ink-2)"}}>{c.name}</span>
                      <span className="mono" style={{textAlign: "right", fontWeight: 600}}>{c.val}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>

        {/* Map + Top compradores */}
        <div style={{display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 12, marginBottom: 16}}>
          <Card title="Concentração geográfica" extra={<Chip tone="blue">Heatmap · UF</Chip>}>
            <div style={{aspectRatio: "1.05", borderRadius: 10, overflow: "hidden", background: "var(--surface-sunk)", border: "1px solid var(--hairline-soft)"}}>
              <BrazilMapSVG markers={m.mapRegioes}/>
            </div>
          </Card>
          <Card title="Principais compradores">
            <div style={{display: "flex", flexDirection: "column", gap: 4}}>
              {m.compradores.map((c, i) => (
                <BarRow key={i} label={c.name} value={c.val} max={m.compradores[0].val}
                  sub={fmtBRL(c.val, true)} color={i === 0 ? "var(--orange)" : "var(--deep-blue)"}/>
              ))}
            </div>
          </Card>
        </div>

        {/* Top contratos */}
        <Card title="Maiores contratos publicados" extra={<>
            <Button kind="ghost" size="sm">Ver todos (214)</Button>
          </>} style={{marginBottom: 16}}>
          <div style={{border: "1px solid var(--hairline-soft)", borderRadius: 8, overflow: "hidden"}}>
            <div style={{display: "grid", gridTemplateColumns: "44px 2.6fr 1.2fr 120px 140px 56px",
              padding: "8px 14px", background: "var(--rail)", fontSize: 11,
              color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".04em", fontWeight: 600}}>
              <span>#</span><span>Objeto</span><span>Órgão</span><span>Modalidade</span><span style={{textAlign:"right"}}>Valor</span><span>UF</span>
            </div>
            {m.topContratos.map((c, i) => (
              <div key={i} style={{display: "grid", gridTemplateColumns: "44px 2.6fr 1.2fr 120px 140px 56px",
                padding: "11px 14px", borderTop: "1px solid var(--hairline-soft)", fontSize: 13, alignItems: "center"}}>
                <span className="mono" style={{color: "var(--ink-3)"}}>{String(i+1).padStart(2,"0")}</span>
                <span style={{color: "var(--ink-1)", fontWeight: 500}}>{c.obj}</span>
                <span style={{color: "var(--ink-2)"}}>{c.org}</span>
                <span><Chip tone="blue">{c.mod}</Chip></span>
                <span className="mono" style={{textAlign: "right", fontWeight: 600}}>{fmtBRL(c.val, true)}</span>
                <span className="mono" style={{color: "var(--ink-2)"}}>{c.uf}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Concorrentes */}
        <Card title="Ranking de concorrentes" extra={<>
            <Chip tone="orange" icon={<Icon.starFill size={10}/>}>Meu perfil</Chip>
            <Button kind="ghost" size="sm" icon={<Icon.download size={13}/>}/>
          </>}>
          <div style={{border: "1px solid var(--hairline-soft)", borderRadius: 8, overflow: "hidden"}}>
            <div style={{display: "grid", gridTemplateColumns: "56px 2fr 100px 120px 100px 120px",
              padding: "8px 14px", background: "var(--rail)", fontSize: 11,
              color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".04em", fontWeight: 600}}>
              <span>Rank</span><span>Fornecedor</span><span style={{textAlign:"right"}}>Share</span><span>Evolução 12m</span><span style={{textAlign:"right"}}>Vitórias</span><span style={{textAlign:"right"}}></span>
            </div>
            {m.concorrentes.map((c, i) => (
              <div key={i} style={{display: "grid", gridTemplateColumns: "56px 2fr 100px 120px 100px 120px",
                padding: "11px 14px", borderTop: "1px solid var(--hairline-soft)", fontSize: 13, alignItems: "center",
                background: c.highlight ? "var(--orange-50)" : "var(--paper)"}}>
                <span style={{
                  display: "inline-flex", width: 26, height: 26, borderRadius: 6,
                  background: i === 0 ? "var(--deep-blue)" : "var(--surface-sunk)",
                  color: i === 0 ? "white" : "var(--ink-2)",
                  alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 12,
                }}>{i+1}</span>
                <div>
                  <div style={{fontWeight: 600, color: "var(--ink-1)"}}>{c.name} {c.highlight && <Chip tone="orange">você</Chip>}</div>
                </div>
                <span className="mono" style={{textAlign: "right", fontWeight: 600}}>{c.share}%</span>
                <span><Sparkline data={c.trend} w={100} h={26} color={c.highlight ? "var(--orange)" : "var(--deep-blue)"}/></span>
                <span className="mono" style={{textAlign: "right"}}>{c.wins}</span>
                <span style={{textAlign: "right"}}><Button kind="ghost" size="sm" icon={<Icon.chevRight size={13}/>}/></span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Inspector removed — content moved to left sidebar */}
    </div>
      </div>
  );
}

window.ModeMercado = ModeMercado;
