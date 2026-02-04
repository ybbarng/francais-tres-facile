"use client";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export function Logo({ size = "md", showText = true, className = "" }: LogoProps) {
  const sizes = {
    sm: { icon: 28, text: "text-lg" },
    md: { icon: 36, text: "text-xl" },
    lg: { icon: 48, text: "text-2xl" },
  };

  const { icon, text } = sizes[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Logo Icon - Combines French tricolor, radio waves (RFI nod), and "F" */}
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Background circle with French blue */}
        <circle cx="24" cy="24" r="23" fill="currentColor" className="text-primary-foreground" />
        <circle
          cx="24"
          cy="24"
          r="22"
          fill="oklch(0.40 0.18 260)"
          className="dark:fill-[oklch(0.55_0.18_260)]"
        />

        {/* French tricolor arc at top */}
        <path
          d="M8 18 A18 18 0 0 1 24 6"
          stroke="oklch(0.45 0.18 260)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          className="dark:stroke-[oklch(0.60_0.18_260)]"
        />
        <path
          d="M24 6 A18 18 0 0 1 32 8"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M32 8 A18 18 0 0 1 40 18"
          stroke="oklch(0.55 0.22 25)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          className="dark:stroke-[oklch(0.60_0.20_25)]"
        />

        {/* Stylized "F" letter */}
        <text
          x="24"
          y="30"
          textAnchor="middle"
          fontSize="22"
          fontWeight="bold"
          fontFamily="system-ui, sans-serif"
          fill="white"
        >
          F
        </text>

        {/* Radio wave arcs (RFI nod) - bottom right */}
        <path
          d="M32 32 Q36 28 36 24"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        />
        <path
          d="M34 34 Q40 28 40 22"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.5"
        />
      </svg>

      {/* Text */}
      {showText && <span className={`font-bold tracking-tight text-white/85 ${text}`}>Français Très Facile</span>}
    </div>
  );
}

// Alternative compact logo for mobile/favicon
export function LogoCompact({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background circle with French blue */}
      <circle cx="24" cy="24" r="23" fill="white" />
      <circle
        cx="24"
        cy="24"
        r="22"
        fill="oklch(0.40 0.18 260)"
        className="dark:fill-[oklch(0.55_0.18_260)]"
      />

      {/* French tricolor arc at top */}
      <path
        d="M8 18 A18 18 0 0 1 24 6"
        stroke="oklch(0.45 0.18 260)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        className="dark:stroke-[oklch(0.60_0.18_260)]"
      />
      <path
        d="M24 6 A18 18 0 0 1 32 8"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M32 8 A18 18 0 0 1 40 18"
        stroke="oklch(0.55 0.22 25)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        className="dark:stroke-[oklch(0.60_0.20_25)]"
      />

      {/* Stylized "F" letter */}
      <text
        x="24"
        y="30"
        textAnchor="middle"
        fontSize="22"
        fontWeight="bold"
        fontFamily="system-ui, sans-serif"
        fill="white"
      >
        F
      </text>

      {/* Radio wave arcs */}
      <path
        d="M32 32 Q36 28 36 24"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
      <path
        d="M34 34 Q40 28 40 22"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
    </svg>
  );
}
