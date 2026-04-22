function BuscaDetalhePage({ route }) {
  const rank = Number(route?.params?.rank || 1);
  const editais = Array.isArray(DATA?.editais) ? DATA.editais : [];
  const edital = editais.find((item) => item.rank === rank) || editais[0] || null;

  if (!edital) {
    return (
      <div className="govgo-page-fallback">
        <div className="govgo-page-fallback__card">
          <h1 className="govgo-page-fallback__title">Nenhum edital disponível</h1>
          <p className="govgo-page-fallback__desc">A página de detalhe precisa de um edital carregado em memória para ser exibida.</p>
        </div>
      </div>
    );
  }

  return <EditalDetail edital={edital} />;
}

window.BuscaDetalhePage = BuscaDetalhePage;