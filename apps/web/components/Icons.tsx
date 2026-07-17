// components/Icons.tsx — Shared line-icon set (no emoji), stroke = currentColor
import type { SVGProps } from "react";

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

function base(size = 18) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

export function IconGrid({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function IconHeart({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M20.8 5.6a5 5 0 0 0-7-.4l-1.8 1.6-1.8-1.6a5 5 0 0 0-7 7l1 1 7.8 7.4 7.8-7.4 1-1a5 5 0 0 0 0-6.6Z" />
    </svg>
  );
}

export function IconCheckSquare({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

export function IconSearch({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3-3" />
    </svg>
  );
}

export function IconGift({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13M20 12v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-7" />
      <path d="M12 8H7.5a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8ZM12 8h4.5a2.5 2.5 0 0 0 0-5C13 3 12 8 12 8Z" />
    </svg>
  );
}

export function IconActivity({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

export function IconFileText({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6M8 13h8M8 17h5" />
    </svg>
  );
}

export function IconSparkles({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
      <path d="M19 3.5 19.7 5.5 21.5 6.2 19.7 6.9 19 8.9 18.3 6.9 16.5 6.2 18.3 5.5 19 3.5Z" />
    </svg>
  );
}

export function IconBell({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

export function IconFlame({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M12 2s5 4 5 9a5 5 0 0 1-10 0c0-1.5.6-2.8 1.3-3.7C8.8 8.6 9 10 10 10.5 10 8 12 2 12 2Z" />
    </svg>
  );
}

export function IconMenu({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export function IconArrowRight({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function IconArrowLeft({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M19 12H5M11 18l-6-6 6-6" />
    </svg>
  );
}

export function IconUser({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a7 7 0 0 1 16 0v1" />
    </svg>
  );
}

export function IconPlus({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconPlay({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M6 4l14 8-14 8V4Z" />
    </svg>
  );
}

export function IconAlertTriangle({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    </svg>
  );
}

export function IconClock({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function IconCheck({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function IconStop({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <rect x="5" y="5" width="14" height="14" rx="2" />
    </svg>
  );
}

export function IconRefresh({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M4 4v6h6M20 20v-6h-6" />
      <path d="M20 8a8 8 0 0 0-14-3L4 7M4 16a8 8 0 0 0 14 3l2-2" />
    </svg>
  );
}

export function IconCopy({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function IconBrain({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M9.5 3a2.5 2.5 0 0 0-2.5 2.5v.6A3 3 0 0 0 5 9v1a3 3 0 0 0 0 5.9V17a3 3 0 0 0 3 3 2.5 2.5 0 0 0 4-2V5.5A2.5 2.5 0 0 0 9.5 3Z" />
      <path d="M14.5 3a2.5 2.5 0 0 1 2.5 2.5v.6A3 3 0 0 1 19 9v1a3 3 0 0 1 0 5.9V17a3 3 0 0 1-3 3 2.5 2.5 0 0 1-4-2V5.5A2.5 2.5 0 0 1 14.5 3Z" />
    </svg>
  );
}

export function IconPackage({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
      <path d="M3 8l9 5 9-5M12 13v8" />
    </svg>
  );
}

export function IconMusic({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M9 18V6l10-2v12" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="16" cy="16" r="3" />
    </svg>
  );
}

export function IconSmartphone({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <rect x="6" y="2" width="12" height="20" rx="2" />
      <path d="M11 18h2" />
    </svg>
  );
}

export function IconChevronDown({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function IconEye({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconUsers({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function IconCamera({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

export function IconMoon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />
    </svg>
  );
}

export function IconSun({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

export function IconVolume({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M11 5 6 9H2v6h4l5 4V5Z" />
      <path d="M19.1 4.9a10 10 0 0 1 0 14.2M15.5 8.5a5 5 0 0 1 0 7" />
    </svg>
  );
}

export function IconLightbulb({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M9 18h6M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2.05V17h6v-.25c0-.85.4-1.55 1-2.05A7 7 0 0 0 12 2Z" />
    </svg>
  );
}

export function IconSettings({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 0 1-4 0v-.09A1.7 1.7 0 0 0 9 19.37a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.63 15a1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 0 1 0-4h.09A1.7 1.7 0 0 0 4.63 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.63a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 0 1 4 0v.09A1.7 1.7 0 0 0 15 4.63a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.37 9a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 0 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1.04Z" />
    </svg>
  );
}

export function IconMessageCircle({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
    </svg>
  );
}

export function IconMonitor({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

export function IconHome({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
    </svg>
  );
}

export function IconLogOut({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

export function IconTarget({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </svg>
  );
}

export function IconZap({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
    </svg>
  );
}

export function IconCalendar({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
      <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
    </svg>
  );
}

export function IconSmile({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 14c.9 1.2 2 1.8 3.5 1.8s2.6-.6 3.5-1.8" />
      <path d="M9 9.5h.01M15 9.5h.01" />
    </svg>
  );
}

export function IconGamepad({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <rect x="2" y="7.5" width="20" height="11" rx="5" />
      <path d="M7 10.5v4M5 12.5h4" />
      <path d="M15.5 11.5h.01M18 13.5h.01" />
    </svg>
  );
}

export function IconCoffee({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M4 9h13v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z" />
      <path d="M17 10.5h1.5a2.5 2.5 0 0 1 0 5H17" />
      <path d="M8 3.5c-.5 1 .5 1.5 0 2.5M12 3.5c-.5 1 .5 1.5 0 2.5" />
    </svg>
  );
}

export function IconCookie({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M12 3a9 9 0 1 0 9 9c-1.5 0-2.5-1-2.3-2.5A3 3 0 0 1 15 6.3 3 3 0 0 1 12 3Z" />
      <path d="M9 12h.01M12 15h.01M9.5 16.5h.01M14.5 12h.01" />
    </svg>
  );
}

export function IconClapperboard({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M3 9.5 4.5 4h13L20.5 9.5Z" />
      <rect x="3" y="9.5" width="18" height="10.5" rx="1.5" />
      <path d="M7 4l2.5 5.5M13 4l2.5 5.5" />
    </svg>
  );
}

export function IconLotus({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M12 21c-4-1-7-4-7-8 3 0 5.5 1.5 7 4 1.5-2.5 4-4 7-4 0 4-3 7-7 8Z" />
      <path d="M12 13c-2-2-2.5-5-1-8 2 1 3.5 3 3.5 5.5M12 13c2-2 2.5-5 1-8-2 1-3.5 3-3.5 5.5" />
    </svg>
  );
}

export function IconBook({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5H6.5A2.5 2.5 0 0 0 4 21Z" />
      <path d="M4 5.5v15.5" />
    </svg>
  );
}

export function IconLeaf({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M5 20c0-8 5-15 14-15 1 8-4 15-14 15Z" />
      <path d="M5 20c2-4 5-7 9-9" />
    </svg>
  );
}

export function IconPalette({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M12 3a9 8.5 0 1 0 0 17c1.4 0 2-1 2-2s-.6-1.5-.6-2.3c0-1 .8-1.7 1.8-1.7H17a4 4 0 0 0 4-4C21 6 17 3 12 3Z" />
      <path d="M8 11h.01M8 15h.01M11.5 8h.01M15.5 9h.01" />
    </svg>
  );
}

export function IconBath({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M3 12h18v2a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5Z" />
      <path d="M5 12V6a2 2 0 0 1 3.5-1.3M2 19h20" />
    </svg>
  );
}

export function IconDice({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8.5 8.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01" />
    </svg>
  );
}

export function IconDance({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <circle cx="14" cy="4" r="1.6" />
      <path d="M9 21l2-6-3-2 1-5 4 1 3 4-2 1.5M11 15l-4 2-2 4" />
    </svg>
  );
}

// Bionic reading — bold fixation points at the start of each "word" bar.
export function IconBoldText({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M3 7h4M3 12h5M3 17h3.5" strokeWidth={4.5} />
      <path d="M9.5 7h11.5M10.5 12h10M8.5 17h12" strokeWidth={2} />
    </svg>
  );
}

export function IconFolder({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4l2 2.5h9A1.5 1.5 0 0 1 21 9v8.5A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5Z" />
    </svg>
  );
}

export function IconInfo({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 8h.01" />
    </svg>
  );
}

export function IconPause({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

export function IconX({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function IconBatteryLow({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <rect x="2" y="7" width="17" height="10" rx="2" />
      <path d="M22 10v4" />
      <path d="M6 10v4" fill="currentColor" />
    </svg>
  );
}

export function IconBatteryFull({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <rect x="2" y="7" width="17" height="10" rx="2" />
      <path d="M22 10v4" />
      <path d="M6 10v4M10 10v4M14 10v4" />
    </svg>
  );
}

export function IconStar({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M12 2.5l2.9 6.1 6.6.7-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.2 1.3-6.6-4.9-4.6 6.6-.7L12 2.5Z" />
    </svg>
  );
}

export function IconTrophy({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 5H4a3 3 0 0 0 3 5" />
      <path d="M17 5h3a3 3 0 0 1-3 5" />
    </svg>
  );
}

export function IconLock({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <rect x="4" y="10.5" width="16" height="10" rx="2" />
      <path d="M7.5 10.5V7a4.5 4.5 0 0 1 9 0v3.5" />
    </svg>
  );
}
