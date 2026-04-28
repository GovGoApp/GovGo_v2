// App root
const { useState: uSa, useEffect: uEa } = React;

function App() {
  const [tweaks, setTweaks] = uSa(window.__TWEAKS || {});
  const [activityOpen, setActivityOpen] = uSa(true);
  const mode = (tweaks.mode === "oportunidades" ? "busca" : tweaks.mode) || "home";

  const setTweak = (k, v) => {
    const next = {...tweaks, [k]: v};
    setTweaks(next);
    window.parent.postMessage({type: "__edit_mode_set_keys", edits: {[k]: v}}, "*");
  };

  // Accent override via tweak — reapplied when theme changes
  uEa(() => {
    const root = document.documentElement;
    const apply = () => {
      const isDark = root.getAttribute("data-theme") === "dark";
      const palettes = {
        blue:   { o: "#1F6FD4", o600: "#185BB2", o700: isDark ? "#7FB0F0" : "#134A94",
                  o50: isDark ? "#17243A" : "#EEF3FC", o100: isDark ? "#1E3452" : "#D4E1F5" },
        green:  { o: "#2E7D32", o600: "#276829", o700: isDark ? "#7BC77E" : "#1F5622",
                  o50: isDark ? "#17301A" : "#E8F3E9", o100: isDark ? "#234B27" : "#CDE5CF" },
        orange: { o: isDark ? "#FF6A3D" : "#FF5722", o600: "#E8481A", o700: isDark ? "#FF8A66" : "#C73C15",
                  o50: isDark ? "#3A1A10" : "#FFF1EC", o100: isDark ? "#4A2418" : "#FFE1D5" },
      };
      const p = palettes[tweaks.accent] || palettes.orange;
      root.style.setProperty("--orange", p.o);
      root.style.setProperty("--orange-600", p.o600);
      root.style.setProperty("--orange-700", p.o700);
      root.style.setProperty("--orange-50", p.o50);
      root.style.setProperty("--orange-100", p.o100);
    };
    apply();
    const mo = new MutationObserver(apply);
    mo.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, [tweaks.accent]);

  const modeEls = {
    home:          <ModeHome onMode={m => setTweak("mode", m)}/>,
    busca:         <ModeBusca/>,
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
        gridTemplateColumns: mode === "busca"
          ? "72px 320px 1fr"
          : "72px 1fr",
        flex: 1, minHeight: 0,
      }}>
        <LeftRail mode={mode} onMode={m => setTweak("mode", m)}/>
        {mode === "busca" && <SearchRail/>}
        <main style={{minWidth: 0, overflow: "hidden"}}>
          {modeEls[mode]}
        </main>
      </div>
      <TweaksPanel tweaks={tweaks} setTweak={setTweak}/>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
