const { useEffect: useBuscaDetalheEffect } = React;

function BuscaDetalhePage({ route, navigate }) {
  const lookup = route?.params?.rank || "";
  const edital = window.GovGoSearchUiAdapter?.findRememberedEdital
    ? window.GovGoSearchUiAdapter.findRememberedEdital(lookup)
    : null;

  useBuscaDetalheEffect(() => {
    window._govgoBuscaSearch = (query, searchType) => {
      if (window.GovGoSearchUiAdapter?.setPendingSearch) {
        window.GovGoSearchUiAdapter.setPendingSearch(query, searchType);
      }

      if (navigate) {
        navigate("busca");
        return Promise.resolve({ pending: true });
      }
      window.location.hash = "#/busca";
      return Promise.resolve({ pending: true });
    };

    return () => { window._govgoBuscaSearch = null; };
  }, [navigate]);

  if (!edital) {
    return (
      <div className="govgo-page-fallback">
        <div className="govgo-page-fallback__card">
          <h1 className="govgo-page-fallback__title">Resultado nao encontrado</h1>
          <p className="govgo-page-fallback__desc">Abra um edital a partir da lista de Busca para carregar o detalhe com dados reais da ultima consulta.</p>
          <div style={{ marginTop: 16 }}>
            <Button kind="primary" size="sm" icon={<Icon.search size={13} />} onClick={() => {
              if (navigate) {
                navigate("busca");
                return;
              }
              window.location.hash = "#/busca";
            }}>
              Voltar para Busca
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <EditalDetail edital={edital} />;
}

window.BuscaDetalhePage = BuscaDetalhePage;
