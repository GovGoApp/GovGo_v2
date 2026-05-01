function InicioPage({ navigate }) {
  const Component = window.InicioDashboard || window.ModeHome;
  return <Component onMode={(legacyMode) => navigate(window.legacyModeToRouteKey(legacyMode))} />;
}

window.InicioPage = InicioPage;
