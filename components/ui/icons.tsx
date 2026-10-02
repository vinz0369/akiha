import type { SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      viewBox="0 0 24 24"
      {...props}
    >
      {children}
    </svg>
  );
}

const strokeProps = {
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  strokeWidth: 1.8,
};

export function ArrowLeftIcon(props: IconProps) {
  return <IconBase {...props}><path d="m15 18-6-6 6-6" {...strokeProps} /></IconBase>;
}

export function ArrowRightIcon(props: IconProps) {
  return <IconBase {...props}><path d="m9 18 6-6-6-6" {...strokeProps} /></IconBase>;
}

export function ArrowUpIcon(props: IconProps) {
  return <IconBase {...props}><path d="m6 15 6-6 6 6" {...strokeProps} /></IconBase>;
}

export function ArrowDownIcon(props: IconProps) {
  return <IconBase {...props}><path d="m6 9 6 6 6-6" {...strokeProps} /></IconBase>;
}

export function CheckIcon(props: IconProps) {
  return <IconBase {...props}><path d="m5 12 4.5 4.5L19 7" {...strokeProps} /></IconBase>;
}

export function AlertIcon(props: IconProps) {
  return <IconBase {...props}><path d="M10.3 4.2 2.7 17.4A1.7 1.7 0 0 0 4.2 20h15.6a1.7 1.7 0 0 0 1.5-2.6L13.7 4.2a2 2 0 0 0-3.4 0Z" {...strokeProps} /><path d="M12 9v4M12 16.5h.01" {...strokeProps} /></IconBase>;
}

export function CloseIcon(props: IconProps) {
  return <IconBase {...props}><path d="m7 7 10 10M17 7 7 17" {...strokeProps} /></IconBase>;
}

export function HeartIcon(props: IconProps) {
  return <IconBase {...props}><path d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.44A4 4 0 0 1 19 10c0 5.65-7 10-7 10Z" {...strokeProps} /></IconBase>;
}

export function GiftIcon(props: IconProps) {
  return <IconBase {...props}><path d="M4 10h16v10H4zM3 7h18v4H3zM12 7v13M12 7c-1.8 0-5.2-.8-5.2-3 0-1.2 1-2 2.2-2 2 0 3 3 3 5Zm0 0c1.8 0 5.2-.8 5.2-3 0-1.2-1-2-2.2-2-2 0-3 3-3 5Z" {...strokeProps} /></IconBase>;
}

export function CloudOffIcon(props: IconProps) {
  return <IconBase {...props}><path d="m4 4 16 16M7.2 7.3A5.5 5.5 0 0 1 17 10v.2A4 4 0 0 1 18 18H8a5 5 0 0 1-2.8-9.15M12 6.5c.5-.16 1.04-.25 1.6-.25" {...strokeProps} /></IconBase>;
}

export function RefreshIcon(props: IconProps) {
  return <IconBase {...props}><path d="M20 7v5h-5M4 17v-5h5M6.1 9A7 7 0 0 1 18.8 7M17.9 15A7 7 0 0 1 5.2 17" {...strokeProps} /></IconBase>;
}

export function BoltIcon(props: IconProps) {
  return <IconBase {...props}><path d="m13.5 2-8 12h6l-1 8 8-12h-6l1-8Z" {...strokeProps} /></IconBase>;
}

export function SmileIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="12" cy="12" r="9" {...strokeProps} /><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01" {...strokeProps} /></IconBase>;
}

export function FlowerIcon(props: IconProps) {
  return <IconBase {...props}><path d="M12 10c-3.7-5.8 3.7-8.2 4.3-2.2 5-3.4 7.8 3.6 1.5 4.2 3.4 5-3.6 7.8-4.2 1.5-5 3.4-7.8-3.6-1.5-4.2-3.4-5 3.6-7.8 4.2-1.5Z" {...strokeProps} /><circle cx="12" cy="11.5" r="1.5" fill="currentColor" /></IconBase>;
}

export function MoonIcon(props: IconProps) {
  return <IconBase {...props}><path d="M20 15.2A8.5 8.5 0 0 1 8.8 4 8.5 8.5 0 1 0 20 15.2Z" {...strokeProps} /></IconBase>;
}

export function HomeIcon(props: IconProps) {
  return <IconBase {...props}><path d="m4 10 8-7 8 7v10h-6v-6h-4v6H4V10Z" {...strokeProps} /></IconBase>;
}

export function CalendarIcon(props: IconProps) {
  return <IconBase {...props}><rect height="16" rx="3" width="17" x="3.5" y="4.5" {...strokeProps} /><path d="M8 3v4M16 3v4M4 9h16" {...strokeProps} /></IconBase>;
}

export function MessageIcon(props: IconProps) {
  return <IconBase {...props}><path d="M5 18.5 3.8 21l3.6-1.1c1.3.7 2.8 1.1 4.6 1.1 5 0 9-3.6 9-8s-4-8-9-8-9 3.6-9 8c0 2.1.7 4 2 5.5Z" {...strokeProps} /><path d="M8 12h8M8 15h5" {...strokeProps} /></IconBase>;
}

export function SettingsIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="12" cy="12" r="3" {...strokeProps} /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1 1.56V21h-4v-.08a1.7 1.7 0 0 0-1-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1H3v-4h.08a1.7 1.7 0 0 0 1.56-1A1.7 1.7 0 0 0 4.3 7.1l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.56V3h4v.08a1.7 1.7 0 0 0 1 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.56 1H21v4h-.08a1.7 1.7 0 0 0-1.52 1Z" {...strokeProps} /></IconBase>;
}

export function TrendingUpIcon(props: IconProps) {
  return <IconBase {...props}><path d="m4 16 6-6 4 4 6-7M15 7h5v5" {...strokeProps} /></IconBase>;
}

export function ImageIcon(props: IconProps) {
  return <IconBase {...props}><rect height="16" rx="3" width="18" x="3" y="4" {...strokeProps} /><circle cx="9" cy="9" r="1.5" {...strokeProps} /><path d="m5.5 18 4.5-4.5 3 3 2-2 3.5 3.5" {...strokeProps} /></IconBase>;
}

export function TrashIcon(props: IconProps) {
  return <IconBase {...props}><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5" {...strokeProps} /></IconBase>;
}

export function StarIcon(props: IconProps) {
  return <IconBase {...props}><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" {...strokeProps} /></IconBase>;
}

export function ShieldCheckIcon(props: IconProps) {
  return <IconBase {...props}><path d="M12 21s7-3.5 7-10V5l-7-2-7 2v6c0 6.5 7 10 7 10Z" {...strokeProps} /><path d="m9 12 2 2 4-4" {...strokeProps} /></IconBase>;
}

export function BellIcon(props: IconProps) {
  return <IconBase {...props}><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" {...strokeProps} /></IconBase>;
}

export function DeviceIcon(props: IconProps) {
  return <IconBase {...props}><rect height="18" rx="3" width="12" x="6" y="3" {...strokeProps} /><path d="M9.5 17.5h5" {...strokeProps} /></IconBase>;
}

export function DownloadIcon(props: IconProps) {
  return <IconBase {...props}><path d="M12 3v12m-4-4 4 4 4-4M5 20h14" {...strokeProps} /></IconBase>;
}

export function LockIcon(props: IconProps) {
  return <IconBase {...props}><rect height="11" rx="2.5" width="16" x="4" y="10" {...strokeProps} /><path d="M8 10V7a4 4 0 0 1 8 0v3" {...strokeProps} /></IconBase>;
}

export function CameraIcon(props: IconProps) {
  return <IconBase {...props}><path d="M8.5 6 10 4h4l1.5 2H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.5Z" {...strokeProps} /><circle cx="12" cy="12.5" r="3.5" {...strokeProps} /></IconBase>;
}

export function SendIcon(props: IconProps) {
  return <IconBase {...props}><path d="m5 12 14-7-4 14-3-5-7-2Zm7 2 3-3" {...strokeProps} /></IconBase>;
}

export function HugIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="12" cy="7" r="3" {...strokeProps} /><path d="M7.5 21v-4.5L5 14a2 2 0 0 1 2.8-2.8l2.1 2.1h4.2l2.1-2.1A2 2 0 0 1 19 14l-2.5 2.5V21M9.5 13.5V21M14.5 13.5V21" {...strokeProps} /></IconBase>;
}

export function ReplyIcon(props: IconProps) {
  return <IconBase {...props}><path d="m10 8-5 4 5 4v-3h3.5c2.5 0 4.5 1.5 5.5 4-.2-5.7-2.8-8-7-8h-2V8Z" {...strokeProps} /></IconBase>;
}

export function EyeIcon(props: IconProps) {
  return <IconBase {...props}><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" {...strokeProps} /><circle cx="12" cy="12" r="2.5" {...strokeProps} /></IconBase>;
}

export function ExpandIcon(props: IconProps) {
  return <IconBase {...props}><path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" {...strokeProps} /></IconBase>;
}
