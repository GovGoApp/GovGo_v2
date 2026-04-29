(function registerGovGoAuthPage() {
  const {useEffect, useMemo, useState} = React;

  const LOGO_LIGHT_URL = "/src/assets/logos/govgo_logo_light_mode.png";
  const LOGO_DARK_URL = "/src/assets/logos/govgo_logo_dark_mode.png";
  const REMEMBER_EMAIL_KEY = "govgo.v2.auth.email";

  function readTheme() {
    try {
      const hash = window.location.hash || "";
      const query = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
      const requestedTheme = query ? new URLSearchParams(query).get("theme") : "";
      if (requestedTheme === "dark" || requestedTheme === "light") {
        return requestedTheme;
      }
      return document.documentElement.getAttribute("data-theme") || localStorage.getItem("govgo-theme") || "light";
    } catch (error) {
      return "light";
    }
  }

  function setDocumentTheme(nextTheme) {
    document.documentElement.setAttribute("data-theme", nextTheme);
    try {
      localStorage.setItem("govgo-theme", nextTheme);
    } catch (error) {}
  }

  function readRememberedEmail() {
    try {
      return localStorage.getItem(REMEMBER_EMAIL_KEY) || "";
    } catch (error) {
      return "";
    }
  }

  function rememberEmail(email, enabled) {
    try {
      if (enabled && email) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, email);
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }
    } catch (error) {}
  }

  function getInitialMode(route) {
    const mode = route && route.params && route.params.mode;
    if (["signin", "signup", "confirm", "forgot", "reset"].includes(mode)) {
      return mode;
    }
    return "signin";
  }

  function readRecoveryParams(route) {
    const params = {...((route && route.params) || {})};
    const hash = window.location.hash || "";
    const query = hash.includes("?")
      ? hash.slice(hash.indexOf("?") + 1)
      : (hash.startsWith("#access_token=") ? hash.slice(1) : "");
    if (query) {
      try {
        const parsed = new URLSearchParams(query);
        for (const [key, value] of parsed.entries()) {
          params[key] = value;
        }
      } catch (error) {}
    }
    return params;
  }

  function AuthInput({type = "text", value, onChange, placeholder, autoComplete, action, inputMode}) {
    return (
      <div className="gg-auth-input-shell">
        <input
          className="gg-auth-input"
          type={type}
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
        />
        {action}
      </div>
    );
  }

  function AuthField({label, children}) {
    return (
      <label className="gg-auth-field">
        <span className="gg-auth-label">{label}</span>
        {children}
      </label>
    );
  }

  function AuthLoadingScreen() {
    const [theme] = useState(readTheme);
    return (
      <div className="gg-auth-loading">
        <div className="gg-auth-loading-card">
          <img
            className="gg-auth-loading-logo"
            src={theme === "dark" ? LOGO_DARK_URL : LOGO_LIGHT_URL}
            alt="GovGo"
          />
          <span>Carregando sessao...</span>
        </div>
      </div>
    );
  }

  function AuthPage({route, navigate}) {
    const auth = window.useGovGoAuth ? window.useGovGoAuth() : null;
    const [theme, setTheme] = useState(readTheme);
    const [mode, setMode] = useState(() => getInitialMode(route));
    const [showPassword, setShowPassword] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const recoveryParams = useMemo(() => readRecoveryParams(route), [route && route.hash]);
    const [form, setForm] = useState({
      email: readRememberedEmail(),
      password: "",
      newPassword: "",
      firstName: "",
      lastName: "",
      phone: "",
      token: "",
      remember: Boolean(readRememberedEmail()),
    });

    useEffect(() => {
      setMode(getInitialMode(route));
      setError("");
      setNotice("");
    }, [route && route.hash]);

    useEffect(() => {
      if (recoveryParams.type === "recovery" || recoveryParams.code || recoveryParams.access_token) {
        setMode("reset");
      }
    }, [recoveryParams.type, recoveryParams.code, recoveryParams.access_token]);

    useEffect(() => {
      setDocumentTheme(theme);
    }, [theme]);

    const logoUrl = theme === "dark" ? LOGO_DARK_URL : LOGO_LIGHT_URL;
    const isSignup = mode === "signup";
    const isConfirm = mode === "confirm";
    const isForgot = mode === "forgot";
    const isReset = mode === "reset";
    const title = isSignup
      ? "Criar sua conta"
      : isConfirm
        ? "Confirmar cadastro"
        : isForgot
          ? "Recuperar senha"
          : isReset
            ? "Definir nova senha"
            : "Entrar";
    const subtitle = isSignup
      ? "Acesse a plataforma GovGo com seu usuario."
      : isConfirm
        ? "Digite o codigo recebido no email informado."
        : isForgot
          ? "Informe seu email para receber as instrucoes."
          : isReset
            ? "Informe a nova senha para concluir a recuperacao."
            : "Bem-vindo de volta ao GovGo.";

    function setField(key, value) {
      setForm((current) => ({...current, [key]: value}));
    }

    function toggleTheme() {
      const nextTheme = theme === "dark" ? "light" : "dark";
      setTheme(nextTheme);
      setDocumentTheme(nextTheme);
    }

    function goNext() {
      const next = route && route.params && route.params.next;
      if (next && typeof next === "string" && next.startsWith("#/") && !next.startsWith("#/login")) {
        window.location.hash = next;
        return;
      }
      navigate("inicio", {replace: true});
    }

    function switchMode(nextMode) {
      setMode(nextMode);
      setError("");
      setNotice("");
      const nextHash = nextMode === "signin" ? "#/login" : `#/login?mode=${nextMode}`;
      window.history.replaceState(null, "", nextHash);
    }

    async function handleSubmit(event) {
      event.preventDefault();
      setBusy(true);
      setError("");
      setNotice("");
      try {
        if (mode === "signin") {
          await auth.login({email: form.email, password: form.password});
          rememberEmail(form.email, form.remember);
          goNext();
          return;
        }
        if (mode === "signup") {
          const payload = {
            email: form.email,
            password: form.password,
            first_name: form.firstName,
            last_name: form.lastName,
            phone: form.phone,
          };
          const response = await auth.signup(payload);
          rememberEmail(form.email, form.remember);
          setNotice(response.message || "Cadastro iniciado. Confira seu email.");
          setMode("confirm");
          window.history.replaceState(null, "", "#/login?mode=confirm");
          return;
        }
        if (mode === "confirm") {
          await auth.confirm({email: form.email, token: form.token, type: "signup"});
          goNext();
          return;
        }
        if (mode === "forgot") {
          const response = await auth.forgot({email: form.email});
          setNotice(response.message || "Enviamos as instrucoes para seu email.");
          return;
        }
        if (mode === "reset") {
          await auth.reset({
            new_password: form.newPassword,
            code: recoveryParams.code,
            access_token: recoveryParams.access_token,
            refresh_token: recoveryParams.refresh_token,
          });
          goNext();
        }
      } catch (err) {
        setError(err.message || "Nao foi possivel concluir a operacao.");
      } finally {
        setBusy(false);
      }
    }

    const canSubmit = mode === "signin"
      ? Boolean(form.email && form.password)
      : mode === "signup"
        ? Boolean(form.firstName && form.lastName && form.email && form.password)
        : mode === "confirm"
          ? Boolean(form.email && form.token)
          : mode === "forgot"
            ? Boolean(form.email)
            : Boolean(form.newPassword);

    return (
      <div className="gg-auth-page" data-screen-label={`GovGo v2 - ${title}`}>
        <div className="gg-auth-top">
          <button
            className="gg-auth-theme"
            type="button"
            onClick={toggleTheme}
            title={theme === "dark" ? "Modo claro" : "Modo escuro"}
          >
            {theme === "dark" ? <Icon.sun size={16}/> : <Icon.moon size={16}/>}
          </button>
        </div>

        <div className="gg-auth-center">
          <section className="gg-auth-card" aria-label={title}>
            <div className="gg-auth-logo-row">
              <img className="gg-auth-logo" src={logoUrl} alt="GovGo" />
              {mode !== "signin" && (
                <button className="gg-auth-back" type="button" onClick={() => switchMode("signin")}>
                  <Icon.chevLeft size={14}/> Voltar
                </button>
              )}
            </div>

            <h1 className="gg-auth-title">{title}</h1>
            <p className="gg-auth-subtitle">{subtitle}</p>

            <form className="gg-auth-form" onSubmit={handleSubmit}>
              {isSignup && (
                <div className="gg-auth-grid">
                  <AuthField label="Nome">
                    <AuthInput
                      value={form.firstName}
                      onChange={(value) => setField("firstName", value)}
                      placeholder="Seu nome"
                      autoComplete="given-name"
                    />
                  </AuthField>
                  <AuthField label="Sobrenome">
                    <AuthInput
                      value={form.lastName}
                      onChange={(value) => setField("lastName", value)}
                      placeholder="Seu sobrenome"
                      autoComplete="family-name"
                    />
                  </AuthField>
                </div>
              )}

              {!isReset && (
                <AuthField label="Email">
                  <AuthInput
                    type="email"
                    value={form.email}
                    onChange={(value) => setField("email", value)}
                    placeholder="voce@empresa.com.br"
                    autoComplete="email"
                  />
                </AuthField>
              )}

              {isSignup && (
                <AuthField label="Telefone">
                  <AuthInput
                    value={form.phone}
                    onChange={(value) => setField("phone", value)}
                    placeholder="(11) 98765-4321"
                    autoComplete="tel"
                    inputMode="tel"
                  />
                </AuthField>
              )}

              {(mode === "signin" || isSignup) && (
                <AuthField label="Senha">
                  <AuthInput
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(value) => setField("password", value)}
                    placeholder={isSignup ? "Crie uma senha" : "Sua senha"}
                    autoComplete={isSignup ? "new-password" : "current-password"}
                    action={
                      <button
                        className="gg-auth-inline-button"
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                      >
                        {showPassword ? "Ocultar" : "Mostrar"}
                      </button>
                    }
                  />
                </AuthField>
              )}

              {isConfirm && (
                <AuthField label="Codigo">
                  <AuthInput
                    value={form.token}
                    onChange={(value) => setField("token", value)}
                    placeholder="Codigo recebido por email"
                    inputMode="numeric"
                  />
                </AuthField>
              )}

              {isReset && (
                <AuthField label="Nova senha">
                  <AuthInput
                    type={showPassword ? "text" : "password"}
                    value={form.newPassword}
                    onChange={(value) => setField("newPassword", value)}
                    placeholder="Digite a nova senha"
                    autoComplete="new-password"
                    action={
                      <button
                        className="gg-auth-inline-button"
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                      >
                        {showPassword ? "Ocultar" : "Mostrar"}
                      </button>
                    }
                  />
                </AuthField>
              )}

              {mode === "signin" && (
                <div className="gg-auth-row">
                  <label className="gg-auth-check">
                    <input
                      type="checkbox"
                      checked={form.remember}
                      onChange={(event) => setField("remember", event.target.checked)}
                    />
                    Lembrar email neste navegador
                  </label>
                  <button className="gg-auth-link" type="button" onClick={() => switchMode("forgot")}>
                    Esqueci minha senha
                  </button>
                </div>
              )}

              {notice && <div className="gg-auth-message gg-auth-message--notice">{notice}</div>}
              {error && <div className="gg-auth-message gg-auth-message--error">{error}</div>}

              <div className="gg-auth-actions">
                <button className="gg-auth-button gg-auth-button--primary" type="submit" disabled={busy || !canSubmit}>
                  {busy ? "Aguarde..." : title}
                </button>
                {mode === "signin" && (
                  <button className="gg-auth-button gg-auth-button--outline" type="button" onClick={() => switchMode("signup")}>
                    Cadastrar
                  </button>
                )}
              </div>
            </form>
          </section>
        </div>

        <footer className="gg-auth-footer">
          <span>2026 GovGo v2</span>
          <span>Suporte</span>
          <span>Status</span>
        </footer>
      </div>
    );
  }

  window.AuthLoadingScreen = AuthLoadingScreen;
  window.AuthPage = AuthPage;
})();
