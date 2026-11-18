import { supabase } from './supabase'

export interface OperatorProfile {
  id: string
  email: string
  fullName: string
  badgeId: string
  stationId: string
  role: 'super_admin' | 'verification_officer' | 'registrar' | 'auditor'
  createdAt?: string
}

export function extractProfileFromUser(user: any): OperatorProfile {
  const meta = user.user_metadata || {}
  return {
    id: user.id,
    email: user.email || '',
    fullName: meta.full_name || user.email?.split('@')[0] || 'Operator',
    badgeId: meta.badge_id || 'OP-001',
    stationId: meta.station_id || 'Terminal Alpha - Central Station',
    role: (meta.role as any) || 'verification_officer',
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
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error(error.message)
  }

  if (!data.user) {
    throw new Error('Authentication failed: no user returned.')
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
}): Promise<OperatorProfile> {
  const { data, error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: {
        full_name: params.fullName,
        badge_id: params.badgeId,
        station_id: params.stationId,
        role: params.role,
      },
    },
  })

  if (error) {
    throw new Error(error.message)
  }

  if (!data.user) {
    throw new Error('Registration failed: no user record created.')
  }

  return extractProfileFromUser(data.user)
}

export async function signOutOperator(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error('Sign out error:', error)
  }
}
