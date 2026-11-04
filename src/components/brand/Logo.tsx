export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      aria-hidden="true"
      fill="none"
    >
      <rect x="8" y="6" width="28" height="36" rx="4" fill="#3c2344" />
      <path d="M28 6h8a4 4 0 0 1 4 4v8H28V6Z" fill="#c8b6e4" />
      <path d="M14 20h16M14 26h16M14 32h10" stroke="#f6f1ea" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
