import { createElement, Fragment } from './mini-react.js'

function Icon({ size = 20, className = '', strokeWidth = 1.8, children, ...props }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{children || <><circle cx="12" cy="12" r="8"/><path d="M8.5 12h7M12 8.5v7"/></>}</svg>
}
const make = path => props => <Icon {...props}>{path}</Icon>
export const ArrowLeft=make(<><path d="m15 18-6-6 6-6"/><path d="M9 12h10"/></>)
export const ArrowRight=make(<><path d="m9 18 6-6-6-6"/><path d="M5 12h10"/></>)
export const Check=make(<path d="m5 12 4 4L19 6"/>), CheckCircle2=make(<><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></>)
export const ChevronDown=make(<path d="m7 10 5 5 5-5"/>), X=make(<><path d="m6 6 12 12"/><path d="m18 6-12 12"/></>)
export const Menu=make(<><path d="M4 7h16M4 12h16M4 17h16"/></>), MoreHorizontal=make(<><circle cx="6" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="18" cy="12" r="1" fill="currentColor"/></>)
export const Bell=make(<><path d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 7H3s3 0 3-7"/><path d="M10 20h4"/></>)
export const CalendarDays=make(<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></>)
export const Clock3=make(<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>), Download=make(<><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14"/></>)
export const Send=make(<><path d="m3 3 18 9-18 9 4-9-4-9Z"/><path d="M7 12h14"/></>), Paperclip=make(<path d="m20 11-8 8a6 6 0 0 1-8-8l9-9a4 4 0 0 1 6 6l-9 9a2 2 0 0 1-3-3l8-8"/>)
export const TrendingUp=make(<><path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/></>), BarChart3=make(<><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>)
export const Users=make(<><circle cx="9" cy="8" r="3"/><path d="M3 20c0-4 2-6 6-6s6 2 6 6M16 5a3 3 0 0 1 0 6M17 14c3 0 4 2 4 5"/></>)
export const UserRound=make(<><circle cx="12" cy="8" r="4"/><path d="M4 21c0-5 3-8 8-8s8 3 8 8"/></>)
export const FileText=make(<><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5M9 12h6M9 16h6"/></>), FileBarChart=FileText
export const Image=make(<><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m3 17 5-5 4 4 3-3 6 6"/></>)
export const Video=make(<><rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/></>), Play=make(<><circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/></>)
export const Instagram=make(<><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></>)
export const MessageCircle=make(<><path d="M21 12a9 9 0 1 1-4-7.5A9 9 0 0 1 21 12Z"/><path d="m7 19-3 2 1-4"/></>)
export const LayoutDashboard=make(<><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>), Grid2X2=LayoutDashboard
export const Target=make(<><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor"/></>)
export const Sparkles=make(<><path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7z"/></>)
export const Zap=make(<path d="m13 2-9 12h7l-1 8 9-12h-7z"/>), PencilLine=make(<><path d="m4 20 4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/></>)
export const Plus=make(<><path d="M12 5v14M5 12h14"/></>), Circle=make(<circle cx="12" cy="12" r="9"/>)

export const CreditCard=make(<><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/></>)
export const Package=make(<><path d="m4 7 8-4 8 4-8 4z"/><path d="M4 7v10l8 4 8-4V7M12 11v10"/></>)
export const Receipt=make(<><path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"/><path d="M9 7h6M9 11h6M9 15h4"/></>)
export const Layers=make(<><path d="m12 2 9 5-9 5-9-5z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/></>)
export const Megaphone=make(<><path d="m3 11 15-6v14L3 13z"/><path d="M7 14v5a2 2 0 0 0 2 2h2v-6"/></>)
export const Workflow=make(<><rect x="3" y="3" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/><path d="M6 8v4h12v4M18 8v4"/></>)
export const Palette=make(<><path d="M12 3a9 9 0 0 0 0 18h1.5a2 2 0 0 0 0-4H12a2 2 0 0 1 0-4h5a4 4 0 0 0 4-4c0-3-4-6-9-6Z"/><circle cx="7" cy="10" r="1" fill="currentColor"/><circle cx="10" cy="7" r="1" fill="currentColor"/><circle cx="15" cy="7" r="1" fill="currentColor"/></>)
export const Search=make(<><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>)
export const Settings=make(<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>)
export const Shield=make(<><path d="M12 3 4 6v5c0 5 3 8 8 10 5-2 8-5 8-10V6z"/><path d="m9 12 2 2 4-5"/></>)
export const LogOut=make(<><path d="M10 17l5-5-5-5M15 12H3"/><path d="M14 3h6v18h-6"/></>)
export const Filter=make(<path d="M4 5h16l-6 7v6l-4 2v-8z"/>)
export const Eye=make(<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>)
export const Edit=make(<><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13 7 4 4"/></>)
export const AlertTriangle=make(<><path d="M12 3 2 21h20z"/><path d="M12 9v5M12 18h.01"/></>)
export const Briefcase=make(<><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3M3 12h18"/></>)
export const DollarSign=make(<><path d="M12 2v20M17 6.5c-1-1-2.5-1.5-5-1.5-3 0-5 1.5-5 4s2 3.5 5 4 5 1.5 5 4-2 4-5 4c-2.5 0-4-.5-5-1.5"/></>)
export const Lock=make(<><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>)
export const Sliders=make(<><path d="M4 6h16M4 18h16M8 3v6M16 15v6"/></>)
