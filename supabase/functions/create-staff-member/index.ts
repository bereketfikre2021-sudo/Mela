/**
 * create-staff-member — Supabase Edge Function (Deno)
 *
 * Creates a synthetic Supabase Auth account for a staff member, then inserts
 * the staff_members row. This is the ONLY place service_role is used; the
 * frontend calls this with the user's anon-key JWT in the Authorization header.
 *
 * Flow:
 *  1. Verify the caller is authenticated via their JWT.
 *  2. Verify the caller is the owner of the business.
 *  3. Check staff limit for the owner's plan.
 *  4. Create a synthetic Supabase Auth account (random password — staff never use it).
 *  5. Insert the staff_members row.
 *  6. Return the new staff member id.
 *
 * Input JSON:
 *  { owner_id, business_id, name, role, pin_hash, permissions }
 *
 * pin_hash: SHA-256 hex of the 4-digit PIN, computed client-side.
 * permissions: jsonb object with boolean permission keys.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.119.0'

const SUPABASE_URL           = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY      = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 30) || 'staff'
}

function corsHeaders(origin: string) {
  return {
    'Access-Control-Allow-Origin':  origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') ?? '*'

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    })
  }

  try {
    // 1. Verify the caller is authenticated using their JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }

    const callerJwt = authHeader.replace('Bearer ', '')

    // Client using caller's JWT (anon key + user JWT) — for identity verification
    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${callerJwt}` } },
    })

    const { data: { user: callerUser }, error: authError } = await callerClient.auth.getUser()
    if (authError || !callerUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }

    // 2. Parse input
    const body = await req.json() as {
      owner_id:    string
      business_id: string
      name:        string
      role:        string
      pin_hash:    string
      permissions: Record<string, boolean>
    }

    const { owner_id, business_id, name, role, pin_hash, permissions } = body

    if (!owner_id || !business_id || !name || !role || !pin_hash || !permissions) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }

    // Caller must be the owner
    if (callerUser.id !== owner_id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }

    // Admin client with service_role for privileged operations
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 3. Verify owner owns this business
    const { data: biz, error: bizError } = await adminClient
      .from('businesses')
      .select('id, owner_id')
      .eq('id', business_id)
      .eq('owner_id', owner_id)
      .single()

    if (bizError || !biz) {
      return new Response(JSON.stringify({ error: 'Business not found or access denied' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }

    // 4. Check staff limit via RPC
    const { data: withinLimit, error: limitError } = await callerClient
      .rpc('check_staff_limit', { p_owner_id: owner_id })

    if (limitError || !withinLimit) {
      return new Response(JSON.stringify({ error: 'Staff limit reached for your plan. Upgrade to Premium to add more staff.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }

    // 5. Build synthetic email
    const slug           = slugify(name)
    const bizPrefix      = business_id.replace(/-/g, '').substring(0, 8)
    const syntheticEmail = `${slug}-${Date.now()}.${bizPrefix}@mela.internal`

    // Random password — staff never use it directly; they authenticate via PIN switcher
    const syntheticPassword = crypto.randomUUID() + crypto.randomUUID()

    // 6. Create the synthetic Supabase Auth account
    const { data: createdUser, error: createUserError } = await adminClient.auth.admin.createUser({
      email:          syntheticEmail,
      password:       syntheticPassword,
      email_confirm:  true,   // auto-confirm — staff don't verify email
      user_metadata:  { is_staff: true, owner_id, business_id, role },
    })

    if (createUserError || !createdUser.user) {
      return new Response(JSON.stringify({ error: createUserError?.message ?? 'Failed to create auth account' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }

    // 7. Insert staff_members row
    const { data: staffMember, error: insertError } = await adminClient
      .from('staff_members')
      .insert({
        owner_id,
        business_id,
        name:            name.trim(),
        role,
        permissions,
        pin_hash,
        synthetic_email: syntheticEmail,
        auth_user_id:    createdUser.user.id,
        status:          'active',
      })
      .select('*')
      .single()

    if (insertError) {
      // Clean up the auth user if the DB insert fails
      await adminClient.auth.admin.deleteUser(createdUser.user.id)
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }

    // 8. Log the creation
    await adminClient.rpc('add_activity_log', {
      p_owner_id:     owner_id,
      p_business_id:  business_id,
      p_performed_by: null,
      p_action_type:  'staff_created',
      p_reference_id: staffMember.id,
      p_details:      JSON.stringify({ staff_name: name, role }),
    })

    return new Response(JSON.stringify({ id: staffMember.id, staff: staffMember }), {
      status: 201,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    })
  }
})
