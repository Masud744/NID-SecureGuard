import { supabase } from './supabase'

export const MASTER_ADMIN_EMAIL = 'hasan.ire.uftb@gmail.com'
export const MASTER_ADMIN_NAME = 'Mahmudul Hasan'

export interface OperatorProfile {
  id: string
  email: string
  fullName: string
  badgeId: string
  stationId: string
  role: 'super_admin' | 'verification_officer' | 'registrar' | 'auditor'
  isMaster?: boolean
  isApproved?: boolean
  createdAt?: string
}

export interface PendingOperatorRequest {
  id: string
  email: string
  fullName: string
  badgeId: string
  stationId: string
  role: 'super_admin' | 'verification_officer' | 'registrar' | 'auditor'
  registeredAt: string
}

const APPROVED_LIST_KEY = 'nid_secureguard_approved_operators_list'
const PENDING_LIST_KEY = 'nid_secureguard_pending_operators_list'

export function isMasterAdmin(email?: string | null): boolean {
  if (!email) return false
  return email.trim().toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()
}

export function getApprovedOperators(): Set<string> {
  try {
    const raw = localStorage.getItem(APPROVED_LIST_KEY)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) {
        return new Set(arr.map((e: string) => e.toLowerCase()))
      }
    }
  } catch (e) {
    console.error('Failed to get approved operators:', e)
  }
  return new Set([MASTER_ADMIN_EMAIL.toLowerCase(), 'admin@secureguard.gov.bd'])
}

export function saveApprovedOperators(set: Set<string>) {
  try {
    localStorage.setItem(APPROVED_LIST_KEY, JSON.stringify(Array.from(set)))
  } catch (e) {
    console.error('Failed to save approved operators:', e)
  }
}

export function getPendingOperatorRequests(): PendingOperatorRequest[] {
  try {
    const raw = localStorage.getItem(PENDING_LIST_KEY)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) return arr
    }
  } catch (e) {
    console.error('Failed to get pending operators:', e)
  }
  return []
}

export function addPendingOperatorRequest(req: PendingOperatorRequest) {
  try {
    const list = getPendingOperatorRequests().filter((r) => r.email.toLowerCase() !== req.email.toLowerCase())
    list.push(req)
    localStorage.setItem(PENDING_LIST_KEY, JSON.stringify(list))
  } catch (e) {
    console.error('Failed to add pending operator:', e)
  }
}

export function approveOperatorRequest(email: string) {
  const approved = getApprovedOperators()
  approved.add(email.toLowerCase())
  saveApprovedOperators(approved)

  // Remove from pending
  const list = getPendingOperatorRequests().filter((r) => r.email.toLowerCase() !== email.toLowerCase())
  localStorage.setItem(PENDING_LIST_KEY, JSON.stringify(list))
}

export function rejectOperatorRequest(email: string) {
  const list = getPendingOperatorRequests().filter((r) => r.email.toLowerCase() !== email.toLowerCase())
  localStorage.setItem(PENDING_LIST_KEY, JSON.stringify(list))

  const approved = getApprovedOperators()
  approved.delete(email.toLowerCase())
  saveApprovedOperators(approved)
}

export function isOperatorApproved(email: string, metaApproved?: boolean): boolean {
  if (isMasterAdmin(email)) return true
  if (metaApproved === true) return true
  const approvedSet = getApprovedOperators()
  return approvedSet.has(email.toLowerCase())
}

export function extractProfileFromUser(user: any): OperatorProfile {
  const meta = user.user_metadata || {}
  const email = user.email || ''
  const isMaster = isMasterAdmin(email)

  return {
    id: user.id,
    email: email,
    fullName: isMaster ? MASTER_ADMIN_NAME : meta.full_name || email.split('@')[0] || 'Operator',
    badgeId: isMaster ? 'SEC-MASTER-01' : meta.badge_id || 'OP-001',
    stationId: isMaster ? 'National Command Center - HQ' : meta.station_id || 'Terminal Alpha - Central Station',
    role: isMaster ? 'super_admin' : (meta.role as any) || 'verification_officer',
    isMaster,
    isApproved: isMaster ? true : isOperatorApproved(email, meta.is_approved),
    createdAt: user.created_at,
  }
}

export async function getCurrentOperator(): Promise<OperatorProfile | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return null
    return extractProfileFromUser(session.user)
  } catch (err) {
    console.error('Failed to get current operator:', err)
    return null
  }
}

export async function signInOperator(email: string, password: string): Promise<OperatorProfile> {
  const cleanEmail = email.trim()
  const isMaster = isMasterAdmin(cleanEmail)

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  })

  if (error) {
    if (error.message.toLowerCase().includes('email not confirmed')) {
      throw new Error(
        'Email verification required: Please verify the confirmation link sent to your Gmail inbox before logging in.'
      )
    }
    throw new Error(error.message)
  }

  if (!data.user) {
    throw new Error('Authentication failed: no user returned.')
  }

  // Enforce Email Verification for non-master accounts
  if (!isMaster && !data.user.email_confirmed_at) {
    await supabase.auth.signOut()
    throw new Error(
      'Email verification required: Your email address has not been confirmed yet. Please click the verification link in your Gmail inbox before accessing the system.'
    )
  }

  // Enforce Master Admin Approval for non-master accounts
  if (!isMaster) {
    const approved = isOperatorApproved(cleanEmail, data.user.user_metadata?.is_approved)
    if (!approved) {
      await supabase.auth.signOut()
      throw new Error(
        `Account Pending Authorization: Your email has been verified, but your operator account requires authorization from Master Administrator (${MASTER_ADMIN_NAME} - ${MASTER_ADMIN_EMAIL}). You cannot access the console until approved.`
      )
    }
  }

  return extractProfileFromUser(data.user)
}

export async function signUpOperator(params: {
  email: string
  password: string
  fullName: string
  badgeId: string
  stationId: string
  role: 'super_admin' | 'verification_officer' | 'registrar' | 'auditor'
}): Promise<{ user: any; requiresEmailConfirmation: boolean }> {
  const cleanEmail = params.email.trim()
  const isMaster = isMasterAdmin(cleanEmail)

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password: params.password,
    options: {
      emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}` : undefined,
      data: {
        full_name: isMaster ? MASTER_ADMIN_NAME : params.fullName,
        badge_id: isMaster ? 'SEC-MASTER-01' : params.badgeId,
        station_id: isMaster ? 'National Command Center - HQ' : params.stationId,
        role: isMaster ? 'super_admin' : params.role,
        is_master: isMaster,
        is_approved: isMaster,
      },
    },
  })

  if (error) {
    throw new Error(error.message)
  }

  if (!data.user) {
    throw new Error('Registration failed: no user record created.')
  }

  // Register in pending queue if not master admin
  if (!isMaster) {
    addPendingOperatorRequest({
      id: data.user.id,
      email: cleanEmail,
      fullName: params.fullName,
      badgeId: params.badgeId,
      stationId: params.stationId,
      role: params.role,
      registeredAt: new Date().toISOString(),
    })
  }

  return {
    user: data.user,
    requiresEmailConfirmation: !data.user.email_confirmed_at,
  }
}

export async function signOutOperator(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error('Sign out error:', error)
  }
}
