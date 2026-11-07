export function Logo({ className = 'h-12 w-12' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="C2C Academy">
      <circle cx="32" cy="32" r="30" fill="#f5c518" />
      <circle cx="32" cy="32" r="24" fill="#16803c" />
      <text x="32" y="38" textAnchor="middle" fontFamily="Sora, Arial Black, sans-serif" fontSize="14" fontWeight="700" fill="#f5c518">C2C</text>
    </svg>
  )
}
