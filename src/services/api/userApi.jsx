(function registerGovGoUserApi() {
  async function parseJsonResponse(response, invalidJsonMessage) {
    try {
      return await response.json();
    } catch (error) {
      throw new Error(invalidJsonMessage);
    }
  }

  async function request(path, options = {}) {
    const response = await fetch(path, {
      method: options.method || "GET",
      credentials: "same-origin",
      headers: {
        "Accept": "application/json",
        ...(options.body ? {"Content-Type": "application/json"} : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const payload = await parseJsonResponse(response, "A API de usuario retornou um JSON invalido.");
    if (!response.ok) {
      throw new Error(payload.error || `Falha HTTP ${response.status}.`);
    }
    return payload;
  }

  function me() {
    return request("/api/auth/me");
  }

  function login({email, password}) {
    return request("/api/auth/login", {
      method: "POST",
      body: {email, password},
    });
  }

  function signup(payload) {
    return request("/api/auth/signup", {
      method: "POST",
      body: payload,
    });
  }

  function confirm({email, token, type}) {
    return request("/api/auth/confirm", {
      method: "POST",
      body: {email, token, type: type || "signup"},
    });
  }

  function forgot({email}) {
    return request("/api/auth/forgot", {
      method: "POST",
      body: {email},
    });
  }

  function reset(payload) {
    return request("/api/auth/reset", {
      method: "POST",
      body: payload,
    });
  }

  function logout() {
    return request("/api/auth/logout", {
      method: "POST",
      body: {},
    });
  }

  function loadFavorites() {
    return request("/api/user/favorites");
  }

  function addFavorite({pncpId, numeroControlePncp, rotulo, title, objeto, objectFull}) {
    return request("/api/user/favorites", {
      method: "POST",
      body: {
        pncp_id: pncpId || numeroControlePncp || "",
        rotulo: rotulo || "",
        objeto: objeto || objectFull || title || "",
      },
    });
  }

  function removeFavorite(pncpId) {
    return request(`/api/user/favorites/${encodeURIComponent(String(pncpId || ""))}`, {
      method: "DELETE",
    });
  }

  function loadFavoriteDetail(pncpId) {
    return request(`/api/user/favorite-detail?pncp_id=${encodeURIComponent(String(pncpId || ""))}`);
  }

  function loadHistory(limit = 50) {
    return request(`/api/user/history?limit=${encodeURIComponent(String(limit || 50))}`);
  }

  function saveHistory(payload) {
    return request("/api/user/history", {
      method: "POST",
      body: payload || {},
    });
  }

  function loadHistoryDetail(promptId, limit = 500) {
    return request(`/api/user/history-detail?prompt_id=${encodeURIComponent(String(promptId || ""))}&limit=${encodeURIComponent(String(limit || 500))}`);
  }

  function deleteHistory(promptId) {
    return request(`/api/user/history/${encodeURIComponent(String(promptId || ""))}`, {
      method: "DELETE",
    });
  }

  window.GovGoUserApi = {
    me,
    login,
    signup,
    confirm,
    forgot,
    reset,
    logout,
    loadFavorites,
    addFavorite,
    removeFavorite,
    loadFavoriteDetail,
    loadHistory,
    saveHistory,
    loadHistoryDetail,
    deleteHistory,
  };
})();
