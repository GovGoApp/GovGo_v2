// Edital detail drawer — slides over from the right within the main column
const { useState: uSod, useEffect: uEod, useRef: uRod } = React;

function EditalDetail({ edital }) {
  const [tab, setTab] = uSod("resumo");
  const [titleFontSize, setTitleFontSize] = uSod(20);
  const [itemsState, setItemsState] = uSod({ status: "idle", items: [], error: "" });
  const [docsState, setDocsState] = uSod({ status: "idle", documents: [], error: "" });
  const titleRef = uRod(null);
  const itemsCacheRef = uRod({});
  const docsCacheRef = uRod({});
  if (!edital) return null;

  const e = edital;
  const raw = e.raw || {};
  const details = e.details || raw.details || {};
  const firstFilled = (...values) => {
    for (const value of values) {
      if (value !== null && value !== undefined && value !== "") return value;
    }
    return "";
  };
  const pickDetail = (...keys) => {
    for (const key of keys) {
      const value = details[key] ?? raw[key] ?? e[key];
      if (value !== null && value !== undefined && value !== "") return value;
    }
    return "";
  };
  const rank = Math.max(1, Number(e.rank || 1));
  const rankIndex = Math.min(9, rank - 1);
  const today = new Date();
  const endParts = String(e.end || "").split("/");
  const endDate = endParts.length === 3 ? new Date(endParts.reverse().join("-")) : new Date(e.end || "");
  const daysLeft = Number.isNaN(endDate.getTime()) ? 0 : Math.max(0, Math.round((endDate - today) / 86400000));
  const urgent = daysLeft <= 10;

  // Fake derived data (consistent per rank)
  const pregoeiro = ["Ana Lúcia Ferreira", "Marco Sobral", "Júlia Cardoso", "Heitor Monteiro", "Paulo R. Lima", "Ivana Barreto", "Teresa C. Alves", "André L. Corrêa", "Fernanda M. Ribeiro", "Lucas F. Nogueira"][e.rank - 1];
  const fallbackProcesso = `${(2026).toString()}/${String(e.rank * 137).padStart(6, "0")}`;
  const fallbackEdital = `PE-${String(e.rank * 23).padStart(4, "0")}/2026`;
  const numProcesso = String(firstFilled(
    pickDetail("numero_processo", "numeroProcesso", "processo"),
    fallbackProcesso
  ));
  const editalNumeroBase = firstFilled(
    pickDetail(
      "numero_instrumento_convocatorio",
      "numeroInstrumentoConvocatorio",
      "numero_edital",
      "numeroEdital",
      "numero_compra",
      "numeroCompra",
      "sequencial_compra",
      "sequencialCompra"
    )
  );
  const editalAno = String(firstFilled(pickDetail("ano_compra", "anoCompra"), "")).trim();
  const numEdital = String(
    editalNumeroBase
      ? (String(editalNumeroBase).includes("/") || !editalAno ? editalNumeroBase : `${editalNumeroBase}/${editalAno}`)
      : fallbackEdital
  );
  const pncpId = String(firstFilled(
    pickDetail("numero_controle_pncp", "numeroControlePNCP", "numerocontrolepncp", "numero_controle", "id"),
    e.itemId,
    e.id
  ));
  const uasg = String(firstFilled(
    pickDetail("unidade_orgao_codigo_unidade", "codigo_unidade", "uasg"),
    String(925000 + e.rank * 13)
  ));
  const esfera = ["Estadual", "Estadual", "Municipal", "Municipal", "Municipal", "Federal", "Municipal", "Federal", "Municipal", "Distrital"][e.rank - 1];
  const sourceLink = String(firstFilled(
    pickDetail("link_sistema_origem", "linkSistemaOrigem", "linksistemaorigem", "url_origem", "urlOrigem", "link"),
    raw.links?.origem
  ));
  const fonte = String(firstFilled(
    pickDetail("fonte", "nome_fonte", "source", "origem"),
    ["PNCP", "ComprasNet", "BLL", "Licitações-e", "PNCP", "ComprasNet", "PNCP", "ComprasNet", "PNCP", "ComprasNet"][e.rank - 1]
  ));

  const objeto = `Registro de preços para aquisição de gêneros alimentícios destinados ao fornecimento de refeições hospitalares e dietas especiais, conforme especificações constantes no Termo de Referência — Anexo I do edital, com entrega parcelada pelo período de 12 (doze) meses.`;

  const objetoReal = e.objeto || details.objeto_compra || e.title || objeto;
  const qtyFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });
  const formatItemQty = (value) => {
    if (value === null || value === undefined || value === "") return "\u2014";
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return String(value);
    return qtyFormatter.format(numeric);
  };
  const formatItemMoney = (value) => {
    if (value === null || value === undefined || value === "") return "\u2014";
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "\u2014";
    return fmtBRL(numeric).replace("R$ ", "R$\u202F");
  };
  const itemRows = Array.isArray(itemsState.items)
    ? itemsState.items.map((item, index) => ({
        numero: item.row_number || index + 1,
        descricao: String(item.descricao_item || ""),
        quantidade: formatItemQty(item.quantidade_item),
        valorUnitario: formatItemMoney(item.valor_unitario_estimado),
        valorTotal: formatItemMoney(item.valor_total_estimado),
      }))
    : [];
  const itemCount = itemsState.status === "success" ? itemRows.length : (Number(e.items) || 0);

  const docs = [
    { name: "Edital completo.pdf", size: "4,2 MB", kind: "edital", date: "28/03/2026", pages: 82 },
    { name: "Termo de Referência — Anexo I.pdf", size: "1,8 MB", kind: "tr", date: "28/03/2026", pages: 34 },
    { name: "Minuta do Contrato — Anexo II.pdf", size: "612 KB", kind: "contrato", date: "28/03/2026", pages: 18 },
    { name: "Planilha de quantitativos.xlsx", size: "86 KB", kind: "planilha", date: "28/03/2026" },
    { name: "Estudo técnico preliminar.pdf", size: "920 KB", kind: "etp", date: "14/03/2026", pages: 22 },
    { name: "Pesquisa de preços.pdf", size: "1,1 MB", kind: "pesq", date: "20/03/2026", pages: 14 },
  ];

  const history = [
    { date: "28/03/2026", event: "Publicação do edital", who: "Pregoeiro", tone: "blue" },
    { date: "02/04/2026", event: "Esclarecimento #1 respondido", who: "Comissão", tone: "default", link: "Item 3.4 — dietas hospitalares" },
    { date: "05/04/2026", event: "Impugnação recebida", who: "Licitante", tone: "orange", link: "Contestação do lote 6" },
    { date: "08/04/2026", event: "Impugnação rejeitada", who: "Comissão", tone: "default" },
    { date: "10/04/2026", event: "Aviso de retificação", who: "Órgão", tone: "orange", link: "Anexo I-A incluído" },
    { date: "14/04/2026", event: "Abertura das propostas", who: "Sistema", tone: "green", future: true },
  ];

  const concorrencia = [
    { cnpj: "14.024.944/0001-03", name: "Vila Vitória Mercantil do Brasil", score: 0.93, hist: 24, win: 0.58 },
    { cnpj: "08.217.761/0001-55", name: "Nutriplus Alimentos Hospitalares", score: 0.88, hist: 18, win: 0.41 },
    { cnpj: "22.554.103/0001-78", name: "Casa da Dieta Distribuidora", score: 0.81, hist: 11, win: 0.37 },
    { cnpj: "31.889.027/0001-12", name: "Prodiet Farmacêutica S.A.", score: 0.77, hist: 42, win: 0.49 },
  ];

  uEod(() => {
    const fitTitle = () => {
      const element = titleRef.current;
      if (!element) return;

      const maxSize = 20;
      const minSize = 16;
      let nextSize = maxSize;

      element.style.fontSize = `${maxSize}px`;
      while (nextSize > minSize && element.scrollWidth > element.clientWidth) {
        nextSize -= 0.5;
        element.style.fontSize = `${nextSize}px`;
      }

      setTitleFontSize(nextSize);
    };

    const frameId = window.requestAnimationFrame(fitTitle);
    window.addEventListener("resize", fitTitle);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", fitTitle);
    };
  }, [e.org]);

  uEod(() => {
    if (tab !== "itens") {
      return;
    }

    if (!pncpId) {
      setItemsState({
        status: "error",
        items: [],
        error: "Este edital nao possui ID PNCP disponivel para carregar os itens.",
      });
      return;
    }

    const cachedItems = itemsCacheRef.current[pncpId];
    if (Array.isArray(cachedItems)) {
      setItemsState({
        status: "success",
        items: cachedItems,
        error: "",
      });
      return;
    }

    const loadEditalItems = window.GovGoSearchApi && window.GovGoSearchApi.loadEditalItems;
    if (typeof loadEditalItems !== "function") {
      setItemsState({
        status: "error",
        items: [],
        error: "A API de itens do edital nao esta disponivel.",
      });
      return;
    }

    let cancelled = false;
    setItemsState({
      status: "loading",
      items: [],
      error: "",
    });

    loadEditalItems({ pncpId, limit: 500 })
      .then((payload) => {
        if (cancelled) return;
        const nextItems = Array.isArray(payload?.items) ? payload.items : [];
        itemsCacheRef.current[pncpId] = nextItems;
        setItemsState({
          status: "success",
          items: nextItems,
          error: "",
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setItemsState({
          status: "error",
          items: [],
          error: error?.message || "Nao foi possivel carregar os itens deste edital.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [tab, pncpId]);

  return (
    <div style={{
      background: "var(--workspace)",
      display: "flex", flexDirection: "column",
      height: "100%", minHeight: 0, overflow: "hidden",
    }}>
      {/* Scroll body */}
      <div style={{flex: 1, overflowY: "auto"}}>
        <div style={{maxWidth: 1080, margin: "0 auto"}}>

        {/* Hero */}
        <div style={{padding: "18px 24px 14px", background: "var(--paper)", borderBottom: "1px solid var(--hairline)"}}>
          <div style={{display: "flex", alignItems: "flex-start", gap: 16}}>
            <div style={{
              width: 58, height: 58, borderRadius: 12,
              background: "linear-gradient(135deg, var(--deep-blue), #1F6FD4)",
              color: "white", display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, letterSpacing: ".02em",
              flexShrink: 0,
            }}>{e.uf}</div>
            <div style={{flex: 1, minWidth: 0, display: "flex", alignItems: "flex-start", gap: 20}}>
              <div style={{flex: 1, minWidth: 0}}>
                <h2
                  ref={titleRef}
                  style={{
                    margin: "0 0 8px",
                    fontFamily: "var(--font-display)",
                    fontSize: titleFontSize,
                    color: "var(--ink-1)",
                    fontWeight: 600,
                    lineHeight: 1.2,
                    letterSpacing: "-0.01em",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {e.org}
                </h2>
                <div style={{display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap"}}>
                  <Chip tone="blue">{e.modal}</Chip>
                  <Chip>{esfera}</Chip>
                  <Chip tone={urgent ? "orange" : "default"} icon={<Icon.clock size={10}/>}>{urgent ? `${daysLeft} dias` : `vence em ${daysLeft}d`}</Chip>
                  {e.sim > 0.5 && (
                    <Chip tone="green">{"Alta ader\u00eancia"}</Chip>
                  )}
                </div>
                <div style={{fontSize: 13, color: "var(--ink-3)", display: "flex", gap: 10, flexWrap: "wrap"}}>
                  <span style={{display: "inline-flex", alignItems: "center", gap: 5}}><Icon.pin size={11}/>{e.mun} {"\u00b7"} {e.uf}</span>
                  <span>ID PNCP <b className="mono" style={{color: "var(--ink-2)", fontWeight: 600}}>{pncpId || "\u2014"}</b></span>
                </div>
              </div>
              <div style={{width: 300, flexShrink: 0, position: "relative", paddingTop: 0, marginRight: 24}}>
                <span style={{position: "absolute", top: 0, right: 0, fontSize: 11, color: "var(--ink-4)", fontFamily: "var(--font-mono)", fontWeight: 500}}>#{String(e.rank).padStart(2, "0")} no rank</span>
                <div style={{display: "flex", flexDirection: "column", gap: 2, fontSize: 13, color: "var(--ink-3)", alignItems: "flex-start", textAlign: "left", paddingRight: 76}}>
                  <span style={{whiteSpace: "nowrap"}}>UASG <b className="mono" style={{color: "var(--ink-2)", fontWeight: 600}}>{uasg}</b></span>
                  <span style={{whiteSpace: "nowrap"}}>Processo <b className="mono" style={{color: "var(--ink-2)", fontWeight: 600}}>{numProcesso}</b></span>
                  <span style={{whiteSpace: "nowrap"}}>Edital <b className="mono" style={{color: "var(--ink-2)", fontWeight: 600}}>{numEdital}</b></span>
                  <span style={{display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap"}}>
                    <span>Fonte <b style={{color: "var(--deep-blue)", fontWeight: 600}}>{fonte}</b></span>
                    {sourceLink && (
                      <a
                        href={sourceLink}
                        target="_blank"
                        rel="noreferrer"
                        title={"Abrir licita\u00e7\u00e3o em nova guia"}
                        style={{display: "inline-flex", color: "var(--deep-blue)"}}
                      >
                        <Icon.external size={12}/>
                      </a>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KPI strip */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
          background: "var(--paper)", borderBottom: "1px solid var(--hairline)",
        }}>
          {[
            { lbl: "Valor estimado", val: e.val === 0 ? "—" : fmtBRL(e.val).replace("R$ ", "R$\u202F"), sub: e.val === 0 ? "sigiloso" : "total do lote", mono: true },
            { lbl: "Encerramento", val: e.end, sub: urgent ? `${daysLeft} dias úteis` : `${daysLeft} dias corridos`, tone: urgent ? "risk" : null, mono: true },
            { lbl: "Itens / Lotes", val: itemCount || "\u2014", sub: `${e.docs} documentos anexados` },
            { lbl: "Similaridade IA", val: e.sim.toFixed(3), sub: "cálculo ponderado", tone: "blue", mono: true },
          ].map((k, i) => (
            <div key={i} style={{
              padding: "14px 18px",
              borderRight: i < 3 ? "1px solid var(--hairline-soft)" : "none",
            }}>
              <div style={{fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600, marginBottom: 4}}>{k.lbl}</div>
              <div className={k.mono ? "mono" : ""} style={{
                fontSize: 18, fontWeight: 600,
                color: k.tone === "risk" ? "var(--risk)" : k.tone === "blue" ? "var(--deep-blue)" : "var(--ink-1)",
                fontFamily: k.mono ? "var(--font-mono)" : "var(--font-display)",
                letterSpacing: k.mono ? "-0.01em" : "-0.015em",
              }}>{k.val}</div>
              <div style={{fontSize: 11, color: "var(--ink-3)", marginTop: 2}}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex", gap: 0, padding: "0 20px",
          background: "var(--paper)", borderBottom: "1px solid var(--hairline)",
          position: "sticky", top: 0, zIndex: 2,
        }}>
          {[
            ["resumo", "Resumo", null],
            ["itens", "Itens", itemCount || 0],
            ["documentos", "Documentos", e.docs],
            ["historico", "Histórico", 6],
            ["concorrencia", "Concorrência", 4],
            ["ia", "Análise IA", null],
          ].map(([id, label, count]) => {
            const active = tab === id;
            return (
              <button key={id} onClick={() => setTab(id)} style={{
                all: "unset", cursor: "pointer",
                padding: "12px 14px", fontSize: 13, fontWeight: active ? 600 : 500,
                color: active ? "var(--ink-1)" : "var(--ink-3)",
                borderBottom: active ? "2px solid var(--orange)" : "2px solid transparent",
                display: "inline-flex", alignItems: "center", gap: 6,
                marginBottom: -1,
              }}>
                {label}
                {count != null && <span className="mono" style={{fontSize: 10.5, color: "var(--ink-4)", fontWeight: 600}}>{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div style={{padding: "20px 24px 100px"}}>
          {tab === "resumo" && (
            <div style={{display: "grid", gridTemplateColumns: "1fr 280px", gap: 18}}>
              <div>
                <div style={{fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600, margin: "0 0 6px"}}>Objeto</div>
                <p style={{margin: 0, fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.6, textWrap: "pretty"}}>{objetoReal}</p>

                <div style={{fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600, margin: "18px 0 8px"}}>Por que este edital foi recomendado</div>
                <div style={{display: "flex", flexDirection: "column", gap: 8}}>
                  {[
                    { score: "+0.42", reason: "Objeto menciona dieta enteral e suplementação hipercalórica — match direto com CNAE 4639-7/01" },
                    { score: "+0.31", reason: "Órgão histórico: 4 contratos anteriores encerrados sem intercorrências" },
                    { score: "+0.18", reason: "UF com 68% da sua receita recorrente nos últimos 12 meses" },
                    { score: "+0.06", reason: "Modalidade Pregão Eletrônico — você venceu 58% das disputas do tipo" },
                    { score: "−0.02", reason: "Prazo de entrega de 7 dias é mais apertado que sua mediana (12 dias)" },
                  ].map((r, i) => (
                    <div key={i} style={{display: "grid", gridTemplateColumns: "64px 1fr", gap: 10, alignItems: "baseline"}}>
                      <span className="mono" style={{fontSize: 12, fontWeight: 600, color: r.score.startsWith("−") ? "var(--risk)" : "var(--green)"}}>{r.score}</span>
                      <span style={{fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5}}>{r.reason}</span>
                    </div>
                  ))}
                </div>
              </div>

              <aside style={{display: "flex", flexDirection: "column", gap: 12}}>
                <SideBlock title="Cronograma">
                  {[
                    ["28/03", "Publicação", "default"],
                    ["08/04", "Limite impugnação", "default"],
                    ["12/04", "Limite esclarecimentos", "default"],
                    [e.end.slice(0, 5), "Abertura propostas", "orange"],
                    ["18/04", "Sessão pública", "default"],
                  ].map(([d, t, tone], i) => (
                    <div key={i} style={{display: "grid", gridTemplateColumns: "54px 1fr", gap: 8, padding: "5px 0", fontSize: 12.5, borderTop: i ? "1px solid var(--hairline-soft)" : "none"}}>
                      <span className="mono" style={{color: "var(--ink-3)", fontWeight: 500}}>{d}</span>
                      <span style={{color: tone === "orange" ? "var(--orange-700)" : "var(--ink-2)", fontWeight: tone === "orange" ? 600 : 400}}>{t}</span>
                    </div>
                  ))}
                </SideBlock>

                <SideBlock title="Responsáveis">
                  <div style={{fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.6}}>
                    <div style={{display: "flex", alignItems: "center", gap: 6, marginBottom: 2}}>
                      <div style={{width: 22, height: 22, borderRadius: "50%", background: "var(--orange-50)", color: "var(--orange-700)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700}}>{pregoeiro.split(" ").map(n => n[0]).slice(0, 2).join("")}</div>
                      <span style={{fontWeight: 500}}>{pregoeiro}</span>
                    </div>
                    <div style={{fontSize: 11.5, color: "var(--ink-3)", marginLeft: 28}}>Pregoeiro — autoridade signatária</div>
                  </div>
                </SideBlock>

                <SideBlock title="Aderência histórica">
                  <div style={{fontSize: 12.5, color: "var(--ink-2)"}}>
                    <div style={{display: "flex", justifyContent: "space-between", padding: "3px 0"}}>
                      <span>Com {e.org.split(" ").slice(0, 2).join(" ")}</span>
                      <span className="mono" style={{fontWeight: 600, color: "var(--deep-blue)"}}>4 contratos</span>
                    </div>
                    <div style={{display: "flex", justifyContent: "space-between", padding: "3px 0", borderTop: "1px solid var(--hairline-soft)"}}>
                      <span>Valor ganho</span>
                      <span className="mono" style={{fontWeight: 600}}>R$ 2,1 mi</span>
                    </div>
                    <div style={{display: "flex", justifyContent: "space-between", padding: "3px 0", borderTop: "1px solid var(--hairline-soft)"}}>
                      <span>Taxa de vitória</span>
                      <span className="mono" style={{fontWeight: 600, color: "var(--green)"}}>62%</span>
                    </div>
                  </div>
                </SideBlock>
              </aside>
            </div>
          )}

          {tab === "itens" && (
            <div style={{background: "var(--paper)", border: "1px solid var(--hairline)", borderRadius: 10, overflow: "hidden"}}>
              {itemsState.status === "loading" ? (
                <div style={{padding: "26px 18px", fontSize: 13, color: "var(--ink-3)"}}>
                  Carregando itens do edital...
                </div>
              ) : itemsState.status === "error" ? (
                <div style={{padding: "26px 18px", fontSize: 13, color: "var(--risk)"}}>
                  {itemsState.error}
                </div>
              ) : itemRows.length === 0 ? (
                <div style={{padding: "26px 18px", fontSize: 13, color: "var(--ink-3)"}}>
                  Nenhum item encontrado para este edital.
                </div>
              ) : (
                <>
                  <div style={{
                    display: "grid", gridTemplateColumns: "64px minmax(0, 1fr) 120px 136px 150px",
                    padding: "10px 16px", background: "var(--rail)",
                    fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600,
                    borderBottom: "1px solid var(--hairline)",
                  }}>
                    <span>{"N\u00ba"}</span>
                    <span>{"Descri\u00e7\u00e3o"}</span>
                    <span>Qtde</span>
                    <span style={{textAlign: "right"}}>{"Unit (R$)"}</span>
                    <span style={{textAlign: "right"}}>{"Total (R$)"}</span>
                  </div>
                  {itemRows.map((item, index) => (
                    <div key={`${item.numero}-${index}`} style={{
                      display: "grid", gridTemplateColumns: "64px minmax(0, 1fr) 120px 136px 150px",
                      padding: "11px 16px", fontSize: 12.5, alignItems: "start",
                      borderBottom: index < itemRows.length - 1 ? "1px solid var(--hairline-soft)" : "none",
                    }}>
                      <span className="mono" style={{color: "var(--ink-3)", fontWeight: 500}}>{String(item.numero).padStart(2, "0")}</span>
                      <span style={{color: "var(--ink-1)", lineHeight: 1.45}}>{item.descricao || "\u2014"}</span>
                      <span className="mono" style={{color: "var(--ink-2)"}}>{item.quantidade}</span>
                      <span className="mono" style={{color: "var(--ink-2)", textAlign: "right"}}>{item.valorUnitario}</span>
                      <span className="mono" style={{color: "var(--ink-1)", fontWeight: 600, textAlign: "right"}}>{item.valorTotal}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {tab === "documentos" && (
            <div style={{display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10}}>
              {docs.map((d, i) => (
                <div key={i} style={{
                  display: "flex", gap: 12, padding: "12px 14px",
                  background: "var(--paper)", border: "1px solid var(--hairline)", borderRadius: 10,
                  cursor: "pointer",
                }}>
                  <div style={{
                    width: 36, height: 44, flexShrink: 0,
                    background: d.kind === "edital" ? "var(--orange-50)" : d.kind === "contrato" ? "var(--blue-50)" : "var(--rail)",
                    color: d.kind === "edital" ? "var(--orange-700)" : d.kind === "contrato" ? "var(--deep-blue)" : "var(--ink-3)",
                    borderRadius: 6, display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, fontWeight: 700, letterSpacing: ".04em",
                  }}>{d.name.split(".").pop().toUpperCase()}</div>
                  <div style={{flex: 1, minWidth: 0}}>
                    <div style={{fontSize: 13, fontWeight: 500, color: "var(--ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{d.name}</div>
                    <div style={{fontSize: 11.5, color: "var(--ink-3)", marginTop: 3, display: "flex", gap: 8}}>
                      <span>{d.size}</span>
                      {d.pages && <><span>·</span><span>{d.pages} páginas</span></>}
                      <span>·</span><span>{d.date}</span>
                    </div>
                  </div>
                  <button style={{all: "unset", cursor: "pointer", color: "var(--ink-3)", padding: 4, display: "inline-flex", alignSelf: "center"}}><Icon.download size={14}/></button>
                </div>
              ))}
            </div>
          )}

          {tab === "historico" && (
            <div style={{position: "relative", paddingLeft: 20}}>
              <div style={{position: "absolute", left: 6, top: 6, bottom: 6, width: 1, background: "var(--hairline)"}}/>
              {history.map((h, i) => (
                <div key={i} style={{position: "relative", paddingBottom: 14}}>
                  <div style={{
                    position: "absolute", left: -18, top: 4, width: 11, height: 11, borderRadius: "50%",
                    background: h.future ? "var(--paper)" : h.tone === "orange" ? "var(--orange)" : h.tone === "blue" ? "var(--deep-blue)" : h.tone === "green" ? "var(--green)" : "var(--ink-3)",
                    border: h.future ? "2px dashed var(--ink-4)" : "none",
                  }}/>
                  <div style={{display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap"}}>
                    <span className="mono" style={{fontSize: 11.5, fontWeight: 600, color: h.future ? "var(--ink-4)" : "var(--ink-2)"}}>{h.date}</span>
                    <span style={{fontSize: 13, fontWeight: h.future ? 400 : 500, color: h.future ? "var(--ink-3)" : "var(--ink-1)"}}>{h.event}</span>
                    <span style={{fontSize: 11.5, color: "var(--ink-3)"}}>· {h.who}</span>
                  </div>
                  {h.link && <div style={{fontSize: 12, color: "var(--deep-blue)", marginTop: 2, paddingLeft: 0}}>{h.link}</div>}
                </div>
              ))}
            </div>
          )}

          {tab === "concorrencia" && (
            <div>
              <p style={{margin: "0 0 12px", fontSize: 12.5, color: "var(--ink-3)"}}>Fornecedores detectados com histórico neste órgão ou objeto similar.</p>
              <div style={{background: "var(--paper)", border: "1px solid var(--hairline)", borderRadius: 10, overflow: "hidden"}}>
                {concorrencia.map((c, i) => (
                  <div key={i} style={{
                    display: "grid", gridTemplateColumns: "1fr 140px 110px 110px 40px",
                    padding: "12px 16px", alignItems: "center",
                    borderBottom: i < concorrencia.length - 1 ? "1px solid var(--hairline-soft)" : "none",
                    background: i === 0 ? "var(--orange-50)" : "var(--paper)",
                  }}>
                    <div style={{minWidth: 0}}>
                      <div style={{fontSize: 12.5, fontWeight: 600, color: "var(--ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{c.name}</div>
                      <div className="mono" style={{fontSize: 11, color: "var(--deep-blue)", marginTop: 2}}>{c.cnpj}</div>
                    </div>
                    <div>
                      <div style={{fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600}}>Aderência</div>
                      <ScoreDot score={c.score}/>
                    </div>
                    <div>
                      <div style={{fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600}}>Contratos</div>
                      <div className="mono" style={{fontSize: 13, fontWeight: 600, color: "var(--ink-1)"}}>{c.hist}</div>
                    </div>
                    <div>
                      <div style={{fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600}}>Taxa vit.</div>
                      <div className="mono" style={{fontSize: 13, fontWeight: 600, color: c.win >= 0.5 ? "var(--green)" : "var(--ink-1)"}}>{Math.round(c.win * 100)}%</div>
                    </div>
                    <button style={{all: "unset", cursor: "pointer", color: "var(--ink-3)", padding: 4, display: "inline-flex", justifySelf: "end"}}><Icon.external size={13}/></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "ia" && (
            <div style={{
              background: "linear-gradient(135deg, rgba(31, 111, 212, .04), rgba(255, 87, 34, .04))",
              border: "1px solid var(--hairline)", borderRadius: 12, padding: 18,
            }}>
              <div style={{display: "flex", alignItems: "center", gap: 8, marginBottom: 12}}>
                <div style={{width: 30, height: 30, borderRadius: 8, background: "var(--deep-blue)", color: "white", display: "inline-flex", alignItems: "center", justifyContent: "center"}}><Icon.sparkle size={14}/></div>
                <div>
                  <div style={{fontSize: 14, fontWeight: 600, color: "var(--ink-1)"}}>Análise estratégica gerada</div>
                  <div style={{fontSize: 11.5, color: "var(--ink-3)"}}>Atualizada há 4 minutos · revisão humana recomendada</div>
                </div>
              </div>
              <div style={{fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.65, textWrap: "pretty"}}>
                Este pregão apresenta <b style={{color: "var(--ink-1)"}}>alta aderência ({(e.sim * 100).toFixed(1)}%)</b> ao seu perfil,
                com objeto centrado em dietas hospitalares — categoria na qual sua empresa tem <b style={{color: "var(--ink-1)"}}>62% de taxa de vitória nos últimos 18 meses</b>.
                O valor estimado ({e.val > 0 ? fmtBRL(e.val).replace("R$ ", "R$\u202F") : "sigiloso"}) coloca a licitação no topo 12% por porte,
                e a modalidade Pregão Eletrônico é favorável ao seu histórico operacional.
                <br/><br/>
                <b style={{color: "var(--orange-700)"}}>Pontos de atenção:</b> o lote 6 (água estéril) sai fora do seu CNAE principal e
                historicamente a Prodiet domina 49% dessa linha no Centro-Oeste — considere apresentar proposta apenas para os lotes 1 a 5.
                O prazo de entrega de 7 dias é mais apertado que sua mediana — valide com logística antes da sessão.
              </div>
              <div style={{display: "flex", gap: 6, marginTop: 14, flexWrap: "wrap"}}>
                <Button size="sm" kind="ghost" icon={<Icon.sparkle size={12}/>}>Regenerar</Button>
                <Button size="sm" kind="ghost" icon={<Icon.download size={12}/>}>Copiar</Button>
                <Button size="sm" kind="ghost" icon={<Icon.external size={12}/>}>Enviar ao time</Button>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Sticky footer actions */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "12px 20px", background: "var(--paper)",
        borderTop: "1px solid var(--hairline)",
      }}>
        <Button kind="ghost" size="sm" icon={<Icon.bookmark size={13}/>}>Salvar</Button>
        <Button kind="ghost" size="sm" icon={<Icon.bell size={13}/>}>Acompanhar</Button>
        <Button kind="ghost" size="sm" icon={<Icon.external size={13}/>}>Compartilhar</Button>
        <span style={{flex: 1}}/>
        <Button
          kind="ghost"
          size="sm"
          icon={<Icon.external size={13}/>}
          disabled={!sourceLink}
          onClick={() => {
            if (sourceLink) {
              window.open(sourceLink, "_blank", "noopener,noreferrer");
            }
          }}
        >
          Abrir no {fonte}
        </Button>
        <Button kind="primary" size="sm" icon={<Icon.sparkle size={13}/>}>Analisar com IA</Button>
      </div>
    </div>
  );
}

function SideBlock({ title, children }) {
  return (
    <div style={{background: "var(--paper)", border: "1px solid var(--hairline)", borderRadius: 10, padding: "12px 14px"}}>
      <div style={{fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600, marginBottom: 8}}>{title}</div>
      {children}
    </div>
  );
}

window.EditalDetail = EditalDetail;
