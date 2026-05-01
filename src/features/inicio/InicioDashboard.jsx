function InicioDashboard({onMode}) {
  const go = (mode) => onMode && onMode(mode);
  const auth = window.useGovGoAuth ? window.useGovGoAuth() : null;
  const favoritesState = window.useGovGoFavorites ? window.useGovGoFavorites() : null;
  const historyState = window.useGovGoHistory ? window.useGovGoHistory() : null;
  const favoritos = favoritesState?.favorites || [];
  const historyItems = historyState?.history || [];
  const [quickQuery, setQuickQuery] = React.useState("");

  const displayName = getInicioDisplayName(auth);
  const greeting = getInicioGreeting();
  const favoriteCountLabel = favoritesState?.status === "loading" ? "..." : String(favoritos.length);
  const favoriteDelta = favoritesState?.status === "loading" ? "carregando" : "ativos";
  const favoriteStats = getInicioFavoriteStats(favoritos);
  const historyStats = getInicioHistoryStats(historyItems, historyState?.status);
  const updatedAtLabel = getInicioUpdatedAtLabel();
  const hasVisibleFavorites = auth?.status === "authenticated" && favoritesState?.status !== "loading" && favoritos.length > 0;

  const favoritePlace = (favorite) => {
    const cityUf = [favorite.municipality || favorite.mun, favorite.uf].filter(Boolean).join("/");
    return [favorite.organization || favorite.org, cityUf].filter(Boolean).join(" - ") || "-";
  };

  const openSearch = (query) => {
    const q = String(query || quickQuery || "").trim();
    if (!q) {
      go("busca");
      return;
    }
    const form = window.GovGoSearchContracts?.createDefaultSearchForm
      ? { ...window.GovGoSearchContracts.createDefaultSearchForm(), query: q }
      : { query: q, searchType: "semantic", searchApproach: "direct", limit: 10 };
    if (window._govgoBuscaSearch) {
      window._govgoBuscaSearch(q, form);
    } else if (window.GovGoSearchUiAdapter?.setPendingSearch) {
      window.GovGoSearchUiAdapter.setPendingSearch(q, form);
    }
    go("busca");
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
      title: "Busca semantica de editais",
      desc: "Ache oportunidades por palavra, objeto ou CNPJ. A IA do GovGo expande sinonimos e classifica por aderencia.",
      icon: <Icon.search size={22}/>,
      stat: historyStats.latestLabel, accent: "orange",
    },
    {
      id: "fornecedores", label: "Empresas", tag: "Perfilar",
      title: "Modo Empresa",
      desc: "Perfil completo, contratos em vigor, risco e historico competitivo de qualquer fornecedor.",
      icon: <Icon.building size={22}/>,
      stat: "gvg_select pendente", accent: "blue",
    },
    {
      id: "mercado", label: "Radar", tag: "Explorar", isNew: true,
      title: "Radar de mercado",
      desc: "Visao macro: volume por segmento, concentracao, sazonalidade e share dos players em tempo real.",
      icon: <Icon.chart size={22}/>,
      stat: "servico de mercado pendente", accent: "orange",
    },
    {
      id: "relatorios", label: "Relatorios", tag: "Consultar",
      title: "Consultas em linguagem natural",
      desc: "Pergunte em portugues, a GovGo gera SQL, executa e devolve a tabela pronta para exportar.",
      icon: <Icon.terminal size={22}/>,
      stat: "gvg_report pendente", accent: "blue",
    },
  ];

  const kpis = [
    { label: "Resultados da ultima busca", value: historyStats.latestCountLabel, delta: historyStats.latestDelta, tone: "orange", icon: <Icon.search size={14}/> },
    { label: "Vence em 7 dias", value: favoriteStats.expiringWeekLabel, delta: favoriteStats.expiringDelta, tone: "risk", icon: <Icon.alert size={14}/> },
    { label: "Favoritos acompanhados", value: favoriteCountLabel, delta: favoriteDelta, tone: "blue", icon: <Icon.bookmark size={14}/> },
    { label: "Valor favoritos", value: favoriteStats.pipelineLabel, delta: favoriteStats.pipelineDelta, tone: "green", icon: <Icon.trend size={14}/> },
  ];

  const recentSearches = historyState ? historyItems : (DATA.historico || []);
  const recentes = DATA.relatorios || [];
  const latestHistoryTags = recentSearches.slice(0, 4);

  const accentBg = (a) => a === "orange" ? "var(--orange)" : a === "blue" ? "var(--deep-blue)" : a === "green" ? "var(--green)" : "var(--ink-2)";
  const accentTint = (a) => a === "orange" ? "var(--orange-50)" : a === "blue" ? "var(--blue-50)" : a === "green" ? "var(--green-50)" : "var(--surface-sunk)";
  const accentText = (a) => a === "orange" ? "var(--orange-700)" : a === "blue" ? "var(--deep-blue)" : a === "green" ? "var(--green)" : "var(--ink-2)";
  const toneFg = (t) => t === "orange" ? "var(--orange-700)" : t === "risk" ? "var(--risk)" : t === "blue" ? "var(--deep-blue)" : t === "green" ? "var(--green)" : "var(--ink-2)";
  const toneBg = (t) => t === "orange" ? "var(--orange-50)" : t === "risk" ? "var(--risk-50)" : t === "blue" ? "var(--blue-50)" : t === "green" ? "var(--green-50)" : "var(--surface-sunk)";

  return (
    <div style={{overflowY: "auto", height: "100%", padding: "24px 36px 60px", background: "var(--workspace)"}}>
      <div style={{
        display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 18, alignItems: "stretch",
        marginBottom: 12,
      }}>
        <div style={{
          borderRadius: 14, overflow: "hidden", position: "relative",
          background: "linear-gradient(135deg, #002247 0%, #003A70 55%, #0B4A8A 100%)",
          padding: "28px 32px", color: "white",
        }}>
          <div style={{position: "absolute", inset: 0, opacity: 0.08, pointerEvents: "none",
            background: "radial-gradient(600px 280px at 85% 0%, var(--orange), transparent 60%)"}}/>
          <div style={{position: "relative", zIndex: 1}}>
            <div style={{fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.15, marginBottom: 8}}>
              {greeting}, {displayName}.
            </div>
            <div style={{fontSize: 14.5, color: "rgba(255,255,255,.78)", maxWidth: 540, lineHeight: 1.55}}>
              Voce tem <span style={{color: "#FFB28C", fontWeight: 600}}>{favoritos.length} favoritos</span> acompanhados e <span style={{color: "#FFB28C", fontWeight: 600}}>{favoriteStats.expiringWeekLabel}</span> vencendo nesta semana.
            </div>

            <form onSubmit={(event) => { event.preventDefault(); openSearch(); }} style={{
              marginTop: 22, background: "rgba(255,255,255,.08)",
              border: "1px solid rgba(255,255,255,.14)", borderRadius: 12,
              padding: "10px 12px 10px 14px", display: "flex", alignItems: "center", gap: 10, maxWidth: 560,
              backdropFilter: "blur(4px)",
            }}>
              <Icon.search size={16} style={{color: "rgba(255,255,255,.7)"}}/>
              <input
                value={quickQuery}
                onChange={(event) => setQuickQuery(event.target.value)}
                placeholder="Buscar editais, CNPJs, objetos, orgaos..."
                style={{
                  all: "unset", flex: 1, fontSize: 14, color: "white",
                  fontFamily: "var(--font-body)",
                }}
              />
              <button type="submit" style={{
                all: "unset", cursor: "pointer", padding: "7px 14px", borderRadius: 7,
                background: "var(--orange)", color: "white", fontWeight: 600, fontSize: 13,
              }}>Buscar</button>
            </form>

            <div style={{display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap"}}>
              {latestHistoryTags.map((historyItem, index) => {
                const label = getInicioHistoryLabel(historyItem);
                return (
                <button key={historyItem.promptId || historyItem.id || index} title={label} onClick={() => historyState ? openHistory(historyItem) : openSearch(label)} style={{
                  all: "unset", cursor: "pointer",
                  fontSize: 11.5, padding: "4px 10px", borderRadius: 99, maxWidth: 160,
                  background: "rgba(255,255,255,.07)", color: "rgba(255,255,255,.82)",
                  border: "1px solid rgba(255,255,255,.12)", whiteSpace: "nowrap",
                  overflow: "hidden", textOverflow: "ellipsis",
                }}>{label}</button>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{
          background: "var(--paper)", border: "1px solid var(--hairline)", borderRadius: 14,
          padding: 20, display: "flex", flexDirection: "column",
        }}>
          <div style={{display: "flex", alignItems: "center", gap: 8, marginBottom: 14}}>
            <Icon.sparkle size={15} style={{color: "var(--orange)"}}/>
            <div style={{fontFamily: "var(--font-display)", fontSize: 13.5, fontWeight: 600, color: "var(--ink-1)"}}>Resumo do seu dia</div>
            <span style={{flex: 1}}/>
            <span style={{fontSize: 11, color: "var(--ink-3)"}}>atualizado {updatedAtLabel}</span>
          </div>
          <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10}}>
            {kpis.map((k) => (
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

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12,
        marginBottom: 12,
      }}>
        {modeCards.map((m) => (
          <button key={m.id} onClick={() => go(m.id)} style={{
            all: "unset", cursor: "pointer", display: "block",
            background: "var(--paper)", border: "1px solid var(--hairline)", borderRadius: 14,
            padding: "14px 16px 12px", minHeight: 94, position: "relative", overflow: "hidden",
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
            <div style={{
              position: "absolute", top: -48, right: -42, width: 120, height: 120, borderRadius: "50%",
              background: accentTint(m.accent), opacity: 0.6, pointerEvents: "none",
            }}/>
            <div style={{position: "relative", display: "flex", alignItems: "flex-start", gap: 12}}>
              <div style={{
                flexShrink: 0, width: 40, height: 40, borderRadius: 10,
                background: accentBg(m.accent), color: "white",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 2px 6px rgba(0,0,0,.15)",
              }}>{m.icon}</div>
              <div style={{flex: 1, minWidth: 0, paddingRight: 14}}>
                <div style={{display: "flex", alignItems: "center", gap: 6, marginBottom: 2}}>
                  <span style={{fontSize: 9.5, letterSpacing: ".08em", textTransform: "uppercase", color: accentText(m.accent), fontWeight: 700}}>{m.tag}</span>
                  {m.isNew && <span style={{fontSize: 8.5, padding: "1px 4px", background: "var(--orange)", color: "white", borderRadius: 3, fontWeight: 700, letterSpacing: ".04em"}}>NEW</span>}
                </div>
                <div style={{
                  fontFamily: "var(--font-display)", fontSize: 15.5, fontWeight: 700,
                  color: "var(--ink-1)", letterSpacing: "-0.01em", lineHeight: 1.15,
                  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}>{m.title}</div>
              </div>
              <Icon.chevRight size={16} style={{color: "var(--ink-3)", flexShrink: 0}}/>
            </div>
            <div style={{
              position: "relative", marginTop: 12, fontSize: 11.5, color: "var(--ink-2)",
              lineHeight: 1.35, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{m.desc}</div>
          </button>
        ))}
      </div>

      <div style={{display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 18, alignItems: "start"}}>
        <div style={{
          background: "var(--paper)",
          border: hasVisibleFavorites ? "1px solid rgba(255, 87, 34, .62)" : "1px solid var(--hairline)",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: hasVisibleFavorites ? "0 0 0 1px rgba(255, 87, 34, .08), var(--shadow-xs)" : "none",
        }}>
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
                gridTemplateColumns: "minmax(0, 1fr) 82px 44px",
                padding: "11px 18px", gap: 10, width: "100%", boxSizing: "border-box",
                borderBottom: i < Math.min(favoritos.length, 5) - 1 ? "1px solid var(--hairline-soft)" : "none",
                alignItems: "center",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--rail)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <div style={{minWidth: 0}}>
                  <div style={{fontSize: 12.5, fontWeight: 600, color: "var(--ink-1)", lineHeight: 1.35, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{f.title}</div>
                  <div style={{fontSize: 11, color: "var(--ink-3)", lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>{favoritePlace(f)}</div>
                </div>
                <div style={{fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--ink-2)", textAlign: "right", whiteSpace: "nowrap"}}>{f.date || f.closingDateLabel || "-"}</div>
                <div style={{textAlign: "right"}}>
                  <Chip tone="blue">{f.uf || "PNCP"}</Chip>
                </div>
              </button>
            ))}
          </div>
        </div>

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

          <div style={{background: "var(--paper)", border: "1px solid var(--hairline)", borderRadius: 12, overflow: "hidden"}}>
            <div style={{padding: "12px 16px", borderBottom: "1px solid var(--hairline-soft)", display: "flex", alignItems: "center", gap: 8}}>
              <Icon.terminal size={14} style={{color: "var(--ink-2)"}}/>
              <div style={{fontFamily: "var(--font-display)", fontSize: 13.5, fontWeight: 600, color: "var(--ink-1)"}}>Relatorios NL -> SQL</div>
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
  );
}

function getInicioDisplayName(auth) {
  const source = String(auth?.displayName || auth?.user?.name || auth?.user?.email || "Usuario").trim();
  const clean = source.includes("@") ? source.split("@")[0] : source;
  const parts = clean.split(/\s+/).filter(Boolean);
  const selected = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : [parts[0] || "Usuario"];
  return selected
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getInicioHistoryLabel(historyItem) {
  return String(historyItem?.title || historyItem?.query || historyItem?.q || historyItem?.text || "Busca recente").trim();
}

function getInicioGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function getInicioUpdatedAtLabel() {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

function getInicioFavoriteDateMeta(favorite) {
  const date = favorite?.date || favorite?.closingDateLabel || favorite?.closingDate || favorite?.data_encerramento_proposta || favorite?.raw?.data_encerramento_proposta || "";
  if (window.GovGoDeadline?.getMeta) {
    return window.GovGoDeadline.getMeta(date);
  }
  return { days: null };
}

function getInicioFavoriteValue(favorite) {
  const candidates = [
    favorite?.estimatedValue,
    favorite?.estimated_value,
    favorite?.valor,
    favorite?.valor_total_estimado,
    favorite?.valor_total_homologado,
    favorite?.raw?.valor_total_estimado,
    favorite?.raw?.valor_total_homologado,
  ];
  for (const value of candidates) {
    const numberValue = Number(value);
    if (Number.isFinite(numberValue) && numberValue > 0) {
      return numberValue;
    }
  }
  return 0;
}

function getInicioFavoriteStats(favoritos) {
  const items = Array.isArray(favoritos) ? favoritos : [];
  const expiringWeek = items.filter((favorite) => {
    const days = getInicioFavoriteDateMeta(favorite).days;
    return Number.isFinite(Number(days)) && Number(days) >= 0 && Number(days) <= 7;
  }).length;
  const pipelineValue = items.reduce((total, favorite) => total + getInicioFavoriteValue(favorite), 0);
  return {
    expiringWeek,
    expiringWeekLabel: String(expiringWeek),
    expiringDelta: expiringWeek ? "atencao" : "ok",
    pipelineValue,
    pipelineLabel: formatInicioMoneyCompact(pipelineValue),
    pipelineDelta: pipelineValue ? "estimado" : "sem valor",
  };
}

function getInicioHistoryStats(historyItems, status) {
  const items = Array.isArray(historyItems) ? historyItems : [];
  const latest = items[0] || {};
  const count = Number(latest.resultCount ?? latest.hits ?? 0) || 0;
  return {
    latestCountLabel: status === "loading" ? "..." : String(count),
    latestDelta: items.length ? "ultima busca" : "sem historico",
    latestLabel: items.length ? `${count} resultados · ${latest.title || latest.query || "ultima busca"}` : "sem buscas recentes",
  };
}

function formatInicioMoneyCompact(value) {
  const numberValue = Number(value) || 0;
  if (numberValue <= 0) {
    return "R$ 0";
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(numberValue);
}

window.InicioDashboard = InicioDashboard;
