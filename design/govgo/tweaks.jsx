// Tweaks panel
const { useState: uSt, useEffect: uEt } = React;

function TweaksPanel({tweaks, setTweak}) {
  const [active, setActive] = uSt(false);

  uEt(() => {
    const handler = (e) => {
      if (e.data?.type === "__activate_edit_mode") setActive(true);
      if (e.data?.type === "__deactivate_edit_mode") setActive(false);
    };
    window.addEventListener("message", handler);
    window.parent.postMessage({type: "__edit_mode_available"}, "*");
    return () => window.removeEventListener("message", handler);
  }, []);

  if (!active) return null;

  const Row = ({label, children}) => (
    <div style={{display: "grid", gridTemplateColumns: "90px 1fr", alignItems: "center", gap: 10, marginBottom: 10}}>
      <span style={{fontSize: 12, color: "var(--ink-3)", fontWeight: 500}}>{label}</span>
      <div>{children}</div>
    </div>
  );
  const Opt = ({k, v, cur, onChange, children}) => (
    <button onClick={() => onChange(v)} style={{
      all: "unset", cursor: "pointer", padding: "5px 10px", fontSize: 12,
      borderRadius: 6, border: `1px solid ${cur === v ? "var(--deep-blue)" : "var(--hairline)"}`,
      background: cur === v ? "var(--deep-blue)" : "white",
      color: cur === v ? "white" : "var(--ink-2)",
      fontWeight: 500,
    }}>{children}</button>
  );

  return (
    <div style={{
      position: "fixed", bottom: 20, right: 20, width: 320, zIndex: 100,
      background: "white", border: "1px solid var(--hairline)",
      borderRadius: 12, boxShadow: "var(--shadow-lg)",
      overflow: "hidden",
    }}>
      <div style={{padding: "12px 14px", background: "linear-gradient(135deg, #003A70, #0B4A8A)", color: "white", display: "flex", alignItems: "center", gap: 10}}>
        <Icon.sparkle size={16}/>
        <span style={{fontFamily: "var(--font-display)", fontSize: 13.5, fontWeight: 600}}>Tweaks</span>
        <span style={{flex: 1}}/>
        <span style={{fontSize: 11, color: "rgba(255,255,255,.6)"}}>GovGo v2</span>
      </div>
      <div style={{padding: 14}}>
        <Row label="Modo">
          <div style={{display: "flex", flexWrap: "wrap", gap: 5}}>
            {[["oportunidades","Oport."],["fornecedores","Forn."],["mercado","Mercado"],["relatorios","Relat."],["designsystem","DS"]].map(([v,l]) => (
              <Opt key={v} v={v} cur={tweaks.mode} onChange={x => setTweak("mode", x)}>{l}</Opt>
            ))}
          </div>
        </Row>
        <Row label="Densidade">
          <div style={{display: "flex", gap: 5}}>
            <Opt v="comfortable" cur={tweaks.density} onChange={x => setTweak("density", x)}>Confortável</Opt>
            <Opt v="compact" cur={tweaks.density} onChange={x => setTweak("density", x)}>Compacta</Opt>
          </div>
        </Row>
        <Row label="Acento">
          <div style={{display: "flex", gap: 5}}>
            <Opt v="orange" cur={tweaks.accent} onChange={x => setTweak("accent", x)}>Laranja</Opt>
            <Opt v="blue" cur={tweaks.accent} onChange={x => setTweak("accent", x)}>Azul</Opt>
            <Opt v="green" cur={tweaks.accent} onChange={x => setTweak("accent", x)}>Verde</Opt>
          </div>
        </Row>
        <Row label="Inspector">
          <div style={{display: "flex", gap: 5}}>
            <Opt v={true}  cur={tweaks.showInspector} onChange={x => setTweak("showInspector", x)}>Visível</Opt>
            <Opt v={false} cur={tweaks.showInspector} onChange={x => setTweak("showInspector", x)}>Oculto</Opt>
          </div>
        </Row>
      </div>
    </div>
  );
}

window.TweaksPanel = TweaksPanel;
