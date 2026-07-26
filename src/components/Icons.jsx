/** Inline SVG icon set — no icon-font dependency, inherits currentColor. */

const base = {
  width: 22, height: 22, viewBox: '0 0 24 24',
  fill: 'none', stroke: 'currentColor',
  strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
};

export const HomeIcon = (p) => (
  <svg {...base} {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9.5 21v-6h5v6" /></svg>
);

export const DumbbellIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M6.5 6.5v11M3.5 9v6M17.5 6.5v11M20.5 9v6M6.5 12h11" />
  </svg>
);

export const CalendarIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);

export const UserIcon = (p) => (
  <svg {...base} {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" /></svg>
);

export const RunIcon = (p) => (
  <svg {...base} {...p}>
    <circle cx="15.5" cy="4.5" r="2" />
    <path d="M6 21l3-5 3.5-2.5L11 9l-3 2-1.5 3" />
    <path d="M13 11.5 16 14l1.5 4M11 9l4-1.5 3 2.5" />
  </svg>
);

export const PlusIcon = (p) => <svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>;
export const CheckIcon = (p) => <svg {...base} {...p}><path d="m4 12.5 5.5 5.5L20 7" /></svg>;
export const TrashIcon = (p) => (
  <svg {...base} {...p}><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6" /></svg>
);
export const SearchIcon = (p) => (
  <svg {...base} {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
export const ChevronLeft = (p) => <svg {...base} {...p}><path d="m15 5-7 7 7 7" /></svg>;
export const ChevronRight = (p) => <svg {...base} {...p}><path d="m9 5 7 7-7 7" /></svg>;
export const PlayIcon = (p) => <svg {...base} {...p} fill="currentColor" stroke="none"><path d="M7 4.5v15l13-7.5z" /></svg>;
export const ScaleIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path d="M8 13a4 4 0 0 1 8 0" /><path d="M12 13V9.5" />
  </svg>
);
export const SunIcon = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" />
  </svg>
);
export const MoonIcon = (p) => (
  <svg {...base} {...p}><path d="M20 14.5A8.2 8.2 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" /></svg>
);
export const DownloadIcon = (p) => (
  <svg {...base} {...p}><path d="M12 3v12M7.5 10.5 12 15l4.5-4.5M4 20h16" /></svg>
);
export const LogoutIcon = (p) => (
  <svg {...base} {...p}><path d="M14 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8" /><path d="M17 8.5 20.5 12 17 15.5M20.5 12H10" /></svg>
);
export const SyncIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M20 12a8 8 0 0 1-13.6 5.7M4 12a8 8 0 0 1 13.6-5.7" />
    <path d="M4 20v-4h4M20 4v4h-4" />
  </svg>
);
export const ListIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
  </svg>
);

export const GridIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="3" y="3" width="7.5" height="7.5" rx="1.6" />
    <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" />
    <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6" />
  </svg>
);

export const FilterIcon = (p) => (
  <svg {...base} {...p}><path d="M3 5h18l-7 8v6l-4 2v-8L3 5z" /></svg>
);

export const DragIcon = (p) => (
  <svg {...base} {...p} strokeWidth="2.2">
    <path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" />
  </svg>
);

export const FlameIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 2s5 4.5 5 9.5a5 5 0 0 1-10 0c0-2 1-3.5 1-3.5s1.5 1.5 1.5 3c0-3 2.5-5.5 2.5-9z" />
  </svg>
);
