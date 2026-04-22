function InicioPage({ navigate }) {
  return <ModeHome onMode={(legacyMode) => navigate(window.legacyModeToRouteKey(legacyMode))} />;
}

window.InicioPage = InicioPage;