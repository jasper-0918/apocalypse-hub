// Apocalypse Blox Hub brand mark: a gradient tile with a flame (apocalypse)
// wrapped around a code bracket </> (scripts). Size it with `className`
// (e.g. "h-7 w-7"); colors are baked in.
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="abhLogoTile" x1="16" y1="2" x2="16" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ff5a3c" />
          <stop offset="1" stopColor="#c01616" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="28" height="28" rx="8" fill="url(#abhLogoTile)" />
      {/* flame */}
      <path
        d="M16 4c5 7 5 11 3.5 14.5.7 1.7 1.4 3.5 2.9 4-1 3-3.5 4.5-6.4 4.5-3.5 0-6-2.5-6-6 0-4 3-6 3.5-9.5 1 2 2.5 1.5 2.5-1C15.5 8 15.5 6 16 4z"
        fill="#fff"
      />
      {/* code brackets </> */}
      <path
        d="M14.1 18.7 12.3 20.5l1.8 1.8M17.9 18.7l1.8 1.8-1.8 1.8"
        stroke="#c01616"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
