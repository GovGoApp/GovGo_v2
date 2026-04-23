// Reusable primitives — buttons, inputs, chips, cards, kpi, table, sparklines
const { useState, useEffect, useRef, useMemo } = React;

// ---------- Circular progress ----------
function CircularProgress({size = 14, stroke = 2, style}) {
  const radius = (size - stroke) / 2;
  const center = size / 2;
  return (
    <span className="gg-spin" aria-hidden="true" style={{width: size, height: size, display: "inline-flex", ...style}}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{display: "block"}}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} opacity=".28"/>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${Math.PI * radius} ${Math.PI * radius * 2}`}
        />
      </svg>
    </span>
  );
}

// ---------- Button ----------
function Button({kind = "default", size = "md", icon, iconRight, children, onClick, active, style, disabled, title, loading}) {
  const isDisabled = disabled || loading;
  const base = {
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: size === "sm" ? "6px 10px" : size === "lg" ? "11px 18px" : "8px 14px",
    fontSize: size === "sm" ? 12.5 : 13.5,
    fontWeight: 500,
    fontFamily: "var(--font-body)",
    borderRadius: "var(--r-md)",
    border: "1px solid transparent",
    cursor: isDisabled ? "not-allowed" : "pointer",
    transition: "background 120ms, border-color 120ms, box-shadow 120ms, transform 80ms",
    lineHeight: 1.2,
    whiteSpace: "nowrap",
    opacity: isDisabled ? 0.62 : 1,
  };
  const variants = {
    primary: { background: "var(--orange)", color: "white", boxShadow: "0 1px 0 rgba(0,0,0,.08), inset 0 1px 0 rgba(255,255,255,.18)" },
    secondary: { background: "var(--deep-blue)", color: "white" },
    default: { background: "var(--paper)", color: "var(--ink-1)", borderColor: "var(--hairline)", boxShadow: "var(--shadow-xs)" },
    ghost:   { background: "transparent", color: "var(--ink-2)" },
    subtle:  { background: "var(--surface-sunk)", color: "var(--ink-1)" },
    danger:  { background: "var(--paper)", color: "var(--risk)", borderColor: "var(--hairline)" },
  };
  const activeStyle = active ? (kind === "ghost" ? { background: "var(--blue-50)", color: "var(--deep-blue)" } : {}) : {};
  return (
    <button onClick={onClick} disabled={isDisabled} title={title}
            style={{...base, ...variants[kind], ...activeStyle, ...style}}
            onMouseDown={e => e.currentTarget.style.transform = "translateY(0.5px)"}
            onMouseUp={e => e.currentTarget.style.transform = "translateY(0)"}>
      {loading ? <CircularProgress size={size === "sm" ? 12 : 14}/> : icon}
      {children}
      {iconRight}
    </button>
  );
}

// ---------- Chip ----------
function Chip({children, onRemove, tone = "default", icon, active, onClick}) {
  const tones = {
    default:{ bg: "var(--paper)", fg: "var(--ink-2)", bd: "var(--hairline)" },
    orange: { bg: "var(--orange-50)", fg: "var(--orange-700)", bd: "var(--orange-100)" },
    blue:   { bg: "var(--blue-50)", fg: "var(--deep-blue)", bd: "var(--blue-200)" },
    green:  { bg: "var(--green-50)", fg: "var(--green)", bd: "var(--green-100)" },
    risk:   { bg: "var(--risk-50)", fg: "var(--risk)", bd: "#F0C8B4" },
    ink:    { bg: "#1B2436", fg: "white", bd: "#1B2436"},
  };
  const t = tones[tone];
  return (
    <span onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "3px 9px", borderRadius: "var(--r-pill)",
      fontSize: 12, fontWeight: 500, lineHeight: 1.4,
      background: active ? "var(--deep-blue)" : t.bg,
      color: active ? "white" : t.fg,
      border: `1px solid ${active ? "var(--deep-blue)" : t.bd}`,
      cursor: onClick ? "pointer" : "default",
      fontVariantNumeric: "tabular-nums",
    }}>
      {icon}
      {children}
      {onRemove && (
        <button onClick={(e) => { e.stopPropagation(); onRemove();}} style={{
          all: "unset", cursor: "pointer", display: "inline-flex", opacity: .6,
          marginLeft: 2, padding: 1, borderRadius: 4,
        }}><Icon.close size={11}/></button>
      )}
    </span>
  );
}

// ---------- Input ----------
function Input({icon, iconRight, placeholder, value, onChange, onKeyDown, size = "md", mono, style, autoComplete = "off", name}) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: size === "sm" ? "6px 10px" : "9px 12px",
      background: "var(--paper)", borderRadius: "var(--r-md)",
      border: `1px solid ${focus ? "var(--deep-blue)" : "var(--hairline)"}`,
      boxShadow: focus ? "var(--ring-focus)" : "var(--shadow-xs)",
      transition: "border-color 120ms, box-shadow 120ms",
      ...style
    }}>
      {icon && <span style={{color: "var(--ink-3)", display: "inline-flex"}}>{icon}</span>}
      <input style={{
        all: "unset", flex: 1, minWidth: 0,
        fontSize: size === "sm" ? 12.5 : 13.5,
        fontFamily: mono ? "var(--font-mono)" : "var(--font-body)",
        color: "var(--ink-1)",
      }} placeholder={placeholder} value={value || ""} autoComplete={autoComplete} name={name || "govgo-input"} spellCheck={false} onChange={e => onChange && onChange(e.target.value)}
         onKeyDown={onKeyDown}
         onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}/>
      {iconRight}
    </div>
  );
}

// ---------- Card ----------
function Card({children, style, title, extra, padding = 16, subtle}) {
  return (
    <section style={{
      background: subtle ? "var(--rail)" : "var(--paper)",
      border: "1px solid var(--hairline)",
      borderRadius: "var(--r-lg)",
      boxShadow: subtle ? "none" : "var(--shadow-xs)",
      ...style
    }}>
      {title && (
        <header style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px", borderBottom: "1px solid var(--hairline-soft)",
        }}>
          <div style={{fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13.5, color: "var(--ink-1)"}}>{title}</div>
          <div style={{display: "flex", alignItems: "center", gap: 6}}>{extra}</div>
        </header>
      )}
      <div style={{padding}}>{children}</div>
    </section>
  );
}

// ---------- KPI ----------
function KPI({label, value, delta, unit, trend, sub, accent}) {
  const pos = delta && delta > 0;
  const neg = delta && delta < 0;
  return (
    <div style={{
      background: "var(--paper)",
      border: "1px solid var(--hairline)",
      borderRadius: "var(--r-lg)",
      padding: "14px 16px 12px",
      display: "flex", flexDirection: "column", gap: 6,
      position: "relative", overflow: "hidden",
    }}>
      {accent && <div style={{position:"absolute", left:0, top:0, bottom:0, width: 3, background: accent}}/>}
      <div style={{fontSize: 11.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".04em", fontWeight: 500}}>{label}</div>
      <div style={{display: "flex", alignItems: "baseline", gap: 6, fontFamily: "var(--font-display)"}}>
        <span style={{fontSize: 24, fontWeight: 600, color: "var(--ink-1)", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums"}}>{value}</span>
        {unit && <span style={{fontSize: 13, color: "var(--ink-3)", fontWeight: 500}}>{unit}</span>}
      </div>
      <div style={{display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "var(--ink-3)"}}>
        {delta != null && (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 3, fontWeight: 600,
            color: pos ? "var(--green)" : neg ? "var(--risk)" : "var(--ink-3)",
            fontVariantNumeric: "tabular-nums",
          }}>
            {pos ? <Icon.trend size={12}/> : neg ? <Icon.trendDown size={12}/> : null}
            {pos ? "+" : ""}{delta}%
          </span>
        )}
        {trend && <Sparkline data={trend} color={neg ? "var(--risk)" : pos ? "var(--green)" : "var(--deep-blue)"} />}
        {sub && <span style={{marginLeft: "auto"}}>{sub}</span>}
      </div>
    </div>
  );
}

// ---------- Sparkline ----------
function Sparkline({data, color = "var(--deep-blue)", w = 80, h = 24, fill = true}) {
  if (!data || !data.length) return null;
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => [i / (data.length - 1) * w, h - ((v - min) / range) * (h - 4) - 2]);
  const path = "M" + pts.map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" L ");
  const area = path + ` L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg width={w} height={h} style={{display: "block"}}>
      {fill && <path d={area} fill={color} opacity=".10"/>}
      <path d={path} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ---------- Bar chart (simple horizontal) ----------
function BarRow({label, value, max, sub, color = "var(--deep-blue)", tone}) {
  const pct = Math.round((value / max) * 100);
  return (
    <div style={{display: "grid", gridTemplateColumns: "140px 1fr 72px", alignItems: "center", gap: 12, padding: "6px 0"}}>
      <div style={{fontSize: 12.5, color: "var(--ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{label}</div>
      <div style={{background: "var(--surface-sunk)", height: 8, borderRadius: 4, position: "relative", overflow: "hidden"}}>
        <div style={{position: "absolute", inset: 0, width: `${pct}%`, background: color, borderRadius: 4}}/>
      </div>
      <div style={{fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-2)", textAlign: "right", fontVariantNumeric: "tabular-nums"}}>{sub}</div>
    </div>
  );
}

// ---------- Tabs ----------
function Tabs({tabs, value, onChange, style}) {
  return (
    <div role="tablist" style={{
      display: "inline-flex", gap: 2, padding: 3,
      background: "var(--surface-sunk)", borderRadius: "var(--r-md)",
      border: "1px solid var(--hairline)",
      ...style
    }}>
      {tabs.map(t => {
        const active = value === t.id;
        return (
          <button key={t.id} role="tab" aria-selected={active} onClick={() => onChange(t.id)}
            style={{
              all: "unset", cursor: "pointer", fontFamily: "inherit",
              padding: "5px 12px", borderRadius: "var(--r-sm)",
              fontSize: 12.5, fontWeight: 500,
              color: active ? "var(--ink-1)" : "var(--ink-3)",
              background: active ? "var(--paper)" : "transparent",
              boxShadow: active ? "var(--shadow-xs)" : "none",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>{t.icon}{t.label}
            {t.count != null && (
              <span style={{
                background: active ? "var(--surface-sunk)" : "transparent",
                color: active ? "var(--ink-2)" : "var(--ink-3)",
                fontSize: 11, padding: "1px 6px", borderRadius: 10, fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
              }}>{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ---------- Collapsible section ----------
function Collapsible({title, icon, children, defaultOpen = true, extra}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button onClick={() => setOpen(!open)} style={{
        all: "unset", cursor: "pointer", width: "100%", padding: "10px 14px",
        display: "flex", alignItems: "center", gap: 8,
        fontFamily: "var(--font-display)", fontSize: 12.5, fontWeight: 600,
        color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: ".04em"
      }}>
        <span style={{display: "inline-flex", color: "var(--ink-3)", transform: open ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 150ms"}}>
          <Icon.chevDown size={14}/>
        </span>
        {icon && <span style={{color: "var(--deep-blue)"}}>{icon}</span>}
        <span style={{flex: 1}}>{title}</span>
        {extra}
      </button>
      {open && <div style={{padding: "0 14px 12px"}}>{children}</div>}
    </div>
  );
}

// ---------- Score dot / badge ----------
function ScoreDot({score}) {
  // score 0..1
  const s = Math.max(0, Math.min(1, score));
  let bg = "var(--risk)", label = "Baixa";
  if (s >= 0.9) { bg = "#0B4A8A"; label = "Alta"; }
  else if (s >= 0.8) { bg = "#1F6FD4"; label = "Alta"; }
  else if (s >= 0.7) { bg = "#FF5722"; label = "Média"; }
  else if (s >= 0.6) { bg = "#EA8B4A"; label = "Média"; }
  return (
    <span style={{display: "inline-flex", alignItems: "center", gap: 8}}>
      <span style={{width: 44, height: 6, borderRadius: 3, background: "var(--surface-sunk)", position:"relative", overflow:"hidden"}}>
        <span style={{position:"absolute", inset: 0, width: `${s*100}%`, background: bg, borderRadius: 3}}/>
      </span>
      <span className="mono" style={{fontSize: 12, color: "var(--ink-1)", fontWeight: 500}}>{s.toFixed(3)}</span>
    </span>
  );
}

// ---------- Section header ----------
function SectionHead({eyebrow, title, desc, actions}) {
  return (
    <div style={{display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 14}}>
      <div>
        {eyebrow && <div style={{fontSize: 11.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600, marginBottom: 4}}>{eyebrow}</div>}
        <h2 style={{fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, margin: 0, color: "var(--ink-1)", letterSpacing: "-0.01em"}}>{title}</h2>
        {desc && <div style={{fontSize: 13, color: "var(--ink-3)", marginTop: 4}}>{desc}</div>}
      </div>
      <div style={{display: "flex", gap: 8, alignItems: "center"}}>{actions}</div>
    </div>
  );
}

// ---------- Format helpers ----------
function fmtBRL(v, compact) {
  if (compact) {
    if (v >= 1e9) return "R$ " + (v/1e9).toFixed(1).replace(".",",") + " bi";
    if (v >= 1e6) return "R$ " + (v/1e6).toFixed(1).replace(".",",") + " mi";
    if (v >= 1e3) return "R$ " + (v/1e3).toFixed(0) + " mil";
    return "R$ " + v.toFixed(0);
  }
  return "R$ " + v.toLocaleString("pt-BR", {minimumFractionDigits: 2, maximumFractionDigits: 2});
}
function fmtNum(v) { return v.toLocaleString("pt-BR"); }

// ---------- Mode search bar — appears at the top of each mode ----------
function ModeSearchBar({placeholder, value, chips, right, icon = <Icon.search size={16}/>, tone = "default"}) {
  const [v, setV] = useState(value || "");
  const isOrange = tone === "orange";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "0 12px 0 14px", height: 44,
      background: "var(--paper)",
      border: `1px solid ${isOrange ? "var(--orange-100)" : "var(--hairline)"}`,
      borderRadius: 10,
      boxShadow: "var(--shadow-sm)",
      marginBottom: 16,
    }}>
      <span style={{color: isOrange ? "var(--orange)" : "var(--deep-blue)", display: "inline-flex"}}>{icon}</span>
      <input value={v} onChange={e => setV(e.target.value)} placeholder={placeholder}
        style={{
          all: "unset", flex: 1, minWidth: 0,
          fontSize: 14, fontFamily: "var(--font-body)", color: "var(--ink-1)",
        }}/>
      {chips && <div style={{display: "flex", gap: 6}}>{chips}</div>}
      {right}
      <span style={{
        fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-3)",
        padding: "2px 6px", background: "var(--surface-sunk)", border: "1px solid var(--hairline)",
        borderRadius: 4,
      }}>⌘K</span>
    </div>
  );
}

Object.assign(window, {Button, Chip, Input, Card, KPI, Sparkline, BarRow, Tabs, Collapsible, ScoreDot, SectionHead, ModeSearchBar, fmtBRL, fmtNum});
