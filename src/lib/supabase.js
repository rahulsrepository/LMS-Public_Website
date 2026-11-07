import { createClient } from '@supabase/supabase-js'

const STORAGE_KEY = 'c2c-supabase-config'
let client = null
let clientStamp = ''

function readConfig() {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || ''
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
  let stored = {}
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    stored = {}
  }
  return {
    url: String(stored.url || envUrl || '').trim(),
    key: String(stored.key || envKey || '').trim(),
  }
}

export function getSupabaseConfig() {
  return readConfig()
}

export function isSupabaseConfigured() {
  const { url, key } = readConfig()
  return Boolean(url && key && !url.includes('your-project') && !key.includes('your-anon'))
}

export function saveSupabaseConfig(url, key) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ url: String(url || '').trim(), key: String(key || '').trim() }))
  client = null
  clientStamp = ''
}

export function clearSupabaseConfig() {
  localStorage.removeItem(STORAGE_KEY)
  client = null
  clientStamp = ''
}

export function getSupabase() {
  const { url, key } = readConfig()
  if (!isSupabaseConfigured()) return null
  const stamp = `${url}|${key}`
  if (!client || clientStamp !== stamp) {
    client = createClient(url, key)
    clientStamp = stamp
  }
  return client
}

export async function testSupabaseConnection() {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Add the project URL and the anon key first.')
  const { error: authError } = await supabase.auth.getSession()
  if (authError) throw new Error(authError.message)
  const { error } = await supabase.from('profiles').select('id').limit(1)
  if (error && /relation|schema cache|does not exist/i.test(error.message)) {
    return 'Project connected. Run supabase/schema.sql in the SQL editor so the LMS tables exist.'
  }
  if (error) throw new Error(error.message)
  return 'Connected to your Supabase project.'
}

export async function signInWithSupabase(email, password) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase is not connected.')
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, role, is_active')
    .eq('id', data.user.id)
    .single()
  if (profileError) throw new Error('No profile is linked to this login. Ask an admin to finish account setup.')
  if (!profile.is_active) throw new Error('This account is inactive. Contact the institute office.')
  return {
    id: profile.id,
    name: profile.full_name,
    email: profile.email,
    phone: profile.phone,
    role: profile.role,
  }
}

export async function signOutSupabase() {
  const supabase = getSupabase()
  if (supabase) await supabase.auth.signOut()
}

export async function changeSupabasePassword(email, currentPassword, nextPassword) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase is not connected.')
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPassword })
  if (signInError) throw new Error('Existing password is not correct.')
  const { error } = await supabase.auth.updateUser({ password: nextPassword })
  if (error) throw new Error(error.message)
}

export async function resetSupabasePassword(email) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase is not connected.')
  const redirectTo = `${window.location.origin}/login/staff`
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) throw new Error(error.message)
}

async function invokePeople(body, fallback) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase is not connected.')
  const { data, error } = await supabase.functions.invoke('create-staff', { body })
  if (error) {
    let message = error.message || fallback
    try {
      const payload = await error.context?.json?.()
      if (payload?.error) message = payload.error
    } catch {
      /* keep the client message */
    }
    throw new Error(message)
  }
  if (data?.error) throw new Error(data.error)
  return data
}

export function createStaffWithSupabase(input) {
  return invokePeople(input, 'Could not create the account.')
}

export function setPersonAccess(userId, active) {
  return invokePeople({ action: 'access', user_id: userId, active }, 'Could not update access.')
}

function courseSlug(course) {
  if (course?.slug) return course.slug
  const fromId = String(course?.id || '').replace(/^course-/, '')
  if (fromId && fromId !== course?.id) return fromId
  return String(course?.name || 'course').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export async function ensureSupabaseCourse(course) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase is not connected.')
  const slug = courseSlug(course)
  const { data: existing, error: readError } = await supabase.from('courses').select('id').eq('slug', slug).maybeSingle()
  if (readError) throw new Error(readError.message)
  if (existing?.id) return existing.id
  const { data, error } = await supabase.from('courses').insert({
    slug,
    name: course.name,
    duration: course.duration || null,
    fee: Number(course.fee) || 0,
    level: course.level || null,
    mode: course.mode || null,
    summary: course.summary || null,
  }).select('id').single()
  if (error) throw new Error(error.message)
  return data.id
}

export async function loadPublicCatalog() {
  const supabase = getSupabase()
  if (!supabase) return null
  const [courses, jobs, workshops] = await Promise.all([
    supabase.from('courses').select('id,slug,name,duration,fee,level,mode,summary'),
    supabase.from('job_openings').select('id,title,job_type,place,blurb,is_open'),
    supabase.from('workshops').select('id,title,event_date,mode,seats,blurb,status'),
  ])
  if (courses.error || jobs.error || workshops.error) return null
  return {
    courses: courses.data || [],
    jobs: (jobs.data || []).map((row) => ({ id: row.id, title: row.title, type: row.job_type, place: row.place, blurb: row.blurb, open: row.is_open })),
    workshops: (workshops.data || []).map((row) => ({ id: row.id, title: row.title, date: row.event_date, mode: row.mode, seats: row.seats, blurb: row.blurb, status: row.status })),
  }
}

export async function saveJobToSupabase(input) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase is not connected.')
  const payload = {
    title: input.title.trim(),
    job_type: input.type || 'Full-time',
    place: input.place || 'Campus',
    blurb: input.blurb || '',
    is_open: input.open !== false,
  }
  const existingId = /^[0-9a-f-]{36}$/i.test(input.id || '') ? input.id : null
  const query = existingId
    ? supabase.from('job_openings').update(payload).eq('id', existingId).select('id').single()
    : supabase.from('job_openings').insert(payload).select('id').single()
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function saveWorkshopToSupabase(input) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase is not connected.')
  const payload = {
    title: input.title.trim(),
    event_date: input.date || '',
    mode: input.mode || 'Campus',
    seats: Number(input.seats) || 20,
    blurb: input.blurb || '',
    status: input.status || 'open',
  }
  const existingId = /^[0-9a-f-]{36}$/i.test(input.id || '') ? input.id : null
  const query = existingId
    ? supabase.from('workshops').update(payload).eq('id', existingId).select('id').single()
    : supabase.from('workshops').insert(payload).select('id').single()
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function saveBatchToSupabase(input) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase is not connected.')
  const courseId = await ensureSupabaseCourse(input.course)
  const payload = {
    course_id: courseId,
    name: input.name.trim(),
    schedule: input.schedule || '',
    start_date: input.startDate || null,
    end_date: input.endDate || null,
    seats: Number(input.seats) || 25,
    status: input.status,
  }
  const existingId = /^[0-9a-f-]{36}$/i.test(input.id || '') ? input.id : null
  const query = existingId
    ? supabase.from('batches').update(payload).eq('id', existingId).select('id').single()
    : supabase.from('batches').insert(payload).select('id').single()
  const { data, error } = await query
  if (error) throw new Error(error.message)
  if (/^[0-9a-f-]{36}$/i.test(input.facultyProfileId || '')) {
    const { data: faculty } = await supabase.from('faculty').select('id').eq('profile_id', input.facultyProfileId).maybeSingle()
    if (faculty?.id) await supabase.from('faculty_batches').upsert({ faculty_id: faculty.id, batch_id: data.id })
  }
  return data
}

export async function nextStudentRollNo(localCount = 0) {
  const supabase = getSupabase()
  if (!supabase) return `C2C26${String(localCount + 1).padStart(3, '0')}`
  const { data, error } = await supabase.from('students').select('roll_no')
  if (error) throw new Error(error.message)
  const used = new Set((data || []).map((row) => row.roll_no))
  let number = Math.max(localCount, data?.length || 0)
  let rollNo = ''
  do {
    number += 1
    rollNo = `C2C26${String(number).padStart(3, '0')}`
  } while (used.has(rollNo))
  return rollNo
}

export async function saveStudentToSupabase(input) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase is not connected.')
  const courseId = input.course ? await ensureSupabaseCourse(input.course) : null
  const { data, error } = await supabase.from('students').insert({
    profile_id: input.profileId,
    full_name: input.name,
    email: input.email || '',
    phone: input.phone || '',
    roll_no: input.rollNo,
    course_id: courseId,
    batch_id: input.batchId,
    status: 'active',
    admission_date: input.admissionDate,
    guardian: input.guardian || '',
    documents: input.documents || [],
    notes: input.notes || '',
    created_by: /^[0-9a-f-]{36}$/i.test(input.createdBy || '') ? input.createdBy : null,
  }).select('id').single()
  if (error) throw new Error(error.message)
  return data
}
