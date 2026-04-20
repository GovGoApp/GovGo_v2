// Minimal hairline icon set — 20x20 viewBox, 1.5 stroke
const I = ({children, size = 18, s = 1.5}) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor"
       strokeWidth={s} strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);
const Icon = {
  search:      (p) => <I {...p}><circle cx="9" cy="9" r="5.5"/><path d="m13.5 13.5 3.5 3.5"/></I>,
  chevDown:    (p) => <I {...p}><path d="m5 7.5 5 5 5-5"/></I>,
  chevRight:   (p) => <I {...p}><path d="m7.5 5 5 5-5 5"/></I>,
  chevLeft:    (p) => <I {...p}><path d="m12.5 5-5 5 5 5"/></I>,
  plus:        (p) => <I {...p}><path d="M10 4v12M4 10h12"/></I>,
  close:       (p) => <I {...p}><path d="m5 5 10 10M15 5 5 15"/></I>,
  filter:      (p) => <I {...p}><path d="M3 5h14M5.5 10h9M8 15h4"/></I>,
  star:        (p) => <I {...p}><path d="m10 3 2.1 4.4 4.9.7-3.5 3.4.8 4.8L10 14l-4.3 2.3.8-4.8L3 8.1l4.9-.7L10 3Z"/></I>,
  starFill:    (p) => <I {...p} s={0}><path fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" d="m10 3 2.1 4.4 4.9.7-3.5 3.4.8 4.8L10 14l-4.3 2.3.8-4.8L3 8.1l4.9-.7L10 3Z"/></I>,
  bell:        (p) => <I {...p}><path d="M5 13h10M6.5 13V9a3.5 3.5 0 0 1 7 0v4M9 16h2"/></I>,
  user:        (p) => <I {...p}><circle cx="10" cy="7.5" r="2.5"/><path d="M4.5 16c.8-2.5 3-4 5.5-4s4.7 1.5 5.5 4"/></I>,
  file:        (p) => <I {...p}><path d="M6 3h6l3 3v11H6z"/><path d="M12 3v3h3"/></I>,
  table:       (p) => <I {...p}><rect x="3" y="4" width="14" height="12" rx="1.5"/><path d="M3 8h14M3 12h14M8.5 4v12"/></I>,
  map:         (p) => <I {...p}><path d="m3 5 4-1.5L13 6l4-1.5v11L13 17 7 14.5 3 16z"/><path d="M7 3.5v11M13 6v11"/></I>,
  chart:       (p) => <I {...p}><path d="M3 16h14M6 13V9M10 13V5M14 13v-5"/></I>,
  brief:       (p) => <I {...p}><rect x="3" y="6" width="14" height="10" rx="1.5"/><path d="M7 6V4.5A1.5 1.5 0 0 1 8.5 3h3A1.5 1.5 0 0 1 13 4.5V6"/></I>,
  terminal:    (p) => <I {...p}><rect x="3" y="4" width="14" height="12" rx="1.5"/><path d="m6 9 2 2-2 2M11 13h3"/></I>,
  bookmark:    (p) => <I {...p}><path d="M6 3h8v14l-4-2.5L6 17z"/></I>,
  history:     (p) => <I {...p}><path d="M4.5 10a5.5 5.5 0 1 0 1.6-3.9"/><path d="M4.5 5v3h3M10 7v3l2 1.5"/></I>,
  upload:      (p) => <I {...p}><path d="M10 13V4M6.5 7.5 10 4l3.5 3.5M4 15.5h12"/></I>,
  download:    (p) => <I {...p}><path d="M10 4v9M6.5 9.5 10 13l3.5-3.5M4 15.5h12"/></I>,
  external:    (p) => <I {...p}><path d="M8 4H4v12h12v-4M12 4h4v4M16 4 9 11"/></I>,
  check:       (p) => <I {...p}><path d="m4.5 10.5 3.5 3.5L16 6"/></I>,
  alert:       (p) => <I {...p}><path d="M10 4 3 16h14z"/><path d="M10 9v3M10 14h.01"/></I>,
  sparkle:     (p) => <I {...p}><path d="M10 3v4M10 13v4M3 10h4M13 10h4M5 5l2.5 2.5M12.5 12.5 15 15M5 15l2.5-2.5M12.5 7.5 15 5"/></I>,
  grid:        (p) => <I {...p}><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="11" y="3" width="6" height="6" rx="1"/><rect x="3" y="11" width="6" height="6" rx="1"/><rect x="11" y="11" width="6" height="6" rx="1"/></I>,
  menu:        (p) => <I {...p}><path d="M3 6h14M3 10h14M3 14h14"/></I>,
  dots:        (p) => <I {...p} s={0}><circle cx="5" cy="10" r="1.2" fill="currentColor"/><circle cx="10" cy="10" r="1.2" fill="currentColor"/><circle cx="15" cy="10" r="1.2" fill="currentColor"/></I>,
  building:    (p) => <I {...p}><path d="M4 17V6l6-3v14M10 17V8l6 2v7M2 17h16"/><path d="M7 8v1M7 11v1M7 14v1M13 12v1M13 15v1"/></I>,
  pin:         (p) => <I {...p}><path d="M10 2.5c2.8 0 5 2.2 5 4.8 0 3.6-5 9.2-5 9.2S5 10.9 5 7.3c0-2.6 2.2-4.8 5-4.8Z"/><circle cx="10" cy="7.5" r="1.8"/></I>,
  sort:        (p) => <I {...p}><path d="M6 4v12M6 4l-2 2M6 4l2 2M14 16V4M14 16l-2-2M14 16l2-2"/></I>,
  trend:       (p) => <I {...p}><path d="m3 13 4-4 3 3 7-7"/><path d="M12 5h5v5"/></I>,
  trendDown:   (p) => <I {...p}><path d="m3 7 4 4 3-3 7 7"/><path d="M12 15h5v-5"/></I>,
  globe:       (p) => <I {...p}><circle cx="10" cy="10" r="7"/><path d="M3 10h14M10 3c2 2.5 3 5 3 7s-1 4.5-3 7c-2-2.5-3-5-3-7s1-4.5 3-7Z"/></I>,
  clock:       (p) => <I {...p}><circle cx="10" cy="10" r="7"/><path d="M10 6v4l2.5 1.5"/></I>,
  logo:        ({size=22}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="1.5" y="1.5" width="21" height="21" rx="5.5" fill="#003A70"/>
      <path d="M7 12.2a5 5 0 0 1 9.3-2.5" stroke="#FF5722" strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M16.8 12.2a5 5 0 0 1-9.3 2.5" stroke="#E0EAF9" strokeWidth="2.2" strokeLinecap="round"/>
      <circle cx="16.5" cy="8" r="1.6" fill="#FF5722"/>
    </svg>
  ),
};
window.Icon = Icon;
