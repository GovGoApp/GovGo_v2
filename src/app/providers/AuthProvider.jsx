(function registerGovGoAuthProvider() {
  const {createContext, useCallback, useContext, useEffect, useMemo, useState} = React;

  const AuthContext = createContext({
    status: "loading",
    user: null,
    error: "",
    refresh: async () => {},
    login: async () => {},
    signup: async () => {},
    confirm: async () => {},
    forgot: async () => {},
    reset: async () => {},
    logout: async () => {},
  });

  function getDisplayName(user) {
    if (!user) {
      return "";
    }
    return user.name || user.email || "";
  }

  function getInitials(user) {
    const source = getDisplayName(user);
    if (!source) {
      return "GG";
    }
    const parts = source
      .replace(/@.*/, "")
      .split(/\s+/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (!parts.length) {
      return "GG";
    }
    const letters = parts.length === 1
      ? parts[0].slice(0, 2)
      : `${parts[0][0]}${parts[parts.length - 1][0]}`;
    return letters.toUpperCase();
  }

  function GovGoAuthProvider({children}) {
    const [status, setStatus] = useState("loading");
    const [user, setUser] = useState(null);
    const [error, setError] = useState("");

    const applyUser = useCallback((nextUser) => {
      setUser(nextUser || null);
      setStatus(nextUser ? "authenticated" : "anonymous");
      setError("");
    }, []);

    const refresh = useCallback(async () => {
      if (!window.GovGoUserApi) {
        setStatus("anonymous");
        return null;
      }
      setStatus((current) => current === "authenticated" ? current : "loading");
      try {
        const payload = await window.GovGoUserApi.me();
        applyUser(payload.user || null);
        return payload.user || null;
      } catch (err) {
        setUser(null);
        setStatus("anonymous");
        setError("");
        return null;
      }
    }, [applyUser]);

    useEffect(() => {
      refresh();
    }, [refresh]);

    const login = useCallback(async (credentials) => {
      setError("");
      const payload = await window.GovGoUserApi.login(credentials);
      applyUser(payload.user || null);
      return payload;
    }, [applyUser]);

    const signup = useCallback(async (payload) => {
      setError("");
      return window.GovGoUserApi.signup(payload);
    }, []);

    const confirm = useCallback(async (payload) => {
      setError("");
      const response = await window.GovGoUserApi.confirm(payload);
      applyUser(response.user || null);
      return response;
    }, [applyUser]);

    const forgot = useCallback(async (payload) => {
      setError("");
      return window.GovGoUserApi.forgot(payload);
    }, []);

    const reset = useCallback(async (payload) => {
      setError("");
      const response = await window.GovGoUserApi.reset(payload);
      applyUser(response.user || null);
      return response;
    }, [applyUser]);

    const logout = useCallback(async () => {
      setError("");
      try {
        await window.GovGoUserApi.logout();
      } finally {
        setUser(null);
        setStatus("anonymous");
      }
    }, []);

    const value = useMemo(() => ({
      status,
      user,
      error,
      isAuthenticated: status === "authenticated",
      displayName: getDisplayName(user),
      initials: getInitials(user),
      refresh,
      login,
      signup,
      confirm,
      forgot,
      reset,
      logout,
      setError,
    }), [status, user, error, refresh, login, signup, confirm, forgot, reset, logout]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  }

  function useGovGoAuth() {
    return useContext(AuthContext);
  }

  window.GovGoAuthProvider = GovGoAuthProvider;
  window.useGovGoAuth = useGovGoAuth;
})();
