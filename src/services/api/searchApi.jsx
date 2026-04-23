(function registerGovGoSearchApi() {
  async function runSearch(formState) {
    if (!window.GovGoSearchContracts) {
      throw new Error("GovGoSearchContracts indisponivel.");
    }

    const response = await fetch("/api/search", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(window.GovGoSearchContracts.toApiPayload(formState)),
    });

    let payload;
    try {
      payload = await response.json();
    } catch (error) {
      throw new Error("A API de Busca retornou um JSON invalido.");
    }

    if (!response.ok && !payload.error) {
      throw new Error(`Falha HTTP ${response.status} ao executar a Busca.`);
    }

    return payload;
  }

  window.GovGoSearchApi = { runSearch };
})();