function RelatoriosPage() {
  if (window.RelatoriosWorkspace) {
    return <RelatoriosWorkspace />;
  }
  return <ModeRelatorios />;
}

window.RelatoriosPage = RelatoriosPage;
