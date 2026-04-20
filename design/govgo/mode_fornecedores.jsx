// Mode: Fornecedores — CNPJ-centric
const { useState: uSf } = React;

function BrazilMapSVG({markers}) {
  return (
    <svg viewBox="0 0 420 420" style={{width: "100%", height: "100%", display: "block"}}>
      <defs>
        <linearGradient id="sea" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#E0EAF9"/>
          <stop offset="1" stopColor="#C9D8F0"/>
        </linearGradient>
      </defs>
      <rect width="420" height="420" fill="url(#sea)"/>
      {/* Stylized Brazil outline — simplified blob */}
      <path d="M70 120 Q80 90 110 80 Q150 65 190 75 Q230 62 260 78 Q300 80 325 110 Q355 140 360 180 Q370 220 340 255 Q330 295 295 320 Q275 360 225 355 Q190 370 155 345 Q120 340 100 305 Q70 285 65 245 Q55 205 60 170 Q62 140 70 120 Z"
            fill="#F6F7FA" stroke="#9AA5BD" strokeWidth="1.2"/>
      {/* state hairlines — suggestive not accurate */}
      <g stroke="#D8DCE5" strokeWidth="0.8" fill="none">
        <path d="M70 200 L360 180"/>
        <path d="M100 140 L310 135"/>
        <path d="M140 260 L330 245"/>
        <path d="M180 320 L290 310"/>
        <path d="M220 70 L225 360"/>
      </g>
      {markers && markers.map((m, i) => (
        <g key={i} transform={`translate(${m.x*420},${m.y*420})`}>
          <circle r={Math.sqrt(m.val) * 2.1 + 4} fill="var(--orange)" opacity=".18"/>
          <circle r={Math.sqrt(m.val) * 0.9 + 3} fill="var(--orange)" opacity=".55"/>
          <circle r="3" fill="white" stroke="var(--orange)" strokeWidth="2"/>
          <text x="0" y="-9" fontSize="9" fontFamily="JetBrains Mono" fill="var(--ink-1)" textAnchor="middle" fontWeight="600">{m.uf}</text>
        </g>
      ))}
    </svg>
  );
}
window.BrazilMapSVG = BrazilMapSVG;

function FornecedoresTabs({tabs, active, onActivate, onClose, onNew}) {
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
            <span style={{color: "var(--deep-blue)", display: "inline-flex"}}><Icon.building size={12}/></span>
            <span className="mono" style={{fontSize: 11, color: isActive ? "var(--deep-blue)" : "var(--ink-3)"}}>{t.cnpj.slice(0, 10)}…</span>
            <span style={{overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140}}>{t.title}</span>
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

function ModeFornecedores() {
  const [tab, setTab] = uSf("perfil");
  const [query, setQuery] = uSf("Padaria Real");
  const [showDisambig, setShowDisambig] = uSf(true);
  const p = DATA.fornecedorPerfil;

  const [fTabs, setFTabs] = uSf([
    { id: "f1", cnpj: "14.024.944/0001-03", title: "Vila Vitória Mercantil" },
    { id: "f2", cnpj: "09.330.414/0001-08", title: "Nordeste Alimentos" },
  ]);
  const [activeFTab, setActiveFTab] = uSf("f1");
  const closeFTab = (id) => {
    const next = fTabs.filter(t => t.id !== id);
    setFTabs(next);
    if (activeFTab === id && next[0]) setActiveFTab(next[0].id);
  };
  const openFTab = (cnpj, title) => {
    const existing = fTabs.find(t => t.cnpj === cnpj);
    if (existing) { setActiveFTab(existing.id); return; }
    const id = "f" + (Date.now() % 100000);
    setFTabs([...fTabs, { id, cnpj, title }]);
    setActiveFTab(id);
  };
  const addNewFTab = () => {
    const id = "f" + (Date.now() % 100000);
    setFTabs([...fTabs, { id, cnpj: "— — —", title: "Nova consulta" }]);
    setActiveFTab(id);
  };

  const candidates = [
    { cnpj: "41.189.420/0001-45", name: "PADARIA REAL DO BRASIL S.A.",         city: "Curitiba/PR",       porte: "Grande",  cnae: "Fabricação de produtos de padaria", contratos: 82, valor: "R$ 24,1 mi", score: 98 },
    { cnpj: "08.774.906/0001-75", name: "PADARIA REAL COMERCIAL LTDA",         city: "Aparecida/GO",      porte: "Médio",   cnae: "Comércio varejista de pães",        contratos: 31, valor: "R$ 6,8 mi",  score: 91 },
    { cnpj: "05.798.383/0001-79", name: "REAL PÃES E BOLOS INDUSTRIAIS LTDA",  city: "Belo Horizonte/MG", porte: "Médio",   cnae: "Fabricação de produtos de padaria", contratos: 19, valor: "R$ 3,4 mi",  score: 84 },
    { cnpj: "34.354.674/0001-06", name: "PANIFICADORA REAL DO SUL LTDA",       city: "Porto Alegre/RS",   porte: "Pequeno", cnae: "Fabricação de produtos de padaria", contratos: 12, valor: "R$ 1,1 mi",  score: 78 },
    { cnpj: "61.699.567/0001-92", name: "REAL DISTRIBUIDORA DE ALIMENTOS",     city: "São Paulo/SP",      porte: "Médio",   cnae: "Comércio atacadista de alimentos",  contratos: 44, valor: "R$ 9,2 mi",  score: 72 },
    { cnpj: "22.110.337/0001-08", name: "PADARIA E CONFEITARIA REAL — ME",     city: "Natal/RN",          porte: "Micro",   cnae: "Comércio varejista de pães",        contratos: 2,  valor: "R$ 180 mil", score: 66 },
  ];

  return (
    <div style={{display: "grid", gridTemplateColumns: "320px 1fr", height: "100%", overflow: "hidden"}}>
      <aside style={{borderRight: "1px solid var(--hairline)", background: "var(--paper)", overflowY: "auto"}}>
        <div style={{padding: "12px 10px 10px", borderBottom: "1px solid var(--hairline)"}}>
          <div style={{fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, margin: "0 2px 8px"}}>MODO EMPRESAS</div>
          <Input size="sm" placeholder="CNPJ ou nome da empresa…" icon={<Icon.building size={14}/>} value={query} onChange={v => { setQuery(v); setShowDisambig(true); }}/>
          <div style={{display: "flex", gap: 6, marginTop: 8, alignItems: "center"}}>
            <Chip tone="blue" icon={<Icon.sparkle size={10}/>}>busca fuzzy</Chip>
            <span style={{flex: 1}}/>
            <Button kind="primary" size="sm" onClick={() => setShowDisambig(true)}>Buscar</Button>
          </div>

          {/* Inline disambiguation — shown when query is a name, not a CNPJ */}
          {showDisambig && query && !/^\d/.test(query.trim()) && (
            <div style={{
              marginTop: 10, background: "var(--paper)",
              border: "1px solid var(--hairline)", borderRadius: 10,
              boxShadow: "var(--shadow-md)", overflow: "hidden",
            }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 12px", background: "var(--orange-50)",
                borderBottom: "1px solid var(--orange-100)",
              }}>
                <Icon.alert size={12} style={{color: "var(--orange-700)"}}/>
                <span style={{fontSize: 11.5, fontWeight: 600, color: "var(--orange-700)"}}>
                  6 empresas com nome similar
                </span>
                <span style={{flex: 1}}/>
                <button onClick={() => setShowDisambig(false)} style={{all: "unset", cursor: "pointer", color: "var(--ink-3)", display: "inline-flex"}}><Icon.close size={11}/></button>
              </div>
              <div style={{maxHeight: 340, overflowY: "auto"}}>
                {candidates.map((c, i) => (
                  <button key={c.cnpj} onClick={() => {
                    openFTab(c.cnpj, c.name.split(" ").slice(0, 3).join(" "));
                    setShowDisambig(false);
                  }}
                    style={{all: "unset", cursor: "pointer", display: "block", width: "100%", boxSizing: "border-box",
                      padding: "10px 12px", borderBottom: i < candidates.length - 1 ? "1px solid var(--hairline-soft)" : "none",
                      transition: "background 100ms"}}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--surface-sunk)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{display: "flex", alignItems: "center", gap: 6, marginBottom: 3}}>
                      <span style={{fontSize: 12.5, fontWeight: 600, color: "var(--ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1}}>{c.name}</span>
                      <span className="mono" style={{fontSize: 10.5, fontWeight: 600, color: c.score >= 90 ? "var(--orange-700)" : "var(--ink-3)", flexShrink: 0}}>{c.score}%</span>
                    </div>
                    <div className="mono" style={{fontSize: 11, color: "var(--deep-blue)", marginBottom: 3}}>{c.cnpj}</div>
                    <div style={{fontSize: 10.5, color: "var(--ink-3)", display: "flex", gap: 6, alignItems: "center"}}>
                      <span>{c.city}</span>
                      <span>·</span>
                      <span>{c.porte}</span>
                      <span>·</span>
                      <span style={{overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{c.contratos} contratos · {c.valor}</span>
                    </div>
                  </button>
                ))}
              </div>
              <div style={{padding: "6px 12px", borderTop: "1px solid var(--hairline-soft)", background: "var(--surface-sunk)", fontSize: 10.5, color: "var(--ink-3)", display: "flex", gap: 8, alignItems: "center"}}>
                <Icon.filter size={10}/>
                <span>Refinar por UF, porte ou CNAE</span>
              </div>
            </div>
          )}
        </div>
        <div style={{padding: "0 10px 10px", display: "flex", flexDirection: "column", gap: 6}}>
          <div style={{fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600, padding: "6px 4px 4px"}}>Recentes</div>
          {DATA.historicoCNPJ.map((c, i) => (
            <div key={i} style={{padding: "10px 12px", borderRadius: 8,
              background: c.active ? "var(--orange-50)" : "var(--paper)",
              border: `1px solid ${c.active ? "var(--orange-100)" : "var(--hairline)"}`, cursor: "pointer"}}>
              <div className="mono" style={{fontSize: 12, fontWeight: 600, color: c.active ? "var(--orange-700)" : "var(--deep-blue)"}}>{c.cnpj}</div>
              <div style={{fontSize: 12, color: "var(--ink-2)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{c.name}</div>
              <div style={{fontSize: 11, color: "var(--ink-3)", marginTop: 2, display: "flex", gap: 6}}>
                <span>{c.city}</span><span>·</span><span>Últ. {c.last}</span>
              </div>
            </div>
          ))}
        </div>
      </aside>
      <div style={{display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden"}}>
        <FornecedoresTabs tabs={fTabs} active={activeFTab}
          onActivate={setActiveFTab} onClose={closeFTab} onNew={addNewFTab}/>
      <div style={{overflowY: "auto", padding: "20px 24px 40px", flex: 1}}>
        {/* Hero / profile card */}
        <div style={{
          background: "var(--paper)", border: "1px solid var(--hairline)", borderRadius: 12,
          boxShadow: "var(--shadow-sm)", overflow: "hidden", marginBottom: 18,
        }}>
          <div style={{padding: "20px 24px", background: "linear-gradient(135deg, #003A70 0%, #0B4A8A 60%, #1F6FD4 100%)", color: "white", display: "flex", gap: 20, alignItems: "center"}}>
            <div style={{
              width: 64, height: 64, borderRadius: 14,
              background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.2)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em",
            }}>VV</div>
            <div style={{flex: 1, minWidth: 0}}>
              <div style={{display: "flex", gap: 8, alignItems: "center", marginBottom: 4}}>
                <span className="mono" style={{fontSize: 12, color: "rgba(255,255,255,.7)"}}>{p.cnpj}</span>
                <span style={{width: 3, height: 3, borderRadius: 99, background: "rgba(255,255,255,.35)"}}/>
                <span style={{fontSize: 12, color: "rgba(255,255,255,.7)"}}>ATIVA desde {p.abertura}</span>
                <span style={{width: 3, height: 3, borderRadius: 99, background: "rgba(255,255,255,.35)"}}/>
                <span style={{fontSize: 12, color: "rgba(255,255,255,.7)"}}>Porte {p.porte}</span>
              </div>
              <h2 style={{margin: 0, fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em"}}>{p.razao}</h2>
              <div style={{fontSize: 13, color: "rgba(255,255,255,.75)", marginTop: 4}}>{p.cnae} · {p.city}/{p.uf}</div>
            </div>
            <div style={{display: "flex", gap: 8}}>
              <Button kind="default" size="sm" icon={<Icon.external size={13}/>}>Receita</Button>
              <Button kind="default" size="sm" icon={<Icon.download size={13}/>}>Snapshot</Button>
              <Button kind="primary" size="sm" icon={<Icon.starFill size={13}/>}>Favoritar</Button>
            </div>
          </div>

          <div style={{display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderTop: "1px solid var(--hairline-soft)"}}>
            {p.stats.map((k, i) => (
              <div key={i} style={{padding: "14px 20px", borderLeft: i ? "1px solid var(--hairline-soft)" : "none"}}>
                <div style={{fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".04em", fontWeight: 600}}>{k.label}</div>
                <div style={{display: "flex", alignItems: "baseline", gap: 6, marginTop: 4}}>
                  <span className="display" style={{fontSize: 22, fontWeight: 600, color: "var(--ink-1)", fontVariantNumeric: "tabular-nums"}}>{k.value}</span>
                </div>
                <div style={{display: "flex", alignItems: "center", gap: 8, marginTop: 4, fontSize: 11.5, color: "var(--ink-3)"}}>
                  {k.delta != null && (
                    <span style={{color: k.delta >= 0 ? "var(--green)" : "var(--risk)", fontWeight: 600}}>
                      {k.delta >= 0 ? "+" : ""}{k.delta}%
                    </span>
                  )}
                  {k.trend && <Sparkline data={k.trend} color={k.delta >= 0 ? "var(--green)" : "var(--risk)"} w={70} h={20}/>}
                  {k.sub && <span>{k.sub}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onChange={setTab}
          tabs={[
            { id: "perfil",     icon: <Icon.building size={13}/>, label: "Perfil" },
            { id: "contratos",  icon: <Icon.file size={13}/>,     label: "Contratos", count: 24 },
            { id: "editais",    icon: <Icon.search size={13}/>,   label: "Editais aderentes", count: 141 },
            { id: "mapa",       icon: <Icon.map size={13}/>,      label: "Mapa" },
            { id: "snapshot",   icon: <Icon.brief size={13}/>,    label: "Snapshot" },
          ]}
          style={{marginBottom: 14}}
        />

        {tab === "perfil" && (
          <div style={{display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14}}>
            <Card title="Atuação e categorias">
              <div style={{display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14}}>
                {p.atividades.map(a => <Chip key={a} tone="blue">{a}</Chip>)}
              </div>
              <div style={{display: "flex", flexDirection: "column", gap: 6}}>
                <BarRow label="Saúde hospitalar" value={72} max={100} sub="72% receita" color="var(--deep-blue)"/>
                <BarRow label="Escolar" value={18} max={100} sub="18%" color="var(--deep-blue)"/>
                <BarRow label="Administrativo" value={7} max={100} sub="7%" color="var(--deep-blue)"/>
                <BarRow label="Outros" value={3} max={100} sub="3%" color="var(--deep-blue)"/>
              </div>
            </Card>

            <Card title="Contato & conformidade">
              <div style={{display: "flex", flexDirection: "column", gap: 10, fontSize: 13}}>
                <div style={{display: "flex", justifyContent: "space-between"}}><span style={{color:"var(--ink-3)"}}>Telefone</span><span className="mono">{p.contatos.fone}</span></div>
                <div style={{display: "flex", justifyContent: "space-between"}}><span style={{color:"var(--ink-3)"}}>E-mail</span><span className="mono" style={{fontSize: 12}}>{p.contatos.email}</span></div>
                <div style={{display: "flex", justifyContent: "space-between"}}><span style={{color:"var(--ink-3)"}}>Regularidade fiscal</span><Chip tone="green" icon={<Icon.check size={10}/>}>Regular</Chip></div>
                <div style={{display: "flex", justifyContent: "space-between"}}><span style={{color:"var(--ink-3)"}}>CND federal</span><span style={{color: "var(--green)", fontWeight: 600}}>Vigente · 12/07/2026</span></div>
                <div style={{display: "flex", justifyContent: "space-between"}}><span style={{color:"var(--ink-3)"}}>Sócios</span><span>3 registrados</span></div>
                <div style={{display: "flex", justifyContent: "space-between"}}><span style={{color:"var(--ink-3)"}}>CEIS / CNEP</span><Chip tone="green">Sem registros</Chip></div>
              </div>
            </Card>

            <Card title="Timeline de atividade" style={{gridColumn: "span 2"}}>
              <div style={{position: "relative", padding: "8px 10px"}}>
                <div style={{position: "absolute", left: 16, top: 12, bottom: 12, width: 2, background: "var(--hairline)"}}/>
                {[
                  { when: "20/04/2026", t: "Proposta vencedora", desc: "Pregão 08261/2026 — Hospital Geral de Fortaleza", tone: "orange" },
                  { when: "02/04/2026", t: "Contrato assinado", desc: "C-4432 · R$ 2,34 mi · Hosp. Univ. UFES", tone: "green" },
                  { when: "18/03/2026", t: "Edital favoritado", desc: "Merenda escolar — Governo de Goiás", tone: "blue" },
                  { when: "05/03/2026", t: "Ampliação de CNAE", desc: "Registrada atividade 5620-1/02 — serviços de alimentação", tone: "blue" },
                ].map((t, i) => (
                  <div key={i} style={{display: "flex", gap: 14, padding: "8px 0", position: "relative"}}>
                    <span style={{width: 10, height: 10, borderRadius: 99, marginLeft: 11, marginTop: 6,
                      background: t.tone === "orange" ? "var(--orange)" : t.tone === "green" ? "var(--green)" : "var(--deep-blue)",
                      border: "2px solid var(--paper)", boxShadow: "0 0 0 2px var(--hairline)", zIndex: 1}}/>
                    <div style={{width: 96, fontSize: 12, color: "var(--ink-3)"}} className="mono">{t.when}</div>
                    <div style={{flex: 1}}>
                      <div style={{fontSize: 13.5, fontWeight: 600, color: "var(--ink-1)"}}>{t.t}</div>
                      <div style={{fontSize: 12.5, color: "var(--ink-3)"}}>{t.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {tab === "contratos" && (
          <Card title="Contratos históricos" extra={<>
              <Chip tone="green">Vigentes: 3</Chip>
              <Chip>Encerrados: 21</Chip>
              <Button kind="ghost" size="sm" icon={<Icon.download size={13}/>}/>
            </>}>
            <div style={{border: "1px solid var(--hairline)", borderRadius: 8, overflow: "hidden"}}>
              <div style={{display: "grid", gridTemplateColumns: "90px 2fr 140px 140px 120px 120px 110px",
                padding: "8px 14px", background: "var(--rail)", borderBottom: "1px solid var(--hairline-soft)",
                fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".04em", fontWeight: 600}}>
                <span>ID</span><span>Órgão</span><span>Modalidade</span><span style={{textAlign:"right"}}>Valor</span><span>Início</span><span>Fim</span><span>Status</span>
              </div>
              {DATA.fornecedorContratos.map(c => (
                <div key={c.id} style={{display: "grid", gridTemplateColumns: "90px 2fr 140px 140px 120px 120px 110px",
                  padding: "11px 14px", borderBottom: "1px solid var(--hairline-soft)", fontSize: 13, alignItems: "center"}}>
                  <span className="mono" style={{fontSize: 12, color: "var(--deep-blue)", fontWeight: 600}}>{c.id}</span>
                  <span style={{color: "var(--ink-1)"}}>{c.org}</span>
                  <span style={{color: "var(--ink-2)"}}>{c.mod}</span>
                  <span className="mono" style={{textAlign: "right", fontWeight: 600}}>{fmtBRL(c.val).replace("R$ ", "R$\u202F")}</span>
                  <span className="mono" style={{color: "var(--ink-2)", fontSize: 12}}>{c.start}</span>
                  <span className="mono" style={{color: "var(--ink-2)", fontSize: 12}}>{c.end}</span>
                  <span>{c.status === "vigente" ? <Chip tone="green">Vigente</Chip> : <Chip>Encerrado</Chip>}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {tab === "editais" && (
          <Card title="Editais aderentes ao perfil" extra={<Chip tone="orange">141 · score ≥ 0.80</Chip>}>
            <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10}}>
              {DATA.editais.slice(0, 6).map(e => (
                <div key={e.rank} style={{padding: 14, border: "1px solid var(--hairline)", borderRadius: 10, background: "var(--paper)"}}>
                  <div style={{display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8}}>
                    <div style={{fontSize: 13.5, fontWeight: 600, color: "var(--ink-1)", flex: 1, lineHeight: 1.3}}>{e.org}</div>
                    <ScoreDot score={e.sim}/>
                  </div>
                  <div style={{fontSize: 12, color: "var(--ink-3)", marginTop: 4}}>{e.mun}/{e.uf} · {e.modal}</div>
                  <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10}}>
                    <span className="mono" style={{fontSize: 12.5, fontWeight: 600}}>{e.val === 0 ? "—" : fmtBRL(e.val, true)}</span>
                    <Chip tone="orange">Vence {e.end}</Chip>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {tab === "mapa" && (
          <Card title="Presença geográfica" extra={<>
              <Chip tone="blue" icon={<Icon.check size={10}/>}>Contratos</Chip>
              <Chip tone="orange" icon={<Icon.check size={10}/>}>Editais</Chip>
              <Chip>Matriz</Chip>
            </>}>
            <div style={{display: "grid", gridTemplateColumns: "1fr 240px", gap: 14}}>
              <div style={{aspectRatio: "1", border: "1px solid var(--hairline)", borderRadius: 10, overflow: "hidden", background: "var(--paper)"}}>
                <BrazilMapSVG markers={DATA.mercado.mapRegioes}/>
              </div>
              <div style={{display: "flex", flexDirection: "column", gap: 10, fontSize: 13}}>
                <div style={{fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".04em", fontWeight: 600}}>Legenda de score</div>
                {[["≥ 0.90","#0B4A8A"],["0.80–0.90","#1F6FD4"],["0.70–0.80","#FF5722"],["0.60–0.70","#EA8B4A"],["< 0.60","#B4481A"]].map(([l,c]) => (
                  <div key={l} style={{display: "flex", alignItems: "center", gap: 10}}>
                    <span style={{width: 14, height: 14, borderRadius: 4, background: c}}/>
                    <span className="mono" style={{fontSize: 12}}>{l}</span>
                  </div>
                ))}
                <div style={{height: 1, background: "var(--hairline)", margin: "6px 0"}}/>
                <div style={{fontSize: 12, color: "var(--ink-3)"}}>Raio do marcador reflete <b style={{color:"var(--ink-1)"}}>valor contratado acumulado</b>.</div>
              </div>
            </div>
          </Card>
        )}

        {tab === "snapshot" && (
          <Card title="Snapshot do fornecedor" extra={<Button kind="ghost" size="sm" icon={<Icon.download size={13}/>}>PDF</Button>}>
            <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16}}>
              <div>
                <div style={{fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".04em", fontWeight: 600, marginBottom: 8}}>Resumo executivo</div>
                <p style={{fontSize: 13.5, lineHeight: 1.6, margin: 0}}>
                  Vila Vitória é um <b>fornecedor regional consolidado no ES</b>, com forte aderência a editais de alimentação hospitalar. Tem crescimento constante de carteira (+22% em 12m) e boa regularidade fiscal, sem registros em CEIS ou CNEP.
                </p>
              </div>
              <div>
                <div style={{fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".04em", fontWeight: 600, marginBottom: 8}}>Riscos</div>
                <ul style={{margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7, color: "var(--ink-2)"}}>
                  <li>Concentração geográfica em ES/MG (88% dos contratos).</li>
                  <li>Dependência de 3 compradores principais.</li>
                  <li>Contrato C-4118 (R$ 4,8 mi) vence em 35 dias.</li>
                </ul>
              </div>
            </div>
          </Card>
        )}
      </div>
      </div>

    </div>
  );
}

window.ModeFornecedores = ModeFornecedores;
