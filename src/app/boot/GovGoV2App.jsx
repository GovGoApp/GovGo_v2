const { useState: useGovGoState, useEffect: useGovGoEffect } = React;

function GovGoV2App() {
  const [route, setRoute] = useGovGoState(() => window.resolveGovGoRoute(window.location.hash));
  const auth = window.useGovGoAuth ? window.useGovGoAuth() : { status: "anonymous" };

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

  useGovGoEffect(() => {
    if (!auth || auth.status === "loading") {
      return;
    }
    if (route.requiresAuth && auth.status !== "authenticated") {
      navigate("login", { replace: true, params: { next: route.hash } });
      return;
    }
    if (route.key === "login" && auth.status === "authenticated") {
      const next = route.params && route.params.next;
      if (next && typeof next === "string" && next.startsWith("#/") && !next.startsWith("#/login")) {
        window.location.hash = next;
        return;
      }
      navigate("inicio", { replace: true });
    }
  }, [auth && auth.status, route.key, route.hash]);

  if (auth && auth.status === "loading") {
    return window.AuthLoadingScreen ? <AuthLoadingScreen /> : null;
  }

  return <AppShell route={route} navigate={navigate} />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <GovGoAuthProvider>
    <GovGoFavoritesProvider>
      <GovGoV2App />
    </GovGoFavoritesProvider>
  </GovGoAuthProvider>
);
