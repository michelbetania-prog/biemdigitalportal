import { createElement, Fragment } from './mini-react.js';
function Icon({ size = 20, className = '', strokeWidth = 1.8, children, ...props }) {
    return createElement("svg", { className: className, width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: strokeWidth, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", ...props }, children || createElement(Fragment, null,
        createElement("circle", { cx: "12", cy: "12", r: "8" }),
        createElement("path", { d: "M8.5 12h7M12 8.5v7" })));
}
const make = path => props => createElement(Icon, { ...props }, path);
export const ArrowLeft = make(createElement(Fragment, null,
    createElement("path", { d: "m15 18-6-6 6-6" }),
    createElement("path", { d: "M9 12h10" })));
export const ArrowRight = make(createElement(Fragment, null,
    createElement("path", { d: "m9 18 6-6-6-6" }),
    createElement("path", { d: "M5 12h10" })));
export const Check = make(createElement("path", { d: "m5 12 4 4L19 6" })), CheckCircle2 = make(createElement(Fragment, null,
    createElement("circle", { cx: "12", cy: "12", r: "9" }),
    createElement("path", { d: "m8 12 3 3 5-6" })));
export const ChevronDown = make(createElement("path", { d: "m7 10 5 5 5-5" })), X = make(createElement(Fragment, null,
    createElement("path", { d: "m6 6 12 12" }),
    createElement("path", { d: "m18 6-12 12" })));
export const Menu = make(createElement(Fragment, null,
    createElement("path", { d: "M4 7h16M4 12h16M4 17h16" }))), MoreHorizontal = make(createElement(Fragment, null,
    createElement("circle", { cx: "6", cy: "12", r: "1", fill: "currentColor" }),
    createElement("circle", { cx: "12", cy: "12", r: "1", fill: "currentColor" }),
    createElement("circle", { cx: "18", cy: "12", r: "1", fill: "currentColor" })));
export const Bell = make(createElement(Fragment, null,
    createElement("path", { d: "M6 9a6 6 0 0 1 12 0c0 7 3 7 3 7H3s3 0 3-7" }),
    createElement("path", { d: "M10 20h4" })));
export const CalendarDays = make(createElement(Fragment, null,
    createElement("rect", { x: "3", y: "5", width: "18", height: "16", rx: "2" }),
    createElement("path", { d: "M8 3v4M16 3v4M3 10h18" })));
export const Clock3 = make(createElement(Fragment, null,
    createElement("circle", { cx: "12", cy: "12", r: "9" }),
    createElement("path", { d: "M12 7v5l3 2" }))), Download = make(createElement(Fragment, null,
    createElement("path", { d: "M12 3v12m0 0 4-4m-4 4-4-4M5 20h14" })));
export const Send = make(createElement(Fragment, null,
    createElement("path", { d: "m3 3 18 9-18 9 4-9-4-9Z" }),
    createElement("path", { d: "M7 12h14" }))), Paperclip = make(createElement("path", { d: "m20 11-8 8a6 6 0 0 1-8-8l9-9a4 4 0 0 1 6 6l-9 9a2 2 0 0 1-3-3l8-8" }));
export const TrendingUp = make(createElement(Fragment, null,
    createElement("path", { d: "m3 17 6-6 4 4 8-8" }),
    createElement("path", { d: "M15 7h6v6" }))), BarChart3 = make(createElement(Fragment, null,
    createElement("path", { d: "M4 20V10M10 20V4M16 20v-7M22 20H2" })));
export const Users = make(createElement(Fragment, null,
    createElement("circle", { cx: "9", cy: "8", r: "3" }),
    createElement("path", { d: "M3 20c0-4 2-6 6-6s6 2 6 6M16 5a3 3 0 0 1 0 6M17 14c3 0 4 2 4 5" })));
export const UserRound = make(createElement(Fragment, null,
    createElement("circle", { cx: "12", cy: "8", r: "4" }),
    createElement("path", { d: "M4 21c0-5 3-8 8-8s8 3 8 8" })));
export const FileText = make(createElement(Fragment, null,
    createElement("path", { d: "M6 2h8l4 4v16H6z" }),
    createElement("path", { d: "M14 2v5h5M9 12h6M9 16h6" }))), FileBarChart = FileText;
export const Image = make(createElement(Fragment, null,
    createElement("rect", { x: "3", y: "4", width: "18", height: "16", rx: "2" }),
    createElement("circle", { cx: "9", cy: "9", r: "2" }),
    createElement("path", { d: "m3 17 5-5 4 4 3-3 6 6" })));
export const Video = make(createElement(Fragment, null,
    createElement("rect", { x: "3", y: "6", width: "13", height: "12", rx: "2" }),
    createElement("path", { d: "m16 10 5-3v10l-5-3" }))), Play = make(createElement(Fragment, null,
    createElement("circle", { cx: "12", cy: "12", r: "9" }),
    createElement("path", { d: "m10 8 6 4-6 4z" })));
export const Instagram = make(createElement(Fragment, null,
    createElement("rect", { x: "3", y: "3", width: "18", height: "18", rx: "5" }),
    createElement("circle", { cx: "12", cy: "12", r: "4" }),
    createElement("circle", { cx: "17.5", cy: "6.5", r: "1", fill: "currentColor" })));
export const MessageCircle = make(createElement(Fragment, null,
    createElement("path", { d: "M21 12a9 9 0 1 1-4-7.5A9 9 0 0 1 21 12Z" }),
    createElement("path", { d: "m7 19-3 2 1-4" })));
export const LayoutDashboard = make(createElement(Fragment, null,
    createElement("rect", { x: "3", y: "3", width: "7", height: "7" }),
    createElement("rect", { x: "14", y: "3", width: "7", height: "7" }),
    createElement("rect", { x: "3", y: "14", width: "7", height: "7" }),
    createElement("rect", { x: "14", y: "14", width: "7", height: "7" }))), Grid2X2 = LayoutDashboard;
export const Target = make(createElement(Fragment, null,
    createElement("circle", { cx: "12", cy: "12", r: "9" }),
    createElement("circle", { cx: "12", cy: "12", r: "5" }),
    createElement("circle", { cx: "12", cy: "12", r: "1", fill: "currentColor" })));
export const Sparkles = make(createElement(Fragment, null,
    createElement("path", { d: "m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" }),
    createElement("path", { d: "m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7z" })));
export const Zap = make(createElement("path", { d: "m13 2-9 12h7l-1 8 9-12h-7z" })), PencilLine = make(createElement(Fragment, null,
    createElement("path", { d: "m4 20 4-1 11-11-3-3L5 16z" }),
    createElement("path", { d: "M14 6l3 3" })));
export const Plus = make(createElement(Fragment, null,
    createElement("path", { d: "M12 5v14M5 12h14" }))), Circle = make(createElement("circle", { cx: "12", cy: "12", r: "9" }));
