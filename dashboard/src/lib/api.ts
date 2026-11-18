import type { HealthStatus, User, VerifyResponse, EnrollmentStatus } from '../types'

const API_BASE = ''

export async function fetchHealth(): Promise<HealthStatus> {
  const res = await fetch(`${API_BASE}/health`)
  if (!res.ok) throw new Error('Health check failed')
  return res.json()
}

export async function fetchUsers(): Promise<User[]> {
  const res = await fetch(`${API_BASE}/api/v1/users`)
  if (!res.ok) throw new Error('Failed to load users')
  return res.json()
}

export async function fetchLogs(limit: number = 20): Promise<import('../types').SecurityLog[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/logs?limit=${limit}`)
    if (res.ok) {
      return await res.json()
    }
  } catch (err) {
    console.error('Failed to fetch logs:', err)
  }
  return []
}

export async function createUser(data: {
  nid_number: string
  full_name: string
  date_of_birth: string
  address?: string
  phone?: string
}): Promise<User> {
  const res = await fetch(`${API_BASE}/api/v1/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to register citizen')
  }
  return res.json()
}

export async function enrollFace(userId: string, sampleCount: number = 10): Promise<EnrollmentStatus> {
  const res = await fetch(`${API_BASE}/api/v1/enroll/face/${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sample_count: sampleCount }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Face enrollment failed')
  }
  return res.json()
}

export async function enrollFingerprint(userId: string, templateId: number): Promise<EnrollmentStatus> {
  const res = await fetch(`${API_BASE}/api/v1/enroll/fingerprint/${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ template_id: templateId }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Fingerprint enrollment failed')
  }
  return res.json()
}

export async function verifyIdentity(nidNumber: string): Promise<VerifyResponse> {
  const res = await fetch(`${API_BASE}/api/v1/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

