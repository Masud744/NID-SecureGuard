export interface User {
  id: string
  nid_number: string
  full_name: string
  date_of_birth: string
  address?: string | null
  phone?: string | null
  status: 'pending' | 'active' | 'suspended'
  created_at: string
  updated_at?: string
  face_profiles?: {
    id: string
    model_label: number
    status: string
    samples_folder?: string
    enrolled_at?: string
  } | null
  fingerprint_records?: Array<{
    id: string
    template_id: number
    status: string
    enrolled_at?: string
  }> | {
    id: string
    template_id: number
    status: string
  } | null
}

export interface SecurityLog {
  id: string
  user_id?: string | null
  nid_number?: string | null
  face_result?: string | null
  face_confidence?: number | null
  fingerprint_result?: string | null
  fingerprint_template_id?: number | null
  access_decision: 'granted' | 'denied'
  failure_reason?: string | null
  ip_address?: string | null
  created_at: string
}

export interface HealthStatus {
  status: string
  device_online: boolean
  mode?: string | null
  camera?: boolean | null
  fingerprint_sensor?: boolean | null
  device_ip?: string | null
}

export interface VerifyResponse {
  access_decision: 'granted' | 'denied'
  nid_number: string
  face_result: {
    label?: number
    confidence?: number
    status: string
  }
  fingerprint_result: {
    template_id?: number | null
    accuracy?: number
    status: string
    message?: string
  }
  failure_reason?: string | null
  timestamp: string
}

export interface EnrollmentStatus {
  user_id: string
  face_enrolled: boolean
  fingerprint_enrolled: boolean
  fully_registered: boolean
}

