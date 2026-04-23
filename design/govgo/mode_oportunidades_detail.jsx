// Edital detail drawer — slides over from the right within the main column
const { useState: uSod } = React;

function EditalDetail({ edital }) {
  const [tab, setTab] = uSod("resumo");
  if (!edital) return null;

  const e = edital;
  const details = e.details || e.raw?.details || {};
  const pickDetail = (...keys) => {
    for (const key of keys) {
      const value = details[key] ?? e[key];
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
  const numProcesso = `${(2026).toString()}/${String(e.rank * 137).padStart(6, "0")}`;
  const numEdital = `PE-${String(e.rank * 23).padStart(4, "0")}/2026`;
  const uasg = String(925000 + e.rank * 13);
  const esfera = ["Estadual", "Estadual", "Municipal", "Municipal", "Municipal", "Federal", "Municipal", "Federal", "Municipal", "Distrital"][e.rank - 1];
  const fonte = ["PNCP", "ComprasNet", "BLL", "Licitações-e", "PNCP", "ComprasNet", "PNCP", "ComprasNet", "PNCP", "ComprasNet"][e.rank - 1];

  const objeto = `Registro de preços para aquisição de gêneros alimentícios destinados ao fornecimento de refeições hospitalares e dietas especiais, conforme especificações constantes no Termo de Referência — Anexo I do edital, com entrega parcelada pelo período de 12 (doze) meses.`;

  const objetoReal = e.objeto || details.objeto_compra || e.title || objeto;

  const items = [
    { lote: 1, desc: "Dieta enteral padrão — 500ml · Polimérica · Isenta de sacarose", qtd: "14.400 un", valor: "R$ 38,90", total: "R$ 560.160,00", match: 0.98 },
    { lote: 2, desc: "Suplemento hipercalórico — sabor baunilha · 200ml", qtd: "6.800 un", valor: "R$ 22,40", total: "R$ 152.320,00", match: 0.96 },
    { lote: 3, desc: "Fórmula pediátrica — 400g · 0 a 12 meses", qtd: "2.200 un", valor: "R$ 71,50", total: "R$ 157.300,00", match: 0.91 },
    { lote: 4, desc: "Módulo de proteína — pó · pote 250g", qtd: "1.540 un", valor: "R$ 98,20", total: "R$ 151.228,00", match: 0.88 },
    { lote: 5, desc: "Espessante alimentar — instantâneo · 125g", qtd: "980 un", valor: "R$ 43,70", total: "R$ 42.826,00", match: 0.84 },
    { lote: 6, desc: "Água para diluição — 1L · estéril", qtd: "4.800 un", valor: "R$ 9,90", total: "R$ 47.520,00", match: 0.73 },
  ];

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

  return (
    <div style={{
      background: "var(--workspace)",
      display: "flex", flexDirection: "column",
      height: "100%", minHeight: 0, overflow: "hidden",
    }}>

      {/* Top bar with breadcrumb */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 24px", background: "var(--paper)",
        borderBottom: "1px solid var(--hairline)",
      }}>
        <span style={{fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600}}>Busca</span>
        <Icon.chevRight size={11} style={{color: "var(--ink-4)"}}/>
        <span style={{fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600}}>Edital</span>
        <Icon.chevRight size={11} style={{color: "var(--ink-4)"}}/>
        <span className="mono" style={{fontSize: 11.5, color: "var(--ink-2)", fontWeight: 600}}>{numEdital}</span>
        <span style={{flex: 1}}/>
        <button title="Anterior" style={{all: "unset", cursor: "pointer", padding: 4, color: "var(--ink-3)", display: "inline-flex", transform: "rotate(180deg)"}}><Icon.chevRight size={14}/></button>
        <button title="Próximo" style={{all: "unset", cursor: "pointer", padding: 4, color: "var(--ink-3)", display: "inline-flex"}}><Icon.chevRight size={14}/></button>
        <div style={{width: 1, height: 16, background: "var(--hairline)", margin: "0 4px"}}/>
        <button title="Abrir no site oficial" style={{all: "unset", cursor: "pointer", padding: 4, color: "var(--ink-3)", display: "inline-flex"}}><Icon.external size={13}/></button>
      </div>

      {/* Scroll body */}
      <div style={{flex: 1, overflowY: "auto"}}>
        <div style={{maxWidth: 1080, margin: "0 auto"}}>

        {/* Hero — org + title + badges */}
        <div style={{padding: "18px 24px 14px", background: "var(--paper)", borderBottom: "1px solid var(--hairline)"}}>
          <div style={{display: "flex", alignItems: "flex-start", gap: 16}}>
            <div style={{
              width: 52, height: 52, borderRadius: 10,
              background: "linear-gradient(135deg, var(--deep-blue), #1F6FD4)",
              color: "white", display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14, letterSpacing: ".02em",
              flexShrink: 0,
            }}>{e.uf}</div>
            <div style={{flex: 1, minWidth: 0}}>
              <div style={{display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap"}}>
                <Chip tone="green" icon={<Icon.check size={11}/>}>Alta aderência · {(e.sim * 100).toFixed(1)}%</Chip>
                <Chip tone="blue">{e.modal}</Chip>
                <Chip>{esfera}</Chip>
                <Chip tone={urgent ? "orange" : "default"} icon={<Icon.clock size={10}/>}>{urgent ? `${daysLeft} dias` : `vence em ${daysLeft}d`}</Chip>
                <span style={{flex: 1}}/>
                <span style={{fontSize: 11, color: "var(--ink-4)", fontFamily: "var(--font-mono)", fontWeight: 500}}>#{String(e.rank).padStart(2, "0")} no rank</span>
              </div>
              <h2 style={{margin: "2px 0 4px", fontFamily: "var(--font-display)", fontSize: 20, color: "var(--ink-1)", fontWeight: 600, lineHeight: 1.25, letterSpacing: "-0.01em"}}>{e.org}</h2>
              <div style={{fontSize: 13, color: "var(--ink-3)", display: "flex", gap: 14, flexWrap: "wrap"}}>
                <span style={{display: "inline-flex", alignItems: "center", gap: 5}}><Icon.pin size={11}/>{e.mun} · {e.uf}</span>
                <span>UASG <b className="mono" style={{color: "var(--ink-2)", fontWeight: 600}}>{uasg}</b></span>
                <span>Processo <b className="mono" style={{color: "var(--ink-2)", fontWeight: 600}}>{numProcesso}</b></span>
                <span>Fonte <b style={{color: "var(--deep-blue)", fontWeight: 600}}>{fonte}</b></span>
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
            { lbl: "Itens / Lotes", val: e.items || "—", sub: `${e.docs} documentos anexados` },
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
            ["itens", "Itens", e.items || 0],
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
              <div style={{
                display: "grid", gridTemplateColumns: "50px minmax(0, 1fr) 110px 110px 130px 70px",
                padding: "10px 16px", background: "var(--rail)",
                fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600,
                borderBottom: "1px solid var(--hairline)",
              }}>
                <span>Lote</span><span>Descrição</span><span>Qtd</span><span style={{textAlign: "right"}}>Valor un.</span><span style={{textAlign: "right"}}>Total</span><span style={{textAlign: "right"}}>Match</span>
              </div>
              {items.map((it, i) => (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "50px minmax(0, 1fr) 110px 110px 130px 70px",
                  padding: "11px 16px", fontSize: 12.5, alignItems: "center",
                  borderBottom: i < items.length - 1 ? "1px solid var(--hairline-soft)" : "none",
                }}>
                  <span className="mono" style={{color: "var(--ink-3)", fontWeight: 500}}>{String(it.lote).padStart(2, "0")}</span>
                  <span style={{color: "var(--ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{it.desc}</span>
                  <span className="mono" style={{color: "var(--ink-2)"}}>{it.qtd}</span>
                  <span className="mono" style={{color: "var(--ink-2)", textAlign: "right"}}>{it.valor}</span>
                  <span className="mono" style={{color: "var(--ink-1)", fontWeight: 600, textAlign: "right"}}>{it.total}</span>
                  <span style={{textAlign: "right"}}>
                    <span className="mono" style={{
                      display: "inline-block", padding: "2px 7px", borderRadius: 10,
                      fontSize: 11, fontWeight: 600,
                      background: it.match >= 0.9 ? "var(--green-50, #E8F3E9)" : it.match >= 0.8 ? "var(--orange-50)" : "var(--rail)",
                      color: it.match >= 0.9 ? "var(--green)" : it.match >= 0.8 ? "var(--orange-700)" : "var(--ink-3)",
                    }}>{it.match.toFixed(2)}</span>
                  </span>
                </div>
              ))}
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
        <Button kind="ghost" size="sm" icon={<Icon.external size={13}/>}>Abrir no {fonte}</Button>
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
