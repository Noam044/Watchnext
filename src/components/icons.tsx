type P = { className?: string };
const base = (className = "size-4") => ({
  className,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const ScreenIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <rect x="2.5" y="5" width="19" height="9" rx="1.5" />
    <path d="M7 20l5-3.5 5 3.5" />
  </svg>
);
export const UsersIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c.8-3.6 3.3-5.5 6.5-5.5s5.7 1.9 6.5 5.5M15.5 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c1.8.8 3 2.5 3.5 5.2" />
  </svg>
);
export const UploadIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M12 15V3.5m0 0-4.5 4.5M12 3.5 16.5 8M4 15v3.5A2 2 0 0 0 6 20.5h12a2 2 0 0 0 2-2V15" />
  </svg>
);
export const UserIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20.5c1-4 4-6 8-6s7 2 8 6" />
  </svg>
);
export const LogoutIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M9 16.5 4.5 12 9 7.5M4.5 12H15" />
  </svg>
);
export const RefreshIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v4.5h-4.5" />
  </svg>
);
export const SparkIcon = ({ className }: P) => (
  <svg {...base(className)} fill="currentColor" stroke="none">
    <path d="M12 2.5l1.9 5.6 5.6 1.9-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.9L12 2.5Z" />
  </svg>
);
export const EyeIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
export const EyeOffIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M4 4l16 16M10 5.7A9 9 0 0 1 12 5.5C18 5.5 21.5 12 21.5 12a17 17 0 0 1-3 3.8M6.5 7.3C3.9 9 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1.1M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </svg>
);
export const CheckIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />
  </svg>
);
export const SearchIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-4.3-4.3" />
  </svg>
);
export const PlusIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const XIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
export const ArrowRightIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M4.5 12h15m0 0-5.5-5.5M19.5 12l-5.5 5.5" />
  </svg>
);
export const ExternalIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
  </svg>
);
export const HeartIcon = ({ className }: P) => (
  <svg {...base(className)} fill="currentColor" stroke="none">
    <path d="M12 20.5s-8-4.7-8-10.6A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.9c0 5.9-8 10.6-8 10.6Z" />
  </svg>
);
export const InfoIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5M12 7.5v.01" />
  </svg>
);
export const PencilIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4ZM13.5 6.5l4 4" />
  </svg>
);
export const LockIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </svg>
);
export const SendIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M21 3 10.5 13.5M21 3l-6.5 18-4-7.5L3 9.5 21 3Z" />
  </svg>
);
export const ChatIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4h0A1.5 1.5 0 0 1 4 14.5v-9Z" />
  </svg>
);
export const ArrowLeftIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M19.5 12h-15m0 0 5.5-5.5M4.5 12l5.5 5.5" />
  </svg>
);
export const FilmIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
    <path d="M7.5 3.5v17M16.5 3.5v17M3.5 8h4M3.5 12h4M3.5 16h4M16.5 8h4M16.5 12h4M16.5 16h4" />
  </svg>
);
