// viago/frontend/src/Icons.tsx - v3.0 Apple HIG Style

const iconProps = {
  width: "28",
  height: "28",
  viewBox: "0 0 24 24",
  strokeWidth: "1.8", // Делаем линии тоньше
  strokeLinecap: "round" as "round",
  strokeLinejoin: "round" as "round",
};

export const HomeIcon = () => <svg {...iconProps} fill="none" stroke="currentColor"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
export const PlusSquareIcon = () => <svg {...iconProps} fill="none" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>;
export const UserIcon = () => <svg {...iconProps} fill="none" stroke="currentColor"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;

// Filled Icons
export const HomeIconFilled = () => <svg {...iconProps} stroke="currentColor" fill="currentColor"><path d="M12 2.09954L2.64926 8.34954C2.24219 8.59954 2 9.09954 2 9.59954V20C2 21.1046 2.89543 22 4 22H20C21.1046 22 22 21.1046 22 20V9.59954C22 9.09954 21.7578 8.59954 21.3507 8.34954L12 2.09954Z"/></svg>;
export const PlusSquareIconFilled = () => <svg {...iconProps} stroke="currentColor" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /></svg>;
export const UserIconFilled = () => <svg {...iconProps} stroke="currentColor" fill="currentColor"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;

// Utility Icons
export const SearchIcon = () => <svg {...iconProps} width="20" height="20" strokeWidth="2.2" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
export const ArrowLeftIcon = () => <svg {...iconProps} width="24" height="24" stroke="currentColor"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>;
