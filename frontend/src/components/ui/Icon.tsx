import React from "react";
import Svg, { Path, Circle, Rect, Line, Polyline } from "react-native-svg";

export type IconName =
  | "back"
  | "chevron-right"
  | "chevron-down"
  | "search"
  | "mail"
  | "lock"
  | "shield"
  | "location"
  | "calendar"
  | "clock"
  | "user"
  | "users"
  | "bell"
  | "home"
  | "plus"
  | "check"
  | "close"
  | "download"
  | "trash"
  | "external"
  | "eye"
  | "eye-off"
  | "play"
  | "trophy"
  | "volleyball"
  | "edit"
  | "settings"
  | "info-circle"
  | "pulse"
  | "filter"
  | "sliders"
  | "share";

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 20, color = "#F5F3FA", strokeWidth = 2 }: IconProps) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
  };

  const s = { stroke: color, strokeWidth, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  switch (name) {
    case "back":
      return (
        <Svg {...props}>
          <Path d="M15 18l-6-6 6-6" {...s} />
        </Svg>
      );
    case "chevron-right":
      return (
        <Svg {...props}>
          <Path d="M9 18l6-6-6-6" {...s} />
        </Svg>
      );
    case "chevron-down":
      return (
        <Svg {...props}>
          <Path d="M6 9l6 6 6-6" {...s} />
        </Svg>
      );
    case "search":
      return (
        <Svg {...props}>
          <Circle cx="11" cy="11" r="8" {...s} />
          <Line x1="21" y1="21" x2="16.65" y2="16.65" {...s} />
        </Svg>
      );
    case "mail":
      return (
        <Svg {...props}>
          <Rect x="2" y="4" width="20" height="16" rx="2" {...s} />
          <Path d="M22 7l-10 7L2 7" {...s} />
        </Svg>
      );
    case "lock":
      return (
        <Svg {...props}>
          <Rect x="3" y="11" width="18" height="11" rx="2" {...s} />
          <Path d="M7 11V7a5 5 0 0110 0v4" {...s} />
        </Svg>
      );
    case "shield":
      return (
        <Svg {...props}>
          <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" {...s} />
        </Svg>
      );
    case "location":
      return (
        <Svg {...props}>
          <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" {...s} />
          <Circle cx="12" cy="10" r="3" {...s} />
        </Svg>
      );
    case "calendar":
      return (
        <Svg {...props}>
          <Rect x="3" y="4" width="18" height="18" rx="2" {...s} />
          <Line x1="16" y1="2" x2="16" y2="6" {...s} />
          <Line x1="8" y1="2" x2="8" y2="6" {...s} />
          <Line x1="3" y1="10" x2="21" y2="10" {...s} />
        </Svg>
      );
    case "clock":
      return (
        <Svg {...props}>
          <Circle cx="12" cy="12" r="10" {...s} />
          <Polyline points="12 6 12 12 16 14" {...s} />
        </Svg>
      );
    case "user":
      return (
        <Svg {...props}>
          <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" {...s} />
          <Circle cx="12" cy="7" r="4" {...s} />
        </Svg>
      );
    case "users":
      return (
        <Svg {...props}>
          <Path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" {...s} />
          <Circle cx="9" cy="7" r="4" {...s} />
          <Path d="M23 21v-2a4 4 0 00-3-3.87" {...s} />
          <Path d="M16 3.13a4 4 0 010 7.75" {...s} />
        </Svg>
      );
    case "bell":
      return (
        <Svg {...props}>
          <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" {...s} />
          <Path d="M13.73 21a2 2 0 01-3.46 0" {...s} />
        </Svg>
      );
    case "home":
      return (
        <Svg {...props}>
          <Path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" {...s} />
          <Polyline points="9 22 9 12 15 12 15 22" {...s} />
        </Svg>
      );
    case "plus":
      return (
        <Svg {...props}>
          <Line x1="12" y1="5" x2="12" y2="19" {...s} />
          <Line x1="5" y1="12" x2="19" y2="12" {...s} />
        </Svg>
      );
    case "check":
      return (
        <Svg {...props}>
          <Polyline points="20 6 9 17 4 12" {...s} />
        </Svg>
      );
    case "close":
      return (
        <Svg {...props}>
          <Line x1="18" y1="6" x2="6" y2="18" {...s} />
          <Line x1="6" y1="6" x2="18" y2="18" {...s} />
        </Svg>
      );
    case "download":
      return (
        <Svg {...props}>
          <Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" {...s} />
          <Polyline points="7 10 12 15 17 10" {...s} />
          <Line x1="12" y1="15" x2="12" y2="3" {...s} />
        </Svg>
      );
    case "trash":
      return (
        <Svg {...props}>
          <Polyline points="3 6 5 6 21 6" {...s} />
          <Path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" {...s} />
        </Svg>
      );
    case "external":
      return (
        <Svg {...props}>
          <Path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" {...s} />
          <Polyline points="15 3 21 3 21 9" {...s} />
          <Line x1="10" y1="14" x2="21" y2="3" {...s} />
        </Svg>
      );
    case "eye":
      return (
        <Svg {...props}>
          <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" {...s} />
          <Circle cx="12" cy="12" r="3" {...s} />
        </Svg>
      );
    case "eye-off":
      return (
        <Svg {...props}>
          <Path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" {...s} />
          <Path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" {...s} />
          <Path d="M14.12 14.12a3 3 0 11-4.24-4.24" {...s} />
          <Line x1="1" y1="1" x2="23" y2="23" {...s} />
        </Svg>
      );
    case "play":
      return (
        <Svg {...props}>
          <Path d="M5 3l14 9-14 9V3z" {...s} fill={color} />
        </Svg>
      );
    case "trophy":
      return (
        <Svg {...props}>
          <Path d="M6 9H4.5a2.5 2.5 0 010-5H6" {...s} />
          <Path d="M18 9h1.5a2.5 2.5 0 000-5H18" {...s} />
          <Path d="M4 22h16" {...s} />
          <Path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" {...s} />
          <Path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" {...s} />
          <Path d="M18 2H6v7a6 6 0 0012 0V2z" {...s} />
        </Svg>
      );
    case "volleyball":
      return (
        <Svg {...props}>
          <Circle cx="12" cy="12" r="10" {...s} />
          <Path d="M12 2a14.5 14.5 0 000 20" {...s} />
          <Path d="M12 2a14.5 14.5 0 010 20" {...s} />
          <Path d="M2 12h20" {...s} />
        </Svg>
      );
    case "edit":
      return (
        <Svg {...props}>
          <Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" {...s} />
          <Path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" {...s} />
        </Svg>
      );
    case "settings":
      return (
        <Svg {...props}>
          <Circle cx="12" cy="12" r="3" {...s} />
          <Path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" {...s} />
        </Svg>
      );
    case "info-circle":
      return (
        <Svg {...props}>
          <Circle cx="12" cy="12" r="9" {...s} />
          <Path d="M12 8v4" {...s} />
          <Path d="M12 16h.01" {...s} />
        </Svg>
      );
    case "pulse":
      return (
        <Svg {...props}>
          <Polyline points="3 13 8 13 10 6 14 18 16 13 21 13" {...s} />
        </Svg>
      );
    case "filter":
      return (
        <Svg {...props}>
          <Path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" {...s} />
        </Svg>
      );
    case "sliders":
      return (
        <Svg {...props}>
          <Path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" {...s} />
          <Path d="M1 14h6M9 8h6M17 16h6" {...s} />
        </Svg>
      );
    case "share":
      return (
        <Svg {...props}>
          <Path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" {...s} />
          <Polyline points="16 6 12 2 8 6" {...s} />
          <Line x1={12} y1={2} x2={12} y2={15} {...s} />
        </Svg>
      );
    default:
      return null;
  }
}
