export function cx(...parts) {
  return parts.filter(Boolean).join(' ')
}

export function inr(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)
}

export function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatLongDate(value = new Date()) {
  return new Date(value).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function todayISO() {
  const date = new Date()
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60000)
  return local.toISOString().slice(0, 10)
}

export function uid(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`
}

export function safeExternalUrl(value) {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
}

export function downloadCsv(filename, rows) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const text = cell == null ? '' : String(cell)
          return `"${text.replaceAll('"', '""')}"`
        })
        .join(','),
    )
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export const ROLE_LABELS = {
  admin: 'Admin',
  receptionist: 'Receptionist',
  faculty: 'Faculty',
  counsellor: 'Counsellor',
  accountant: 'Accountant',
  student: 'Student',
}

export const ENQUIRY_STATUSES = [
  { id: 'new', label: 'New' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'interested', label: 'Interested' },
  { id: 'follow_up', label: 'Follow-up Required' },
  { id: 'converted', label: 'Converted' },
  { id: 'not_interested', label: 'Not Interested' },
]

export function statusLabel(id) {
  return ENQUIRY_STATUSES.find((item) => item.id === id)?.label || id
}
