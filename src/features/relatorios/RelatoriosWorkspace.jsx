function ReportsTabsV2({tabs, active, onActivate, onClose, onNew}) {
  const scrollRef = React.useRef(null);
  const visibleTabs = tabs.filter((tab) => tab.id !== "intro");

  React.useEffect(() => {
    const node = scrollRef.current;
    if (!node) return undefined;

    const handleWheel = (event) => {
      if (node.scrollWidth <= node.clientWidth) return;
      const delta = Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      if (!delta) return;
      node.scrollLeft += delta;
      event.preventDefault();
    };

    node.addEventListener("wheel", handleWheel, {passive: false});
    return () => node.removeEventListener("wheel", handleWheel);
  }, []);

  return (
    <div ref={scrollRef} style={{
      display: "flex", alignItems: "flex-end", gap: 2,
      borderBottom: "1px solid var(--hairline)",
      padding: "0 8px", background: "var(--surface-sunk)",
      overflowX: "auto", overflowY: "hidden", flexShrink: 0,
      scrollbarWidth: "thin",
      scrollBehavior: "smooth",
    }}>
      {visibleTabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <div key={tab.id} onClick={() => onActivate(tab.id)}
            style={{
              flex: "0 0 auto",
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "9px 12px", marginTop: 6,
              background: isActive ? "var(--paper)" : "transparent",
              border: isActive ? "1px solid var(--hairline)" : "1px solid transparent",
              borderBottom: isActive ? "1px solid var(--paper)" : "1px solid transparent",
              borderRadius: "8px 8px 0 0",
              cursor: "pointer", position: "relative", top: 1,
              fontSize: 12.5, fontWeight: 500,
              color: isActive ? "var(--ink-1)" : "var(--ink-3)",
              maxWidth: 340, minWidth: 0,
            }}>
            <span style={{color: tab.status === "error" ? "var(--risk)" : "var(--deep-blue)", display: "inline-flex"}}>
              {tab.status === "running" ? <CircularProgress size={16}/> : <Icon.terminal size={18}/>}
            </span>
            <span style={{overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 230}}>
              {tab.title}
            </span>
            {tab.count != null && <span className="mono" style={{fontSize: 10.5, color: "var(--ink-3)", fontWeight: 600}}>{tab.count}</span>}
            {tab.closable !== false && (
              <button onClick={(event) => { event.stopPropagation(); onClose(tab.id); }} style={{
                all: "unset", cursor: "pointer", padding: 2, borderRadius: 3,
                display: "inline-flex", color: "var(--ink-3)", marginLeft: 2, flexShrink: 0,
              }}>
                <Icon.close size={13}/>
              </button>
            )}
          </div>
        );
      })}
      <button onClick={onNew} title="Nova consulta" style={{
        all: "unset", cursor: "pointer",
        flex: "0 0 auto",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 30, height: 30, marginTop: 6, borderRadius: 6,
        color: "var(--orange)",
      }}>
        <Icon.plus size={17}/>
      </button>
      <span style={{flex: 1}}/>
    </div>
  );
}

const REPORTS_INTRO_TAB = {id: "intro", title: "Nova consulta", count: null, status: "idle", closable: false};
const REPORTS_INTRO_REPORT = {
  id: "intro",
  title: "Nova consulta",
  question: "",
  sql: "",
  executedSql: "",
  columns: [],
  rows: [],
  rowCount: 0,
  elapsedMs: 0,
  status: "idle",
  error: "",
  saved: false,
};

function reportStorageKey(auth) {
  const user = auth?.user || {};
  const identity = user.uid || user.email || "anon";
  return `govgo:v2:relatorios:workspace:${identity}`;
}

function readWorkspaceSnapshot(storageKey) {
  const memoryStore = window.__govgoReportsWorkspaceState || {};
  try {
    const raw = window.localStorage?.getItem(storageKey);
    if (raw) return JSON.parse(raw);
  } catch (error) {
    // Fallback to in-memory state below.
  }
  return memoryStore[storageKey] || null;
}

function writeWorkspaceSnapshot(storageKey, snapshot) {
  window.__govgoReportsWorkspaceState = window.__govgoReportsWorkspaceState || {};
  window.__govgoReportsWorkspaceState[storageKey] = snapshot;
  try {
    window.localStorage?.setItem(storageKey, JSON.stringify(snapshot));
  } catch (error) {
    // In-memory persistence still covers navigation inside the current app session.
  }
}

function hasWorkspaceTabs(snapshot) {
  return Array.isArray(snapshot?.tabs) && snapshot.tabs.some((tab) => tab && tab.id && tab.id !== "intro");
}

function compactReportForStorage(report) {
  const source = report || {};
  return {
    ...source,
    columns: Array.isArray(source.columns) ? source.columns.slice(0, 80) : [],
    rows: Array.isArray(source.rows) ? source.rows.slice(0, 40) : [],
    previewRows: Array.isArray(source.previewRows) ? source.previewRows.slice(0, 40) : undefined,
  };
}

function compactChatForStorage(chat) {
  return {
    id: chat?.id || "",
    title: chat?.title || "Novo chat",
    messages: Array.isArray(chat?.messages) ? chat.messages.slice(-200) : [],
  };
}

function RelatoriosWorkspace() {
  const auth = window.useGovGoAuth ? window.useGovGoAuth() : {status: "anonymous"};
  const storageKey = React.useMemo(() => reportStorageKey(auth), [auth?.user?.uid, auth?.user?.email]);
  const skipNextPersistRef = React.useRef(false);
  const workspaceReadyRef = React.useRef(false);
  const localWorkspaceHadTabsRef = React.useRef(false);
  const reportHydrationRef = React.useRef({});
  const [question, setQuestion] = React.useState("");
  const [history, setHistory] = React.useState([]);
  const [saved, setSaved] = React.useState([]);
  const [chats, setChats] = React.useState([]);
  const [historyMode, setHistoryMode] = React.useState("chats");
  const [sidePanelMode, setSidePanelMode] = React.useState("chat");
  const [chatOpen, setChatOpen] = React.useState(true);
  const [sqlCards, setSqlCards] = React.useState({});
  const [copiedCardKey, setCopiedCardKey] = React.useState("");
  const [deletingCards, setDeletingCards] = React.useState({});
  const [deletingChats, setDeletingChats] = React.useState({});
  const [historyStatus, setHistoryStatus] = React.useState("idle");
  const [historyError, setHistoryError] = React.useState("");
  const [activeChat, setActiveChat] = React.useState({
    id: "",
    title: "Novo chat",
    messages: [],
  });
  const [activeId, setActiveId] = React.useState("intro");
  const [tabs, setTabs] = React.useState([REPORTS_INTRO_TAB]);
  const [reports, setReports] = React.useState({intro: REPORTS_INTRO_REPORT});
  const [running, setRunning] = React.useState(false);
  const [exporting, setExporting] = React.useState("");
  const [copyState, setCopyState] = React.useState("");
  const [tablePage, setTablePage] = React.useState(1);
  const chatScrollRef = React.useRef(null);

  const activeReport = reports[activeId] || reports.intro;

  const applyWorkspaceSnapshot = React.useCallback((savedState) => {
    const savedTabs = Array.isArray(savedState?.tabs) ? savedState.tabs : [];
    const restoredTabs = savedTabs
      .filter((tab) => tab && tab.id && tab.title)
      .map((tab) => ({
        id: String(tab.id),
        title: String(tab.title || "Relatorio"),
        count: tab.count ?? null,
        status: tab.status || "idle",
        closable: tab.closable !== false,
      }));
    const nextTabs = [
      REPORTS_INTRO_TAB,
      ...restoredTabs.filter((tab) => tab.id !== "intro"),
    ];
    const savedReports = savedState?.reports && typeof savedState.reports === "object" ? savedState.reports : {};
    const nextReports = {intro: REPORTS_INTRO_REPORT};
    nextTabs.forEach((tab) => {
      if (tab.id === "intro") return;
      nextReports[tab.id] = compactReportForStorage(savedReports[tab.id] || {
        id: tab.id,
        title: tab.title,
        status: tab.status || "idle",
        rows: [],
        columns: [],
      });
    });
    const nextActiveId = nextTabs.some((tab) => tab.id === savedState?.activeId) ? savedState.activeId : "intro";
    setTabs(nextTabs);
    setReports(nextReports);
      setActiveId(nextActiveId);
      setHistoryMode(["chats", "reports", "saved"].includes(savedState?.historyMode) ? savedState.historyMode : "chats");
      setSidePanelMode(["chat", "history"].includes(savedState?.sidePanelMode) ? savedState.sidePanelMode : "chat");
      setChatOpen(savedState?.chatOpen !== false);
      setActiveChat(compactChatForStorage(savedState?.activeChat || {id: "", title: "Novo chat", messages: []}));
    setQuestion("");
    return hasWorkspaceTabs(savedState);
  }, []);

  React.useLayoutEffect(() => {
    if (auth.status !== "authenticated") return;
    workspaceReadyRef.current = false;
    skipNextPersistRef.current = true;
    try {
      const savedState = readWorkspaceSnapshot(storageKey);
      localWorkspaceHadTabsRef.current = applyWorkspaceSnapshot(savedState || {});
    } catch (error) {
      localWorkspaceHadTabsRef.current = false;
      setTabs([REPORTS_INTRO_TAB]);
      setReports({intro: REPORTS_INTRO_REPORT});
      setActiveId("intro");
      setActiveChat({id: "", title: "Novo chat", messages: []});
      setQuestion("");
    }
  }, [applyWorkspaceSnapshot, auth.status, storageKey]);

  React.useEffect(() => {
    if (auth.status !== "authenticated") return;
    if (!workspaceReadyRef.current) return;
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    try {
      const tabIds = new Set(tabs.map((tab) => tab.id));
      const compactReports = {};
      Object.entries(reports || {}).forEach(([id, report]) => {
        if (tabIds.has(id)) {
          compactReports[id] = compactReportForStorage(report);
        }
      });
      const snapshot = {
        version: 1,
        updatedAt: new Date().toISOString(),
        activeId,
        historyMode,
        sidePanelMode,
        chatOpen,
        activeChat: compactChatForStorage(activeChat),
        tabs: tabs.slice(-16).map((tab) => ({
          id: tab.id,
          title: tab.title,
          count: tab.count ?? null,
          status: tab.status || "idle",
          closable: tab.closable !== false,
        })),
        reports: compactReports,
      };
      writeWorkspaceSnapshot(storageKey, snapshot);
      if (window.GovGoReportsApi?.saveWorkspace) {
        window.GovGoReportsApi.saveWorkspace({workspace: snapshot}).catch(() => {});
      }
    } catch (error) {
      // localStorage can be unavailable or full; the remote history remains authoritative.
    }
  }, [activeChat, activeId, auth.status, chatOpen, historyMode, reports, sidePanelMode, storageKey, tabs]);

  const relativeDateLabel = React.useCallback((value) => {
    const text = String(value || "").trim();
    if (!text) return "";
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return text;
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 1) return "agora";
    if (minutes < 60) return `ha ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `ha ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "ontem";
    if (days < 7) return `ha ${days} dias`;
    return new Intl.DateTimeFormat("pt-BR", {day: "2-digit", month: "2-digit"}).format(date);
  }, []);

  const titleFromQuestion = React.useCallback((value) => {
    const text = String(value || "Nova consulta").trim();
    return text.length > 62 ? `${text.slice(0, 59)}...` : text;
  }, []);

  const normalizeReport = React.useCallback((report, fallback = {}) => {
    const source = report || {};
    return {
      ...fallback,
      ...source,
      id: source.id || fallback.id || `report-${Date.now()}`,
      title: source.title || fallback.title || titleFromQuestion(source.question || fallback.question),
      subtitle: source.subtitle || fallback.subtitle || "",
      rows: Array.isArray(source.rows) ? source.rows : (Array.isArray(source.previewRows) ? source.previewRows : []),
      columns: Array.isArray(source.columns) ? source.columns : [],
      rowCount: Number(source.rowCount ?? source.row_count ?? fallback.rowCount ?? 0),
      elapsedMs: Number(source.elapsedMs ?? fallback.elapsedMs ?? 0),
      status: source.error ? "error" : (source.status || fallback.status || "ok"),
      error: source.error || fallback.error || "",
      saved: !!source.saved,
    };
  }, [titleFromQuestion]);

  const upsertReport = React.useCallback((id, report) => {
    setReports((current) => ({...current, [id]: {...(current[id] || {}), ...report}}));
  }, []);

  const upsertTab = React.useCallback((id, patch) => {
    setTabs((current) => current.map((tab) => tab.id === id ? {...tab, ...patch} : tab));
  }, []);

  const hydrateReportRows = React.useCallback((report) => {
    const id = String(report?.id || "");
    if (!id || id === "intro" || !report?.sql || !window.GovGoReportsApi?.loadReport) return;
    const loadedRows = Array.isArray(report.rows)
      ? report.rows.length
      : (Array.isArray(report.previewRows) ? report.previewRows.length : 0);
    const expectedRows = Number(report.rowCount || 0);
    if (!expectedRows || loadedRows >= expectedRows) return;
    if (reportHydrationRef.current[id]) return;

    reportHydrationRef.current[id] = "loading";
    window.GovGoReportsApi.loadReport(id)
      .then((payload) => {
        const fullReport = normalizeReport(payload.report || {}, report);
        upsertReport(id, {...fullReport, previewOnly: false});
        upsertTab(id, {
          title: fullReport.title || report.title || "Relatorio",
          count: String(fullReport.rowCount || 0),
          status: fullReport.status || "ok",
        });
        setHistory((current) => current.map((item) => String(item.id) === id ? {...item, ...(payload.report || {})} : item));
        setSaved((current) => current.map((item) => String(item.id) === id ? {...item, ...(payload.report || {})} : item));
      })
      .catch((error) => {
        upsertReport(id, {error: error.message || "Nao foi possivel carregar todas as linhas."});
      })
      .finally(() => {
        reportHydrationRef.current[id] = "done";
      });
  }, [normalizeReport, upsertReport, upsertTab]);

  const addReportTab = React.useCallback((report, tabPatch = {}) => {
    const normalized = normalizeReport(report);
    const id = normalized.id;
    const title = tabPatch.title || normalized.title || titleFromQuestion(normalized.question);
    setReports((current) => ({...current, [id]: normalized}));
    setTabs((current) => {
      if (current.some((tab) => tab.id === id)) {
        return current.map((tab) => tab.id === id ? {
          ...tab,
          title,
          count: normalized.rowCount != null ? String(normalized.rowCount) : tab.count,
          status: normalized.status || tab.status,
          ...tabPatch,
        } : tab);
      }
      return [...current, {
        id,
        title,
        count: normalized.rowCount != null ? String(normalized.rowCount) : null,
        status: normalized.status || "idle",
        closable: true,
        ...tabPatch,
      }];
    });
    setActiveId(id);
    return id;
  }, [normalizeReport, titleFromQuestion]);

  const openReport = React.useCallback((item) => {
    const report = normalizeReport({
      ...item,
      rows: item.rows || item.previewRows || [],
      previewOnly: !item.rows,
    });
    addReportTab(report, {status: report.status, count: String(report.rowCount || 0)});
    hydrateReportRows(report);
  }, [addReportTab, hydrateReportRows, normalizeReport]);

  const openReportById = React.useCallback((reportId) => {
    if (!reportId) return;
    if (reports[reportId]) {
      setActiveId(reportId);
      hydrateReportRows(reports[reportId]);
      return;
    }
    const item = history.find((entry) => String(entry.id) === String(reportId));
    if (item) {
      openReport(item);
    }
  }, [history, hydrateReportRows, openReport, reports]);

  const openChat = React.useCallback((chat) => {
    setSidePanelMode("chat");
    setChatOpen(true);
    setActiveChat({
      id: chat.id || "",
      title: chat.title || "Novo chat",
      messages: Array.isArray(chat.messages) ? chat.messages : [],
    });
    window.setTimeout(() => {
      const container = chatScrollRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 0);
    const lastReportId = chat.lastReportId || (Array.isArray(chat.messages)
      ? [...chat.messages].reverse().find((msg) => msg.reportId)?.reportId
      : "");
    if (lastReportId) {
      window.setTimeout(() => openReportById(lastReportId), 0);
    }
  }, [openReportById]);

  const loadReportsHistory = React.useCallback(async () => {
    if (!window.GovGoReportsApi || auth.status !== "authenticated") {
      setHistory([]);
      setSaved([]);
      setChats([]);
      setHistoryStatus("idle");
      return;
    }
    setHistoryStatus("loading");
    setHistoryError("");
    try {
      const [historyResult, workspaceResult] = await Promise.allSettled([
        window.GovGoReportsApi.loadHistory(50),
        window.GovGoReportsApi.loadWorkspace ? window.GovGoReportsApi.loadWorkspace() : Promise.resolve({workspace: {}}),
      ]);
      if (historyResult.status === "rejected") {
        throw historyResult.reason;
      }
      const payload = historyResult.value || {};
      const remoteWorkspace = workspaceResult.status === "fulfilled" ? (workspaceResult.value?.workspace || {}) : {};
      const nextHistory = Array.isArray(payload.history) ? payload.history : [];
      const nextSaved = Array.isArray(payload.saved) ? payload.saved : [];
      const nextChats = Array.isArray(payload.chats) ? payload.chats : [];
      setHistory(nextHistory);
      setSaved(nextSaved);
      setChats(nextChats);
      if (!localWorkspaceHadTabsRef.current && hasWorkspaceTabs(remoteWorkspace)) {
        skipNextPersistRef.current = true;
        localWorkspaceHadTabsRef.current = true;
        applyWorkspaceSnapshot(remoteWorkspace);
      }
      setActiveChat((current) => {
        if (!current.id && nextChats[0]) {
          return {
            id: nextChats[0].id || "",
            title: nextChats[0].title || "Novo chat",
            messages: Array.isArray(nextChats[0].messages) ? nextChats[0].messages : [],
          };
        }
        const updated = nextChats.find((chat) => String(chat.id) === String(current.id));
        return updated ? {
          id: updated.id || "",
          title: updated.title || "Novo chat",
          messages: Array.isArray(updated.messages) ? updated.messages : [],
        } : current;
      });
      setHistoryStatus("ready");
    } catch (error) {
      setHistoryStatus("error");
      setHistoryError(error.message || "Nao foi possivel carregar relatorios.");
    } finally {
      workspaceReadyRef.current = true;
    }
  }, [applyWorkspaceSnapshot, auth.status]);

  React.useEffect(() => {
    loadReportsHistory();
  }, [loadReportsHistory]);

  const closeTab = React.useCallback((id) => {
    if (id === "intro") return;
    setTabs((current) => {
      const next = current.filter((tab) => tab.id !== id);
      if (activeId === id) {
        setActiveId(next[next.length - 1]?.id || "intro");
      }
      return next.length ? next : [REPORTS_INTRO_TAB];
    });
  }, [activeId]);

  const startNewChat = React.useCallback(() => {
    setSidePanelMode("chat");
    setChatOpen(true);
    setActiveChat({id: "", title: "Novo chat", messages: []});
    setQuestion("");
    setActiveId("intro");
  }, []);

  const runReport = React.useCallback(async () => {
    const q = String(question || "").trim();
    if (!q || running) return;
    const tempReportId = `pending-${Date.now()}`;
    const title = titleFromQuestion(q);
    setQuestion("");
    const localUserMessage = {
      id: `u-${tempReportId}`,
      role: "user",
      text: q,
      createdAt: new Date().toISOString(),
    };
    const localAssistantMessage = {
      id: `a-${tempReportId}`,
      role: "assistant",
      text: "Gerando SQL e executando consulta...",
      status: "running",
      createdAt: new Date().toISOString(),
    };

    setActiveChat((current) => ({
      ...current,
      title: current.title && current.title !== "Novo chat" ? current.title : title,
      messages: [...(current.messages || []), localUserMessage, localAssistantMessage],
    }));
    addReportTab({
      id: tempReportId,
      title,
      question: q,
      sql: "",
      columns: [],
      rows: [],
      rowCount: 0,
      elapsedMs: 0,
      status: "running",
      error: "",
      saved: false,
    }, {title, count: "...", status: "running"});

    setRunning(true);
    try {
      const payload = await window.GovGoReportsApi.runReport({
        question: q,
        chatId: activeChat.id || "",
      });
      const report = normalizeReport(payload.report || {}, {title, question: q});
      const finalId = report.id || tempReportId;
      setReports((current) => {
        const next = {...current};
        delete next[tempReportId];
        next[finalId] = report;
        return next;
      });
      setTabs((current) => current.map((tab) => tab.id === tempReportId ? {
        ...tab,
        id: finalId,
        title: report.title || title,
        count: String(report.rowCount ?? 0),
        status: report.status || "ok",
      } : tab));
      setActiveId(finalId);
      if (payload.chat) {
        setActiveChat({
          id: payload.chat.id || "",
          title: payload.chat.title || title,
          messages: Array.isArray(payload.chat.messages) ? payload.chat.messages : [],
        });
      }
      if (Array.isArray(payload.chats)) setChats(payload.chats);
      if (Array.isArray(payload.history)) setHistory(payload.history);
      if (Array.isArray(payload.saved)) setSaved(payload.saved);
    } catch (error) {
      const message = error.message || "Erro ao executar relatorio.";
      upsertReport(tempReportId, {status: "error", error: message});
      upsertTab(tempReportId, {status: "error", count: "erro"});
      setActiveChat((current) => ({
        ...current,
        messages: (current.messages || []).map((msg) => (
          msg.id === localAssistantMessage.id
            ? {...msg, text: message, error: message, status: "error"}
            : msg
        )),
      }));
    } finally {
      setRunning(false);
    }
  }, [activeChat.id, addReportTab, normalizeReport, question, running, titleFromQuestion, upsertReport, upsertTab]);

  const saveCurrentReport = React.useCallback(async () => {
    if (!activeReport || !activeReport.id || activeReport.id === "intro") return;
    try {
      const payload = await window.GovGoReportsApi.saveReport({id: activeReport.id});
      const report = payload.report || {};
      upsertReport(activeReport.id, {saved: true});
      setSaved((current) => [report, ...current.filter((item) => item.id !== report.id)]);
      return report;
    } catch (error) {
      upsertReport(activeReport.id, {error: error.message || "Nao foi possivel salvar."});
    }
  }, [activeReport, upsertReport]);

  const exportCurrentReport = React.useCallback(async (format) => {
    if (!activeReport || !activeReport.id || activeReport.id === "intro") return;
    setExporting(format);
    try {
      const payload = await window.GovGoReportsApi.exportReport(activeReport.id, format);
      window.GovGoReportsApi.downloadBase64File(payload);
    } catch (error) {
      upsertReport(activeReport.id, {error: error.message || "Nao foi possivel exportar."});
    } finally {
      setExporting("");
    }
  }, [activeReport, upsertReport]);

  const copySql = React.useCallback(async () => {
    const sql = activeReport?.sql || "";
    if (!sql) return;
    try {
      await navigator.clipboard.writeText(sql);
      setCopyState("copiado");
      window.setTimeout(() => setCopyState(""), 1200);
    } catch (error) {
      setCopyState("erro");
      window.setTimeout(() => setCopyState(""), 1200);
    }
  }, [activeReport]);

  const reportCardText = React.useCallback(({showSql, sql, title, subtitle, fallback}) => {
    if (showSql) return String(sql || "").trim();
    return [title, subtitle].map((part) => String(part || "").trim()).filter(Boolean).join("\n")
      || String(fallback || "").trim();
  }, []);

  const copyReportCardText = React.useCallback(async (key, text, event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const value = String(text || "").trim();
    if (!key || !value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedCardKey(key);
      window.setTimeout(() => setCopiedCardKey((current) => current === key ? "" : current), 1200);
    } catch (error) {
      setCopiedCardKey("");
    }
  }, []);

  const removeReportFromLocalState = React.useCallback((reportId) => {
    const id = String(reportId || "");
    if (!id) return;
    setHistory((current) => current.filter((item) => String(item.id) !== id));
    setSaved((current) => current.filter((item) => String(item.id) !== id));
    setReports((current) => {
      const next = {...current};
      delete next[id];
      return next;
    });
    setTabs((current) => {
      const next = current.filter((tab) => String(tab.id) !== id);
      setActiveId((currentActive) => currentActive === id ? (next[next.length - 1]?.id || "intro") : currentActive);
      return next.length ? next : [REPORTS_INTRO_TAB];
    });
    setActiveChat((current) => ({
      ...current,
      messages: (current.messages || []).map((message) => String(message.reportId || "") === id
        ? {...message, reportId: "", reportDeleted: true}
        : message),
    }));
  }, []);

  const deleteReportCard = React.useCallback(async (reportId, event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const id = String(reportId || "");
    if (!id || deletingCards[id]) return;
    setDeletingCards((current) => ({...current, [id]: true}));
    setHistoryError("");
    try {
      if (!window.GovGoReportsApi?.deleteReport) {
        throw new Error("API de relatorios indisponivel.");
      }
      const payload = await window.GovGoReportsApi.deleteReport(id);
      removeReportFromLocalState(id);
      if (Array.isArray(payload.history)) setHistory(payload.history);
      if (Array.isArray(payload.saved)) setSaved(payload.saved);
      if (Array.isArray(payload.chats)) {
        setChats(payload.chats);
        setActiveChat((current) => {
          const updated = payload.chats.find((chat) => String(chat.id) === String(current.id));
          return updated ? {
            id: updated.id || "",
            title: updated.title || "Novo chat",
            messages: Array.isArray(updated.messages) ? updated.messages : [],
          } : current;
        });
      }
    } catch (error) {
      setHistoryError(error.message || "Nao foi possivel apagar o relatorio.");
    } finally {
      setDeletingCards((current) => {
        const next = {...current};
        delete next[id];
        return next;
      });
    }
  }, [deletingCards, removeReportFromLocalState]);

  const removeChatFromLocalState = React.useCallback((chatId) => {
    const id = String(chatId || "");
    if (!id) return;
    setChats((current) => current.filter((chat) => String(chat.id) !== id));
    setActiveChat((current) => String(current.id || "") === id
      ? {id: "", title: "Novo chat", messages: []}
      : current);
  }, []);

  const deleteChatCard = React.useCallback(async (chatId, event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const id = String(chatId || "");
    if (!id || deletingChats[id]) return;
    setDeletingChats((current) => ({...current, [id]: true}));
    setHistoryError("");
    try {
      if (!window.GovGoReportsApi?.deleteChat) {
        throw new Error("API de chats indisponivel.");
      }
      const payload = await window.GovGoReportsApi.deleteChat(id);
      removeChatFromLocalState(id);
      if (Array.isArray(payload.history)) setHistory(payload.history);
      if (Array.isArray(payload.saved)) setSaved(payload.saved);
      if (Array.isArray(payload.chats)) setChats(payload.chats);
    } catch (error) {
      setHistoryError(error.message || "Nao foi possivel apagar o chat.");
    } finally {
      setDeletingChats((current) => {
        const next = {...current};
        delete next[id];
        return next;
      });
    }
  }, [deletingChats, removeChatFromLocalState]);

  const cardActionButtonStyle = React.useCallback((options = {}) => {
    const tone = options.tone || "default";
    const active = !!options.active;
    const disabled = !!options.disabled;
    const isRisk = tone === "risk";
    const activeColor = isRisk ? "var(--risk)" : "var(--orange)";
    const activeBg = isRisk ? "var(--risk-50)" : "var(--orange-50)";
    const activeBorder = isRisk ? "#F0C8B4" : "var(--orange-100)";
    return {
      all: "unset",
      cursor: disabled ? "default" : "pointer",
      opacity: disabled ? 0.55 : 1,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      width: 22,
      height: 20,
      borderRadius: 6,
      color: active ? activeColor : "var(--ink-3)",
      background: active ? activeBg : "transparent",
      border: `1px solid ${active ? activeBorder : "var(--hairline)"}`,
    };
  }, []);

  const toggleSqlCard = React.useCallback((key, event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!key) return;
    setSqlCards((current) => ({...current, [key]: !current[key]}));
  }, []);

  const activeMessages = Array.isArray(activeChat.messages) ? activeChat.messages : [];
  const lastChatMessage = activeMessages[activeMessages.length - 1] || {};
  const lastChatMessageKey = [
    lastChatMessage.id || "",
    lastChatMessage.text || "",
    lastChatMessage.sql || "",
    lastChatMessage.status || "",
  ].join(":");
  const historyItems = historyMode === "chats" ? chats : historyMode === "saved" ? saved : history;
  const columns = Array.isArray(activeReport?.columns) ? activeReport.columns : [];
  const rows = Array.isArray(activeReport?.rows) ? activeReport.rows : [];
  const tablePageSize = 10;
  const tableTotalRows = rows.length;
  const tableTotalPages = Math.max(1, Math.ceil(tableTotalRows / Math.max(1, tablePageSize)));
  const currentTablePage = Math.min(Math.max(1, tablePage), tableTotalPages);
  const tableStartIndex = (currentTablePage - 1) * tablePageSize;
  const tableEndIndex = Math.min(tableStartIndex + tablePageSize, tableTotalRows);
  const visibleRows = rows.slice(tableStartIndex, tableEndIndex);
  const reportMetaById = React.useMemo(() => {
    const map = {};
    Object.values(reports || {}).forEach((report) => {
      if (report?.id) map[String(report.id)] = report;
    });
    [...history, ...saved].forEach((report) => {
      if (report?.id) map[String(report.id)] = {...(map[String(report.id)] || {}), ...report};
    });
    return map;
  }, [history, reports, saved]);

  const looksLikeSql = React.useCallback((value) => /^\s*(select|with)\b/i.test(String(value || "")), []);

  const reportTitleForDisplay = React.useCallback((item, fallback = "Relatorio") => {
    const title = String(item?.title || "").trim();
    const question = String(item?.question || "").trim();
    const sameAsQuestion = title && question && title.toLowerCase() === question.toLowerCase();
    if (title && !looksLikeSql(title) && !sameAsQuestion) return title;
    if (String(item?.reportTitle || "").trim()) return String(item.reportTitle).trim();
    return fallback;
  }, [looksLikeSql]);

  const reportSubtitleForDisplay = React.useCallback((item) => {
    const subtitle = String(item?.subtitle || item?.reportSubtitle || "").trim();
    const title = String(item?.title || item?.reportTitle || "").trim();
    const question = String(item?.question || "").trim();
    const normalizedSubtitle = subtitle.toLowerCase();
    if (
      subtitle
      && !looksLikeSql(subtitle)
      && normalizedSubtitle !== title.toLowerCase()
      && normalizedSubtitle !== question.toLowerCase()
    ) {
      return subtitle;
    }
    return "";
  }, [looksLikeSql]);

  React.useEffect(() => {
    const container = chatScrollRef.current;
    if (!container) return;
    window.requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  }, [activeChat.id, activeMessages.length, lastChatMessageKey]);

  React.useEffect(() => {
    setTablePage(1);
  }, [activeId, tableTotalRows]);

  React.useEffect(() => {
    setTablePage((page) => Math.min(Math.max(1, page), tableTotalPages));
  }, [tableTotalPages]);

  React.useEffect(() => {
    hydrateReportRows(activeReport);
  }, [activeReport, hydrateReportRows]);

  const statusChip = activeReport?.status === "running"
    ? <Chip tone="blue" icon={<CircularProgress size={11}/>}>Executando</Chip>
    : activeReport?.status === "error"
      ? <Chip tone="risk" icon={<Icon.alert size={11}/>}>Erro</Chip>
      : activeReport?.sql
        ? <Chip tone="green" icon={<Icon.check size={11}/>}>Executado</Chip>
        : <Chip tone="blue" icon={<Icon.sparkle size={11}/>}>NL -&gt; SQL</Chip>;
  const hasActiveResult = activeReport?.id && activeReport.id !== "intro";
  const resultTitle = hasActiveResult ? reportTitleForDisplay(activeReport, "Relatorio") : "";
  const resultSubtitle = hasActiveResult ? reportSubtitleForDisplay(activeReport) : "";
  const canPageBackward = currentTablePage > 1;
  const canPageForward = currentTablePage < tableTotalPages;
  const pageButtonStyle = (enabled = true) => ({
    all: "unset",
    cursor: enabled ? "pointer" : "default",
    opacity: enabled ? 1 : 0.42,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 24,
    height: 24,
    borderRadius: 6,
    fontSize: 11.5,
    fontFamily: "var(--font-mono)",
    color: enabled ? "var(--deep-blue)" : "var(--ink-3)",
    border: "1px solid var(--hairline)",
    background: "var(--paper)",
  });

  return (
    <div style={{display: "grid", gridTemplateColumns: "360px minmax(0, 1fr)", width: "100%", minWidth: 0, height: "100%", overflow: "hidden"}}>
      <aside style={{
        borderRight: "1px solid var(--hairline)",
        background: "var(--paper)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        maxHeight: "100%",
        minHeight: 0,
        minWidth: 0,
        overflow: "hidden",
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "9px 10px",
          borderBottom: "1px solid var(--hairline)",
          background: "var(--rail)",
          flexShrink: 0,
          minWidth: 0,
        }}>
          {[
            ["chat", "Chat", <Icon.terminal size={14}/>],
            ["history", "Historico", <Icon.history size={14}/>],
          ].map(([value, label, icon]) => {
            const active = sidePanelMode === value;
            return (
              <button key={value} onClick={() => {
                setSidePanelMode(value);
                setChatOpen(true);
              }} style={{
                all: "unset",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                minWidth: 0,
                flex: "1 1 0",
                height: 34,
                padding: "0 9px",
                boxSizing: "border-box",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                color: active ? "var(--orange-700)" : "var(--ink-3)",
                background: active ? "var(--paper)" : "transparent",
                border: `1px solid ${active ? "var(--hairline)" : "transparent"}`,
                boxShadow: active ? "var(--shadow-xs)" : "none",
              }}>
                {icon}
                <span style={{overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{label}</span>
              </button>
            );
          })}
          <span style={{width: 2, flexShrink: 0}}/>
            <button onClick={() => setChatOpen((value) => !value)} title={chatOpen ? "Colapsar painel" : "Expandir painel"} style={{
              all: "unset",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: 7,
              color: "var(--ink-3)",
              flexShrink: 0,
            }}>
              {chatOpen ? <Icon.chevDown size={16}/> : <Icon.chevRight size={16}/>}
            </button>
        </div>

        {sidePanelMode === "chat" && (
        <section style={{
          display: "flex",
          flexDirection: "column",
          flex: chatOpen ? "1 1 auto" : "0 0 auto",
          minHeight: 0,
          minWidth: 0,
          overflow: "hidden",
          borderBottom: chatOpen ? "0" : "1px solid var(--hairline)",
        }}>
          <div style={{padding: "10px 12px 8px", minWidth: 0, borderBottom: chatOpen ? "1px solid var(--hairline-soft)" : "0"}}>
            <div style={{display: "flex", alignItems: "center", gap: 8, minWidth: 0, marginBottom: 3}}>
              <div style={{fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, minWidth: 0, flex: 1}}>
                CHAT
              </div>
              <button onClick={startNewChat} title="Novo chat" style={{
                all: "unset",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 24,
                height: 22,
                borderRadius: 7,
                color: "var(--orange)",
                flexShrink: 0,
              }}>
                <Icon.plus size={17}/>
              </button>
            </div>
            <div style={{display: "flex", alignItems: "center", gap: 8, minWidth: 0}}>
              <div style={{fontSize: 13, color: "var(--ink-1)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, flex: 1}}>
                {activeChat.title || "Novo chat"}
              </div>
            </div>
          </div>

          {chatOpen && (<>
          <div ref={chatScrollRef} style={{flex: 1, minHeight: 0, minWidth: 0, overflowY: "auto", overflowX: "hidden", padding: "2px 12px 10px"}}>
            {!activeMessages.length && (
              <div style={{
                border: "1px solid var(--hairline)",
                borderRadius: 8,
                padding: 12,
                color: "var(--ink-3)",
                fontSize: 12.5,
                lineHeight: 1.45,
                background: "var(--rail)",
                boxSizing: "border-box",
                width: "100%",
                overflow: "hidden",
              }}>
                Pergunte em portugues. A conversa fica aqui; cada resposta SQL gera um relatorio na area da direita.
              </div>
            )}
            {activeMessages.map((message) => {
              const isUser = message.role === "user";
              const clickable = !isUser && message.reportId;
              const reportMeta = clickable ? (reportMetaById[String(message.reportId)] || {}) : {};
              const cardKey = clickable ? `chat:${message.reportId || message.id}` : "";
              const showSqlForCard = !!sqlCards[cardKey];
              const messageTitle = String(message.reportTitle || "").trim();
              const metaQuestion = String(reportMeta.question || "").trim();
              const messageTitleIsQuestion = messageTitle && metaQuestion && messageTitle.toLowerCase() === metaQuestion.toLowerCase();
              const displayMeta = {
                ...reportMeta,
                title: messageTitle && !messageTitleIsQuestion ? messageTitle : reportMeta.title,
                subtitle: message.reportSubtitle || reportMeta.subtitle,
              };
              const reportTitle = reportTitleForDisplay(displayMeta, "Relatorio gerado");
              const reportSubtitle = reportSubtitleForDisplay(displayMeta);
              const sqlText = message.sql || reportMeta.sql || "";
              const isRunningMessage = message.status === "running";
              const isErrorMessage = message.status === "error";
              const showReportTitle = clickable && !showSqlForCard && !isRunningMessage && !isErrorMessage;
              const showReportSql = clickable && showSqlForCard && sqlText && !isRunningMessage;
              const visibleText = reportCardText({
                showSql: showSqlForCard,
                sql: sqlText,
                title: reportTitle,
                subtitle: reportSubtitle,
                fallback: message.text || sqlText,
              });
              const isDeleting = !!deletingCards[String(message.reportId || "")];
              return (
                <div key={message.id} style={{
                  display: "flex",
                  justifyContent: isUser ? "flex-end" : "flex-start",
                  marginBottom: 8,
                  width: "100%",
                  minWidth: 0,
                  overflow: "hidden",
                }}>
                  <div role={clickable ? "button" : undefined} tabIndex={clickable ? 0 : undefined} onClick={() => clickable && openReportById(message.reportId)} onKeyDown={(event) => {
                    if (clickable && (event.key === "Enter" || event.key === " ")) {
                      event.preventDefault();
                      openReportById(message.reportId);
                    }
                  }} style={{
                    cursor: clickable ? "pointer" : "default",
                    maxWidth: isUser ? "82%" : "92%",
                    minWidth: 0,
                    boxSizing: "border-box",
                    overflow: "hidden",
                    overflowWrap: "anywhere",
                    background: isUser ? "var(--deep-blue)" : (message.status === "error" ? "var(--risk-50)" : "var(--blue-50)"),
                    color: isUser ? "white" : (message.status === "error" ? "var(--risk)" : "var(--ink-1)"),
                    border: `1px solid ${isUser ? "var(--deep-blue)" : (message.status === "error" ? "#F0C8B4" : "var(--blue-200)")}`,
                    borderRadius: isUser ? "12px 12px 3px 12px" : "12px 12px 12px 3px",
                    padding: "8px 10px",
                    fontSize: isUser ? 12.8 : 12,
                    lineHeight: 1.45,
                    boxShadow: "var(--shadow-xs)",
                  }}>
                    {showReportTitle ? (
                      <>
                        <div style={{
                          fontFamily: "var(--font-body)",
                          fontSize: 12.8,
                          fontWeight: 600,
                          color: "var(--ink-1)",
                          lineHeight: 1.35,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: "100%",
                        }}>
                          {reportTitle}
                        </div>
                        {reportSubtitle && (
                          <div style={{
                            marginTop: 3,
                            fontFamily: "var(--font-body)",
                            fontSize: 11.4,
                            color: "var(--ink-3)",
                            lineHeight: 1.35,
                            overflow: "hidden",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}>
                            {reportSubtitle}
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{
                        fontFamily: isUser || (!showReportSql && !sqlText) ? "var(--font-body)" : "var(--font-mono)",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        overflowWrap: "anywhere",
                        maxWidth: "100%",
                        overflow: showReportSql ? "hidden" : "visible",
                        display: showReportSql ? "-webkit-box" : "block",
                        WebkitLineClamp: showReportSql ? 5 : "initial",
                        WebkitBoxOrient: showReportSql ? "vertical" : "initial",
                      }}>
                        {showReportSql ? sqlText : (message.text || sqlText)}
                      </div>
                    )}
                    {!isUser && message.reportId && (
                      <div style={{display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 6, fontSize: 11, color: "var(--ink-3)", minWidth: 0}}>
                        <span>{message.status === "error" ? "erro" : `${message.rowCount || 0} linhas`}</span>
                        <span>-</span>
                        <span>abrir relatorio</span>
                        {!isRunningMessage && (
                          <span style={{marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0}}>
                            {sqlText && (
                              <button onClick={(event) => toggleSqlCard(cardKey, event)} title={showSqlForCard ? "Mostrar titulo" : "Mostrar SQL"} style={cardActionButtonStyle({active: showSqlForCard})}>
                                <Icon.terminal size={13}/>
                              </button>
                            )}
                            <button onClick={(event) => copyReportCardText(cardKey, visibleText, event)} title={copiedCardKey === cardKey ? "Copiado" : "Copiar texto"} style={cardActionButtonStyle({active: copiedCardKey === cardKey})}>
                              <Icon.copy size={13}/>
                            </button>
                            <button onClick={(event) => deleteReportCard(message.reportId, event)} title={isDeleting ? "Apagando" : "Apagar relatorio"} disabled={isDeleting} style={cardActionButtonStyle({tone: "risk", active: isDeleting, disabled: isDeleting})}>
                              <Icon.trash size={13}/>
                            </button>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{padding: "10px 12px 12px", minWidth: 0, overflow: "hidden", borderTop: "1px solid var(--hairline-soft)"}}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "auto minmax(0, 1fr) auto",
              alignItems: "end",
              gap: 8,
              padding: "8px 10px",
              background: "var(--paper)",
              border: "1px solid var(--hairline)",
              borderRadius: "var(--r-md)",
              boxShadow: "var(--shadow-xs)",
              minWidth: 0,
            }}>
              <span style={{display: "inline-flex", color: "var(--ink-3)", alignSelf: "start", paddingTop: 2}}>
                <Icon.terminal size={14}/>
              </span>
              <textarea
                rows={3}
                placeholder="Faca uma pergunta..."
                value={question || ""}
                spellCheck={false}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    runReport();
                  }
                }}
                style={{
                  all: "unset",
                  minWidth: 0,
                  height: 58,
                  resize: "none",
                  overflowY: "auto",
                  fontFamily: "var(--font-body)",
                  fontSize: 12.5,
                  lineHeight: 1.45,
                  color: "var(--ink-1)",
                  whiteSpace: "pre-wrap",
                }}
              />
              <Button kind="primary" size="sm" loading={running} disabled={!question.trim()} onClick={runReport} style={{flexShrink: 0}}>Enviar</Button>
            </div>
          </div>
          </>)}
        </section>
        )}

        {sidePanelMode === "history" && chatOpen && (
        <section style={{display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0, minWidth: 0, overflow: "hidden"}}>
          <div style={{padding: "10px 12px 7px", borderBottom: "1px solid var(--hairline-soft)", flexShrink: 0}}>
            <div style={{display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 4, minWidth: 0}}>
              {[
                ["chats", "Chats"],
                ["reports", "Relatórios"],
                ["saved", "Favoritos"],
              ].map(([value, label]) => (
                <button key={value} onClick={() => setHistoryMode(value)} style={{
                  all: "unset", cursor: "pointer", textAlign: "center",
                  padding: "6px 4px", borderRadius: 7,
                  fontSize: 11.5, fontWeight: 600,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  color: historyMode === value ? "var(--orange-700)" : "var(--ink-3)",
                  background: historyMode === value ? "var(--orange-50)" : "var(--surface-sunk)",
                  border: `1px solid ${historyMode === value ? "var(--orange-100)" : "var(--hairline)"}`,
                }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{flex: 1, minHeight: 0, minWidth: 0, overflowY: "auto", overflowX: "hidden", padding: "8px 10px 10px"}}>
            {historyStatus === "loading" && <div style={{padding: "12px", color: "var(--ink-3)", fontSize: 12.5}}>Carregando...</div>}
            {historyError && (
              <div style={{padding: "10px 12px", marginBottom: 8, border: "1px solid #F0C8B4", borderRadius: 8, background: "var(--risk-50)", color: "var(--risk)", fontSize: 12.5}}>
                {historyError}
              </div>
            )}
            {historyStatus !== "loading" && !historyItems.length && !historyError && (
              <div style={{padding: "10px 12px", border: "1px solid var(--hairline)", borderRadius: 8, color: "var(--ink-3)", fontSize: 12.5}}>
                Nada por aqui ainda.
              </div>
            )}
            {historyItems.map((item) => {
              const isChat = historyMode === "chats";
              const cardKey = `${historyMode}:${item.id}`;
              const showSqlForCard = !isChat && !!sqlCards[cardKey];
              const primary = isChat ? (item.title || "Novo chat") : reportTitleForDisplay(item, historyMode === "saved" ? "SQL salvo" : "Relatorio");
              const subtitle = !isChat ? reportSubtitleForDisplay(item) : "";
              const sqlText = item.sql || "";
              const secondary = isChat
                ? `${item.messageCount || 0} mensagens - ${item.reportCount || 0} relatorios`
                : `${item.rowCount || 0} linhas`;
              const visibleText = reportCardText({
                showSql: showSqlForCard,
                sql: sqlText,
                title: primary,
                subtitle,
                fallback: item.question || sqlText,
              });
              const isDeleting = isChat
                ? !!deletingChats[String(item.id || "")]
                : !!deletingCards[String(item.id || "")];
              return (
                <div key={item.id} role="button" tabIndex={0} onClick={() => isChat ? openChat(item) : openReport(item)} onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    isChat ? openChat(item) : openReport(item);
                  }
                }} style={{
                  cursor: "pointer", display: "block", width: "100%", minWidth: 0, boxSizing: "border-box",
                  overflow: "hidden",
                  padding: "9px 10px", marginBottom: 6,
                  background: (isChat && item.id === activeChat.id) || (!isChat && item.id === activeReport?.id) ? "var(--orange-50)" : "var(--paper)",
                  border: `1px solid ${(isChat && item.id === activeChat.id) || (!isChat && item.id === activeReport?.id) ? "var(--orange-100)" : "var(--hairline)"}`,
                  borderRadius: 8,
                }}>
                  {showSqlForCard ? (
                    <div style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11.2,
                      color: "var(--ink-1)",
                      lineHeight: 1.35,
                      minWidth: 0,
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflowWrap: "anywhere",
                    }}>
                      {sqlText || "SQL indisponivel"}
                    </div>
                  ) : (
                    <>
                      <div style={{fontSize: 12.4, color: "var(--ink-1)", fontWeight: 600, lineHeight: 1.35, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>
                        {primary}
                      </div>
                      {!isChat && subtitle && (
                        <div style={{
                          fontSize: 11.2,
                          color: "var(--ink-3)",
                          lineHeight: 1.35,
                          marginTop: 3,
                          minWidth: 0,
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}>
                          {subtitle}
                        </div>
                      )}
                    </>
                  )}
                  <div style={{display: "flex", alignItems: "center", gap: 7, marginTop: 5, fontSize: 11, color: "var(--ink-3)", minWidth: 0, overflow: "hidden", whiteSpace: "nowrap"}}>
                    <span>{relativeDateLabel(item.updatedAt || item.createdAt)}</span>
                    <span>-</span>
                    <span style={{overflow: "hidden", textOverflow: "ellipsis"}}>{secondary}</span>
                    {isChat ? (
                      <span style={{marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0}}>
                        <button onClick={(event) => deleteChatCard(item.id, event)} title={isDeleting ? "Apagando" : "Apagar chat"} disabled={isDeleting} style={cardActionButtonStyle({tone: "risk", active: isDeleting, disabled: isDeleting})}>
                          <Icon.trash size={13}/>
                        </button>
                      </span>
                    ) : (
                      <span style={{marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0}}>
                        {sqlText && (
                          <button onClick={(event) => toggleSqlCard(cardKey, event)} title={showSqlForCard ? "Mostrar titulo" : "Mostrar SQL"} style={cardActionButtonStyle({active: showSqlForCard})}>
                            <Icon.terminal size={13}/>
                          </button>
                        )}
                        <button onClick={(event) => copyReportCardText(cardKey, visibleText, event)} title={copiedCardKey === cardKey ? "Copiado" : "Copiar texto"} style={cardActionButtonStyle({active: copiedCardKey === cardKey})}>
                          <Icon.copy size={13}/>
                        </button>
                        <button onClick={(event) => deleteReportCard(item.id, event)} title={isDeleting ? "Apagando" : "Apagar relatorio"} disabled={isDeleting} style={cardActionButtonStyle({tone: "risk", active: isDeleting, disabled: isDeleting})}>
                          <Icon.trash size={13}/>
                        </button>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        )}
      </aside>

      <div style={{display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden"}}>
        <ReportsTabsV2 tabs={tabs} active={activeId} onActivate={setActiveId} onClose={closeTab} onNew={startNewChat}/>
        <div style={{overflowY: "auto", padding: "14px 24px 40px", flex: 1}}>
          {hasActiveResult && (
            <div style={{marginBottom: 10, minWidth: 0}}>
              <h2 style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontSize: 20,
                fontWeight: 600,
                lineHeight: 1.2,
                color: "var(--ink-1)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {resultTitle}
              </h2>
              {resultSubtitle && (
                <div style={{
                  marginTop: 4,
                  fontSize: 13,
                  color: "var(--ink-3)",
                  lineHeight: 1.35,
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}>
                  {resultSubtitle}
                </div>
              )}
            </div>
          )}

          {activeReport?.status === "idle" && !activeReport?.sql && (
            <div style={{
              background: "var(--paper)", border: "1px solid var(--hairline)", borderRadius: 10,
              padding: 24, color: "var(--ink-2)", fontSize: 13.5, lineHeight: 1.55,
            }}>
              Use o chat a esquerda para gerar um relatorio. O SQL e a tabela aparecem aqui.
            </div>
          )}

          {activeReport?.error && (
            <div style={{
              background: "var(--risk-50)", border: "1px solid #F0C8B4", color: "var(--risk)",
              borderRadius: 10, padding: "12px 14px", marginBottom: 14, fontSize: 13,
            }}>
              {activeReport.error}
            </div>
          )}

          {(activeReport?.sql || activeReport?.status === "running") && (
            <div style={{background: "var(--code-bg)", borderRadius: 10, overflow: "hidden", marginBottom: 14}}>
              <div style={{display: "flex", alignItems: "center", padding: "6px 12px", borderBottom: "1px solid rgba(255,255,255,.08)"}}>
                <span style={{fontFamily: "var(--font-mono)", fontSize: 11.5, color: "rgba(255,255,255,.68)", textTransform: "uppercase", letterSpacing: ".04em"}}>
                  comando sql
                </span>
                <span style={{flex: 1}}/>
                <button onClick={copySql} disabled={!activeReport?.sql} title={copyState === "copiado" ? "Copiado" : "Copiar SQL"} style={{
                  all: "unset",
                  cursor: activeReport?.sql ? "pointer" : "default",
                  opacity: activeReport?.sql ? 1 : 0.45,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 24,
                  height: 22,
                  borderRadius: 6,
                  color: copyState === "copiado" ? "#28C840" : "rgba(255,255,255,.78)",
                }}>
                  <Icon.copy size={13}/>
                </button>
              </div>
              <pre style={{
                margin: 0,
                padding: "10px 14px",
                fontFamily: "var(--font-mono)",
                fontSize: 12.2,
                lineHeight: 1.5,
                color: "#E0EAF9",
                overflowX: "auto",
                overflowY: "auto",
                maxHeight: 92,
                scrollbarWidth: "thin",
                whiteSpace: "pre-wrap",
              }}>
                {activeReport?.status === "running" ? "Gerando SQL e executando consulta..." : activeReport.sql}
              </pre>
            </div>
          )}

          {(activeReport?.sql || rows.length || activeReport?.status === "running") && (
            <div style={{background: "var(--paper)", border: "1px solid var(--hairline)", borderRadius: 10, overflow: "hidden"}}>
              <div style={{padding: "12px 16px", borderBottom: "1px solid var(--hairline-soft)", display: "flex", alignItems: "center", gap: 10}}>
                {statusChip}
                <span style={{fontSize: 12, color: "var(--ink-3)"}}>
                  {activeReport?.status === "running"
                    ? "processando"
                    : `${activeReport?.rowCount || rows.length || 0} linhas - ${activeReport?.elapsedMs || 0} ms`}
                </span>
                <span style={{flex: 1}}/>
                <div style={{display: "inline-flex", alignItems: "center", gap: 4, marginRight: 4}} title={`${tableStartIndex + (tableTotalRows ? 1 : 0)}-${tableEndIndex} de ${tableTotalRows}`}>
                  <button disabled={!canPageBackward} onClick={() => setTablePage(1)} style={pageButtonStyle(canPageBackward)}>
                    <Icon.pageFirst size={14}/>
                  </button>
                  <button disabled={!canPageBackward} onClick={() => setTablePage((page) => Math.max(1, page - 1))} style={pageButtonStyle(canPageBackward)}>
                    <Icon.pagePrev size={14}/>
                  </button>
                  <input
                    value={String(currentTablePage)}
                    onChange={(event) => {
                      const value = Number.parseInt(event.target.value, 10);
                      if (Number.isFinite(value)) {
                        setTablePage(Math.min(Math.max(1, value), tableTotalPages));
                      }
                    }}
                    aria-label="Pagina do relatorio"
                    style={{
                      width: 34,
                      height: 24,
                      padding: 0,
                      textAlign: "center",
                      borderRadius: 6,
                      border: "1px solid var(--hairline)",
                      background: "var(--paper)",
                      color: "var(--ink-1)",
                      fontFamily: "var(--font-mono)",
                      fontSize: 11.5,
                      outline: "none",
                    }}
                  />
                  <button disabled={!canPageForward} onClick={() => setTablePage((page) => Math.min(tableTotalPages, page + 1))} style={pageButtonStyle(canPageForward)}>
                    <Icon.pageNext size={14}/>
                  </button>
                  <button disabled={!canPageForward} onClick={() => setTablePage(tableTotalPages)} style={pageButtonStyle(canPageForward)}>
                    <Icon.pageLast size={14}/>
                  </button>
                </div>
                <Button kind="ghost" size="sm" icon={<Icon.download size={13}/>} disabled={!activeReport?.id || activeReport.id === "intro"} loading={exporting === "csv"} onClick={() => exportCurrentReport("csv")}>CSV</Button>
                <Button kind="ghost" size="sm" icon={<Icon.download size={13}/>} disabled={!activeReport?.id || activeReport.id === "intro"} loading={exporting === "xlsx"} onClick={() => exportCurrentReport("xlsx")}>XLSX</Button>
                <Button size="sm" icon={activeReport?.saved ? <Icon.bookmarkFill size={13}/> : <Icon.bookmark size={13}/>} disabled={!activeReport?.id || activeReport.id === "intro" || activeReport?.saved} onClick={saveCurrentReport}>
                  {activeReport?.saved ? "Salvo" : "Salvar"}
                </Button>
              </div>

              {!columns.length && activeReport?.status !== "running" && (
                <div style={{padding: 18, color: "var(--ink-3)", fontSize: 13}}>
                  Sem linhas para exibir.
                </div>
              )}

              {columns.length > 0 && (
                <div style={{
                  overflowX: "auto",
                  overflowY: "hidden",
                  height: 446,
                  scrollbarWidth: "thin",
                }}>
                  <table style={{borderCollapse: "collapse", width: "100%", minWidth: Math.max(760, columns.length * 140)}}>
                    <thead>
                      <tr style={{background: "var(--rail)"}}>
                        {columns.map((column) => (
                          <th key={column} style={{
                            textAlign: "left", padding: "9px 12px", borderBottom: "1px solid var(--hairline-soft)",
                            fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".04em", fontWeight: 600,
                            whiteSpace: "nowrap",
                            height: 36,
                          }}>
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.map((row, rowIndex) => (
                        <tr key={rowIndex} style={{background: rowIndex === 0 ? "var(--orange-50)" : "var(--paper)"}}>
                          {columns.map((column) => (
                            <td key={column} style={{
                              padding: "10px 12px", borderBottom: "1px solid var(--hairline-soft)", fontSize: 12.5,
                              color: "var(--ink-1)", maxWidth: 360, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                              height: 41,
                            }} title={String(row[column] ?? "")}>
                              {typeof row[column] === "object" && row[column] !== null ? JSON.stringify(row[column]) : String(row[column] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

window.RelatoriosWorkspace = RelatoriosWorkspace;
