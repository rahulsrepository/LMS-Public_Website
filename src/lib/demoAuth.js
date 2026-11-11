const KEY = 'c2c-demo-auth-v1'

/** Local stand-in for Supabase Auth. Passwords never live on profile records. */
export const DEMO_LOGINS = [
  { role: 'Admin', name: 'Kavita Sharma', email: 'admin@c2cacademy.in', password: 'Admin@123', profileId: 'user-admin' },
  { role: 'Receptionist', name: 'Priya Deshmukh', email: 'reception@c2cacademy.in', password: 'Reception@123', profileId: 'user-reception' },
  { role: 'Faculty', name: 'Rahul Kulkarni', email: 'faculty@c2cacademy.in', password: 'Faculty@123', profileId: 'user-faculty' },
  { role: 'Counsellor', name: 'Neha Kulkarni', email: 'counsellor@c2cacademy.in', password: 'Counsel@123', profileId: 'user-counsellor' },
  { role: 'Accountant', name: 'Suresh Rao', email: 'accounts@c2cacademy.in', password: 'Accounts@123', profileId: 'user-accountant' },
  { role: 'Student', name: 'Ananya Reddy', email: 'student@c2cacademy.in', password: 'Student@123', profileId: 'user-student' },
]

const EXTRA = [
  { email: 'meera@c2cacademy.in', password: 'Staff@123', profileId: 'user-meera' },
  { email: 'imran@c2cacademy.in', password: 'Staff@123', profileId: 'user-imran' },
  { email: 'sneha@c2cacademy.in', password: 'Staff@123', profileId: 'user-sneha' },
]

function read() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (Array.isArray(parsed) && parsed.length) return parsed
  } catch {
    /* fresh seed */
  }
  return null
}

export function ensureDemoAuth() {
  if (!read()) {
    localStorage.setItem(
      KEY,
      JSON.stringify([
        ...DEMO_LOGINS.map(({ email, password, profileId }) => ({ email, password, profileId })),
        ...EXTRA,
      ]),
    )
  }
}

export function verifyDemo(email, password) {
  ensureDemoAuth()
  const users = read() || []
  return users.find((user) => user.email.toLowerCase() === email.trim().toLowerCase() && user.password === password) || null
}

export function registerDemo(email, password, profileId) {
  ensureDemoAuth()
  const users = read() || []
  if (users.some((user) => user.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('A login already exists for this email.')
  }
  users.push({ email: email.toLowerCase(), password, profileId })
  localStorage.setItem(KEY, JSON.stringify(users))
}

export function updateDemoEmail(profileId, email) {
  const users = read() || []
  const row = users.find((user) => user.profileId === profileId)
  if (!row) return
  row.email = email.trim().toLowerCase()
  localStorage.setItem(KEY, JSON.stringify(users))
}

export function updateDemoPassword(email, currentPassword, nextPassword) {
  const match = verifyDemo(email, currentPassword)
  if (!match) throw new Error('Existing password is not correct.')
  const users = read() || []
  const row = users.find((user) => user.email.toLowerCase() === email.trim().toLowerCase())
  if (!row) throw new Error('Existing password is not correct.')
  row.password = nextPassword
  localStorage.setItem(KEY, JSON.stringify(users))
}

export function resetDemoAuth() {
  localStorage.removeItem(KEY)
  ensureDemoAuth()
}

export function validatePassword(password) {
  if (!password || password.length < 6) return 'Password must be at least 6 characters.'
  return ''
}
