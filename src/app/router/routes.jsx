(function registerGovGoRoutes() {
  const routeConfig = {
    inicio: {
      key: "inicio",
      title: "Início",
      mode: "home",
      componentName: "InicioPage",
      withSearchRail: false,
    },
    login: {
      key: "login",
      title: "Entrar",
      mode: "auth",
      componentName: "AuthPage",
      withSearchRail: false,
      withoutShell: true,
      requiresAuth: false,
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

  function parseQueryString(value) {
    const params = {};
    if (!value) {
      return params;
    }
    try {
      const parsed = new URLSearchParams(value);
      for (const [key, paramValue] of parsed.entries()) {
        params[key] = paramValue;
      }
    } catch (error) {}
    return params;
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

    if (/^(access_token|refresh_token|type|code)=/.test(normalized)) {
      const params = parseQueryString(normalized);
      return { key: "login", params: { ...params, mode: params.type === "recovery" ? "reset" : "signin" } };
    }

    const queryStart = normalized.indexOf("?");
    const pathPart = queryStart >= 0 ? normalized.slice(0, queryStart) : normalized;
    const queryParams = queryStart >= 0 ? parseQueryString(normalized.slice(queryStart + 1)) : {};
    const parts = pathPart.split("/").filter(Boolean);
    if (parts[0] === "login") {
      return { key: "login", params: { mode: queryParams.mode || "signin", ...queryParams } };
    }
    if (parts[0] === "cadastro" || parts[0] === "signup") {
      return { key: "login", params: { mode: "signup", ...queryParams } };
    }
    if (parts[0] === "reset") {
      return { key: "login", params: { mode: "reset", ...queryParams } };
    }
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
    if (routeKey === "login") {
      const query = new URLSearchParams();
      if (params.mode && params.mode !== "signin") {
        query.set("mode", params.mode);
      }
      if (params.next) {
        query.set("next", params.next);
      }
      const queryString = query.toString();
      return queryString ? `#/login?${queryString}` : "#/login";
    }
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
      requiresAuth: config.requiresAuth !== false,
      withoutShell: !!config.withoutShell,
    };
  }

  window.GOVGO_ROUTE_CONFIG = routeConfig;
  window.legacyModeToRouteKey = (legacyMode) => legacyModeToRoute[legacyMode] || "inicio";
  window.routeKeyToLegacyMode = (routeKey) => routeToLegacyMode[routeKey] || "home";
  window.buildGovGoHash = buildHash;
  window.resolveGovGoRoute = resolveRoute;
})();
