import type { HealthStatus, User, VerifyResponse, EnrollmentStatus } from '../types'
import { supabase } from './supabase'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  try {
    const { data } = await supabase.auth.getSession()
    if (data?.session?.access_token) {
      headers['Authorization'] = `Bearer ${data.session.access_token}`
    }
  } catch {
    // fallback for unauthenticated kiosk mode
  }
  return headers
}

export async function fetchHealth(): Promise<HealthStatus> {
  const res = await fetch(`${API_BASE}/health`)
  if (!res.ok) throw new Error('Health check failed')
  return res.json()
}

export async function fetchUsers(): Promise<User[]> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}/api/v1/users`, { headers })
  if (!res.ok) throw new Error('Failed to load users')
  return res.json()
}

export async function fetchLogs(limit: number = 20): Promise<import('../types').SecurityLog[]> {
  try {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_BASE}/api/v1/logs?limit=${limit}`, { headers })
    if (res.ok) {
      return await res.json()
    }
  } catch (err) {
    console.error('Failed to fetch logs:', err)
  }
  return []
}

export async function verifyLogChain(): Promise<{
  valid: boolean
  message: string
  total_logs: number
  sealed_logs: number
  status: 'intact' | 'tampered'
}> {
  try {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_BASE}/api/v1/logs/verify-chain`, { headers })
    if (res.ok) return await res.json()
  } catch (err) {
    console.error('Failed to verify audit log chain:', err)
  }
  return {
    valid: false,
    message: 'Cryptographic ledger probe failed',
    total_logs: 0,
    sealed_logs: 0,
    status: 'tampered',
  }
}

export async function createUser(data: {
  nid_number: string
  full_name: string
  date_of_birth: string
  address?: string
  phone?: string
}): Promise<User> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}/api/v1/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to register citizen')
  }
  return res.json()
}

export async function enrollFace(userId: string, sampleCount: number = 10): Promise<EnrollmentStatus> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}/api/v1/enroll/face/${userId}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ sample_count: sampleCount }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Face enrollment failed')
  }
  return res.json()
}

export async function enrollFingerprint(userId: string, templateId: number): Promise<EnrollmentStatus> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}/api/v1/enroll/fingerprint/${userId}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ template_id: templateId }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Fingerprint enrollment failed')
  }
  return res.json()
}

export async function verifyIdentity(nidNumber: string): Promise<VerifyResponse> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}/api/v1/verify`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ nid_number: nidNumber }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Verification request failed')
  }
  return res.json()
}

export function getCameraSnapshotUrl(fresh: boolean = false): string {
  return `${API_BASE}/api/v1/device/snapshot?t=${Date.now()}${fresh ? '&fresh=true' : ''}`
}

export async function checkFaceDetection(): Promise<{ face_detected: boolean; confidence: number }> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/device/detect`)
    if (!res.ok) return { face_detected: false, confidence: 0 }
    return res.json()
  } catch {
    return { face_detected: false, confidence: 0 }
  }
}

export interface OperatorRecord {
  id: string
  email: string
  fullName: string
  badgeId: string
  stationId: string
  role: 'super_admin' | 'verification_officer' | 'registrar' | 'auditor'
  isMaster?: boolean
  registeredAt: string
}

export async function fetchPendingOperators(): Promise<OperatorRecord[]> {
  try {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_BASE}/api/v1/operators/pending`, { headers })
    if (res.ok) return await res.json()
  } catch (err) {
    console.error('Failed to fetch pending operators:', err)
  }
  return []
}

export async function fetchApprovedOperators(): Promise<OperatorRecord[]> {
  try {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_BASE}/api/v1/operators/approved`, { headers })
    if (res.ok) return await res.json()
  } catch (err) {
    console.error('Failed to fetch approved operators:', err)
  }
  return []
}

export async function apiApproveOperator(userId: string): Promise<boolean> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}/api/v1/operators/approve`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ user_id: userId }),
  })
  return res.ok
}

export async function apiRejectOperator(userId: string): Promise<boolean> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}/api/v1/operators/reject`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ user_id: userId }),
  })
  return res.ok
}
