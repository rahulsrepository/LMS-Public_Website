import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { scoreAttempt } from './codeRunner'
import { registerDemo, resetDemoAuth, updateDemoPassword, validatePassword, verifyDemo } from './demoAuth'
import { todayISO, uid } from './format'
import { hasAnyPermission, hasPermission } from './permissions'
import { INSTITUTE, JOBS, WORKSHOPS } from './catalog'
import { createSeed, DATA_KEY, DATA_VERSION } from './seed'
import { changeSupabasePassword, clearSupabaseConfig, createStaffWithSupabase, ensureSupabaseCourse, getSupabaseConfig, isSupabaseConfigured, loadPublicCatalog, nextStudentRollNo, resetSupabasePassword, saveBatchToSupabase, saveJobToSupabase, saveStudentToSupabase, saveSupabaseConfig, saveWorkshopToSupabase, setPersonAccess, signInWithSupabase, signOutSupabase, testSupabaseConnection } from './supabase'

const LmsContext = createContext(null)
const SESSION_KEY = 'c2c-session'

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DATA_KEY) || 'null')
    if (parsed?.version === DATA_VERSION && Array.isArray(parsed.profiles)) return withCurrentContact(parsed)
    if (parsed?.profiles) return withoutSampleData(parsed)
  } catch {
    /* use seed */
  }
  return createSeed()
}

function withCurrentContact(state) {
  if (!state?.settings) return state
  const previousPhone = '+91 96864 88775'
  const previousAddress = 'C2C Academy Campus'
  const previousWhatsapp = 'https://wa.me/919686488775'
  if (state.settings.phone === previousPhone) state.settings.phone = INSTITUTE.phone
  if (state.settings.address === previousAddress) state.settings.address = INSTITUTE.address
  if (!state.settings.whatsapp || state.settings.whatsapp === previousWhatsapp) state.settings.whatsapp = INSTITUTE.whatsapp
  if (!Array.isArray(state.workshops)) {
    state.workshops = WORKSHOPS.map((item) => ({ ...item, status: 'open' }))
  }
  if (!Array.isArray(state.jobs)) {
    state.jobs = JOBS.map((item) => ({ ...item, open: true }))
  }
  if (!Array.isArray(state.facultyAttendance)) state.facultyAttendance = []
  if (!Array.isArray(state.inventory)) state.inventory = []
  if (!Array.isArray(state.tickets)) state.tickets = []
  if (!Array.isArray(state.cashNotes)) state.cashNotes = []
  if (!Array.isArray(state.referrals)) state.referrals = []
  return state
}

function withoutSampleData(parsed) {
  const fresh = createSeed()
  const profiles = parsed.profiles.filter((item) => isCloudId(item.id) && item.email !== 'meera.faculty@example.com')
  const ids = new Set(profiles.map((item) => item.id))
  fresh.profiles = profiles
  fresh.faculty = (parsed.faculty || []).filter((item) => ids.has(item.userId))
  fresh.receptionists = (parsed.receptionists || []).filter((item) => ids.has(item.userId))
  fresh.counsellors = (parsed.counsellors || []).filter((item) => ids.has(item.userId))
  fresh.accountants = (parsed.accountants || []).filter((item) => ids.has(item.userId))
  fresh.students = (parsed.students || []).filter((item) => ids.has(item.userId))
  const studentIds = new Set(fresh.students.map((item) => item.id))
  fresh.feeRecords = (parsed.feeRecords || []).filter((item) => studentIds.has(item.studentId))
  return withCurrentContact(fresh)
}

function loadSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null')
  } catch {
    return null
  }
}

function isCloudId(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '')
}

async function syncAccess(userId, active) {
  if (!isSupabaseConfigured() || !isCloudId(userId)) return
  await setPersonAccess(userId, active)
}

function facultyOf(state, userId) {
  return state.faculty.find((item) => item.userId === userId) || null
}

function assertAssignedBatch(state, actor, batchId) {
  if (actor.role === 'admin') return
  const faculty = facultyOf(state, actor.id)
  if (!faculty || faculty.status !== 'active' || !faculty.batchIds.includes(batchId)) {
    throw new Error('You can only work with batches assigned to you.')
  }
}

function recalcFee(state, studentId) {
  const fee = state.feeRecords.find((item) => item.studentId === studentId)
  if (!fee) return
  const verified = state.payments.filter((payment) => payment.studentId === studentId && payment.status === 'verified')
  const collected = verified.filter((payment) => payment.kind === 'collection').reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  const refunds = verified.filter((payment) => payment.kind === 'refund').reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  const discounts = verified.filter((payment) => payment.kind === 'discount').reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  fee.discount = discounts
  fee.paid = Math.max(collected - refunds, 0)
  fee.pending = Math.max(Number(fee.total || 0) - discounts - fee.paid, 0)
}

function mergeRemoteCatalog(state, remote) {
  const courses = [...state.courses]
  remote.courses.forEach((row) => {
    const found = courses.find((course) => course.slug === row.slug)
    const next = {
      name: row.name,
      fee: Number(row.fee) || 0,
      duration: row.duration || '',
      level: row.level || '',
      mode: row.mode || '',
      summary: row.summary || '',
    }
    if (found) Object.assign(found, next)
    else courses.unshift({ id: row.id, slug: row.slug, months: 3, accent: 'New', outcomes: [], modules: [], ...next })
  })
  const jobs = [...(state.jobs || [])]
  remote.jobs.forEach((row) => {
    const found = jobs.find((job) => job.id === row.id || job.title === row.title)
    if (found) Object.assign(found, row)
    else jobs.unshift(row)
  })
  const workshops = [...(state.workshops || [])]
  remote.workshops.forEach((row) => {
    const found = workshops.find((item) => item.id === row.id || item.title === row.title)
    if (found) Object.assign(found, row)
    else workshops.unshift(row)
  })
  return { ...state, courses, jobs, workshops }
}

function syncBatches(state, facultyId, batchIds) {
  const faculty = state.faculty.find((item) => item.id === facultyId)
  if (!faculty) return
  state.faculty.forEach((item) => {
    if (item.id !== facultyId) item.batchIds = item.batchIds.filter((id) => !batchIds.includes(id))
  })
  faculty.batchIds = batchIds
  state.batches.forEach((batch) => {
    if (batchIds.includes(batch.id)) batch.facultyId = facultyId
    else if (batch.facultyId === facultyId) batch.facultyId = state.faculty.find((item) => item.batchIds.includes(batch.id))?.id || ''
  })
}

export function LmsProvider({ children }) {
  const [state, setState] = useState(loadState)
  const [session, setSession] = useState(loadSession)
  const [toasts, setToasts] = useState([])
  const [cloudOn, setCloudOn] = useState(() => isSupabaseConfigured())
  const stateRef = useRef(state)
  const sessionRef = useRef(session)
  stateRef.current = state
  sessionRef.current = session

  useEffect(() => {
    localStorage.setItem(DATA_KEY, JSON.stringify(state))
  }, [state])

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    let cancel = false
    loadPublicCatalog().then((remote) => {
      if (cancel || !remote) return
      setState((current) => mergeRemoteCatalog(current, remote))
    })
    return () => { cancel = true }
  }, [])

  useEffect(() => {
    if (!session || isSupabaseConfigured()) return
    const profile = state.profiles.find((item) => item.id === session.id)
    if (!profile?.active) {
      sessionStorage.removeItem(SESSION_KEY)
      setSession(null)
      pushToast('Your access has been removed.', 'error')
    }
  }, [state.profiles, session])

  function pushToast(message, tone = 'success') {
    const id = uid('toast')
    setToasts((current) => [...current, { id, message, tone }])
    setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 3800)
  }

  function dismissToast(id) {
    setToasts((current) => current.filter((item) => item.id !== id))
  }

  function persistSession(next) {
    sessionRef.current = next
    setSession(next)
    if (next) sessionStorage.setItem(SESSION_KEY, JSON.stringify(next))
    else sessionStorage.removeItem(SESSION_KEY)
  }

  function commit(permissions, mutator, action, success = 'Saved successfully.') {
    const actor = sessionRef.current
    if (!actor) {
      pushToast('Please sign in again.', 'error')
      return null
    }
    const allowed = Array.isArray(permissions) ? hasAnyPermission(actor.role, permissions) : hasPermission(actor.role, permissions)
    if (!allowed) {
      pushToast('You do not have permission for this action.', 'error')
      return null
    }
    try {
      const draft = structuredClone(stateRef.current)
      mutator(draft, actor)
      draft.logs = [
        { id: uid('log'), actorId: actor.id, actorName: actor.name, role: actor.role, action, at: new Date().toISOString() },
        ...draft.logs,
      ].slice(0, 300)
      stateRef.current = draft
      setState(draft)
      pushToast(success)
      return draft
    } catch (error) {
      pushToast(error.message || 'Something went wrong.', 'error')
      return null
    }
  }

  async function login(email, password) {
    if (!email?.trim() || !password) throw new Error('Email and password are required.')
    let next
    if (isSupabaseConfigured()) {
      next = await signInWithSupabase(email.trim(), password)
    } else {
      const auth = verifyDemo(email, password)
      if (!auth) throw new Error('Incorrect email or password.')
      const profile = stateRef.current.profiles.find((item) => item.id === auth.profileId)
      if (!profile?.active) throw new Error('This account is inactive or access has been removed.')
      next = { id: profile.id, name: profile.name, email: profile.email, role: profile.role }
    }
    persistSession(next)
    const draft = structuredClone(stateRef.current)
    draft.logs = [
      { id: uid('log'), actorId: next.id, actorName: next.name, role: next.role, action: 'Signed in', at: new Date().toISOString() },
      ...draft.logs,
    ].slice(0, 300)
    stateRef.current = draft
    setState(draft)
    return next
  }

  async function logout() {
    if (isSupabaseConfigured()) await signOutSupabase()
    persistSession(null)
  }

  async function requestPasswordReset(email) {
    if (!email?.trim()) throw new Error('Enter the email on your account.')
    if (isSupabaseConfigured()) {
      await resetSupabasePassword(email.trim())
      return 'Password reset email sent.'
    }
    return 'This demo keeps sample passwords on the sign-in page. Connect Supabase Auth to send reset emails.'
  }

  async function connectSupabase(url, key) {
    const previous = getSupabaseConfig()
    saveSupabaseConfig(url, key)
    if (!isSupabaseConfigured()) {
      saveSupabaseConfig(previous.url, previous.key)
      setCloudOn(isSupabaseConfigured())
      throw new Error('Enter the project URL and the anon key. Use the public anon key, never the service role key.')
    }
    try {
      const message = await testSupabaseConnection()
      setCloudOn(true)
      pushToast(message)
      return message
    } catch (error) {
      saveSupabaseConfig(previous.url, previous.key)
      setCloudOn(isSupabaseConfigured())
      throw error
    }
  }

  function disconnectSupabase() {
    clearSupabaseConfig()
    const stillOn = isSupabaseConfigured()
    setCloudOn(stillOn)
    pushToast(stillOn ? 'Saved keys cleared. The .env keys are still in use.' : 'Supabase disconnected. Demo sign-in is active again.')
  }

  function submitPublicEnquiry(input) {
    const name = input.name?.trim()
    const phone = (input.phone || '').replace(/\D/g, '').slice(-10)
    if (!name || phone.length !== 10) {
      pushToast('Enter your name and a 10-digit mobile number.', 'error')
      return false
    }
    const draft = structuredClone(stateRef.current)
    draft.enquiries.unshift({
      id: uid('enq'),
      name,
      phone,
      email: input.email?.trim() || '',
      courseId: input.courseId || '',
      source: input.source || 'Website',
      status: 'new',
      followUpDate: todayISO(),
      remarks: input.remarks?.trim() || '',
      counsellorId: draft.counsellors[0]?.userId || '',
      createdAt: todayISO(),
      history: [{ at: new Date().toISOString(), note: 'Submitted from the website.', by: 'Website' }],
    })
    draft.logs = [
      { id: uid('log'), actorId: 'public', actorName: 'Website', role: 'public', action: `New enquiry from ${name}`, at: new Date().toISOString() },
      ...draft.logs,
    ].slice(0, 300)
    stateRef.current = draft
    setState(draft)
    pushToast('Thank you. A counsellor will contact you shortly.')
    return true
  }

  const api = {
    state,
    session,
    toasts,
    supabaseConfigured: cloudOn,
    connectSupabase,
    disconnectSupabase,
    dismissToast,
    login,
    logout,
    requestPasswordReset,
    submitPublicEnquiry,
    can: (permission) => hasPermission(session?.role, permission),
    canAny: (permissions) => hasAnyPermission(session?.role, permissions),

    myFaculty: () => (session ? facultyOf(state, session.id) : null),
    myStudent: () => state.students.find((student) => student.userId === session?.id) || null,

    students() {
      if (!session) return []
      if (session.role === 'admin' || session.role === 'receptionist') return state.students
      if (session.role === 'faculty') {
        const faculty = facultyOf(state, session.id)
        const ids = new Set(faculty?.batchIds || [])
        return state.students.filter((student) => ids.has(student.batchId))
      }
      if (session.role === 'counsellor') return state.students.filter((student) => student.createdBy === session.id)
      if (session.role === 'accountant') {
        return state.students.map((student) => ({
          id: student.id,
          name: student.name,
          rollNo: student.rollNo,
          phone: student.phone,
          courseId: student.courseId,
          batchId: student.batchId,
          status: student.status,
        }))
      }
      if (session.role === 'student') return state.students.filter((student) => student.userId === session.id)
      return []
    },

    batches() {
      if (!session) return []
      if (session.role === 'faculty') {
        const faculty = facultyOf(state, session.id)
        const ids = new Set(faculty?.batchIds || [])
        return state.batches.filter((batch) => ids.has(batch.id))
      }
      if (['admin', 'receptionist', 'counsellor', 'accountant'].includes(session.role)) return state.batches
      if (session.role === 'student') {
        const mine = state.students.find((student) => student.userId === session.id)
        return state.batches.filter((batch) => batch.id === mine?.batchId)
      }
      return []
    },

    subjects() {
      if (!session) return []
      if (session.role === 'faculty') {
        const faculty = facultyOf(state, session.id)
        const ids = new Set(faculty?.subjectIds || [])
        return state.subjects.filter((subject) => ids.has(subject.id))
      }
      if (['admin', 'receptionist'].includes(session.role)) return state.subjects
      return []
    },

    exams() {
      if (!session) return []
      if (session.role === 'admin') return state.exams
      if (session.role === 'faculty') {
        const faculty = facultyOf(state, session.id)
        const ids = new Set(faculty?.batchIds || [])
        return state.exams.filter((exam) => ids.has(exam.batchId))
      }
      if (session.role === 'student') {
        const mine = state.students.find((student) => student.userId === session.id)
        return state.exams.filter((exam) => exam.batchId === mine?.batchId && exam.status === 'published')
      }
      return []
    },

    assignments() {
      if (!session) return []
      if (session.role === 'admin') return state.assignments
      if (session.role === 'faculty') {
        const faculty = facultyOf(state, session.id)
        const ids = new Set(faculty?.batchIds || [])
        return state.assignments.filter((item) => ids.has(item.batchId))
      }
      if (session.role === 'student') {
        const mine = state.students.find((student) => student.userId === session.id)
        return state.assignments.filter((item) => item.batchId === mine?.batchId)
      }
      return []
    },

    materials() {
      if (!session) return []
      if (session.role === 'admin') return state.materials
      if (session.role === 'faculty') {
        const faculty = facultyOf(state, session.id)
        return state.materials.filter((item) => item.facultyId === faculty?.id || faculty?.subjectIds?.includes(item.subjectId))
      }
      if (session.role === 'student') {
        const mine = state.students.find((student) => student.userId === session.id)
        return state.materials.filter((item) => item.batchId === mine?.batchId)
      }
      return []
    },

    payments() {
      if (!session) return []
      if (session.role === 'admin' || session.role === 'accountant') return state.payments
      if (session.role === 'receptionist' || session.role === 'counsellor') {
        return state.payments.map(({ proofName, ...payment }) => payment)
      }
      if (session.role === 'student') {
        const mine = state.students.find((student) => student.userId === session.id)
        return state.payments.filter((payment) => payment.studentId === mine?.id)
      }
      return []
    },

    feeRecords() {
      if (!session) return []
      if (['admin', 'accountant', 'receptionist', 'counsellor'].includes(session.role)) return state.feeRecords
      if (session.role === 'student') {
        const mine = state.students.find((student) => student.userId === session.id)
        return state.feeRecords.filter((fee) => fee.studentId === mine?.id)
      }
      return []
    },

    enquiries() {
      if (!session) return []
      if (['admin', 'counsellor', 'receptionist'].includes(session.role)) return state.enquiries
      return []
    },

    attendance() {
      if (!session) return []
      if (session.role === 'admin' || session.role === 'receptionist') return state.attendance
      if (session.role === 'faculty') {
        const faculty = facultyOf(state, session.id)
        const ids = new Set(faculty?.batchIds || [])
        return state.attendance.filter((row) => ids.has(row.batchId))
      }
      if (session.role === 'student') {
        const mine = state.students.find((student) => student.userId === session.id)
        return state.attendance.filter((row) => row.studentId === mine?.id)
      }
      return []
    },

    notifications() {
      if (!session) return state.notifications.filter((item) => item.audience === 'all')
      return state.notifications.filter((item) => item.audience === 'all' || item.audience === session.role || (item.audience === 'students' && session.role === 'student') || (item.audience === 'staff' && session.role !== 'student'))
    },

    async addStudent(input) {
      const passwordError = validatePassword(input.password)
      if (!input.email?.trim()) {
        pushToast('Email is required for the student login.', 'error')
        return null
      }
      if (passwordError) {
        pushToast(passwordError, 'error')
        return null
      }
      const email = input.email.trim().toLowerCase()
      if (stateRef.current.profiles.some((item) => item.email === email)) {
        pushToast('An account with this email already exists.', 'error')
        return null
      }
      let profileId = uid('user')
      try {
        if (isSupabaseConfigured()) {
          const created = await createStaffWithSupabase({
            role: 'student',
            full_name: input.name,
            email,
            phone: input.phone,
            password: input.password,
          })
          profileId = created.id
        }
      } catch (error) {
        pushToast(error.message || 'Could not create the student login.', 'error')
        return null
      }
      const batch = stateRef.current.batches.find((item) => item.id === input.batchId)
      if (!batch || batch.courseId !== input.courseId) {
        pushToast('Choose a batch that belongs to the selected course.', 'error')
        return null
      }
      const occupied = stateRef.current.students.filter((student) => student.batchId === batch.id && student.status !== 'inactive').length
      if (occupied >= batch.seats) {
        pushToast('This batch is full.', 'error')
        return null
      }
      let rollNo = `C2C26${String(stateRef.current.students.length + 1).padStart(3, '0')}`
      let studentId = uid('stu')
      try {
        if (isSupabaseConfigured()) {
          rollNo = await nextStudentRollNo(stateRef.current.students.length)
          if (!isCloudId(batch.id)) throw new Error('Save this batch again so it is stored in Supabase, then add the student.')
          const course = stateRef.current.courses.find((item) => item.id === input.courseId)
          const saved = await saveStudentToSupabase({
            profileId,
            name: input.name.trim(),
            email,
            phone: (input.phone || '').replace(/\D/g, '').slice(-10),
            rollNo,
            course,
            batchId: batch.id,
            admissionDate: todayISO(),
            guardian: input.guardian?.trim() || '',
            documents: input.documents || [],
            notes: input.notes?.trim() || '',
            createdBy: sessionRef.current?.id,
          })
          studentId = saved.id
        }
      } catch (error) {
        pushToast(error.message || 'Could not store the student in Supabase.', 'error')
        return null
      }
      return commit(['students.write', 'students.register'], (draft, actor) => {
        if (!input.name?.trim() || !input.courseId || !input.batchId) throw new Error('Name, course and batch are required.')
        const batch = draft.batches.find((item) => item.id === input.batchId)
        if (!batch || batch.courseId !== input.courseId) throw new Error('Choose a batch that belongs to the selected course.')
        const count = draft.students.filter((student) => student.batchId === batch.id && student.status !== 'inactive').length
        if (count >= batch.seats) throw new Error('This batch is full.')
        const id = studentId
        const course = draft.courses.find((item) => item.id === input.courseId)
        draft.profiles.push({ id: profileId, name: input.name.trim(), email, phone: (input.phone || '').replace(/\D/g, '').slice(-10), role: 'student', active: true })
        if (!isSupabaseConfigured()) registerDemo(email, input.password, profileId)
        draft.students.unshift({
          id,
          userId: profileId,
          name: input.name.trim(),
          email,
          phone: (input.phone || '').replace(/\D/g, '').slice(-10),
          rollNo,
          courseId: input.courseId,
          batchId: input.batchId,
          status: 'active',
          admissionDate: todayISO(),
          guardian: input.guardian?.trim() || '',
          documents: input.documents || [],
          createdBy: actor.id,
          notes: input.notes?.trim() || '',
        })
        draft.feeRecords.unshift({
          id: uid('fee'),
          studentId: id,
          courseFee: course?.fee || 0,
          discount: 0,
          total: course?.fee || 0,
          paid: 0,
          pending: course?.fee || 0,
          dueDate: input.dueDate || '',
        })
      }, `Registered student ${input.name?.trim()}`, 'Student registered.')
    },

    updateStudent(id, input) {
      return commit(['students.write', 'students.register'], (draft, actor) => {
        const student = draft.students.find((item) => item.id === id)
        if (!student) throw new Error('Student not found.')
        if (actor.role === 'counsellor' && student.createdBy !== actor.id) throw new Error('You can update students you registered.')
        if (actor.role === 'faculty' || actor.role === 'accountant') throw new Error('You cannot edit student records.')
        student.name = input.name?.trim() || student.name
        student.email = input.email?.trim() ?? student.email
        student.phone = input.phone != null ? input.phone.replace(/\D/g, '').slice(-10) : student.phone
        student.guardian = input.guardian ?? student.guardian
        student.documents = input.documents || student.documents
        student.notes = actor.role === 'admin' ? input.notes ?? student.notes : student.notes
        if (input.courseId && input.batchId) {
          const batch = draft.batches.find((item) => item.id === input.batchId)
          if (!batch || batch.courseId !== input.courseId) throw new Error('Choose a batch that belongs to the selected course.')
          student.courseId = input.courseId
          student.batchId = input.batchId
        }
      }, 'Updated student record')
    },

    async setStudentStatus(id, status) {
      const student = stateRef.current.students.find((item) => item.id === id)
      try {
        if (student?.userId) await syncAccess(student.userId, status === 'active')
      } catch (error) {
        pushToast(error.message || 'Could not update access.', 'error')
        return null
      }
      return commit('students.status', (draft) => {
        const student = draft.students.find((item) => item.id === id)
        if (!student) throw new Error('Student not found.')
        student.status = status
        if (student.userId) {
          const profile = draft.profiles.find((item) => item.id === student.userId)
          if (profile) profile.active = status === 'active'
        }
      }, `${status === 'active' ? 'Activated' : 'Deactivated'} student account`)
    },

    async deleteStudent(id) {
      const student = stateRef.current.students.find((item) => item.id === id)
      try {
        if (student?.userId) await syncAccess(student.userId, false)
      } catch (error) {
        pushToast(error.message || 'Could not remove access.', 'error')
        return null
      }
      return commit('students.delete', (draft) => {
        const student = draft.students.find((item) => item.id === id)
        if (!student) throw new Error('Student not found.')
        draft.students = draft.students.filter((item) => item.id !== id)
        draft.feeRecords = draft.feeRecords.filter((item) => item.studentId !== id)
        draft.attendance = draft.attendance.filter((item) => item.studentId !== id)
        if (student.userId) {
          const profile = draft.profiles.find((item) => item.id === student.userId)
          if (profile) profile.active = false
        }
      }, 'Deleted student record', 'Student removed.')
    },

    async addFaculty(input) {
      const passwordError = validatePassword(input.password)
      if (passwordError) {
        pushToast(passwordError, 'error')
        return null
      }
      if (!input.name?.trim() || !input.email?.trim()) {
        pushToast('Name and email are required.', 'error')
        return null
      }
      const email = input.email.trim().toLowerCase()
      const existing = stateRef.current.profiles.find((item) => item.email === email)
      if (existing && (!isSupabaseConfigured() || isCloudId(existing.id))) {
        pushToast('An account with this email already exists.', 'error')
        return null
      }
      let profileId = uid('user')
      try {
        if (isSupabaseConfigured()) {
          const created = await createStaffWithSupabase({
            role: 'faculty',
            full_name: input.name,
            email,
            phone: input.phone,
            password: input.password,
            designation: input.designation,
            qualification: input.qualification,
            specialization: input.specialization,
          })
          profileId = created.id
        }
      } catch (error) {
        pushToast(error.message || 'Could not create the faculty login.', 'error')
        return null
      }
      return commit('faculty.manage', (draft) => {
        const local = draft.profiles.find((item) => item.email === email && !isCloudId(item.id))
        if (local) {
          const oldId = local.id
          local.id = profileId
          local.name = input.name.trim()
          local.phone = (input.phone || '').replace(/\D/g, '').slice(-10)
          local.active = true
          const faculty = draft.faculty.find((item) => item.userId === oldId)
          if (faculty) {
            faculty.userId = profileId
            faculty.status = 'active'
            faculty.designation = input.designation?.trim() || faculty.designation
            faculty.qualification = input.qualification?.trim() || ''
            faculty.specialization = input.specialization?.trim() || ''
            faculty.subjectIds = input.subjectIds || []
            syncBatches(draft, faculty.id, input.batchIds || [])
          }
          return
        }
        if (draft.profiles.some((item) => item.email === email)) throw new Error('An account with this email already exists.')
        const facultyId = uid('fac')
        draft.profiles.push({ id: profileId, name: input.name.trim(), email, phone: (input.phone || '').replace(/\D/g, '').slice(-10), role: 'faculty', active: true })
        draft.faculty.unshift({
          id: facultyId,
          userId: profileId,
          designation: input.designation?.trim() || 'Trainer',
          qualification: input.qualification?.trim() || '',
          specialization: input.specialization?.trim() || '',
          status: 'active',
          joinedOn: todayISO(),
          subjectIds: input.subjectIds || [],
          batchIds: [],
        })
        if (!isSupabaseConfigured()) registerDemo(email, input.password, profileId)
        syncBatches(draft, facultyId, input.batchIds || [])
      }, `Created faculty account for ${input.name?.trim()}`, 'Faculty account created.')
    },

    updateFaculty(id, input) {
      return commit('faculty.manage', (draft) => {
        const faculty = draft.faculty.find((item) => item.id === id)
        if (!faculty) throw new Error('Faculty record not found.')
        const profile = draft.profiles.find((item) => item.id === faculty.userId)
        if (profile) {
          profile.name = input.name?.trim() || profile.name
          profile.phone = (input.phone || '').replace(/\D/g, '').slice(-10)
        }
        faculty.designation = input.designation?.trim() || faculty.designation
        faculty.qualification = input.qualification?.trim() || ''
        faculty.specialization = input.specialization?.trim() || ''
        faculty.subjectIds = input.subjectIds || []
        syncBatches(draft, faculty.id, input.batchIds || [])
      }, 'Updated faculty details')
    },

    async setFacultyStatus(id, status) {
      const faculty = stateRef.current.faculty.find((item) => item.id === id)
      try {
        if (faculty?.userId) await syncAccess(faculty.userId, status === 'active')
      } catch (error) {
        pushToast(error.message || 'Could not update access.', 'error')
        return null
      }
      return commit('faculty.manage', (draft, actor) => {
        const faculty = draft.faculty.find((item) => item.id === id)
        if (!faculty) throw new Error('Faculty record not found.')
        if (faculty.userId === actor.id) throw new Error('You cannot change your own access.')
        if (!['active', 'inactive'].includes(status)) throw new Error('Choose active or inactive.')
        faculty.status = status
        const profile = draft.profiles.find((item) => item.id === faculty.userId)
        if (profile) profile.active = status === 'active'
      }, `${status === 'active' ? 'Activated' : 'Deactivated'} faculty account`)
    },

    async removeFacultyAccess(id) {
      const faculty = stateRef.current.faculty.find((item) => item.id === id)
      try {
        if (faculty?.userId) await syncAccess(faculty.userId, false)
      } catch (error) {
        pushToast(error.message || 'Could not remove access.', 'error')
        return null
      }
      return commit('faculty.manage', (draft, actor) => {
        const faculty = draft.faculty.find((item) => item.id === id)
        if (!faculty) throw new Error('Faculty record not found.')
        if (faculty.userId === actor.id) throw new Error('You cannot remove your own access.')
        faculty.status = 'removed'
        faculty.batchIds = []
        draft.batches.forEach((batch) => {
          if (batch.facultyId === faculty.id) batch.facultyId = ''
        })
        const profile = draft.profiles.find((item) => item.id === faculty.userId)
        if (profile) profile.active = false
      }, 'Removed faculty access', 'Faculty access removed.')
    },

    async addStaff(input) {
      const passwordError = validatePassword(input.password)
      if (passwordError) {
        pushToast(passwordError, 'error')
        return null
      }
      if (!['receptionist', 'counsellor', 'accountant'].includes(input.role)) {
        pushToast('You cannot create this role here.', 'error')
        return null
      }
      if (!input.name?.trim() || !input.email?.trim()) {
        pushToast('Name and email are required.', 'error')
        return null
      }
      const email = input.email.trim().toLowerCase()
      const existing = stateRef.current.profiles.find((item) => item.email === email)
      if (existing && (!isSupabaseConfigured() || isCloudId(existing.id))) {
        pushToast('An account with this email already exists.', 'error')
        return null
      }
      let profileId = uid('user')
      try {
        if (isSupabaseConfigured()) {
          const created = await createStaffWithSupabase({
            role: input.role,
            full_name: input.name,
            email,
            phone: input.phone,
            password: input.password,
            shift: input.shift,
            focus: input.focus,
          })
          profileId = created.id
        }
      } catch (error) {
        pushToast(error.message || 'Could not create the login.', 'error')
        return null
      }
      return commit('staff.manage', (draft) => {
        const local = draft.profiles.find((item) => item.email === email && !isCloudId(item.id))
        if (local) {
          const oldId = local.id
          local.id = profileId
          local.name = input.name.trim()
          local.phone = (input.phone || '').replace(/\D/g, '').slice(-10)
          local.role = input.role
          local.active = true
          const lists = { receptionist: draft.receptionists, counsellor: draft.counsellors, accountant: draft.accountants }
          const row = lists[input.role]?.find((item) => item.userId === oldId)
          if (row) row.userId = profileId
          return
        }
        if (draft.profiles.some((item) => item.email === email)) throw new Error('An account with this email already exists.')
        draft.profiles.push({ id: profileId, name: input.name.trim(), email, phone: (input.phone || '').replace(/\D/g, '').slice(-10), role: input.role, active: true })
        const row = { id: uid(input.role.slice(0, 3)), userId: profileId }
        if (input.role === 'receptionist') draft.receptionists.unshift({ ...row, shift: input.shift || 'Morning', desk: 'Front office' })
        if (input.role === 'counsellor') draft.counsellors.unshift({ ...row, focus: input.focus || 'Admissions' })
        if (input.role === 'accountant') draft.accountants.unshift({ ...row, desk: 'Accounts' })
        if (!isSupabaseConfigured()) registerDemo(email, input.password, profileId)
      }, `Created ${input.role} account for ${input.name?.trim()}`, 'Staff account created. They can sign in with this email and password.')
    },

    async setStaffStatus(profileId, active) {
      try {
        await syncAccess(profileId, active)
      } catch (error) {
        pushToast(error.message || 'Could not update access.', 'error')
        return null
      }
      return commit('staff.manage', (draft, actor) => {
        if (profileId === actor.id) throw new Error('You cannot change your own access.')
        const profile = draft.profiles.find((item) => item.id === profileId)
        if (!profile || profile.role === 'faculty' || profile.role === 'admin') throw new Error('Use the matching management page for this account.')
        profile.active = active
      }, `${active ? 'Activated' : 'Deactivated'} staff account`)
    },

    async saveCourse(input) {
      if (!input.name?.trim() || !input.fee) {
        pushToast('Course name and fee are required.', 'error')
        return null
      }
      try {
        if (isSupabaseConfigured()) {
          await ensureSupabaseCourse({
            id: input.id,
            slug: input.slug,
            name: input.name.trim(),
            duration: input.duration || '3 months',
            fee: Number(input.fee),
            level: input.level || 'Beginner',
            mode: 'Classroom + lab',
            summary: input.summary || '',
          })
        }
      } catch (error) {
        pushToast(error.message || 'Could not store the course in Supabase.', 'error')
        return null
      }
      return commit('courses.manage', (draft) => {
        if (!input.name?.trim() || !input.fee) throw new Error('Course name and fee are required.')
        if (input.id) {
          const course = draft.courses.find((item) => item.id === input.id)
          if (!course) throw new Error('Course not found.')
          Object.assign(course, { name: input.name.trim(), fee: Number(input.fee), duration: input.duration, level: input.level, summary: input.summary })
          return
        }
        const slug = input.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        draft.courses.unshift({
          id: uid('course'),
          slug: `${slug}-${Math.floor(Math.random() * 90 + 10)}`,
          name: input.name.trim(),
          duration: input.duration || '3 months',
          months: 3,
          fee: Number(input.fee),
          level: input.level || 'Beginner',
          mode: 'Classroom + lab',
          accent: 'New',
          summary: input.summary || '',
          outcomes: [],
          modules: [],
        })
      }, input.id ? 'Updated course' : `Created course ${input.name?.trim()}`)
    },

    saveSubject(input) {
      return commit('subjects.manage', (draft) => {
        if (!input.name?.trim() || !input.courseId) throw new Error('Subject name and course are required.')
        if (input.id) {
          const subject = draft.subjects.find((item) => item.id === input.id)
          if (!subject) throw new Error('Subject not found.')
          Object.assign(subject, { name: input.name.trim(), code: input.code?.trim() || subject.code, courseId: input.courseId })
          return
        }
        draft.subjects.unshift({ id: uid('sub'), courseId: input.courseId, name: input.name.trim(), code: input.code?.trim() || 'SUB' })
      }, input.id ? 'Updated subject' : 'Added subject')
    },

    async saveBatch(input) {
      if (!input.name?.trim() || !input.courseId) {
        pushToast('Batch name and course are required.', 'error')
        return null
      }
      const status = ['running', 'waiting', 'closed'].includes(input.status) ? input.status : 'running'
      const course = stateRef.current.courses.find((item) => item.id === input.courseId)
      const faculty = stateRef.current.faculty.find((item) => item.id === input.facultyId)
      let batchId = input.id || uid('batch')
      try {
        if (isSupabaseConfigured()) {
          if (!course) throw new Error('Choose a course for this batch.')
          const saved = await saveBatchToSupabase({
            ...input,
            status,
            course,
            facultyProfileId: faculty?.userId,
          })
          batchId = saved.id
        }
      } catch (error) {
        pushToast(error.message || 'Could not store the batch in Supabase.', 'error')
        return null
      }
      return commit('batches.manage', (draft) => {
        const previousId = input.id
        const existing = previousId ? draft.batches.find((item) => item.id === previousId) : null
        const record = {
          id: batchId,
          courseId: input.courseId,
          name: input.name.trim(),
          facultyId: input.facultyId || existing?.facultyId || '',
          startDate: input.startDate || existing?.startDate || todayISO(),
          endDate: input.endDate || '',
          schedule: input.schedule || '',
          days: existing?.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
          seats: Number(input.seats) || existing?.seats || 25,
          status,
        }
        if (existing) {
          Object.assign(existing, record)
          if (previousId !== batchId) {
            draft.students.forEach((student) => {
              if (student.batchId === previousId) student.batchId = batchId
            })
          }
        } else {
          draft.batches.unshift(record)
        }
        if (input.facultyId) {
          const assigned = draft.faculty.find((item) => item.id === input.facultyId)
          if (assigned) syncBatches(draft, assigned.id, [...new Set([...assigned.batchIds, batchId])])
        }
      }, input.id ? 'Updated batch' : 'Created batch')
    },

    saveAttendance(batchId, date, marks) {
      return commit('attendance.mark', (draft, actor) => {
        assertAssignedBatch(draft, actor, batchId)
        marks.forEach((mark) => {
          const existing = draft.attendance.find((row) => row.batchId === batchId && row.studentId === mark.studentId && row.date === date)
          if (existing) {
            existing.status = mark.status
            existing.markedBy = actor.id
          } else {
            draft.attendance.push({ id: uid('att'), batchId, studentId: mark.studentId, date, status: mark.status, markedBy: actor.id })
          }
        })
      }, 'Saved attendance', 'Attendance saved.')
    },

    addMaterial(input) {
      return commit('materials.manage', (draft, actor) => {
        if (!input.title?.trim() || !input.subjectId) throw new Error('Title and subject are required.')
        const faculty = actor.role === 'faculty' ? facultyOf(draft, actor.id) : draft.faculty.find((item) => item.id === input.facultyId) || facultyOf(draft, actor.id)
        if (actor.role === 'faculty' && !faculty?.subjectIds?.includes(input.subjectId)) throw new Error('This subject is not assigned to you.')
        draft.materials.unshift({
          id: uid('mat'),
          subjectId: input.subjectId,
          batchId: input.batchId || faculty?.batchIds?.[0] || '',
          facultyId: faculty?.id || '',
          title: input.title.trim(),
          kind: input.kind || 'PDF',
          fileName: input.fileName || 'resource.pdf',
          createdAt: todayISO(),
        })
      }, 'Added study material', 'Study material added.')
    },

    deleteMaterial(id) {
      return commit('materials.manage', (draft, actor) => {
        const material = draft.materials.find((item) => item.id === id)
        if (!material) throw new Error('Material not found.')
        if (actor.role === 'faculty') {
          const faculty = facultyOf(draft, actor.id)
          if (material.facultyId !== faculty?.id) throw new Error('You can remove only your own materials.')
        }
        draft.materials = draft.materials.filter((item) => item.id !== id)
      }, 'Removed study material', 'Material removed.')
    },

    saveExam(input) {
      return commit('exams.manage', (draft, actor) => {
        if (!input.title?.trim() || !input.batchId) throw new Error('Title and batch are required.')
        assertAssignedBatch(draft, actor, input.batchId)
        const faculty = actor.role === 'faculty' ? facultyOf(draft, actor.id) : draft.faculty.find((item) => item.batchIds.includes(input.batchId))
        const questions = (input.questions || []).map((question) => ({
          ...question,
          id: question.id || uid('q'),
          marks: Number(question.marks) || 1,
          testcases: (question.testcases || []).map((testcase) => ({ ...testcase, id: testcase.id || uid('t') })),
        }))
        if (!questions.length) throw new Error('Add at least one question.')
        if (input.id) {
          const exam = draft.exams.find((item) => item.id === input.id)
          if (!exam) throw new Error('Exam not found.')
          if (actor.role === 'faculty' && !facultyOf(draft, actor.id)?.batchIds.includes(exam.batchId)) throw new Error('This exam is outside your batches.')
          Object.assign(exam, { title: input.title.trim(), batchId: input.batchId, subjectId: input.subjectId || exam.subjectId, durationMin: Number(input.durationMin) || 30, kind: input.kind, questions })
          return
        }
        draft.exams.unshift({
          id: uid('exam'),
          title: input.title.trim(),
          kind: input.kind || 'mcq',
          batchId: input.batchId,
          subjectId: input.subjectId || '',
          facultyId: faculty?.id || '',
          durationMin: Number(input.durationMin) || 30,
          status: 'draft',
          questions,
        })
      }, input.id ? 'Updated examination' : 'Created examination', input.id ? 'Examination updated.' : 'Examination saved as draft.')
    },

    setExamStatus(id, status) {
      return commit('exams.manage', (draft, actor) => {
        const exam = draft.exams.find((item) => item.id === id)
        if (!exam) throw new Error('Exam not found.')
        assertAssignedBatch(draft, actor, exam.batchId)
        exam.status = status
      }, status === 'published' ? 'Published examination' : 'Closed examination', status === 'published' ? 'Examination published.' : 'Examination updated.')
    },

    submitAttempt(examId, payload) {
      const actor = sessionRef.current
      const student = stateRef.current.students.find((item) => item.userId === actor?.id)
      if (!student) {
        pushToast('Student profile not found.', 'error')
        return null
      }
      try {
        const draft = structuredClone(stateRef.current)
        const exam = draft.exams.find((item) => item.id === examId && item.status === 'published' && item.batchId === student.batchId)
        if (!exam) throw new Error('This examination is not available.')
        if (draft.attempts.some((item) => item.examId === examId && item.studentId === student.id)) throw new Error('You have already submitted this examination.')
        const attempt = {
          id: uid('attempt'),
          examId,
          studentId: student.id,
          answers: payload.answers || {},
          code: payload.code || {},
          score: 0,
          total: 0,
          published: false,
          status: 'submitted',
          feedback: '',
          submittedAt: new Date().toISOString(),
        }
        const score = scoreAttempt(exam, attempt)
        attempt.score = score.earned
        attempt.total = score.total
        draft.attempts.unshift(attempt)
        stateRef.current = draft
        setState(draft)
        pushToast('Submission received. Results appear after faculty publish them.')
        return draft
      } catch (error) {
        pushToast(error.message, 'error')
        return null
      }
    },

    publishResults(examId) {
      return commit('results.manage', (draft, actor) => {
        const exam = draft.exams.find((item) => item.id === examId)
        if (!exam) throw new Error('Exam not found.')
        assertAssignedBatch(draft, actor, exam.batchId)
        draft.attempts.forEach((attempt) => {
          if (attempt.examId === examId) attempt.published = true
        })
      }, 'Published examination results', 'Results published to students.')
    },

    gradeAttempt(id, marks, feedback) {
      return commit('results.manage', (draft, actor) => {
        const attempt = draft.attempts.find((item) => item.id === id)
        if (!attempt) throw new Error('Submission not found.')
        const exam = draft.exams.find((item) => item.id === attempt.examId)
        assertAssignedBatch(draft, actor, exam?.batchId)
        attempt.score = Number(marks) || 0
        attempt.feedback = feedback || ''
        attempt.status = 'evaluated'
      }, 'Evaluated examination submission')
    },

    saveAssignment(input) {
      return commit('assignments.manage', (draft, actor) => {
        if (!input.title?.trim() || !input.batchId || !input.deadline) throw new Error('Title, batch and deadline are required.')
        assertAssignedBatch(draft, actor, input.batchId)
        const faculty = actor.role === 'faculty' ? facultyOf(draft, actor.id) : draft.faculty.find((item) => item.batchIds.includes(input.batchId))
        if (input.id) {
          const assignment = draft.assignments.find((item) => item.id === input.id)
          if (!assignment) throw new Error('Assignment not found.')
          assertAssignedBatch(draft, actor, assignment.batchId)
          Object.assign(assignment, { title: input.title.trim(), deadline: input.deadline, totalMarks: Number(input.totalMarks) || 10, description: input.description || '', batchId: input.batchId, subjectId: input.subjectId || '' })
          return
        }
        draft.assignments.unshift({
          id: uid('asg'),
          title: input.title.trim(),
          batchId: input.batchId,
          subjectId: input.subjectId || '',
          facultyId: faculty?.id || '',
          deadline: input.deadline,
          totalMarks: Number(input.totalMarks) || 10,
          description: input.description || '',
        })
      }, input.id ? 'Updated assignment' : 'Created assignment')
    },

    submitAssignment(assignmentId, content, fileName) {
      const actor = sessionRef.current
      const student = stateRef.current.students.find((item) => item.userId === actor?.id)
      if (!student) {
        pushToast('Student profile not found.', 'error')
        return null
      }
      try {
        const draft = structuredClone(stateRef.current)
        const assignment = draft.assignments.find((item) => item.id === assignmentId && item.batchId === student.batchId)
        if (!assignment) throw new Error('Assignment not found.')
        if (!content?.trim()) throw new Error('Write a short submission note.')
        const existing = draft.submissions.find((item) => item.assignmentId === assignmentId && item.studentId === student.id)
        if (existing) {
          existing.content = content.trim()
          existing.fileName = fileName || existing.fileName
          existing.submittedAt = new Date().toISOString()
          existing.status = 'submitted'
        } else {
          draft.submissions.unshift({
            id: uid('subm'),
            assignmentId,
            studentId: student.id,
            content: content.trim(),
            fileName: fileName || '',
            marks: null,
            feedback: '',
            status: 'submitted',
            submittedAt: new Date().toISOString(),
          })
        }
        stateRef.current = draft
        setState(draft)
        pushToast('Assignment submitted.')
        return true
      } catch (error) {
        pushToast(error.message, 'error')
        return null
      }
    },

    gradeSubmission(id, marks, feedback) {
      return commit('assignments.manage', (draft, actor) => {
        const submission = draft.submissions.find((item) => item.id === id)
        if (!submission) throw new Error('Submission not found.')
        const assignment = draft.assignments.find((item) => item.id === submission.assignmentId)
        assertAssignedBatch(draft, actor, assignment?.batchId)
        if (Number(marks) > Number(assignment?.totalMarks || 0)) throw new Error('Marks cannot exceed the assignment total.')
        submission.marks = Number(marks)
        submission.feedback = feedback || ''
        submission.status = 'evaluated'
      }, 'Evaluated assignment', 'Marks and feedback saved.')
    },

    saveEnquiry(input) {
      return commit(['enquiries.full', 'enquiries.limited'], (draft, actor) => {
        if (!input.name?.trim() || !input.phone?.trim()) throw new Error('Student name and phone are required.')
        const phone = input.phone.replace(/\D/g, '').slice(-10)
        if (phone.length !== 10) throw new Error('Enter a 10-digit mobile number.')
        if (input.id) {
          const enquiry = draft.enquiries.find((item) => item.id === input.id)
          if (!enquiry) throw new Error('Enquiry not found.')
          const note = input.note?.trim()
          Object.assign(enquiry, {
            name: input.name.trim(),
            phone,
            email: input.email?.trim() || '',
            courseId: input.courseId || '',
            source: input.source || enquiry.source,
            status: input.status || enquiry.status,
            followUpDate: input.followUpDate || '',
            remarks: input.remarks?.trim() ?? enquiry.remarks,
          })
          if (note) enquiry.history.unshift({ at: new Date().toISOString(), note, by: actor.name })
          return
        }
        draft.enquiries.unshift({
          id: uid('enq'),
          name: input.name.trim(),
          phone,
          email: input.email?.trim() || '',
          courseId: input.courseId || '',
          source: input.source || 'Walk-in',
          status: input.status || 'new',
          followUpDate: input.followUpDate || todayISO(),
          remarks: input.remarks?.trim() || '',
          counsellorId: actor.role === 'counsellor' ? actor.id : input.counsellorId || draft.counsellors[0]?.userId || actor.id,
          createdAt: todayISO(),
          history: input.note ? [{ at: new Date().toISOString(), note: input.note, by: actor.name }] : [],
        })
      }, input.id ? 'Updated enquiry' : `Added enquiry for ${input.name?.trim()}`)
    },

    deleteEnquiry(id) {
      return commit('enquiries.full', (draft) => {
        if (!draft.enquiries.some((item) => item.id === id)) throw new Error('Enquiry not found.')
        draft.enquiries = draft.enquiries.filter((item) => item.id !== id)
      }, 'Deleted enquiry', 'Enquiry removed.')
    },

    saveSession(input) {
      return commit('enquiries.full', (draft, actor) => {
        if (!input.enquiryId || !input.date) throw new Error('Choose an enquiry and a date.')
        if (input.id) {
          const sessionRow = draft.sessions.find((item) => item.id === input.id)
          if (!sessionRow) throw new Error('Session not found.')
          Object.assign(sessionRow, { date: input.date, time: input.time || '', mode: input.mode || 'Campus', notes: input.notes || '', status: input.status || sessionRow.status })
          return
        }
        draft.sessions.unshift({
          id: uid('ses'),
          enquiryId: input.enquiryId,
          date: input.date,
          time: input.time || '',
          mode: input.mode || 'Campus',
          notes: input.notes || '',
          counsellorId: actor.id,
          status: 'scheduled',
        })
      }, 'Saved counselling session')
    },

    enrollEnquiry(enquiryId, input) {
      return commit(['admissions.manage', 'admissions.assist'], (draft, actor) => {
        const enquiry = draft.enquiries.find((item) => item.id === enquiryId)
        if (!enquiry) throw new Error('Enquiry not found.')
        if (!input.courseId || !input.batchId) throw new Error('Course and batch are required.')
        const batch = draft.batches.find((item) => item.id === input.batchId)
        if (!batch || batch.courseId !== input.courseId) throw new Error('Choose a batch that belongs to the selected course.')
        const occupied = draft.students.filter((student) => student.batchId === batch.id && student.status !== 'inactive').length
        if (occupied >= batch.seats) throw new Error('This batch is full.')
        const processing = input.mode === 'processing'
        const studentId = uid('stu')
        const course = draft.courses.find((item) => item.id === input.courseId)
        draft.students.unshift({
          id: studentId,
          userId: null,
          name: enquiry.name,
          email: enquiry.email,
          phone: enquiry.phone,
          rollNo: `C2C26${String(draft.students.length + 1).padStart(3, '0')}`,
          courseId: input.courseId,
          batchId: input.batchId,
          status: processing ? 'pending' : 'active',
          admissionDate: todayISO(),
          guardian: input.guardian || '',
          documents: input.documents || [],
          createdBy: actor.id,
          notes: '',
        })
        draft.feeRecords.unshift({
          id: uid('fee'),
          studentId,
          courseFee: course?.fee || 0,
          discount: 0,
          total: course?.fee || 0,
          paid: 0,
          pending: course?.fee || 0,
          dueDate: '',
        })
        draft.admissions.unshift({
          id: uid('adm'),
          enquiryId,
          studentId,
          courseId: input.courseId,
          batchId: input.batchId,
          documents: input.documents || [],
          status: processing ? 'processing' : 'enrolled',
          counsellorId: enquiry.counsellorId || actor.id,
          createdAt: todayISO(),
        })
        enquiry.status = processing ? 'interested' : 'converted'
        enquiry.history.unshift({ at: new Date().toISOString(), note: processing ? 'Admission submitted for processing.' : 'Converted to an enrolled student.', by: actor.name })
      }, 'Processed admission', input.mode === 'processing' ? 'Admission submitted for processing.' : 'Student enrolled.')
    },

    confirmAdmission(id) {
      return commit(['admissions.manage', 'admissions.assist'], (draft) => {
        const admission = draft.admissions.find((item) => item.id === id)
        if (!admission) throw new Error('Admission not found.')
        admission.status = 'enrolled'
        const student = draft.students.find((item) => item.id === admission.studentId)
        if (student) student.status = 'active'
        const enquiry = draft.enquiries.find((item) => item.id === admission.enquiryId)
        if (enquiry) enquiry.status = 'converted'
      }, 'Confirmed admission', 'Admission confirmed.')
    },

    recordPayment(input) {
      const kind = input.kind || 'collection'
      return commit(kind === 'collection' ? 'fees.manage' : ['fees.manage', 'fees.request'], (draft, actor) => {
        if (!input.studentId || !input.amount) throw new Error('Student and amount are required.')
        const amount = Number(input.amount)
        if (!amount || amount <= 0) throw new Error('Enter an amount greater than zero.')
        if (!['collection', 'refund', 'discount'].includes(kind)) throw new Error('Unknown payment type.')
        if (kind === 'collection' && !hasPermission(actor.role, 'fees.manage')) throw new Error('Only accounts can record a collection.')
        if ((kind === 'refund' || kind === 'discount') && !input.note?.trim()) throw new Error('Add a reason for the refund or discount.')
        let status = 'verified'
        if (kind === 'refund' || kind === 'discount') status = actor.role === 'admin' ? 'verified' : 'pending'
        if (input.method !== 'cash' && kind === 'collection' && !input.utr?.trim()) throw new Error('UTR / transaction ID is required for UPI and bank transfers.')
        const receiptNo = `C2C-R-${1040 + draft.payments.length + 1}`
        draft.payments.unshift({
          id: uid('pay'),
          studentId: input.studentId,
          amount,
          method: input.method || 'cash',
          kind,
          utr: input.utr?.trim() || '',
          proofName: input.proofName || '',
          status,
          date: input.date || todayISO(),
          receiptNo,
          recordedBy: actor.id,
          note: input.note?.trim() || '',
        })
        recalcFee(draft, input.studentId)
      }, 'Recorded a payment', 'Payment recorded.')
    },

    verifyPayment(id, status) {
      return commit('fees.manage', (draft, actor) => {
        const payment = draft.payments.find((item) => item.id === id)
        if (!payment) throw new Error('Payment not found.')
        if ((payment.kind === 'refund' || payment.kind === 'discount') && status === 'verified' && actor.role !== 'admin') {
          throw new Error('Refunds and discounts need admin authorization.')
        }
        payment.status = status
        recalcFee(draft, payment.studentId)
      }, `${status === 'verified' ? 'Verified' : 'Rejected'} payment`)
    },

    addNotification(input) {
      return commit('notifications.manage', (draft) => {
        if (!input.title?.trim() || !input.body?.trim()) throw new Error('Title and message are required.')
        draft.notifications.unshift({
          id: uid('nt'),
          title: input.title.trim(),
          body: input.body.trim(),
          audience: input.audience || 'all',
          createdAt: new Date().toISOString(),
        })
      }, 'Published a notification', 'Notification sent.')
    },

    updateSettings(input) {
      return commit('settings', (draft) => {
        draft.settings = {
          ...draft.settings,
          name: input.name?.trim() || draft.settings.name,
          phone: input.phone?.trim() || draft.settings.phone,
          email: input.email?.trim() || draft.settings.email,
          address: input.address?.trim() || draft.settings.address,
          hours: input.hours?.trim() || draft.settings.hours,
        }
      }, 'Updated institute settings', 'Settings saved.')
    },

    markFacultyAttendance(facultyId, status) {
      return commit('attendance.faculty', (draft, actor) => {
        const faculty = draft.faculty.find((item) => item.id === facultyId)
        if (!faculty) throw new Error('Faculty member not found.')
        const date = todayISO()
        const existing = draft.facultyAttendance.find((item) => item.facultyId === facultyId && item.date === date)
        if (existing) existing.status = status
        else draft.facultyAttendance.unshift({ id: uid('fatt'), facultyId, date, status, markedBy: actor.name })
      }, 'Marked faculty attendance', 'Faculty attendance saved.')
    },

    async saveWorkshop(input) {
      if (!input.title?.trim()) {
        pushToast('Workshop title is required.', 'error')
        return null
      }
      let workshopId = input.id || uid('ws')
      try {
        if (isSupabaseConfigured()) {
          const saved = await saveWorkshopToSupabase({ ...input, id: workshopId, status: input.status || 'open' })
          workshopId = saved.id
        }
      } catch (error) {
        pushToast(error.message || 'Could not store the workshop in Supabase.', 'error')
        return null
      }
      return commit('workshops.manage', (draft) => {
        if (!input.title?.trim()) throw new Error('Workshop title is required.')
        if (input.id) {
          const row = draft.workshops.find((item) => item.id === input.id)
          if (!row) throw new Error('Workshop not found.')
          Object.assign(row, { id: workshopId, title: input.title.trim(), date: input.date || '', mode: input.mode || '', seats: Number(input.seats) || 0, blurb: input.blurb || '', status: input.status || 'open' })
          return
        }
        draft.workshops.unshift({ id: workshopId, title: input.title.trim(), date: input.date || '', mode: input.mode || 'Campus', seats: Number(input.seats) || 20, blurb: input.blurb || '', status: 'open' })
      }, input.id ? 'Updated a workshop' : 'Added a workshop', 'Workshop saved.')
    },

    async saveJob(input) {
      if (!input.title?.trim()) {
        pushToast('Role title is required.', 'error')
        return null
      }
      let jobId = input.id || uid('job')
      try {
        if (isSupabaseConfigured()) {
          const saved = await saveJobToSupabase({ ...input, id: jobId, open: input.open !== false })
          jobId = saved.id
        }
      } catch (error) {
        pushToast(error.message || 'Could not store the opening in Supabase.', 'error')
        return null
      }
      return commit('careers.manage', (draft) => {
        if (!input.title?.trim()) throw new Error('Role title is required.')
        if (input.id) {
          const row = draft.jobs.find((item) => item.id === input.id)
          if (!row) throw new Error('Role not found.')
          Object.assign(row, { id: jobId, title: input.title.trim(), type: input.type || '', place: input.place || 'Campus', blurb: input.blurb || '', open: input.open !== false })
          return
        }
        draft.jobs.unshift({ id: jobId, title: input.title.trim(), type: input.type || 'Full-time', place: input.place || 'Campus', blurb: input.blurb || '', open: true })
      }, input.id ? 'Updated a role' : 'Added a role', 'Career listing saved.')
    },

    saveInventory(input) {
      return commit('inventory.manage', (draft) => {
        if (!input.name?.trim()) throw new Error('Item name is required.')
        if (input.id) {
          const row = draft.inventory.find((item) => item.id === input.id)
          if (!row) throw new Error('Item not found.')
          Object.assign(row, { name: input.name.trim(), qty: Number(input.qty) || 0, note: input.note || '' })
          return
        }
        draft.inventory.unshift({ id: uid('inv'), name: input.name.trim(), qty: Number(input.qty) || 0, note: input.note || '' })
      }, input.id ? 'Updated inventory' : 'Added an inventory item', 'Inventory saved.')
    },

    saveTicket(input) {
      return commit('tickets.manage', (draft, actor) => {
        if (!input.subject?.trim() || !input.message?.trim()) throw new Error('Subject and message are required.')
        draft.tickets.unshift({
          id: uid('tkt'),
          subject: input.subject.trim(),
          message: input.message.trim(),
          status: 'open',
          by: actor.name,
          role: actor.role,
          at: new Date().toISOString(),
        })
      }, 'Opened a support ticket', 'Ticket sent to admin.')
    },

    setTicketStatus(id, status) {
      return commit('tickets.manage', (draft, actor) => {
        if (actor.role !== 'admin') throw new Error('Only an admin can close a ticket.')
        const ticket = draft.tickets.find((item) => item.id === id)
        if (!ticket) throw new Error('Ticket not found.')
        ticket.status = status
      }, 'Updated a support ticket', 'Ticket updated.')
    },

    addCashNote(input) {
      return commit('fees.cash', (draft, actor) => {
        const amount = Number(input.amount)
        if (!amount) throw new Error('Enter a cash amount.')
        draft.cashNotes.unshift({ id: uid('cash'), amount, note: input.note?.trim() || '', direction: input.direction === 'out' ? 'out' : 'in', by: actor.name, at: new Date().toISOString() })
      }, 'Updated cash on hand', 'Cash note saved.')
    },

    addReferral(input) {
      return commit(['fees.manage', 'fees.request'], (draft, actor) => {
        const amount = Number(input.amount)
        if (!input.name?.trim() || !amount) throw new Error('Name and amount are required.')
        draft.referrals.unshift({ id: uid('ref'), name: input.name.trim(), amount, note: input.note?.trim() || '', by: actor.name, at: todayISO() })
      }, 'Added a referral credit', 'Referral wallet updated.')
    },

    async changeOwnPassword(currentPassword, nextPassword) {
      const actor = sessionRef.current
      if (!actor) {
        pushToast('Please sign in again.', 'error')
        return null
      }
      const problem = validatePassword(nextPassword)
      if (problem) {
        pushToast(problem, 'error')
        return null
      }
      try {
        if (isSupabaseConfigured()) await changeSupabasePassword(actor.email, currentPassword, nextPassword)
        else updateDemoPassword(actor.email, currentPassword, nextPassword)
      } catch (error) {
        pushToast(error.message || 'Could not change the password.', 'error')
        return null
      }
      const draft = structuredClone(stateRef.current)
      draft.logs = [
        { id: uid('log'), actorId: actor.id, actorName: actor.name, role: actor.role, action: 'Changed own password', at: new Date().toISOString() },
        ...draft.logs,
      ].slice(0, 300)
      stateRef.current = draft
      setState(draft)
      pushToast('Password updated.')
      return true
    },

    resetDemo() {
      if (!hasPermission(sessionRef.current?.role, 'settings')) {
        pushToast('Only an admin can reset the workspace.', 'error')
        return
      }
      localStorage.removeItem(DATA_KEY)
      resetDemoAuth()
      const fresh = createSeed()
      stateRef.current = fresh
      setState(fresh)
      pushToast('Local records cleared.')
    },
  }

  return <LmsContext.Provider value={api}>{children}</LmsContext.Provider>
}

export function useLms() {
  const context = useContext(LmsContext)
  if (!context) throw new Error('useLms must be used inside LmsProvider')
  return context
}
