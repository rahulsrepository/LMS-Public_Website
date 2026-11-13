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
  let data
  let error
  try {
    ({ data, error } = await supabase.auth.signInWithPassword({ email, password }))
  } catch (requestError) {
    if (/failed to fetch|networkerror|load failed/i.test(requestError?.message || '')) {
      throw new Error('Could not reach Supabase. Check your internet connection and confirm the configured project URL is available.')
    }
    throw requestError
  }
  if (error) {
    if (error.code === 'invalid_credentials' || /invalid login credentials/i.test(error.message)) {
      throw new Error('Invalid credentials. Please check your email and password.')
    }
    if (/failed to fetch|networkerror|load failed/i.test(error.message || '')) {
      throw new Error('Could not reach Supabase. Check your internet connection and confirm the configured project URL is available.')
    }
    throw new Error(error.message)
  }
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

export async function loadOwnStudentFromSupabase(profileId) {
  const supabase = getSupabase()
  if (!supabase) return null
  const { data, error } = await supabase
    .from('students')
    .select('id,profile_id,full_name,email,phone,roll_no,course_id,batch_id,status,admission_date,guardian,documents,notes')
    .eq('profile_id', profileId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  return {
    id: data.id,
    userId: data.profile_id,
    name: data.full_name,
    email: data.email || '',
    phone: data.phone || '',
    rollNo: data.roll_no,
    courseId: data.course_id || '',
    batchId: data.batch_id || '',
    status: data.status,
    admissionDate: data.admission_date,
    guardian: data.guardian || '',
    documents: data.documents || [],
    notes: data.notes || '',
    bookmarks: [],
    education: [],
    projects: [],
    experiences: [],
    certificates: [],
  }
}

export async function loadPeopleFromSupabase() {
  const supabase = getSupabase()
  if (!supabase) return null
  const results = await Promise.all([
    supabase.from('profiles').select('id,full_name,email,phone,experience,avatar_url,role,is_active'),
    supabase.from('students').select('id,profile_id,full_name,email,phone,roll_no,course_id,batch_id,status,admission_date,guardian,documents,notes,created_by'),
    supabase.from('faculty').select('id,profile_id,designation,qualification,specialization,status,joined_on'),
    supabase.from('faculty_batches').select('faculty_id,batch_id'),
    supabase.from('faculty_subjects').select('faculty_id,subject_id'),
    supabase.from('receptionists').select('id,profile_id,shift,desk'),
    supabase.from('counsellors').select('id,profile_id,focus'),
    supabase.from('accountants').select('id,profile_id,desk'),
  ])
  const failed = results.find((result) => result.error)
  if (failed?.error) throw new Error(failed.error.message)
  const [profiles, students, faculty, facultyBatches, facultySubjects, receptionists, counsellors, accountants] = results.map((result) => result.data || [])
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]))
  const people = (rows, extra = {}) => rows.map((row) => ({
    id: row.id,
    userId: row.profile_id,
    ...extra(row),
  }))
  return {
    profiles: profiles.map((profile) => ({
      id: profile.id,
      name: profile.full_name,
      email: profile.email,
      phone: profile.phone || '',
      experience: profile.experience || '',
      avatarUrl: profile.avatar_url || '',
      role: profile.role,
      active: profile.is_active,
    })),
    students: people(students, (row) => ({
      name: row.full_name,
      email: row.email || '',
      phone: row.phone || '',
      rollNo: row.roll_no,
      courseId: row.course_id || '',
      batchId: row.batch_id || '',
      status: row.status,
      admissionDate: row.admission_date,
      guardian: row.guardian || '',
      documents: row.documents || [],
      notes: row.notes || '',
      experience: profileById.get(row.profile_id)?.experience || '',
      bookmarks: [],
      education: [],
      projects: [],
      experiences: [],
      certificates: [],
      createdBy: row.created_by || '',
    })),
    faculty: faculty.map((row) => ({
      id: row.id,
      userId: row.profile_id,
      designation: row.designation || 'Trainer',
      qualification: row.qualification || '',
      specialization: row.specialization || '',
      status: row.status,
      joinedOn: row.joined_on || '',
      batchIds: facultyBatches.filter((link) => link.faculty_id === row.id).map((link) => link.batch_id),
      subjectIds: facultySubjects.filter((link) => link.faculty_id === row.id).map((link) => link.subject_id),
    })),
    receptionists: people(receptionists, (row) => ({ shift: row.shift || 'Morning', desk: row.desk || 'Front office' })),
    counsellors: people(counsellors, (row) => ({ focus: row.focus || 'Admissions' })),
    accountants: people(accountants, (row) => ({ desk: row.desk || 'Accounts' })),
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

export async function updateOwnSupabaseProfile(input) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase is not connected.')
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw new Error(userError.message)
  if (!userData.user) throw new Error('Please sign in again.')
  const { error } = await supabase.from('profiles')
    .update({ full_name: input.name, phone: input.phone })
    .eq('id', userData.user.id)
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

export function updatePersonWithSupabase(input) {
  return invokePeople({
    action: 'update',
    user_id: input.userId,
    full_name: input.name,
    email: input.email,
    phone: input.phone,
    experience: input.experience,
    student: input.student || null,
  }, 'Could not update the person.')
}

export async function uploadProfileAvatar(userId, file) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase is not connected.')
  if (!file?.type?.startsWith('image/')) throw new Error('Choose an image file.')
  if (file.size > 2 * 1024 * 1024) throw new Error('Profile images must be 2 MB or smaller.')
  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const path = `${userId}/profile.${extension}`
  const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type })
  if (uploadError) throw new Error(uploadError.message)
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  const { error: profileError } = await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', userId)
  if (profileError) throw new Error(profileError.message)
  return data.publicUrl
}

export function setPersonAccess(userId, active, facultyStatus) {
  return invokePeople({ action: 'access', user_id: userId, active, faculty_status: facultyStatus }, 'Could not update access.')
}

export function deletePersonWithSupabase(userId) {
  return invokePeople({ action: 'delete', user_id: userId }, 'Could not delete the account.')
}

export function deleteStudentWithSupabase(studentId, userId) {
  return invokePeople({ action: 'delete_student', student_id: studentId, user_id: userId }, 'Could not delete the student record.')
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

export async function deleteCourseFromSupabase(id) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase is not connected.')
  if (!/^[0-9a-f-]{36}$/i.test(id || '')) return
  const { error } = await supabase.from('courses').delete().eq('id', id)
  if (error) {
    if (/foreign key|constraint/i.test(error.message)) {
      throw new Error('This course is linked to a batch or admission. Move those records before deleting the course.')
    }
    throw new Error(error.message)
  }
}

export async function loadPublicCatalog() {
  const supabase = getSupabase()
  if (!supabase) return null
  const [courses, jobs, workshops] = await Promise.all([
    supabase.from('courses').select('id,slug,name,duration,fee,level,mode,summary'),
    supabase.from('job_openings').select('id,title,company_name,job_type,industry,skills,place,salary,apply_url,blurb,is_open'),
    supabase.from('workshops').select('id,title,event_date,mode,seats,blurb,status'),
  ])
  if (courses.error) throw new Error(courses.error.message)
  if (workshops.error) throw new Error(workshops.error.message)
  return {
    courses: courses.data || [],
    jobs: (jobs.data || []).map((row) => ({ id: row.id, title: row.title, company: row.company_name, type: row.job_type, industry: row.industry || 'IT', skills: row.skills, place: row.place, salary: row.salary, applyUrl: row.apply_url, blurb: row.blurb, open: row.is_open, studentOnly: true })),
    workshops: (workshops.data || []).map((row) => ({ id: row.id, title: row.title, date: row.event_date, mode: row.mode, seats: row.seats, blurb: row.blurb, status: row.status })),
    warnings: jobs.error ? [jobs.error.message] : [],
  }
}

export async function loadAcademicStructureFromSupabase() {
  const supabase = getSupabase()
  if (!supabase) return null
  const [courses, subjects, batches, facultyBatches] = await Promise.all([
    supabase.from('courses').select('id,slug,name,duration,fee,level,mode,summary'),
    supabase.from('subjects').select('id,course_id,name,code'),
    supabase.from('batches').select('id,course_id,name,schedule,start_date,end_date,seats,status'),
    supabase.from('faculty_batches').select('batch_id,faculty:faculty(profile_id)'),
  ])
  for (const result of [courses, subjects, batches, facultyBatches]) {
    if (result.error) throw new Error(result.error.message)
  }
  return {
    courses: courses.data || [],
    subjects: subjects.data || [],
    batches: batches.data || [],
    facultyBatches: facultyBatches.data || [],
  }
}

export async function saveSubjectToSupabase(input) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase is not connected.')
  const courseId = await ensureSupabaseCourse(input.course)
  const payload = {
    course_id: courseId,
    name: input.name.trim(),
    code: input.code?.trim() || 'SUB',
  }
  const existingId = /^[0-9a-f-]{36}$/i.test(input.id || '') ? input.id : null
  const query = existingId
    ? supabase.from('subjects').update(payload).eq('id', existingId).select('id').single()
    : supabase.from('subjects').insert(payload).select('id').single()
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function saveJobToSupabase(input) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase is not connected.')
  const payload = {
    title: input.title.trim(),
    company_name: input.company.trim(),
    job_type: input.type || 'Full-time',
    industry: input.industry || 'IT',
    skills: input.skills.trim(),
    place: input.place.trim(),
    salary: input.salary.trim(),
    apply_url: input.applyUrl.trim(),
    blurb: input.blurb || '',
    is_open: input.open !== false,
  }
  const existingId = /^[0-9a-f-]{36}$/i.test(input.id || '') ? input.id : null
  const query = existingId
    ? supabase.from('job_openings').update(payload).eq('id', existingId).select('id').single()
    : supabase.from('job_openings').insert(payload).select('id').single()
  const { data, error } = await query
  if (error) {
    if (/company_name|job_type|industry|skills|salary|apply_url|schema cache/i.test(error.message)) {
      throw new Error('The Supabase job_openings table is missing required fields. Run supabase/migrations/20261110_job_posting_apply_url_fix.sql and supabase/migrations/20261110_people_notifications_jobs.sql in the SQL Editor, then reload the app.')
    }
    throw new Error(error.message)
  }
  return data
}

export async function setJobOpenInSupabase(id, open) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase is not connected.')
  if (!/^[0-9a-f-]{36}$/i.test(id || '')) return
  const { error } = await supabase.from('job_openings').update({ is_open: open }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteJobFromSupabase(id) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase is not connected.')
  if (!/^[0-9a-f-]{36}$/i.test(id || '')) return
  const { error } = await supabase.from('job_openings').delete().eq('id', id)
  if (error) throw new Error(error.message)
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

export async function deleteWorkshopFromSupabase(id) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase is not connected.')
  if (!/^[0-9a-f-]{36}$/i.test(id || '')) return
  const { error } = await supabase.from('workshops').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function loadExamsFromSupabase(includeSolutions = true) {
  const supabase = getSupabase()
  if (!supabase) return null
  const { data: exams, error: examError } = await supabase
    .from('examinations')
    .select('id,title,kind,batch_id,subject_id,faculty_id,duration_min,status')
  if (examError) throw new Error(examError.message)
  if (!exams?.length) return []

  const examIds = exams.map((exam) => exam.id)
  const questionFields = 'id,examination_id,type,prompt,options,language,starter,marks'
  const { data: questions, error: questionError } = await supabase
    .from('questions')
    .select(includeSolutions ? `${questionFields},answer` : questionFields)
    .in('examination_id', examIds)
  if (questionError) throw new Error(questionError.message)
  const questionIds = (questions || []).map((question) => question.id)
  let testcases = []
  if (questionIds.length) {
    const testcaseFields = 'id,question_id,input,expected'
    const { data, error } = await supabase
      .from('coding_testcases')
      .select(includeSolutions ? `${testcaseFields},hidden` : testcaseFields)
      .in('question_id', questionIds)
    if (error) throw new Error(error.message)
    testcases = data || []
  }

  return exams.map((exam) => ({
    id: exam.id,
    title: exam.title,
    kind: exam.kind,
    batchId: exam.batch_id,
    subjectId: exam.subject_id || '',
    facultyId: exam.faculty_id || '',
    durationMin: exam.duration_min,
    status: exam.status,
    questions: (questions || []).filter((question) => question.examination_id === exam.id).map((question) => ({
      id: question.id,
      type: question.type,
      prompt: question.prompt,
      options: question.options || [],
      ...(includeSolutions ? { answer: question.answer ?? 0 } : {}),
      language: question.language || 'javascript',
      starter: question.starter || '',
      marks: question.marks,
      testcases: testcases.filter((testcase) => testcase.question_id === question.id).map((testcase) => ({
        id: testcase.id,
        input: testcase.input,
        expected: testcase.expected,
        ...(includeSolutions ? { hidden: testcase.hidden } : {}),
      })),
    })),
  }))
}

export async function saveExamToSupabase(input) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase is not connected.')
  if (!/^[0-9a-f-]{36}$/i.test(input.batchId || '')) throw new Error('Save this batch to Supabase before creating an examination.')
  const isUpdate = /^[0-9a-f-]{36}$/i.test(input.id || '')
  const finalStatus = input.status || 'published'
  const examPayload = {
    title: input.title.trim(),
    kind: input.kind || 'mcq',
    batch_id: input.batchId,
    subject_id: /^[0-9a-f-]{36}$/i.test(input.subjectId || '') ? input.subjectId : null,
    faculty_id: /^[0-9a-f-]{36}$/i.test(input.facultyId || '') ? input.facultyId : null,
    duration_min: Number(input.durationMin) || 30,
    status: 'draft',
  }
  const query = isUpdate
    ? supabase.from('examinations').update(examPayload).eq('id', input.id).select('id').single()
    : supabase.from('examinations').insert(examPayload).select('id').single()
  const { data: saved, error: examError } = await query
  if (examError) throw new Error(examError.message)

  const { error: clearError } = await supabase.from('questions').delete().eq('examination_id', saved.id)
  if (clearError) {
    if (!isUpdate) await discardIncompleteExam(supabase, saved.id, clearError.message)
    throw new Error(clearError.message)
  }
  for (const question of input.questions || []) {
    const { data: savedQuestion, error: questionError } = await supabase.from('questions').insert({
      examination_id: saved.id,
      type: question.type || 'mcq',
      prompt: question.prompt,
      options: question.options || [],
      answer: question.type === 'mcq' ? Number(question.answer) || 0 : null,
      language: question.language || null,
      starter: question.starter || null,
      marks: Number(question.marks) || 1,
    }).select('id').single()
    if (questionError) {
      if (!isUpdate) await discardIncompleteExam(supabase, saved.id, questionError.message)
      throw new Error(questionError.message)
    }
    const cases = (question.testcases || []).map((testcase) => ({
      question_id: savedQuestion.id,
      input: testcase.input || '',
      expected: testcase.expected || '',
      hidden: Boolean(testcase.hidden),
    }))
    if (cases.length) {
      const { error } = await supabase.from('coding_testcases').insert(cases)
      if (error) {
        if (!isUpdate) await discardIncompleteExam(supabase, saved.id, error.message)
        throw new Error(error.message)
      }
    }
  }
  const { error: publishError } = await supabase.from('examinations').update({ status: finalStatus }).eq('id', saved.id)
  if (publishError) {
    if (!isUpdate) await discardIncompleteExam(supabase, saved.id, publishError.message)
    throw new Error(publishError.message)
  }
  return loadSingleExamFromSupabase(saved.id)
}

async function discardIncompleteExam(supabase, id, cause) {
  const { error } = await supabase.from('examinations').delete().eq('id', id)
  if (error) throw new Error(`${cause} The incomplete examination could not be removed: ${error.message}`)
}

async function loadSingleExamFromSupabase(id) {
  const exams = await loadExamsFromSupabase()
  return exams?.find((exam) => exam.id === id) || null
}

export async function setExamStatusInSupabase(id, status) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase is not connected.')
  if (!/^[0-9a-f-]{36}$/i.test(id || '')) return
  const { error } = await supabase.from('examinations').update({ status }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function loadNotificationsFromSupabase() {
  const supabase = getSupabase()
  if (!supabase) return null
  const { data, error } = await supabase
    .from('notifications')
    .select('id,title,body,audience,created_at')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw new Error(error.message)
  return (data || []).map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    audience: row.audience,
    createdAt: row.created_at,
  }))
}

export async function saveNotificationToSupabase(input) {
  const supabase = getSupabase()
  if (!supabase) return null
  const { data, error } = await supabase
    .from('notifications')
    .insert({ title: input.title, body: input.body, audience: input.audience || 'all' })
    .select('id,title,body,audience,created_at')
    .single()
  if (error) throw new Error(error.message)
  return {
    id: data.id,
    title: data.title,
    body: data.body,
    audience: data.audience,
    createdAt: data.created_at,
  }
}

export async function loadNotificationReadsFromSupabase(userId) {
  const supabase = getSupabase()
  if (!supabase) return null
  const { data, error } = await supabase
    .from('notification_reads')
    .select('notification_id')
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
  return (data || []).map((row) => row.notification_id)
}

export async function saveNotificationReadsToSupabase(userId, notificationIds) {
  const supabase = getSupabase()
  if (!supabase || !notificationIds.length) return
  const { error } = await supabase
    .from('notification_reads')
    .upsert(notificationIds.map((notificationId) => ({
      user_id: userId,
      notification_id: notificationId,
    })), { onConflict: 'user_id,notification_id', ignoreDuplicates: true })
  if (error) throw new Error(error.message)
}

export async function loadStaffAttendanceFromSupabase() {
  const supabase = getSupabase()
  if (!supabase) return null
  const { data, error } = await supabase
    .from('staff_attendance')
    .select('id,profile_id,category,attended_on,status,marked_by')
    .order('attended_on', { ascending: false })
    .limit(500)
  if (error) throw new Error(error.message)
  return (data || []).map((row) => ({
    id: row.id,
    personId: row.profile_id,
    category: row.category,
    date: row.attended_on,
    status: row.status,
    markedBy: row.marked_by,
  }))
}

export async function saveStaffAttendanceToSupabase(input) {
  const supabase = getSupabase()
  if (!supabase) return
  const { error } = await supabase.from('staff_attendance').upsert({
    profile_id: input.profileId,
    category: input.category,
    attended_on: input.date,
    status: input.status,
    marked_by: input.markedBy,
  }, { onConflict: 'profile_id,category,attended_on' })
  if (error) throw new Error(error.message)
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
  let assignedFacultyId = null
  if (/^[0-9a-f-]{36}$/i.test(input.facultyProfileId || '')) {
    const { data: faculty, error: facultyError } = await supabase.from('faculty').select('id').eq('profile_id', input.facultyProfileId).maybeSingle()
    if (facultyError) throw new Error(facultyError.message)
    if (!faculty?.id) throw new Error('The selected faculty member is not set up in Supabase.')
    assignedFacultyId = faculty.id
    const { error: assignmentError } = await supabase.from('faculty_batches').upsert({ faculty_id: assignedFacultyId, batch_id: data.id })
    if (assignmentError) throw new Error(assignmentError.message)
  }
  const { data: currentAssignments, error: assignmentsError } = await supabase
    .from('faculty_batches')
    .select('faculty_id')
    .eq('batch_id', data.id)
  if (assignmentsError) throw new Error(assignmentsError.message)
  for (const assignment of currentAssignments || []) {
    if (assignment.faculty_id === assignedFacultyId) continue
    const { error: removeError } = await supabase.from('faculty_batches')
      .delete()
      .eq('faculty_id', assignment.faculty_id)
      .eq('batch_id', data.id)
    if (removeError) throw new Error(removeError.message)
  }
  return data
}

export async function deleteBatchFromSupabase(id) {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase is not connected.')
  if (!/^[0-9a-f-]{36}$/i.test(id || '')) throw new Error('This batch is not stored in Supabase.')
  const { error } = await supabase.from('batches').delete().eq('id', id)
  if (error) throw new Error(error.message)
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
