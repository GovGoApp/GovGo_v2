// Shell: top bar, left rail, search rail (Busca), activity rail (Favoritos/Histórico/Boletins)
const { useState: uS } = React;

function TopBar({mode}) {
  const [theme, setTheme] = uS(() => {
    if (typeof document === 'undefined') return 'light';
    return document.documentElement.getAttribute('data-theme') || localStorage.getItem('govgo-theme') || 'light';
  });
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
      <div style={{display: "flex", alignItems: "center", gap: 10}}>
        <Icon.logo size={26}/>
        <div style={{display: "flex", alignItems: "baseline", gap: 6}}>
          <span style={{fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, color: "var(--deep-blue)", letterSpacing: "-0.01em"}}>GovGo</span>
          <span style={{fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 12, color: "var(--ink-3)"}}>v2</span>
        </div>
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

// ---------- Search rail (LEFT in Busca mode) ----------
function SearchRail() {
  const [filtersOpen, setFiltersOpen] = uS(false);
  const [query, setQuery] = uS("alimentação hospitalar");
  const [semantic, setSemantic] = uS(true);

  const handleBuscar = () => {
    if (window._govgoBuscaSearch) {
      window._govgoBuscaSearch(query, semantic ? "semantic" : "keyword");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleBuscar();
  };

  return (
    <aside style={{
      minWidth: 0, background: "var(--rail)", borderRight: "1px solid var(--hairline)",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* Busca box */}
      <div style={{background: "var(--paper)", borderBottom: "1px solid var(--hairline)"}}>
        <div style={{padding: "12px 10px 10px"}}>
          <div style={{fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, margin: "0 2px 8px"}}>MODO BUSCA</div>
          <Input size="sm" placeholder="Buscar editais, objeto, palavra-chave…" icon={<Icon.search size={14}/>} value={query} onChange={setQuery} onKeyDown={handleKeyDown}/>
          <div style={{display: "flex", gap: 6, marginTop: 8, alignItems: "center"}}>
            <Chip tone={semantic ? "blue" : "default"} icon={<Icon.sparkle size={10}/>} onClick={() => setSemantic(!semantic)}>IA semântica</Chip>
            <Chip>sinônimos</Chip>
            <span style={{flex: 1}}/>
            <Button kind="primary" size="sm" onClick={handleBuscar}>Buscar</Button>
          </div>
        </div>
      </div>

      <div style={{flex: 1, overflowY: "auto", paddingBottom: 12}}>
        {/* Filters — single collapsible box, smaller font */}
        <div style={{margin: "10px 10px 0", background: "var(--paper)", border: "1px solid var(--hairline)", borderRadius: 8, fontSize: 11.5}}>
          <button onClick={() => setFiltersOpen(!filtersOpen)} style={{
            all: "unset", cursor: "pointer", width: "100%", boxSizing: "border-box",
            display: "flex", alignItems: "center", gap: 7, padding: "8px 10px",
            color: "var(--ink-2)",
          }}>
            <Icon.filter size={12}/>
            <span style={{fontSize: 11.5, fontWeight: 600, letterSpacing: ".02em"}}>Filtros</span>
            <Chip tone="orange">5 ativos</Chip>
            <span style={{flex: 1}}/>
            <span style={{transform: filtersOpen ? "rotate(180deg)" : "none", transition: "transform 140ms", color: "var(--ink-3)", display: "inline-flex"}}>
              <Icon.chevDown size={12}/>
            </span>
          </button>
          {filtersOpen && (
            <div style={{borderTop: "1px solid var(--hairline-soft)", padding: "8px 10px 10px", fontSize: 11.5}}>
              <div style={{display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10}}>
                <Chip tone="blue" onRemove={()=>{}}>Status: Aberto</Chip>
                <Chip tone="blue" onRemove={()=>{}}>UF: CE, SP, BA</Chip>
                <Chip tone="orange" onRemove={()=>{}}>sim ≥ 0.85</Chip>
                <Chip tone="blue" onRemove={()=>{}}>R$ &gt; 100k</Chip>
                <Chip tone="blue" onRemove={()=>{}}>Vence em 60d</Chip>
              </div>

              <div style={{fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 600, margin: "6px 0 5px"}}>Geografia</div>
              <div style={{display: "flex", flexWrap: "wrap", gap: 4}}>
                {["SP","RJ","MG","CE","BA","DF","RS","PR","GO","PE","SC","AM","PA","MT"].map(uf => (
                  <Chip key={uf} tone={["SP","CE","BA"].includes(uf) ? "blue" : "default"}>{uf}</Chip>
                ))}
              </div>

              <div style={{fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 600, margin: "12px 0 5px"}}>Valor estimado</div>
              <div style={{fontSize: 11, color: "var(--ink-3)"}}>R$ 100.000 — R$ 500.000.000</div>
              <div style={{background: "var(--surface-sunk)", height: 5, borderRadius: 3, position: "relative", marginTop: 6}}>
                <div style={{position: "absolute", left: "18%", right: "22%", top: 0, bottom: 0, background: "var(--deep-blue)", borderRadius: 3}}/>
                <div style={{position: "absolute", left: "calc(18% - 5px)", top: -3, width: 11, height: 11, borderRadius: "50%", background: "var(--paper)", border: "2px solid var(--deep-blue)"}}/>
                <div style={{position: "absolute", left: "calc(78% - 5px)", top: -3, width: 11, height: 11, borderRadius: "50%", background: "var(--paper)", border: "2px solid var(--deep-blue)"}}/>
              </div>

              <div style={{fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 600, margin: "12px 0 5px"}}>Modalidade</div>
              <div style={{display: "flex", flexDirection: "column", gap: 2, fontSize: 11.5}}>
                {["Pregão Eletrônico (142)","Concorrência (38)","Dispensa (24)","RDC (10)"].map((m, i) => (
                  <label key={i} style={{display: "flex", alignItems: "center", gap: 7, padding: "2px 0"}}>
                    <input type="checkbox" defaultChecked={i<2}/> <span>{m}</span>
                  </label>
                ))}
              </div>

              <div style={{fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 600, margin: "12px 0 5px"}}>Palavras-chave</div>
              <div style={{display: "flex", flexDirection: "column", gap: 6}}>
                <Input size="sm" placeholder="Inclusão" icon={<Icon.plus size={12}/>} value="alimentação, refeições"/>
                <Input size="sm" placeholder="Exclusão" icon={<Icon.close size={12}/>} value="consultoria, ti"/>
              </div>

              <div style={{fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 600, margin: "12px 0 5px"}}>Aderência ao perfil</div>
              <Input size="sm" mono placeholder="CNPJ" value="14.024.944/0001-03"/>

              <div style={{display: "flex", gap: 6, marginTop: 10}}>
                <Button kind="ghost" size="sm" style={{flex: 1, justifyContent: "center"}}>Limpar</Button>
                <Button kind="primary" size="sm" style={{flex: 2, justifyContent: "center"}}>Aplicar</Button>
              </div>
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
