(function registerGovGoFavoritesProvider() {
  const {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} = React;

  const FavoritesContext = createContext({
    status: "idle",
    favorites: [],
    favoriteIds: new Set(),
    error: "",
    loadFavorites: async () => {},
    isFavorite: () => false,
    addFavorite: async () => {},
    removeFavorite: async () => {},
    toggleFavorite: async () => {},
    loadFavoriteDetail: async () => {},
  });

  function looksLikePncpId(value) {
    return /^\d{14}-\d-\d{6}\/\d{4}$/.test(String(value || "").trim());
  }

  function pickPncpId(value) {
    if (!value) {
      return "";
    }
    if (typeof value === "string" || typeof value === "number") {
      return String(value).trim();
    }
    const candidates = [
      value.pncpId,
      value.numero_controle_pncp,
      value.numeroControlePncp,
      value.raw?.details?.numero_controle_pncp,
      value.raw?.details?.numero_controle,
      value.details?.numero_controle_pncp,
      value.details?.numero_controle,
      value.raw?.numero_controle_pncp,
      value.raw?.numero_controle,
      value.raw?.id,
      value.itemId,
      value.id,
    ].map((candidate) => String(candidate || "").trim()).filter(Boolean);
    return candidates.find(looksLikePncpId) || candidates[0] || "";
  }

  function normalizeFavorite(item) {
    const source = item || {};
    const pncpId = pickPncpId(source);
    return {
      ...source,
      id: pncpId,
      pncpId,
      title: source.title || source.summary || source.objectSummary || source.rotulo || source.objeto || source.objeto_compra || pncpId,
      summary: source.summary || source.objectSummary || source.rotulo || source.title || "",
      objectSummary: source.objectSummary || source.summary || source.rotulo || source.title || "",
      objectFull: source.objectFull || source.objeto || source.objeto_compra || source.raw?.objeto_compra || "",
      objeto: source.objeto || source.objectFull || source.objeto_compra || source.raw?.objeto_compra || "",
      summaryPending: Boolean(source.summaryPending),
      organization: source.organization || source.org || source.orgao_entidade_razao_social || "-",
      municipality: source.municipality || source.mun || source.unidade_orgao_municipio_nome || "-",
      uf: source.uf || source.unidade_orgao_uf_sigla || "-",
      date: source.date || source.closingDateLabel || source.data_encerramento_proposta || "",
    };
  }

  function favoriteFromEdital(edital) {
    const pncpId = pickPncpId(edital);
    return normalizeFavorite({
      id: pncpId,
      pncpId,
      title: edital?.objeto || edital?.title || edital?.raw?.details?.objeto_compra || edital?.raw?.objeto_compra || pncpId,
      objectFull: edital?.objeto || edital?.title || edital?.raw?.details?.objeto_compra || edital?.raw?.objeto_compra || "",
      objeto: edital?.objeto || edital?.title || edital?.raw?.details?.objeto_compra || edital?.raw?.objeto_compra || "",
      organization: edital?.org || edital?.organization || edital?.raw?.details?.orgao_entidade_razao_social || "-",
      municipality: edital?.mun || edital?.municipality || edital?.raw?.details?.unidade_orgao_municipio_nome || "-",
      uf: edital?.uf || edital?.raw?.details?.unidade_orgao_uf_sigla || "-",
      date: edital?.end || edital?.closingDateLabel || edital?.raw?.details?.data_encerramento_proposta || "",
      summaryPending: true,
      raw: edital,
    });
  }

  function mergeFavorites(items) {
    const seen = new Set();
    const merged = [];
    (Array.isArray(items) ? items : []).forEach((item) => {
      const favorite = normalizeFavorite(item);
      if (!favorite.pncpId || seen.has(favorite.pncpId)) {
        return;
      }
      seen.add(favorite.pncpId);
      merged.push(favorite);
    });
    return merged;
  }

  function GovGoFavoritesProvider({children}) {
    const auth = window.useGovGoAuth ? window.useGovGoAuth() : {status: "anonymous"};
    const [status, setStatus] = useState("idle");
    const [favorites, setFavorites] = useState([]);
    const [error, setError] = useState("");
    const loadRetryRef = useRef(0);

    const applyFavorites = useCallback((items) => {
      setFavorites(mergeFavorites(items));
    }, []);

    const loadFavorites = useCallback(async () => {
      if (!window.GovGoUserApi || auth.status !== "authenticated") {
        applyFavorites([]);
        setStatus("idle");
        return [];
      }
      setStatus("loading");
      setError("");
      try {
        const payload = await window.GovGoUserApi.loadFavorites();
        const items = payload.favorites || [];
        applyFavorites(items);
        loadRetryRef.current = 0;
        setStatus("ready");
        return items;
      } catch (err) {
        const message = err.message || "Nao foi possivel carregar favoritos.";
        if (message === "Failed to fetch" && loadRetryRef.current < 3) {
          loadRetryRef.current += 1;
          setStatus("loading");
          setError("");
          window.setTimeout(() => loadFavorites(), 800);
          return [];
        }
        setStatus("error");
        setError(message);
        return [];
      }
    }, [auth.status, applyFavorites]);

    useEffect(() => {
      if (auth.status === "authenticated") {
        loadFavorites();
        return;
      }
      applyFavorites([]);
      loadRetryRef.current = 0;
      setStatus("idle");
      setError("");
    }, [auth.status, loadFavorites, applyFavorites]);

    const favoriteIds = useMemo(() => new Set(favorites.map((item) => item.pncpId)), [favorites]);

    const isFavorite = useCallback((value) => {
      const pncpId = pickPncpId(value);
      return Boolean(pncpId && favoriteIds.has(pncpId));
    }, [favoriteIds]);

    const addFavorite = useCallback(async (edital) => {
      if (auth.status !== "authenticated") {
        throw new Error("Entre para salvar favoritos.");
      }
      const optimistic = favoriteFromEdital(edital);
      if (!optimistic.pncpId || !looksLikePncpId(optimistic.pncpId)) {
        throw new Error("PNCP valido do edital nao encontrado.");
      }
      setFavorites((current) => mergeFavorites([optimistic, ...current]));
      setStatus("saving");
      setError("");
      try {
        const payload = await window.GovGoUserApi.addFavorite({
          pncpId: optimistic.pncpId,
          title: optimistic.title,
          objeto: optimistic.objeto || optimistic.objectFull || optimistic.title,
        });
        applyFavorites([...(payload.favorites || []), optimistic]);
        setStatus("ready");
        return payload;
      } catch (err) {
        const message = err.message || "Nao foi possivel salvar favorito.";
        try {
          const payload = await window.GovGoUserApi.loadFavorites();
          applyFavorites(payload.favorites || []);
        } catch (_) {}
        setStatus("error");
        setError(message);
        throw err;
      }
    }, [auth.status, applyFavorites]);

    const removeFavorite = useCallback(async (value) => {
      if (auth.status !== "authenticated") {
        throw new Error("Entre para alterar favoritos.");
      }
      const pncpId = pickPncpId(value);
      if (!pncpId) {
        throw new Error("PNCP do favorito nao encontrado.");
      }
      setFavorites((current) => current.filter((item) => item.pncpId !== pncpId));
      setStatus("saving");
      setError("");
      try {
        const payload = await window.GovGoUserApi.removeFavorite(pncpId);
        if (Array.isArray(payload.favorites)) {
          applyFavorites(payload.favorites);
        }
        setStatus("ready");
        return payload;
      } catch (err) {
        const message = err.message || "Nao foi possivel remover favorito.";
        try {
          const payload = await window.GovGoUserApi.loadFavorites();
          applyFavorites(payload.favorites || []);
        } catch (_) {}
        setStatus("error");
        setError(message);
        throw err;
      }
    }, [auth.status, applyFavorites]);

    const toggleFavorite = useCallback(async (edital) => {
      return isFavorite(edital) ? removeFavorite(edital) : addFavorite(edital);
    }, [isFavorite, addFavorite, removeFavorite]);

    const loadFavoriteDetail = useCallback(async (value) => {
      const pncpId = pickPncpId(value);
      if (!pncpId) {
        throw new Error("PNCP do favorito nao encontrado.");
      }
      if (!window.GovGoUserApi?.loadFavoriteDetail) {
        throw new Error("API de detalhe do favorito indisponivel.");
      }
      return window.GovGoUserApi.loadFavoriteDetail(pncpId);
    }, []);

    const value = useMemo(() => ({
      status,
      favorites,
      favoriteIds,
      error,
      loadFavorites,
      isFavorite,
      addFavorite,
      removeFavorite,
      toggleFavorite,
      loadFavoriteDetail,
    }), [status, favorites, favoriteIds, error, loadFavorites, isFavorite, addFavorite, removeFavorite, toggleFavorite, loadFavoriteDetail]);

    return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
  }

  function useGovGoFavorites() {
    return useContext(FavoritesContext);
  }

  window.GovGoFavoritesProvider = GovGoFavoritesProvider;
  window.useGovGoFavorites = useGovGoFavorites;
})();
