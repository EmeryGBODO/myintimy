const base = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.15, strokeLinecap: "round", strokeLinejoin: "round" };
const make = (paths) => ({ className = "h-5 w-5", ...rest }) => <svg {...base} className={className} aria-hidden="true" {...rest}>{paths}</svg>;

export const IconSearch = make(<><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></>);
export const IconHeart = make(<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z" />);
export const IconBag = make(<><path d="M5 8h14l-1.2 12H6.2z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></>);
export const IconMenu = make(<path d="M3 8h18M3 16h18" />);
export const IconClose = make(<path d="M6 6l12 12M18 6L6 18" />);
export const IconSun = make(<><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4" /></>);
export const IconMoon = make(<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z" />);
export const IconLeft = make(<path d="M15 5l-7 7 7 7" />);
export const IconRight = make(<path d="M9 5l7 7-7 7" />);
export const IconArrow = make(<path d="M4 12h16M14 6l6 6-6 6" />);
export const IconPlus = make(<path d="M12 5v14M5 12h14" />);
export const IconMinus = make(<path d="M5 12h14" />);
export const IconBox = make(<><path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5z" /><path d="M3.5 7.5L12 12l8.5-4.5M12 12v9" /></>);
export const IconLock = make(<><rect x="5" y="10.5" width="14" height="10" rx="1" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></>);
export const IconReturn = make(<><path d="M9 14L4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></>);
export const IconChat = make(<><path d="M4 18.5V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7.5z" /><path d="M8.5 9h7M8.5 12h4.5" /></>);
