(function registerGovGoHistoryProvider() {
  const {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} = React;

  const HistoryContext = createContext({
    status: "idle",
    history: [],
    error: "",
    loadHistory: async () => [],
    saveHistory: async () => null,
    removeHistory: async () => null,
    loadHistoryDetail: async () => null,
  });

  function normalizeDateLabel(value) {
    const text = String(value || "").trim();
    if (!text) {
      return "";
    }
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) {
      return text;
    }
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  function relativeDateLabel(value) {
    const text = String(value || "").trim();
    if (!text) {
      return "";
    }
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) {
      return text;
    }
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return "agora";
    if (minutes < 60) return `ha ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `ha ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "ontem";
    if (days < 7) return `ha ${days} dias`;
    return normalizeDateLabel(value).slice(0, 10);
  }

  function normalizeHistoryItem(item) {
    const source = item || {};
    const promptId = source.promptId || source.prompt_id || source.id || "";
    const query = String(source.query || source.text || "").trim();
    const title = String(source.title || query || "Busca por filtros").trim();
    const resultCount = Number(source.resultCount ?? source.result_count ?? source.hits ?? 0) || 0;
    const createdAt = source.createdAt || source.created_at || "";
    const config = source.config && typeof source.config === "object" ? source.config : {};
    const filters = source.filters && typeof source.filters === "object" ? source.filters : (config.uiFilters || {});
    return {
      ...source,
      id: promptId,
      promptId,
      title,
      text: query,
      query,
      resultCount,
      hits: resultCount,
      createdAt,
      createdAtLabel: normalizeDateLabel(createdAt),
      when: relativeDateLabel(createdAt),
      config: {
        ...config,
        query,
        uiFilters: filters || {},
      },
      filters: filters || {},
    };
  }

  function mergeHistory(items) {
    const seen = new Set();
    const merged = [];
    (Array.isArray(items) ? items : []).forEach((item) => {
      const historyItem = normalizeHistoryItem(item);
      if (!historyItem.promptId || seen.has(String(historyItem.promptId))) {
        return;
      }
      seen.add(String(historyItem.promptId));
      merged.push(historyItem);
    });
    return merged;
  }

  function GovGoHistoryProvider({children}) {
    const auth = window.useGovGoAuth ? window.useGovGoAuth() : {status: "anonymous"};
    const [status, setStatus] = useState("idle");
    const [history, setHistory] = useState([]);
    const [error, setError] = useState("");
    const loadRetryRef = useRef(0);

    const applyHistory = useCallback((items) => {
      setHistory(mergeHistory(items));
    }, []);

    const loadHistory = useCallback(async () => {
      if (!window.GovGoUserApi || auth.status !== "authenticated") {
        applyHistory([]);
        setStatus("idle");
        return [];
      }
      setStatus("loading");
      setError("");
      try {
        const payload = await window.GovGoUserApi.loadHistory();
        const items = payload.history || [];
        applyHistory(items);
        loadRetryRef.current = 0;
        setStatus("ready");
        return items;
      } catch (err) {
        const message = err.message || "Nao foi possivel carregar historico.";
        if (message === "Failed to fetch" && loadRetryRef.current < 3) {
          loadRetryRef.current += 1;
          setStatus("loading");
          setError("");
          window.setTimeout(() => loadHistory(), 800);
          return [];
        }
        setStatus("error");
        setError(message);
        return [];
      }
    }, [auth.status, applyHistory]);

    useEffect(() => {
      if (auth.status === "authenticated") {
        loadHistory();
        return;
      }
      applyHistory([]);
      loadRetryRef.current = 0;
      setStatus("idle");
      setError("");
    }, [auth.status, loadHistory, applyHistory]);

    const saveHistory = useCallback(async (payload) => {
      if (auth.status !== "authenticated" || !window.GovGoUserApi?.saveHistory) {
        return null;
      }
      try {
        const response = await window.GovGoUserApi.saveHistory(payload || {});
        if (Array.isArray(response.history)) {
          applyHistory(response.history);
          setStatus("ready");
        }
        return response;
      } catch (err) {
        console.warn("Falha ao salvar historico", err);
        return null;
      }
    }, [auth.status, applyHistory]);

    const removeHistory = useCallback(async (value) => {
      if (auth.status !== "authenticated") {
        throw new Error("Entre para alterar o historico.");
      }
      const promptId = value && typeof value === "object" ? value.promptId || value.id : value;
      if (!promptId) {
        throw new Error("Item do historico nao encontrado.");
      }
      setHistory((current) => current.filter((item) => String(item.promptId) !== String(promptId)));
      setStatus("saving");
      setError("");
      try {
        const payload = await window.GovGoUserApi.deleteHistory(promptId);
        if (Array.isArray(payload.history)) {
          applyHistory(payload.history);
        }
        setStatus("ready");
        return payload;
      } catch (err) {
        const message = err.message || "Nao foi possivel remover historico.";
        try {
          const payload = await window.GovGoUserApi.loadHistory();
          applyHistory(payload.history || []);
        } catch (_) {}
        setStatus("error");
        setError(message);
        throw err;
      }
    }, [auth.status, applyHistory]);

    const loadHistoryDetail = useCallback(async (value) => {
      const promptId = value && typeof value === "object" ? value.promptId || value.id : value;
      if (!promptId) {
        throw new Error("Item do historico nao encontrado.");
      }
      if (!window.GovGoUserApi?.loadHistoryDetail) {
        throw new Error("API de historico indisponivel.");
      }
      return window.GovGoUserApi.loadHistoryDetail(promptId);
    }, []);

    const value = useMemo(() => ({
      status,
      history,
      error,
      loadHistory,
      saveHistory,
      removeHistory,
      loadHistoryDetail,
    }), [status, history, error, loadHistory, saveHistory, removeHistory, loadHistoryDetail]);

    return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>;
  }

  function useGovGoHistory() {
    return useContext(HistoryContext);
  }

  window.GovGoHistoryProvider = GovGoHistoryProvider;
  window.useGovGoHistory = useGovGoHistory;
})();
