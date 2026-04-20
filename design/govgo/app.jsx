// App root
const { useState: uSa, useEffect: uEa } = React;

function App() {
  const [tweaks, setTweaks] = uSa(window.__TWEAKS || {});
  const [activityOpen, setActivityOpen] = uSa(true);
  const mode = tweaks.mode || "mercado";

  const setTweak = (k, v) => {
    const next = {...tweaks, [k]: v};
    setTweaks(next);
    window.parent.postMessage({type: "__edit_mode_set_keys", edits: {[k]: v}}, "*");
  };

  // Accent override via tweak
  uEa(() => {
    const root = document.documentElement;
    if (tweaks.accent === "blue") {
      root.style.setProperty("--orange", "#1F6FD4");
      root.style.setProperty("--orange-600", "#185BB2");
      root.style.setProperty("--orange-700", "#134A94");
      root.style.setProperty("--orange-50", "#EEF3FC");
      root.style.setProperty("--orange-100", "#D4E1F5");
    } else if (tweaks.accent === "green") {
      root.style.setProperty("--orange", "#2E7D32");
      root.style.setProperty("--orange-600", "#276829");
      root.style.setProperty("--orange-700", "#1F5622");
      root.style.setProperty("--orange-50", "#E8F3E9");
      root.style.setProperty("--orange-100", "#CDE5CF");
    } else {
      root.style.setProperty("--orange", "#FF5722");
      root.style.setProperty("--orange-600", "#E8481A");
      root.style.setProperty("--orange-700", "#C73C15");
      root.style.setProperty("--orange-50", "#FFF1EC");
      root.style.setProperty("--orange-100", "#FFE1D5");
    }
  }, [tweaks.accent]);

  const modeEls = {
    oportunidades: <ModeOportunidades/>,
    fornecedores:  <ModeFornecedores/>,
    mercado:       <ModeMercado/>,
    relatorios:    <ModeRelatorios/>,
    designsystem:  <ModeDesignSystem/>,
  };

  const tpl = tweaks.showInspector === false
    ? "278px 1fr"
    : "278px 1fr";

  return (
    <div data-screen-label={"GovGo v2 · " + mode} style={{
      minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--workspace)",
      fontSize: tweaks.density === "compact" ? 12.5 : 13.5,
    }}>
      <TopBar mode={mode} onCommand={() => {}}/>
      <div style={{
        display: "grid",
        gridTemplateColumns: mode === "oportunidades"
          ? `72px 300px 1fr ${activityOpen ? "300px" : "44px"}`
          : "72px 1fr",
        flex: 1, minHeight: 0,
      }}>
        <LeftRail mode={mode} onMode={m => setTweak("mode", m)}/>
        {mode === "oportunidades" && <SearchRail/>}
        <main style={{minWidth: 0, overflow: "hidden"}}>
          {modeEls[mode]}
        </main>
        {mode === "oportunidades" && <ActivityRail open={activityOpen} onToggle={() => setActivityOpen(!activityOpen)}/>}
      </div>
      <TweaksPanel tweaks={tweaks} setTweak={setTweak}/>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
