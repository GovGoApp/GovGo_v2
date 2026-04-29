function AppShell({ route, navigate }) {
  const PageComponent = window[route.componentName];
  const page = PageComponent
    ? <PageComponent route={route} navigate={navigate} />
    : (
      <div className="govgo-page-fallback">
        <div className="govgo-page-fallback__card">
          <h1 className="govgo-page-fallback__title">Página indisponível</h1>
          <p className="govgo-page-fallback__desc">A página solicitada ainda não foi registrada no frontend real da v2.</p>
        </div>
      </div>
    );

  if (route.withoutShell) {
    return page;
  }

  const gridTemplateColumns = route.withSearchRail ? "72px 320px 1fr" : "72px 1fr";

  return (
    <div
      data-screen-label={`GovGo v2 · ${route.title}`}
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--workspace)",
        overflow: "hidden",
      }}
    >
      <TopBar mode={route.mode} navigate={navigate} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns,
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <LeftRail mode={route.mode} onMode={(legacyMode) => navigate(window.legacyModeToRouteKey(legacyMode))} />
        {route.withSearchRail ? <SearchRail navigate={navigate} /> : null}
        <main style={{ minWidth: 0, minHeight: 0, overflow: "hidden" }}>{page}</main>
      </div>
    </div>
  );
}

window.AppShell = AppShell;
