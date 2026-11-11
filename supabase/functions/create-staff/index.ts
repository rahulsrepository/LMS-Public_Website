import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders } from '../_shared/cors.ts'

const PEOPLE = ['admin', 'faculty', 'receptionist', 'counsellor', 'accountant', 'student']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!token) return json({ error: 'Sign in required.' }, 401)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )
    const userId = readUserId(token)
    if (!userId) return json({ error: 'Sign in required.' }, 401)
    const body = await req.json()
    const { data: actor } = await admin.from('profiles').select('role, is_active').eq('id', userId).single()
    const canManagePeople = ['admin', 'receptionist'].includes(actor?.role)
    const canRegisterStudents = body.action !== 'access' && body.role === 'student' && actor?.role === 'counsellor'
    if (!actor?.is_active || (!canManagePeople && !canRegisterStudents)) {
      return json({ error: 'You do not have permission to manage this person.' }, 403)
    }

    if (body.action === 'access') return json(await setAccess(admin, userId, body))
    if (body.action === 'update') {
      if (actor.role !== 'admin') return json({ error: 'Only an admin can edit people account details.' }, 403)
      return json(await updatePerson(admin, body))
    }
    if (body.action === 'delete_student') return json(await deleteStudentRecord(admin, userId, actor.role, body))
    if (body.action === 'delete') return json(await deletePerson(admin, userId, actor.role, body))

    const role = String(body.role || '')
    if (!PEOPLE.includes(role)) return json({ error: 'This role cannot be created here.' }, 400)
    if (role === 'admin' && actor.role !== 'admin') return json({ error: 'Only an admin can create another admin.' }, 403)

    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')
    const fullName = String(body.full_name || body.name || '').trim()
    if (!email || !fullName) return json({ error: 'Name and email are required.' }, 400)
    if (password.length < 6) {
      return json({ error: 'Password must be at least 6 characters.' }, 400)
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })
    if (createError || !created.user) {
      if (createError && /password|weak_password/i.test(createError.message)) {
        return json({
          error: 'Supabase Auth rejected this password. To allow any 6-character password, change the project password policy in Supabase Dashboard > Authentication > Settings to a 6-character minimum with no character-composition rules, then redeploy this function.',
        }, 400)
      }
      return json({ error: createError?.message || 'Could not create the login.' }, 400)
    }

    const id = created.user.id
    const { error: profileError } = await admin.from('profiles').insert({
      id,
      full_name: fullName,
      email,
      phone: String(body.phone || ''),
      experience: String(body.experience || ''),
      role,
      is_active: true,
    })
    if (profileError) {
      const cleanupError = await removeCreatedUser(admin, id)
      return json({ error: withCleanupError(profileError.message, cleanupError) }, 400)
    }

    if (role === 'faculty') {
      const { error } = await admin.from('faculty').insert({
        profile_id: id,
        designation: body.designation || 'Trainer',
        qualification: body.qualification || '',
        specialization: body.specialization || '',
        status: 'active',
      })
      if (error) {
        const cleanupError = await removeCreatedUser(admin, id)
        return json({ error: withCleanupError(error.message, cleanupError) }, 400)
      }
    }
    if (role === 'receptionist') {
      const { error } = await admin.from('receptionists').insert({ profile_id: id, shift: body.shift || 'Morning' })
      if (error) {
        const cleanupError = await removeCreatedUser(admin, id)
        return json({ error: withCleanupError(error.message, cleanupError) }, 400)
      }
    }
    if (role === 'counsellor') {
      const { error } = await admin.from('counsellors').insert({ profile_id: id, focus: body.focus || 'Admissions' })
      if (error) {
        const cleanupError = await removeCreatedUser(admin, id)
        return json({ error: withCleanupError(error.message, cleanupError) }, 400)
      }
    }
    if (role === 'accountant') {
      const { error } = await admin.from('accountants').insert({ profile_id: id, desk: 'Accounts' })
      if (error) {
        const cleanupError = await removeCreatedUser(admin, id)
        return json({ error: withCleanupError(error.message, cleanupError) }, 400)
      }
    }

    await admin.from('activity_logs').insert({
      actor_id: userId,
      action: `Created ${role} account for ${fullName}`,
      entity: role,
      entity_id: id,
    })

    return json({ id, email })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return json({ error: message }, 500)
  }
})

async function updatePerson(admin, body) {
  const userId = String(body.user_id || '')
  const email = String(body.email || '').trim().toLowerCase()
  const fullName = String(body.full_name || '').trim()
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !email || !fullName) {
    return { error: 'Choose a person and enter a valid name and email.', status: 400 }
  }
  const { data: target, error: targetError } = await admin.from('profiles').select('id, email, role').eq('id', userId).single()
  if (targetError || !target) return { error: 'Person not found.', status: 404 }
  const { error: authError } = await admin.auth.admin.updateUserById(userId, {
    email,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })
  if (authError) return { error: authError.message, status: 400 }

  const { error: profileError } = await admin.from('profiles').update({
    full_name: fullName,
    email,
    phone: String(body.phone || ''),
    experience: String(body.experience || ''),
  }).eq('id', userId)
  if (profileError) {
    const { error: rollbackError } = await admin.auth.admin.updateUserById(userId, { email: target.email })
    const message = rollbackError
      ? `${profileError.message} The auth email rollback also failed: ${rollbackError.message}`
      : profileError.message
    return { error: message, status: 400 }
  }
  if (target.role === 'student' && body.student) {
    const studentUpdate: Record<string, unknown> = {
      full_name: fullName,
      email,
      phone: String(body.phone || ''),
    }
    if (typeof body.student.guardian === 'string') studentUpdate.guardian = body.student.guardian
    if (Array.isArray(body.student.documents)) studentUpdate.documents = body.student.documents
    if (typeof body.student.notes === 'string') studentUpdate.notes = body.student.notes
    if (isUuid(body.student.course_id)) studentUpdate.course_id = body.student.course_id
    if (isUuid(body.student.batch_id)) studentUpdate.batch_id = body.student.batch_id
    const { error: studentError } = await admin.from('students').update(studentUpdate).eq('profile_id', userId)
    if (studentError) return { error: `Profile saved, but the student record could not be updated: ${studentError.message}`, status: 400 }
  }
  return { id: userId, email }
}

async function removeCreatedUser(admin, userId) {
  const { error } = await admin.auth.admin.deleteUser(userId)
  return error?.message || null
}

async function deleteStudentRecord(admin, actorId, actorRole, body) {
  if (!['admin', 'receptionist'].includes(actorRole)) {
    return { error: 'You do not have permission to delete student records.', status: 403 }
  }
  const studentId = String(body.student_id || '')
  if (!isUuid(studentId)) return { error: 'Choose a student with a valid record.', status: 400 }
  const { data: student, error: studentError } = await admin.from('students').select('profile_id').eq('id', studentId).maybeSingle()
  if (studentError) return { error: studentError.message, status: 400 }
  if (!student) {
    const userId = String(body.user_id || '')
    return userId ? deletePerson(admin, actorId, actorRole, { user_id: userId }) : { error: 'Student not found.', status: 404 }
  }
  if (student.profile_id) {
    const { data: profile, error } = await admin.from('profiles').select('role').eq('id', student.profile_id).maybeSingle()
    if (error) return { error: error.message, status: 400 }
    if (profile?.role !== 'student') return { error: 'The student record is linked to a different account role.', status: 400 }
    return deletePerson(admin, actorId, actorRole, { user_id: student.profile_id })
  }

  const { error } = await admin.from('students').delete().eq('id', studentId)
  if (error) return { error: `The student record could not be deleted: ${error.message}`, status: 400 }
  const { error: logError } = await admin.from('activity_logs').insert({
    actor_id: actorId,
    action: 'Deleted student record',
    entity: 'student',
    entity_id: studentId,
  })
  return { id: studentId, deleted: true, warning: logError?.message || '' }
}

async function deletePerson(admin, actorId, actorRole, body) {
  const userId = String(body.user_id || '')
  if (!isUuid(userId)) return { error: 'Choose a person with a valid account.', status: 400 }
  if (userId === actorId) return { error: 'You cannot delete your own account.', status: 400 }

  const { data: target, error: targetError } = await admin
    .from('profiles')
    .select('id, role, full_name, is_active')
    .eq('id', userId)
    .maybeSingle()
  if (targetError) return { error: targetError.message, status: 400 }
  if (!target) return { error: 'Person not found.', status: 404 }
  if (actorRole !== 'admin' && !(actorRole === 'receptionist' && target.role === 'student')) {
    return { error: 'Only an admin can permanently delete this account.', status: 403 }
  }
  if (target.role === 'admin') {
    if (actorRole !== 'admin') return { error: 'Only an admin can delete another admin account.', status: 403 }
    if (target.is_active) {
      const { count, error } = await admin.from('profiles').select('id', { count: 'exact', head: true })
        .eq('role', 'admin').eq('is_active', true).neq('id', userId)
      if (error) return { error: error.message, status: 400 }
      if (count === 0) return { error: 'The last active admin cannot be deleted.', status: 403 }
    }
  }
  if (actorRole === 'receptionist' && target.role !== 'student') {
    return { error: 'Receptionists can only delete student records.', status: 403 }
  }

  const referenceUpdates = await Promise.all([
    admin.from('students').update({ created_by: null }).eq('created_by', userId),
    admin.from('enquiries').update({ counsellor_id: null }).eq('counsellor_id', userId),
    admin.from('admissions').update({ counsellor_id: null }).eq('counsellor_id', userId),
    admin.from('counselling_sessions').update({ counsellor_id: null }).eq('counsellor_id', userId),
    admin.from('attendance').update({ marked_by: null }).eq('marked_by', userId),
    admin.from('payments').update({ recorded_by: null }).eq('recorded_by', userId),
    admin.from('activity_logs').update({ actor_id: null }).eq('actor_id', userId),
  ])
  const referenceError = referenceUpdates.find((result) => result.error)?.error
  if (referenceError) return { error: `Some linked records could not be detached: ${referenceError.message}`, status: 400 }

  if (target.role === 'student') {
    const { error } = await admin.from('students').delete().eq('profile_id', userId)
    if (error) return { error: `The student record could not be deleted: ${error.message}`, status: 400 }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId)
  if (deleteError) return { error: `The account could not be deleted: ${deleteError.message}`, status: 400 }

  const { error: logError } = await admin.from('activity_logs').insert({
    actor_id: actorId,
    action: `Deleted ${target.role} account for ${target.full_name}`,
    entity: target.role,
    entity_id: userId,
  })

  return { id: userId, deleted: true, warning: logError?.message || '' }
}

function withCleanupError(message, cleanupError) {
  return cleanupError ? `${message} The incomplete login could not be removed: ${cleanupError}` : message
}

async function setAccess(admin, actorId, body) {
  const userId = String(body.user_id || '')
  const active = Boolean(body.active)
  if (!userId) return { error: 'Choose a person first.', status: 400 }
  if (userId === actorId) return { error: 'You cannot change your own access.', status: 400 }

  const { data: target, error: targetError } = await admin.from('profiles').select('id, role, full_name, is_active').eq('id', userId).single()
  if (targetError) return { error: targetError.message, status: 400 }
  if (!target) return { error: 'This person does not have a login yet. Add them again.', status: 400 }
  if (target.role === 'admin' && !active) {
    const { count, error } = await admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin').eq('is_active', true).neq('id', userId)
    if (error) return { error: error.message, status: 400 }
    if (count === 0) return { error: 'The last active admin cannot be removed.', status: 403 }
  }
  if (target.role === 'admin') {
    const { data: actor } = await admin.from('profiles').select('role').eq('id', actorId).single()
    if (actor?.role !== 'admin') return { error: 'Only an admin can change another admin account.', status: 403 }
  }

  const { error: profileError } = await admin.from('profiles').update({ is_active: active }).eq('id', userId)
  if (profileError) return { error: profileError.message, status: 400 }

  let priorFacultyId: string | null = null
  let priorFacultyStatus: string | null = null
  let priorFacultyBatches: Array<{ faculty_id: string; batch_id: string }> = []
  let priorStudentStatus: string | null = null
  if (target.role === 'faculty') {
    const { data: faculty, error: readError } = await admin.from('faculty').select('id,status').eq('profile_id', userId).maybeSingle()
    if (readError) {
      const rollbackError = await restoreProfileAccess(admin, userId, target.is_active)
      return { error: withRollbackError(readError.message, rollbackError), status: 400 }
    }
    priorFacultyId = faculty?.id || null
    priorFacultyStatus = faculty?.status || null
    if (priorFacultyId) {
      const { data, error } = await admin.from('faculty_batches').select('faculty_id,batch_id').eq('faculty_id', priorFacultyId)
      if (error) {
        const rollbackError = await restoreProfileAccess(admin, userId, target.is_active)
        return { error: withRollbackError(error.message, rollbackError), status: 400 }
      }
      priorFacultyBatches = data || []
    }
    const facultyStatus = body.faculty_status === 'removed' ? 'removed' : active ? 'active' : 'inactive'
    const { error } = await admin.from('faculty').update({ status: facultyStatus }).eq('profile_id', userId)
    if (error) {
      const rollbackError = await restoreProfileAccess(admin, userId, target.is_active)
      return { error: withRollbackError(`The faculty record could not be updated: ${error.message}`, rollbackError), status: 400 }
    }
    if (facultyStatus === 'removed' && priorFacultyId) {
      const { error: assignmentsError } = await admin.from('faculty_batches').delete().eq('faculty_id', priorFacultyId)
      if (assignmentsError) {
        const rollbackError = await restoreAccessRecords(admin, userId, target, priorFacultyId, priorFacultyStatus, [])
        return { error: withRollbackError(`Faculty batch assignments could not be cleared: ${assignmentsError.message}`, rollbackError), status: 400 }
      }
    }
  }
  if (target.role === 'student') {
    const { data: student, error: readError } = await admin.from('students').select('status').eq('profile_id', userId).maybeSingle()
    if (readError) {
      const rollbackError = await restoreProfileAccess(admin, userId, target.is_active)
      return { error: withRollbackError(readError.message, rollbackError), status: 400 }
    }
    priorStudentStatus = student?.status || null
    const { error } = await admin.from('students').update({ status: active ? 'active' : 'inactive' }).eq('profile_id', userId)
    if (error) {
      const rollbackError = await restoreProfileAccess(admin, userId, target.is_active)
      return { error: withRollbackError(`The student record could not be updated: ${error.message}`, rollbackError), status: 400 }
    }
  }

  const { error: banError } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: active ? 'none' : '876600h',
  })
  if (banError) {
    const rollbackError = await restoreAccessRecords(admin, userId, target, priorFacultyId, priorFacultyStatus, priorFacultyBatches, priorStudentStatus)
    return { error: withRollbackError(banError.message, rollbackError), status: 400 }
  }

  await admin.from('activity_logs').insert({
    actor_id: actorId,
    action: `${active ? 'Restored' : 'Removed'} access for ${target.full_name}`,
    entity: target.role,
    entity_id: userId,
  })

  return { id: userId, active }
}

async function restoreProfileAccess(admin, userId: string, active: boolean) {
  const { error } = await admin.from('profiles').update({ is_active: active }).eq('id', userId)
  return error?.message || null
}

async function restoreAccessRecords(admin, userId: string, target, facultyId: string | null, facultyStatus: string | null, facultyBatches: Array<{ faculty_id: string; batch_id: string }>, studentStatus: string | null = null) {
  const errors = []
  const profileError = await restoreProfileAccess(admin, userId, target.is_active)
  if (profileError) errors.push(`profile: ${profileError}`)
  if (target.role === 'faculty' && facultyStatus && facultyId) {
    const { error } = await admin.from('faculty').update({ status: facultyStatus }).eq('profile_id', userId)
    if (error) errors.push(`faculty: ${error.message}`)
    if (facultyBatches.length) {
      const { error: assignmentsError } = await admin.from('faculty_batches').insert(facultyBatches)
      if (assignmentsError) errors.push(`faculty assignments: ${assignmentsError.message}`)
    }
  }
  if (target.role === 'student' && studentStatus) {
    const { error } = await admin.from('students').update({ status: studentStatus }).eq('profile_id', userId)
    if (error) errors.push(`student: ${error.message}`)
  }
  return errors.length ? errors.join('; ') : null
}

function withRollbackError(message: string, rollbackError: string | null) {
  return rollbackError ? `${message} Access status rollback also failed: ${rollbackError}` : message
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

function readUserId(token) {
  try {
    const body = token.split('.')[1]
    if (!body) return null
    const padded = body.replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(padded))
    if (typeof payload.sub !== 'string' || !/^[0-9a-f-]{36}$/i.test(payload.sub)) return null
    if (payload.role === 'anon' || payload.role === 'service_role') return null
    if (payload.exp && payload.exp * 1000 < Date.now()) return null
    return payload.sub
  } catch {
    return null
  }
}

function json(payload, status = 200) {
  const code = payload && typeof payload === 'object' && 'status' in payload && typeof payload.status === 'number' ? payload.status : status
  const body = payload && typeof payload === 'object' ? { ...payload } : { error: 'Unexpected error' }
  delete body.status
  return new Response(JSON.stringify(body), {
    status: code,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
