(function registerGovGoRoutes() {
  const routeConfig = {
    inicio: {
      key: "inicio",
      title: "Início",
      mode: "home",
      componentName: "InicioPage",
      withSearchRail: false,
    },
    busca: {
      key: "busca",
      title: "Busca",
      mode: "busca",
      componentName: "BuscaPage",
      withSearchRail: true,
    },
    "busca-detalhe": {
      key: "busca-detalhe",
      title: "Busca Detalhe",
      mode: "busca",
      componentName: "BuscaDetalhePage",
      withSearchRail: true,
    },
    empresas: {
      key: "empresas",
      title: "Empresas",
      mode: "fornecedores",
      componentName: "EmpresasPage",
      withSearchRail: false,
    },
    radar: {
      key: "radar",
      title: "Radar",
      mode: "mercado",
      componentName: "RadarPage",
      withSearchRail: false,
    },
    relatorios: {
      key: "relatorios",
      title: "Relatórios",
      mode: "relatorios",
      componentName: "RelatoriosPage",
      withSearchRail: false,
    },
    "design-system": {
      key: "design-system",
      title: "Design System",
      mode: "designsystem",
      componentName: "DesignSystemPage",
      withSearchRail: false,
    },
  };

  function decodeRouteSegment(value) {
    try {
      return decodeURIComponent(value || "");
    } catch (error) {
      return value || "";
    }
  }

  const legacyModeToRoute = {
    home: "inicio",
    busca: "busca",
    oportunidades: "busca",
    fornecedores: "empresas",
    mercado: "radar",
    relatorios: "relatorios",
    designsystem: "design-system",
  };

  const routeToLegacyMode = Object.entries(legacyModeToRoute).reduce((acc, [legacyMode, routeKey]) => {
    acc[routeKey] = legacyMode;
    return acc;
  }, {});
  routeToLegacyMode.busca = "busca";

  function parseHash(hash) {
    const normalized = (hash || "").replace(/^#/, "").replace(/^\//, "");
    if (!normalized) {
      return { key: "inicio", params: {} };
    }

    const parts = normalized.split("/").filter(Boolean);
    if (parts[0] === "busca" && parts[1] === "detalhe") {
      return { key: "busca-detalhe", params: { rank: decodeRouteSegment(parts[2] || "1") } };
    }
    if (parts[0] === "busca-detalhe") {
      return { key: "busca-detalhe", params: { rank: decodeRouteSegment(parts[1] || "1") } };
    }
    if (routeConfig[parts[0]]) {
      return { key: parts[0], params: {} };
    }
    return { key: "inicio", params: {} };
  }

  function buildHash(routeKey, params = {}) {
    if (routeKey === "busca-detalhe") {
      const key = params.id || params.rank || 1;
      return `#/busca/detalhe/${encodeURIComponent(String(key))}`;
    }
    if (routeConfig[routeKey]) {
      return `#/${routeKey}`;
    }
    return "#/inicio";
  }

  function resolveRoute(hash) {
    const parsed = parseHash(hash);
    const config = routeConfig[parsed.key] || routeConfig.inicio;
    return {
      ...config,
      params: parsed.params,
      hash: buildHash(config.key, parsed.params),
    };
  }

  window.GOVGO_ROUTE_CONFIG = routeConfig;
  window.legacyModeToRouteKey = (legacyMode) => legacyModeToRoute[legacyMode] || "inicio";
  window.routeKeyToLegacyMode = (routeKey) => routeToLegacyMode[routeKey] || "home";
  window.buildGovGoHash = buildHash;
  window.resolveGovGoRoute = resolveRoute;
})();
