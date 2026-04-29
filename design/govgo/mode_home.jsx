// Mode: Home / Dashboard — landing page with paths to all modes
function ModeHome({onMode}) {
  const go = (m) => onMode && onMode(m);
  const auth = window.useGovGoAuth ? window.useGovGoAuth() : null;
  const favoritesState = window.useGovGoFavorites ? window.useGovGoFavorites() : null;
  const historyState = window.useGovGoHistory ? window.useGovGoHistory() : null;
  const favoritos = favoritesState?.favorites || [];
  const historyItems = historyState?.history || [];
  const favoriteCountLabel = favoritesState?.status === "loading" ? "..." : String(favoritos.length);
  const favoriteDelta = favoritesState?.status === "loading" ? "carregando" : "ativos";

  const favoritePlace = (favorite) => {
    const cityUf = [favorite.municipality || favorite.mun, favorite.uf].filter(Boolean).join("/");
    return [favorite.organization || favorite.org, cityUf].filter(Boolean).join(" - ") || "-";
  };

  const openFavorite = (favorite) => {
    if (typeof openFavoriteInBusca === "function") {
      openFavoriteInBusca(favorite, (routeKey) => go(routeKey));
      return;
    }
    go("busca");
  };

  const openHistory = (historyItem) => {
    if (typeof openHistoryInBusca === "function") {
      openHistoryInBusca(historyItem, (routeKey) => go(routeKey));
      return;
    }
    go("busca");
  };

  const modeCards = [
    {
      id: "busca", label: "Busca", tag: "Descobrir",
      title: "Busca semântica de editais",
      desc: "Ache oportunidades por palavra, objeto ou CNPJ. A IA do GovGo expande sinônimos e classifica por aderência.",
      icon: <Icon.search size={22}/>,
      stat: "214 aderentes · alimentação hospitalar", accent: "orange",
    },
    {
      id: "fornecedores", label: "Análise", tag: "Perfilar",
      title: "Análise de fornecedores & CNPJs",
      desc: "Perfil completo, contratos em vigor, risco e histórico competitivo de qualquer fornecedor.",
      icon: <Icon.building size={22}/>,
      stat: "12.408 fornecedores indexados", accent: "blue",
    },
    {
      id: "mercado", label: "Mercado", tag: "Explorar", isNew: true,
      title: "Inteligência de mercado",
      desc: "Visão macro: volume por segmento, concentração, sazonalidade e share dos players em tempo real.",
      icon: <Icon.chart size={22}/>,
      stat: "R$ 284,6 bi em 12 meses · +7,4%", accent: "orange",
    },
    {
      id: "relatorios", label: "Relatórios", tag: "Consultar",
      title: "Consultas em linguagem natural",
      desc: "Pergunte em português, a GovGo gera SQL, executa e devolve a tabela pronta para exportar.",
      icon: <Icon.terminal size={22}/>,
      stat: "14 consultas salvas · NL → SQL", accent: "blue",
    },
  ];

  const kpis = [
    { label: "Editais aderentes abertos", value: "214", delta: "+12 hoje", tone: "orange", icon: <Icon.search size={14}/> },
    { label: "Vence em 7 dias",            value: "18",  delta: "atenção",  tone: "risk",   icon: <Icon.alert size={14}/> },
    { label: "Favoritos acompanhados",     value: favoriteCountLabel,  delta: favoriteDelta, tone: "blue", icon: <Icon.bookmark size={14}/> },
    { label: "Valor pipeline estimado",    value: "R$ 86,4 mi", delta: "+8,2%", tone: "green", icon: <Icon.trend size={14}/> },
  ];

  const recentSearches = historyState ? historyItems : (DATA.historico || []);
  const recentes = DATA.relatorios || [];

  const accentBg = (a) => a === "orange" ? "var(--orange)" : a === "blue" ? "var(--deep-blue)" : a === "green" ? "var(--green)" : "var(--ink-2)";
  const accentTint = (a) => a === "orange" ? "var(--orange-50)" : a === "blue" ? "var(--blue-50)" : a === "green" ? "var(--green-50)" : "var(--surface-sunk)";
  const accentText = (a) => a === "orange" ? "var(--orange-700)" : a === "blue" ? "var(--deep-blue)" : a === "green" ? "var(--green)" : "var(--ink-2)";
  const toneFg = (t) => t === "orange" ? "var(--orange-700)" : t === "risk" ? "var(--risk)" : t === "blue" ? "var(--deep-blue)" : t === "green" ? "var(--green)" : "var(--ink-2)";
  const toneBg = (t) => t === "orange" ? "var(--orange-50)" : t === "risk" ? "var(--risk-50)" : t === "blue" ? "var(--blue-50)" : t === "green" ? "var(--green-50)" : "var(--surface-sunk)";

  return (
    <div style={{overflowY: "auto", height: "100%", padding: "24px 36px 60px", background: "var(--workspace)"}}>

      {/* Hero */}
      <div style={{
        display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 18, alignItems: "stretch",
        marginBottom: 22,
      }}>
        <div style={{
          borderRadius: 14, overflow: "hidden", position: "relative",
          background: "linear-gradient(135deg, #002247 0%, #003A70 55%, #0B4A8A 100%)",
          padding: "28px 32px", color: "white",
        }}>
          <div style={{position: "absolute", inset: 0, opacity: 0.08, pointerEvents: "none",
            background: "radial-gradient(600px 280px at 85% 0%, var(--orange), transparent 60%)"}}/>
          <div style={{position: "relative", zIndex: 1}}>
            <div style={{fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,.65)", fontWeight: 600, marginBottom: 10}}>GovGo · v2 beta</div>
            <div style={{fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.15, marginBottom: 8}}>
              Bom dia, Rodrigo.
            </div>
            <div style={{fontSize: 14.5, color: "rgba(255,255,255,.78)", maxWidth: 540, lineHeight: 1.55}}>
              Você tem <span style={{color: "#FFB28C", fontWeight: 600}}>18 editais aderentes</span> vencendo nesta semana e <span style={{color: "#FFB28C", fontWeight: 600}}>R$ 86,4 mi</span> em pipeline acompanhado.
            </div>

            {/* Quick search */}
            <div style={{
              marginTop: 22, background: "rgba(255,255,255,.08)",
              border: "1px solid rgba(255,255,255,.14)", borderRadius: 12,
              padding: "10px 12px 10px 14px", display: "flex", alignItems: "center", gap: 10, maxWidth: 560,
              backdropFilter: "blur(4px)",
            }}>
              <Icon.search size={16} style={{color: "rgba(255,255,255,.7)"}}/>
              <input placeholder="Buscar editais, CNPJs, objetos, órgãos…" style={{
                all: "unset", flex: 1, fontSize: 14, color: "white",
                fontFamily: "var(--font-body)",
              }}/>
              <span style={{fontFamily: "var(--font-mono)", fontSize: 11, padding: "3px 7px", borderRadius: 5, background: "rgba(255,255,255,.12)", color: "rgba(255,255,255,.78)"}}>⌘K</span>
              <button onClick={() => go("busca")} style={{
                all: "unset", cursor: "pointer", padding: "7px 14px", borderRadius: 7,
                background: "var(--orange)", color: "white", fontWeight: 600, fontSize: 13,
              }}>Buscar</button>
            </div>

            <div style={{display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap"}}>
              {["alimentação hospitalar", "merenda escolar", "locação de veículos", "serviços de limpeza"].map(s => (
                <button key={s} onClick={() => go("busca")} style={{
                  all: "unset", cursor: "pointer",
                  fontSize: 11.5, padding: "4px 10px", borderRadius: 99,
                  background: "rgba(255,255,255,.07)", color: "rgba(255,255,255,.82)",
                  border: "1px solid rgba(255,255,255,.12)",
                }}>{s}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Pipeline mini */}
        <div style={{
          background: "var(--paper)", border: "1px solid var(--hairline)", borderRadius: 14,
          padding: 20, display: "flex", flexDirection: "column",
        }}>
          <div style={{display: "flex", alignItems: "center", gap: 8, marginBottom: 14}}>
            <Icon.sparkle size={15} style={{color: "var(--orange)"}}/>
            <div style={{fontFamily: "var(--font-display)", fontSize: 13.5, fontWeight: 600, color: "var(--ink-1)"}}>Resumo do seu dia</div>
            <span style={{flex: 1}}/>
            <span style={{fontSize: 11, color: "var(--ink-3)"}}>atualizado 14:02</span>
          </div>
          <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10}}>
            {kpis.map(k => (
              <div key={k.label} style={{
                padding: "12px 12px", borderRadius: 10, background: "var(--surface-sunk)",
                border: "1px solid var(--hairline-soft)",
              }}>
                <div style={{display: "flex", alignItems: "center", gap: 6, color: toneFg(k.tone), marginBottom: 4}}>
                  <span style={{display: "inline-flex", width: 22, height: 22, borderRadius: 6, background: toneBg(k.tone), alignItems: "center", justifyContent: "center"}}>{k.icon}</span>
                  <span style={{fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 600}}>{k.delta}</span>
                </div>
                <div style={{fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--ink-1)", letterSpacing: "-0.01em", lineHeight: 1.1}}>{k.value}</div>
                <div style={{fontSize: 11.5, color: "var(--ink-2)", marginTop: 2, lineHeight: 1.3}}>{k.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modes — BIG cards */}
      <div style={{marginBottom: 10, display: "flex", alignItems: "baseline", gap: 10}}>
        <h3 style={{fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 600, color: "var(--ink-1)", margin: 0}}>Por onde começar</h3>
        <span style={{fontSize: 12, color: "var(--ink-3)"}}>quatro modos · um clique</span>
      </div>
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14,
        marginBottom: 28,
      }}>
        {modeCards.map(m => (
          <button key={m.id} onClick={() => go(m.id)} style={{
            all: "unset", cursor: "pointer", display: "block",
            background: "var(--paper)", border: "1px solid var(--hairline)", borderRadius: 14,
            padding: "20px 20px 18px", position: "relative", overflow: "hidden",
            boxShadow: "var(--shadow-xs)", transition: "transform 140ms, box-shadow 140ms, border-color 140ms",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "var(--shadow-md)";
            e.currentTarget.style.borderColor = accentBg(m.accent);
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = "";
            e.currentTarget.style.boxShadow = "var(--shadow-xs)";
            e.currentTarget.style.borderColor = "var(--hairline)";
          }}>
            {/* decorative accent corner */}
            <div style={{
              position: "absolute", top: -40, right: -40, width: 140, height: 140, borderRadius: "50%",
              background: accentTint(m.accent), opacity: 0.6, pointerEvents: "none",
            }}/>
            <div style={{position: "relative", display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14}}>
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: accentBg(m.accent), color: "white",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 2px 6px rgba(0,0,0,.15)",
              }}>{m.icon}</div>
              <div style={{flex: 1, minWidth: 0}}>
                <div style={{display: "flex", alignItems: "center", gap: 6, marginBottom: 3}}>
                  <span style={{fontSize: 10.5, letterSpacing: ".08em", textTransform: "uppercase", color: accentText(m.accent), fontWeight: 700}}>{m.tag}</span>
                  {m.isNew && <span style={{fontSize: 9, padding: "1px 5px", background: "var(--orange)", color: "white", borderRadius: 3, fontWeight: 700, letterSpacing: ".04em"}}>NEW</span>}
                </div>
                <div style={{fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600, color: "var(--ink-1)", letterSpacing: "-0.01em", lineHeight: 1.25}}>{m.title}</div>
              </div>
              <Icon.chevRight size={16} style={{color: "var(--ink-3)"}}/>
            </div>
            <div style={{position: "relative", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5, marginBottom: 14, minHeight: 60}}>
              {m.desc}
            </div>
            <div style={{
              position: "relative", fontFamily: "var(--font-mono)", fontSize: 11.5,
              color: "var(--ink-3)", paddingTop: 12, borderTop: "1px solid var(--hairline-soft)",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{width: 6, height: 6, borderRadius: 99, background: accentBg(m.accent)}}/>
              {m.stat}
            </div>
          </button>
        ))}
      </div>

      {/* Two columns: Favorites + Recent searches + SQL saved */}
      <div style={{display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18}}>

        {/* Favoritos */}
        <div style={{background: "var(--paper)", border: "1px solid var(--hairline)", borderRadius: 12, overflow: "hidden"}}>
          <div style={{padding: "14px 18px", borderBottom: "1px solid var(--hairline-soft)", display: "flex", alignItems: "center", gap: 8}}>
            <Icon.starFill size={14} style={{color: "var(--orange)"}}/>
            <div style={{fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 600, color: "var(--ink-1)"}}>Editais favoritos</div>
            <span style={{flex: 1}}/>
            <button onClick={() => go("busca")} style={{
              all: "unset", cursor: "pointer", fontSize: 12, color: "var(--deep-blue)", fontWeight: 500,
              display: "inline-flex", alignItems: "center", gap: 4,
            }}>Ver todos <Icon.chevRight size={12}/></button>
          </div>
          <div>
            {auth?.status !== "authenticated" && (
              <div style={{padding: "18px", fontSize: 13, color: "var(--ink-3)", lineHeight: 1.45}}>
                Entre para carregar seus editais favoritos.
              </div>
            )}
            {auth?.status === "authenticated" && favoritesState?.status === "loading" && (
              <div style={{padding: "18px", fontSize: 13, color: "var(--ink-3)"}}>
                Carregando favoritos...
              </div>
            )}
            {auth?.status === "authenticated" && favoritesState?.status !== "loading" && favoritos.length === 0 && (
              <div style={{padding: "18px", fontSize: 13, color: "var(--ink-3)", lineHeight: 1.45}}>
                Nenhum edital favorito ainda.
              </div>
            )}
            {favoritos.slice(0, 5).map((f, i) => (
              <button key={f.pncpId || f.id} onClick={() => openFavorite(f)} style={{
                all: "unset", cursor: "pointer", display: "grid",
                gridTemplateColumns: "1fr 140px 130px",
                padding: "13px 18px", gap: 12, width: "100%", boxSizing: "border-box",
                borderBottom: i < Math.min(favoritos.length, 5) - 1 ? "1px solid var(--hairline-soft)" : "none",
                alignItems: "center",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--rail)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <div style={{minWidth: 0}}>
                  <div style={{fontSize: 13.5, fontWeight: 600, color: "var(--ink-1)", lineHeight: 1.3, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{f.title}</div>
                  <div style={{fontSize: 11.5, color: "var(--ink-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{favoritePlace(f)}</div>
                </div>
                <div style={{fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-2)"}}>{f.date || f.closingDateLabel || "-"}</div>
                <div style={{textAlign: "right"}}>
                  <Chip tone="blue">{f.uf || "PNCP"}</Chip>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Activity column: recent searches + saved SQL */}
        <div style={{display: "flex", flexDirection: "column", gap: 18}}>

          <div style={{background: "var(--paper)", border: "1px solid var(--hairline)", borderRadius: 12, overflow: "hidden"}}>
            <div style={{padding: "12px 16px", borderBottom: "1px solid var(--hairline-soft)", display: "flex", alignItems: "center", gap: 8}}>
              <Icon.history size={14} style={{color: "var(--ink-2)"}}/>
              <div style={{fontFamily: "var(--font-display)", fontSize: 13.5, fontWeight: 600, color: "var(--ink-1)"}}>Buscas recentes</div>
              <span style={{flex: 1}}/>
              <button onClick={() => go("busca")} style={{all: "unset", cursor: "pointer", fontSize: 11.5, color: "var(--deep-blue)", fontWeight: 500}}>Todas</button>
            </div>
            <div>
              {historyState && auth?.status !== "authenticated" && (
                <div style={{padding: "16px", fontSize: 12.5, color: "var(--ink-3)"}}>
                  Entre para carregar suas buscas recentes.
                </div>
              )}
              {historyState && auth?.status === "authenticated" && historyState.status === "loading" && (
                <div style={{padding: "16px", fontSize: 12.5, color: "var(--ink-3)"}}>
                  Carregando historico...
                </div>
              )}
              {historyState && auth?.status === "authenticated" && historyState.status !== "loading" && recentSearches.length === 0 && (
                <div style={{padding: "16px", fontSize: 12.5, color: "var(--ink-3)"}}>
                  Nenhuma busca recente ainda.
                </div>
              )}
              {recentSearches.slice(0, 4).map((h, i) => (
                <button key={h.promptId || h.id || i} onClick={() => historyState ? openHistory(h) : go("busca")} style={{
                  all: "unset", cursor: "pointer", display: "flex", alignItems: "center",
                  padding: "10px 16px", gap: 10, width: "100%", boxSizing: "border-box",
                  borderTop: i === 0 ? "none" : "1px solid var(--hairline-soft)",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--rail)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <Icon.search size={12} style={{color: "var(--ink-3)"}}/>
                  <span style={{flex: 1, fontSize: 12.5, color: "var(--ink-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{h.title || h.q || h.query || h.text}</span>
                  <span className="mono" style={{fontSize: 11, color: "var(--ink-3)"}}>{h.resultCount ?? h.hits ?? 0}</span>
                  <span style={{fontSize: 11, color: "var(--ink-3)", width: 60, textAlign: "right"}}>{h.when || h.createdAtLabel || ""}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Relatórios recentes */}
          <div style={{background: "var(--paper)", border: "1px solid var(--hairline)", borderRadius: 12, overflow: "hidden"}}>
            <div style={{padding: "12px 16px", borderBottom: "1px solid var(--hairline-soft)", display: "flex", alignItems: "center", gap: 8}}>
              <Icon.terminal size={14} style={{color: "var(--ink-2)"}}/>
              <div style={{fontFamily: "var(--font-display)", fontSize: 13.5, fontWeight: 600, color: "var(--ink-1)"}}>Relatórios NL → SQL</div>
              <span style={{flex: 1}}/>
              <button onClick={() => go("relatorios")} style={{all: "unset", cursor: "pointer", fontSize: 11.5, color: "var(--deep-blue)", fontWeight: 500}}>Abrir</button>
            </div>
            <div>
              {(recentes || []).slice(0, 3).map((r, i) => (
                <button key={i} onClick={() => go("relatorios")} style={{
                  all: "unset", cursor: "pointer", display: "block",
                  padding: "10px 16px", width: "100%", boxSizing: "border-box",
                  borderTop: i === 0 ? "none" : "1px solid var(--hairline-soft)",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--rail)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <div style={{fontSize: 12.5, color: "var(--ink-1)", fontWeight: 500, lineHeight: 1.35, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{r.q}</div>
                  <div style={{fontSize: 11, color: "var(--ink-3)", marginTop: 3, display: "flex", gap: 8}}>
                    <span>{r.when}</span><span>·</span><span>{r.rows} linhas</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
