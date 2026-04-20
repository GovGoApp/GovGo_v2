// Mode: Design System — mini reference
// Resolve CSS color (hex or var(--name)) to #rrggbb, then measure contrast.
function resolveColor(c) {
  if (typeof window === "undefined") return "#ffffff";
  const el = document.createElement("div");
  el.style.color = c;
  el.style.display = "none";
  document.body.appendChild(el);
  const rgb = getComputedStyle(el).color;
  document.body.removeChild(el);
  return rgb; // rgb(r, g, b)
}
function luminance(rgbStr) {
  const m = rgbStr.match(/\d+(\.\d+)?/g);
  if (!m) return 1;
  const [r, g, b] = m.slice(0, 3).map(Number).map(v => v / 255);
  const lin = v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function Swatch({name, color, label}) {
  const ref = React.useRef(null);
  const [fg, setFg] = React.useState("#fff");
  const [resolved, setResolved] = React.useState(label || "");
  React.useEffect(() => {
    if (!ref.current) return;
    const bg = getComputedStyle(ref.current).backgroundColor;
    setFg(luminance(bg) > 0.5 ? "var(--ink-1)" : "#fff");
    if (!label) {
      // convert rgb(r,g,b) -> #rrggbb
      const m = bg.match(/\d+/g);
      if (m) setResolved("#" + m.slice(0,3).map(v => (+v).toString(16).padStart(2,"0")).join("").toUpperCase());
    }
  }, [color, label]);
  return (
    <div>
      <div ref={ref} style={{
        height: 68, background: color, borderRadius: 10,
        border: "1px solid var(--hairline)",
        display: "flex", alignItems: "flex-end", padding: 10,
      }}>
        <span className="mono" style={{fontSize: 11, color: fg, fontWeight: 600}}>{resolved}</span>
      </div>
      <div style={{marginTop: 6, fontSize: 12, color: "var(--ink-2)", fontWeight: 500}}>{name}</div>
    </div>
  );
}

function ModeDesignSystem() {
  return (
    <div style={{overflowY: "auto", height: "100%", padding: "20px 32px 60px"}}>
      <SectionHead
        eyebrow="Design System · GovGo v2"
        title="Fundamentos visuais e componentes"
        desc="Base preservada da identidade GovGo, modernizada com neutros refinados, tipografia contemporânea e elevação sutil."
      />

      {/* Colors */}
      <div style={{marginTop: 20}}>
        <h3 style={{fontFamily: "var(--font-display)", fontSize: 14, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 12px"}}>Cores de marca</h3>
        <div style={{display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 18}}>
          <Swatch name="Laranja GovGo" color="var(--orange)"/>
          <Swatch name="Azul institucional" color="var(--deep-blue)"/>
          <Swatch name="Fundo azul claro" color="var(--blue-50)"/>
          <Swatch name="Verde sucesso" color="var(--green)"/>
        </div>
        <h3 style={{fontFamily: "var(--font-display)", fontSize: 14, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 12px"}}>Neutros & superfícies</h3>
        <div style={{display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10}}>
          <Swatch name="Paper" color="var(--paper)"/>
          <Swatch name="Workspace" color="var(--surface)"/>
          <Swatch name="Sunk" color="var(--surface-sunk)"/>
          <Swatch name="Hairline" color="var(--hairline)"/>
          <Swatch name="Ink 2" color="var(--ink-2)"/>
          <Swatch name="Ink 1" color="var(--ink-1)"/>
        </div>
      </div>

      {/* Typography */}
      <div style={{marginTop: 28}}>
        <h3 style={{fontFamily: "var(--font-display)", fontSize: 14, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 12px"}}>Tipografia</h3>
        <div style={{display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14}}>
          {[
            {fam: "Sora", usage: "Títulos & navegação", sample: "Inteligência de compras"},
            {fam: "IBM Plex Sans", usage: "Texto e tabelas", sample: "Alimentação hospitalar"},
            {fam: "JetBrains Mono", usage: "Dados técnicos & SQL", sample: "14.024.944/0001-03"},
          ].map(t => (
            <div key={t.fam} style={{padding: 18, border: "1px solid var(--hairline)", borderRadius: 10, background: "var(--paper)"}}>
              <div style={{fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".04em", fontWeight: 600}}>{t.usage}</div>
              <div style={{fontFamily: t.fam === "JetBrains Mono" ? "JetBrains Mono" : t.fam, fontSize: 24, fontWeight: 600, color: "var(--ink-1)", marginTop: 6, letterSpacing: "-0.01em"}}>{t.sample}</div>
              <div style={{fontSize: 12, color: "var(--ink-3)", marginTop: 6}} className="mono">{t.fam}</div>
            </div>
          ))}
        </div>
        <div style={{display: "grid", gridTemplateColumns: "120px 1fr", rowGap: 10, columnGap: 18, marginTop: 16, alignItems: "baseline"}}>
          {[
            ["Display / XL", 32, "display", 600, "Panorama do mercado"],
            ["Display / L", 22, "display", 600, "Perfil do fornecedor"],
            ["Heading", 17, "display", 600, "Resultados da busca"],
            ["Body / strong", 14, "body", 600, "Valor contratado"],
            ["Body", 13, "body", 400, "Pregão eletrônico publicado em 20/04/2026."],
            ["Caption", 11.5, "body", 500, "FAVORITOS · 12"],
            ["Mono / data", 13, "mono", 500, "R$ 30.613.507,38"],
          ].map(([l, s, f, w, t], i) => (
            <React.Fragment key={i}>
              <span style={{fontSize: 11.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".04em", fontWeight: 600}}>{l}</span>
              <span style={{fontFamily: f === "display" ? "var(--font-display)" : f === "mono" ? "var(--font-mono)" : "var(--font-body)",
                fontSize: s, fontWeight: w, color: "var(--ink-1)", letterSpacing: f === "display" ? "-0.01em" : 0}}>{t}</span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Components */}
      <div style={{marginTop: 28, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16}}>
        <Card title="Botões">
          <div style={{display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14}}>
            <Button kind="primary">Ação primária</Button>
            <Button kind="secondary">Secundária</Button>
            <Button>Neutra</Button>
            <Button kind="ghost">Ghost</Button>
            <Button kind="subtle">Subtle</Button>
            <Button kind="danger">Risco</Button>
          </div>
          <div style={{display: "flex", flexWrap: "wrap", gap: 8}}>
            <Button kind="primary" size="sm" icon={<Icon.plus size={13}/>}>Com ícone</Button>
            <Button size="sm" icon={<Icon.download size={13}/>}>Exportar</Button>
            <Button kind="primary" disabled>Desabilitado</Button>
            <Button kind="ghost" size="sm" icon={<Icon.dots size={14}/>}/>
          </div>
        </Card>

        <Card title="Chips & badges">
          <div style={{display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12}}>
            <Chip>Neutra</Chip>
            <Chip tone="orange">Laranja</Chip>
            <Chip tone="blue">Azul</Chip>
            <Chip tone="green" icon={<Icon.check size={10}/>}>Sucesso</Chip>
            <Chip tone="risk" icon={<Icon.alert size={10}/>}>Atenção</Chip>
            <Chip tone="ink">Destaque</Chip>
            <Chip onRemove={()=>{}}>Removível</Chip>
          </div>
          <div style={{display: "flex", flexWrap: "wrap", gap: 6}}>
            <Chip active onClick={()=>{}}>Ativo</Chip>
            <Chip onClick={()=>{}}>Clicável</Chip>
            <Chip tone="blue">UF: SP</Chip>
            <Chip tone="orange">sim ≥ 0.85</Chip>
          </div>
        </Card>

        <Card title="Inputs">
          <div style={{display: "flex", flexDirection: "column", gap: 10}}>
            <Input icon={<Icon.search size={14}/>} placeholder="Buscar edital…" value="alimentação hospitalar"/>
            <Input mono placeholder="CNPJ" value="14.024.944/0001-03" icon={<Icon.building size={14}/>}/>
            <Input size="sm" placeholder="Menor, linha de filtro" icon={<Icon.filter size={13}/>}/>
          </div>
        </Card>

        <Card title="KPI cards">
          <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10}}>
            <KPI label="Volume 12m" value="R$ 284,6" unit="bi" delta={7.4} trend={[2,3,3.4,4,4.2,4.8,5,5.3,5.6,5.9,6.1,6.3]}/>
            <KPI label="Ticket médio" value="R$ 1,82" unit="mi" delta={-1.2} trend={[6,5.8,5.6,5.4,5.3,5.2,5.1,5.0,4.9,4.85,4.82,4.8]}/>
          </div>
        </Card>

        <Card title="Tabela densa" style={{gridColumn: "span 2"}}>
          <div style={{border: "1px solid var(--hairline-soft)", borderRadius: 8, overflow: "hidden"}}>
            <div style={{display: "grid", gridTemplateColumns: "60px 2fr 1fr 120px 140px",
              padding: "8px 14px", background: "var(--rail)", fontSize: 11,
              color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".04em", fontWeight: 600}}>
              <span>Rank</span><span>Órgão</span><span>UF</span><span>Similaridade</span><span style={{textAlign:"right"}}>Valor</span>
            </div>
            {DATA.editais.slice(0,4).map(e => (
              <div key={e.rank} style={{display: "grid", gridTemplateColumns: "60px 2fr 1fr 120px 140px",
                padding: "10px 14px", borderTop: "1px solid var(--hairline-soft)", fontSize: 13, alignItems: "center"}}>
                <span className="mono" style={{color: "var(--ink-2)"}}>{String(e.rank).padStart(2,"0")}</span>
                <span style={{color: "var(--ink-1)"}}>{e.org}</span>
                <span className="mono">{e.uf}</span>
                <span><ScoreDot score={e.sim}/></span>
                <span className="mono" style={{textAlign: "right", fontWeight: 600}}>{fmtBRL(e.val, true)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Estados: empty / loading / error / success" style={{gridColumn: "span 2"}}>
          <div style={{display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12}}>
            {/* empty */}
            <div style={{padding: 22, border: "1px dashed var(--divider)", borderRadius: 10, textAlign: "center", background: "var(--rail)"}}>
              <div style={{width: 38, height: 38, margin: "0 auto 10px", borderRadius: 99, background: "var(--paper)", border: "1px solid var(--hairline)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--ink-3)"}}>
                <Icon.search size={18}/>
              </div>
              <div style={{fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14}}>Nenhum resultado</div>
              <div style={{fontSize: 12, color: "var(--ink-3)", marginTop: 4, lineHeight: 1.4}}>Tente termos mais amplos ou remova filtros.</div>
            </div>
            {/* loading */}
            <div style={{padding: 22, border: "1px solid var(--hairline)", borderRadius: 10, background: "var(--paper)"}}>
              {[1,2,3].map(i => (
                <div key={i} style={{display: "flex", gap: 8, alignItems: "center", marginBottom: 8}}>
                  <div style={{width: 28, height: 28, borderRadius: 99, background: "linear-gradient(90deg,#EEF0F5,#F6F7FA,#EEF0F5)", backgroundSize: "200% 100%", animation: "shine 1.4s infinite"}}/>
                  <div style={{flex: 1}}>
                    <div style={{height: 10, borderRadius: 4, background: "linear-gradient(90deg,#EEF0F5,#F6F7FA,#EEF0F5)", backgroundSize: "200% 100%", animation: "shine 1.4s infinite", marginBottom: 5, width: i === 1 ? "70%" : "90%"}}/>
                    <div style={{height: 8, borderRadius: 4, background: "linear-gradient(90deg,#EEF0F5,#F6F7FA,#EEF0F5)", backgroundSize: "200% 100%", animation: "shine 1.4s infinite", width: "40%"}}/>
                  </div>
                </div>
              ))}
              <style>{`@keyframes shine { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
            </div>
            {/* error */}
            <div style={{padding: 22, border: "1px solid #F0C8B4", borderRadius: 10, background: "var(--risk-50)"}}>
              <div style={{display: "flex", gap: 8, alignItems: "center", color: "var(--risk)", marginBottom: 6}}>
                <Icon.alert size={16}/>
                <span style={{fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14}}>Falha ao executar</span>
              </div>
              <div style={{fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.4, marginBottom: 10}}>O PNCP retornou 503. Suas últimas consultas foram salvas localmente.</div>
              <Button size="sm" kind="danger">Tentar novamente</Button>
            </div>
            {/* success */}
            <div style={{padding: 22, border: "1px solid var(--green-100)", borderRadius: 10, background: "var(--green-50)"}}>
              <div style={{display: "flex", gap: 8, alignItems: "center", color: "var(--green)", marginBottom: 6}}>
                <Icon.check size={16}/>
                <span style={{fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14}}>Busca salva</span>
              </div>
              <div style={{fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.4, marginBottom: 10}}>Alertas diários ativados. Você receberá por e-mail às 7h.</div>
              <Button size="sm" kind="ghost" icon={<Icon.bell size={13}/>}>Gerenciar alertas</Button>
            </div>
          </div>
        </Card>

        <Card title="Toast" style={{gridColumn: "span 2"}}>
          <div style={{display: "flex", gap: 12, flexWrap: "wrap"}}>
            <div style={{display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
              background: "#1A2233", color: "white", borderRadius: 10, boxShadow: "var(--shadow-lg)", minWidth: 320}}>
              <span style={{width: 26, height: 26, borderRadius: 99, background: "rgba(46,125,50,.2)", color: "#6FBF71", display: "inline-flex", alignItems: "center", justifyContent: "center"}}>
                <Icon.check size={14}/>
              </span>
              <div style={{flex: 1}}>
                <div style={{fontSize: 13.5, fontWeight: 600}}>Exportação concluída</div>
                <div style={{fontSize: 12, color: "rgba(255,255,255,.65)"}}>214 registros · resultados-alimentacao.xlsx</div>
              </div>
              <Button size="sm" kind="ghost" style={{color: "white"}}>Abrir</Button>
              <Icon.close size={14}/>
            </div>
          </div>
        </Card>
      </div>

      {/* Motion note */}
      <div style={{marginTop: 24, padding: 18, background: "var(--paper)", border: "1px solid var(--hairline)", borderRadius: 10}}>
        <h3 style={{fontFamily: "var(--font-display)", fontSize: 14, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 10px"}}>Comportamento</h3>
        <div style={{display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, fontSize: 13}}>
          {[
            ["Hover em linhas de tabela", "Fundo muda para Sunk em 120ms. Cursor pointer. Sem elevação — evita ruído em listas densas."],
            ["Seleção de linha", "Borda esquerda 3px laranja + fundo azul-50. Persiste enquanto o item estiver no inspector."],
            ["Filtros aplicados", "Chips ganham tom laranja quando sobrescrevem default. Click-to-remove sem confirmação."],
            ["Transições entre modos", "Crossfade 160ms + slide sutil. O command bar e o contexto ativo permanecem."],
          ].map(([t, d]) => (
            <div key={t}>
              <div style={{fontWeight: 600, color: "var(--ink-1)", marginBottom: 4}}>{t}</div>
              <div style={{color: "var(--ink-3)", lineHeight: 1.5}}>{d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

window.ModeDesignSystem = ModeDesignSystem;
