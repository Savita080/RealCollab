export const FolderIcon = ({ open }) => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    {open
      ? <path d="M1 4h5l1.5-2H15v10H1V4z" fill="var(--accent)" fillOpacity=".7" stroke="var(--accent)" strokeWidth="1.2" strokeLinejoin="round" />
      : <path d="M1 4h5l1.5-2H15v10H1V4z" fill="none" stroke="var(--text-3)" strokeWidth="1.2" strokeLinejoin="round" />}
  </svg>
);

export const FileIcon = () => (
  <svg width="12" height="14" viewBox="0 0 12 14" fill="none" style={{ flexShrink: 0 }}>
    <path d="M1 1h7l3 3v9H1V1z" fill="none" stroke="var(--text-3)" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M8 1v3h3" stroke="var(--text-3)" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

export const ChevronIcon = ({ open }) => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s', flexShrink: 0 }}>
    <path d="M3 2l4 3-4 3" stroke="var(--text-3)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
