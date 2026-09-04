import type { SVGProps } from "react";

/** Small, consistent stroke-icon set (own simple line-icon paths — no
 * external icon library needed for this scope). All 16-20px, currentColor. */

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base(size = 17) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

export function ChevronRightIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function SearchIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

export function PlusIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function TrashIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" />
    </svg>
  );
}

export function GripIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <circle cx="9" cy="6" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="6" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="9" cy="18" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="18" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function AlertTriangleIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M10.29 3.86 1.82 18a1.5 1.5 0 0 0 1.29 2.25h17.78A1.5 1.5 0 0 0 22.18 18L13.71 3.86a1.5 1.5 0 0 0-2.42 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

export function ZapIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p} fill="currentColor" stroke="none">
      <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" />
    </svg>
  );
}

export function BarChartIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M4 20V10M12 20V4M20 20v-6" />
    </svg>
  );
}

export function WavesIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M3 8c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0" />
      <path d="M3 16c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0" />
    </svg>
  );
}

export function ArrowUpDownIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M7 3v18M3 7l4-4 4 4M17 21V3M13 17l4 4 4-4" />
    </svg>
  );
}

export function ShieldAlertIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  );
}

export function CheckCircleIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5" />
    </svg>
  );
}

export function LogOutIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

export function RefreshIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M3 12a9 9 0 0 1 15.3-6.4L21 8M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15.3 6.4L3 16M3 21v-5h5" />
    </svg>
  );
}

export function InboxIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M4 12h4l2 3h4l2-3h4" />
      <path d="M5.5 5h13l2.5 7v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-7l2.5-7Z" />
    </svg>
  );
}

export function WifiOffIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M2 2l20 20M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 3.5-2.3M19 13a10 10 0 0 0-2.8-2M12 20h.01" />
    </svg>
  );
}

export function ClockIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

export function PencilIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export function TrendingUpIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </svg>
  );
}

export function LayersIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="m12 2 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5" />
      <path d="m3 17 9 5 9-5" />
    </svg>
  );
}
