import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PEOPLE = ['faculty', 'receptionist', 'counsellor', 'accountant', 'student']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

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
    const { data: actor } = await admin.from('profiles').select('role, is_active').eq('id', userId).single()
    if (!actor?.is_active || !['admin', 'receptionist'].includes(actor.role)) {
      return json({ error: 'Only an admin or receptionist can manage people.' }, 403)
    }

    const body = await req.json()
    if (body.action === 'access') return json(await setAccess(admin, userId, body))

    const role = String(body.role || '')
    if (!PEOPLE.includes(role)) return json({ error: 'This role cannot be created here.' }, 400)

    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')
    const fullName = String(body.full_name || body.name || '').trim()
    if (!email || !fullName) return json({ error: 'Name and email are required.' }, 400)
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return json({ error: 'Password must be at least 8 characters and include a letter and a number.' }, 400)
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })
    if (createError || !created.user) return json({ error: createError?.message || 'Could not create the login.' }, 400)

    const id = created.user.id
    const { error: profileError } = await admin.from('profiles').insert({
      id,
      full_name: fullName,
      email,
      phone: String(body.phone || ''),
      role,
      is_active: true,
    })
    if (profileError) return json({ error: profileError.message }, 400)

    if (role === 'faculty') {
      const { error } = await admin.from('faculty').insert({
        profile_id: id,
        designation: body.designation || 'Trainer',
        qualification: body.qualification || '',
        specialization: body.specialization || '',
        status: 'active',
      })
      if (error) return json({ error: error.message }, 400)
    }
    if (role === 'receptionist') await admin.from('receptionists').insert({ profile_id: id, shift: body.shift || 'Morning' })
    if (role === 'counsellor') await admin.from('counsellors').insert({ profile_id: id, focus: body.focus || 'Admissions' })
    if (role === 'accountant') await admin.from('accountants').insert({ profile_id: id, desk: 'Accounts' })

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

async function setAccess(admin, actorId, body) {
  const userId = String(body.user_id || '')
  const active = Boolean(body.active)
  if (!userId) return { error: 'Choose a person first.', status: 400 }
  if (userId === actorId) return { error: 'You cannot change your own access.', status: 400 }

  const { data: target } = await admin.from('profiles').select('id, role, full_name').eq('id', userId).single()
  if (!target) return { error: 'This person does not have a login yet. Add them again.', status: 400 }
  if (target.role === 'admin') return { error: 'Admin access cannot be removed here.', status: 403 }

  const { error: banError } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: active ? 'none' : '876600h',
  })
  if (banError) return { error: banError.message, status: 400 }

  const { error: profileError } = await admin.from('profiles').update({ is_active: active }).eq('id', userId)
  if (profileError) return { error: profileError.message, status: 400 }

  if (target.role === 'faculty') {
    await admin.from('faculty').update({ status: active ? 'active' : 'inactive' }).eq('profile_id', userId)
  }

  await admin.from('activity_logs').insert({
    actor_id: actorId,
    action: `${active ? 'Restored' : 'Removed'} access for ${target.full_name}`,
    entity: target.role,
    entity_id: userId,
  })

  return { id: userId, active }
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
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
