const { useState: useGovGoState, useEffect: useGovGoEffect } = React;

function GovGoV2App() {
  const [route, setRoute] = useGovGoState(() => window.resolveGovGoRoute(window.location.hash));

  const navigate = (routeKey, options = {}) => {
    const nextHash = window.buildGovGoHash(routeKey, options.params);
    if (options.replace) {
      window.history.replaceState(null, "", nextHash);
      setRoute(window.resolveGovGoRoute(nextHash));
      return;
    }
    if (window.location.hash === nextHash) {
      setRoute(window.resolveGovGoRoute(nextHash));
      return;
    }
    window.location.hash = nextHash;
  };

  useGovGoEffect(() => {
    const onHashChange = () => setRoute(window.resolveGovGoRoute(window.location.hash));
    window.addEventListener("hashchange", onHashChange);

    if (!window.location.hash) {
      const initialHash = window.buildGovGoHash("inicio");
      window.history.replaceState(null, "", initialHash);
      setRoute(window.resolveGovGoRoute(initialHash));
    } else {
      setRoute(window.resolveGovGoRoute(window.location.hash));
    }

    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useGovGoEffect(() => {
    document.title = `GovGo v2 — ${route.title}`;
  }, [route.title]);

  return <AppShell route={route} navigate={navigate} />;
}

ReactDOM.createRoot(document.getElementById("root")).render(<GovGoV2App />);