import { useId } from 'react'

const BADGES = [
  { label: 'HTML', bg: '#e4572e', fg: '#fff', x: '46%', y: '8%', size: 78 },
  { label: 'JS', bg: '#f7df1e', fg: '#1a1a1a', x: '68%', y: '38%', size: 92 },
  { label: 'Py', bg: '#fff', fg: '#3776ab', x: '22%', y: '30%', size: 86 },
  { label: 'CSS', bg: '#29a4d9', fg: '#fff', x: '84%', y: '28%', size: 72 },
  { label: 'PHP', bg: '#777bb3', fg: '#fff', x: '28%', y: '72%', size: 70 },
  { label: 'C++', bg: '#00599c', fg: '#fff', x: '62%', y: '74%', size: 68 },
  { label: 'C#', bg: '#68217a', fg: '#fff', x: '48%', y: '42%', size: 108 },
  { label: 'SQL', bg: '#fff', fg: '#00758f', x: '74%', y: '18%', size: 64 },
  { label: 'Java', bg: '#e76f00', fg: '#fff', x: '40%', y: '70%', size: 74 },
  { label: '.NET', bg: '#fff', fg: '#512bd4', x: '82%', y: '62%', size: 66 },
  { label: 'React', bg: '#20232a', fg: '#61dafb', x: '14%', y: '52%', size: 64 },
  { label: 'Node', bg: '#339933', fg: '#fff', x: '18%', y: '14%', size: 58 },
  { label: 'Go', bg: '#00add8', fg: '#fff', x: '88%', y: '46%', size: 52 },
  { label: 'SQL', bg: '#f29111', fg: '#fff', x: '8%', y: '34%', size: 48, text: 'DB' },
]

const DOTS = [
  { x: '38%', y: '4%', c: '#f5a524' },
  { x: '12%', y: '22%', c: '#f5c518' },
  { x: '6%', y: '58%', c: '#3b82f6' },
  { x: '94%', y: '36%', c: '#ec4899' },
  { x: '92%', y: '70%', c: '#22c55e' },
  { x: '52%', y: '92%', c: '#ef4444' },
]

export function NetworkMesh({ className = '' }) {
  const id = `mesh-${useId().replace(/:/g, '')}`
  return (
    <svg className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} aria-hidden>
      <defs>
        <pattern id={id} width="140" height="140" patternUnits="userSpaceOnUse">
          <path d="M10 20 L70 10 L120 46 L90 100 L30 110 L8 70 Z" fill="none" stroke="#16803c" strokeOpacity="0.18" />
          <path d="M70 10 L130 30 M120 46 L70 78 L30 110 M90 100 L140 90" fill="none" stroke="#16803c" strokeOpacity="0.14" />
          <circle cx="10" cy="20" r="2.2" fill="#16803c" fillOpacity="0.35" />
          <circle cx="70" cy="10" r="2.2" fill="#16803c" fillOpacity="0.35" />
          <circle cx="120" cy="46" r="2.2" fill="#16803c" fillOpacity="0.35" />
          <circle cx="90" cy="100" r="2.2" fill="#16803c" fillOpacity="0.35" />
          <circle cx="30" cy="110" r="2.2" fill="#16803c" fillOpacity="0.35" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}

export function TechField({ className = '' }) {
  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`} aria-hidden>
      <NetworkMesh />
      {DOTS.map((dot) => (
        <span key={`${dot.x}${dot.y}`} className="absolute h-3 w-3 rounded-full" style={{ left: dot.x, top: dot.y, background: dot.c }} />
      ))}
      {BADGES.map((badge, index) => (
        <span key={`${badge.label}-${index}`} className="absolute" style={{ left: badge.x, top: badge.y, transform: 'translate(-50%, -50%)' }}>
          <span
            className="grid place-items-center rounded-full font-display font-bold shadow-lg"
            style={{
              width: badge.size,
              height: badge.size,
              background: badge.bg,
              color: badge.fg,
              fontSize: badge.size > 90 ? 28 : 16,
              animation: `floaty ${6 + (index % 4)}s ease-in-out ${index * 0.2}s infinite`,
            }}
          >
            {badge.text || badge.label}
          </span>
        </span>
      ))}
    </div>
  )
}
