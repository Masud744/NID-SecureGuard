import React, { useState, useEffect } from 'react'
import { ShieldCheck, ShieldAlert, Fingerprint, Camera, RefreshCw, UserCheck, MapPin, Phone, Calendar, ArrowRight, CheckCircle2, XCircle } from 'lucide-react'
import { verifyIdentity, getCameraSnapshotUrl, fetchUsers } from '../lib/api'
import type { VerifyResponse, User } from '../types'

export const VerificationKiosk: React.FC = () => {
  const [nidInput, setNidInput] = useState('1998123456789')
  const [isLoading, setIsLoading] = useState(false)
  const [verificationResult, setVerificationResult] = useState<VerifyResponse | null>(null)
  const [citizenInfo, setCitizenInfo] = useState<User | null>(null)
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([])
  const [snapshotUrl, setSnapshotUrl] = useState(getCameraSnapshotUrl())
  const [countdown, setCountdown] = useState<number | null>(null)
  const [statusMessage, setStatusMessage] = useState('Ready for citizen authentication.')

  // Load registered citizens for quick-fill demo
  useEffect(() => {
    fetchUsers().then(users => {
      setRegisteredUsers(users)
      if (users.length > 0 && !nidInput) {
        setNidInput(users[0].nid_number)
      }
    }).catch(() => {})
  }, [])

  // Auto-refresh snapshot every 4s when idle
  useEffect(() => {
    if (isLoading) return
    const timer = setInterval(() => {
      setSnapshotUrl(getCameraSnapshotUrl())
    }, 4000)
    return () => clearInterval(timer)
  }, [isLoading])

  // Countdown timer for auto-clearing access granted screen
  useEffect(() => {
    if (countdown === null) return
    if (countdown <= 0) {
      setVerificationResult(null)
      setCitizenInfo(null)
      setCountdown(null)
      setStatusMessage('Screen reset for next citizen.')
      return
    }
    const timer = setTimeout(() => setCountdown(c => (c !== null ? c - 1 : null)), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!nidInput.trim()) return

    setIsLoading(true)
    setVerificationResult(null)
    setCitizenInfo(null)
    setStatusMessage('1/2 Analyzing face through ESP32-S3 camera...')

    try {
      const res = await verifyIdentity(nidInput.trim())
      setVerificationResult(res)

      if (res.access_decision === 'granted') {
        setStatusMessage('Biometrics matched! Decrypting citizen records...')
        // Fetch citizen profile
        const users = await fetchUsers()
        const user = users.find(u => u.nid_number === nidInput.trim())
        if (user) setCitizenInfo(user)
        setCountdown(20) // auto clear after 20 seconds
      } else {
        setStatusMessage(`Access Denied: ${res.failure_reason || 'Biometric mismatch'}`)
      }
    } catch (err: any) {
      setStatusMessage(err.message || 'Verification failed')
    } finally {
      setIsLoading(false)
      setSnapshotUrl(getCameraSnapshotUrl())
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Top Banner / NID Input */}
      <div className="bg-dark-850 rounded-2xl border border-dark-700 p-6 mb-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Biometric Verification Kiosk</h1>
            <p className="text-sm text-slate-400 mt-0.5">Dual-biometric authentication: NID + Face Match + Fingerprint Match</p>
          </div>

          {/* NID Input Form */}
          <form onSubmit={handleVerify} className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={nidInput}
                onChange={e => setNidInput(e.target.value)}
                placeholder="Enter 10-17 Digit NID..."
                className="w-64 sm:w-72 px-4 py-2.5 rounded-xl bg-dark-900 border border-dark-700 text-white font-mono text-sm placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !nidInput.trim()}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold text-sm transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>Verify</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Quick select registered demo NIDs */}
        {registeredUsers.length > 0 && (
          <div className="mt-4 pt-4 border-t border-dark-800 flex items-center gap-2 text-xs">
            <span className="text-slate-500">Registered Citizens:</span>
            <div className="flex flex-wrap gap-1.5">
              {registeredUsers.map(u => (
                <button
                  key={u.id}
                  onClick={() => setNidInput(u.nid_number)}
                  className={`px-2.5 py-1 rounded-md font-mono text-xs transition-colors ${
                    nidInput === u.nid_number
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-dark-800 text-slate-400 hover:text-slate-200 border border-dark-700'
                  }`}
                >
                  {u.full_name} ({u.nid_number})
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Verification Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Live ESP32 Camera View */}
        <div className="bg-dark-850 rounded-2xl border border-dark-700 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Camera className="w-5 h-5 text-emerald-400" />
                <h2 className="font-semibold text-white">ESP32-S3 Live Camera Feed</h2>
              </div>
              <button
                onClick={() => setSnapshotUrl(getCameraSnapshotUrl())}
                className="p-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 text-slate-400 hover:text-white transition-colors"
                title="Refresh Frame"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Video Viewport Frame */}
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-dark-900 border border-dark-700 flex items-center justify-center">
              <img
                src={snapshotUrl}
                alt="ESP32 Camera Live"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480" fill="%23111215"><text x="50%" y="50%" fill="%2364748b" font-family="sans-serif" font-size="16" text-anchor="middle">Camera Feed Standby / Connecting...</text></svg>'
                }}
              />

              {/* Target Overlay Lines */}
              <div className="absolute inset-0 pointer-events-none border border-emerald-500/20 m-6 rounded-lg">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-emerald-400 rounded-tl-sm" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-emerald-400 rounded-tr-sm" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-emerald-400 rounded-bl-sm" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-emerald-400 rounded-br-sm" />
              </div>

              {/* Active Scanning Bar when loading */}
              {isLoading && (
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-lg shadow-emerald-400/50 animate-scan-line pointer-events-none" />
              )}

              {/* Status Badge */}
              <div className="absolute bottom-3 left-3 px-3 py-1 rounded-lg bg-dark-900/80 backdrop-blur text-xs font-mono text-slate-300 border border-dark-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>OV2640 640x480</span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-dark-900/50 border border-dark-700/60 text-xs text-slate-400 flex items-center justify-between">
            <span>Face Engine: <strong>OpenCV LBPH</strong></span>
            <span>Threshold: <strong>135.0 (Distance)</strong></span>
          </div>
        </div>

        {/* Right Column: Biometric Prompts & Decision View */}
        <div className="flex flex-col gap-6">
          {/* Hardware Instruction & Scan Prompt Card */}
          <div className="bg-dark-850 rounded-2xl border border-dark-700 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Fingerprint className="w-5 h-5 text-emerald-400" />
              <h2 className="font-semibold text-white">Biometric Scanner Prompt</h2>
            </div>

            <div className="p-6 rounded-xl bg-dark-900/80 border border-dark-700/80 flex flex-col items-center justify-center text-center">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-all ${
                isLoading
                  ? 'bg-emerald-500/10 border-2 border-emerald-400 animate-pulse text-emerald-400'
                  : 'bg-dark-800 border border-dark-700 text-slate-400'
              }`}>
                <Fingerprint className="w-10 h-10" />
              </div>

              <h3 className="font-semibold text-base text-white">
                {isLoading ? 'Scanning In Progress...' : 'Ready for Scan'}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                {isLoading
                  ? 'Keep looking at the camera and hold your enrolled finger on the R307S sensor.'
                  : 'Enter the citizen NID number and click "Verify" to trigger dual-biometric authentication.'}
              </p>

              {/* Live Status Banner */}
              <div className="mt-4 w-full px-4 py-2.5 rounded-lg bg-dark-850 border border-dark-700 font-mono text-xs text-slate-300">
                {statusMessage}
              </div>
            </div>
          </div>

          {/* Decision Cards */}
          {verificationResult && (
            <div className={`rounded-2xl border p-6 transition-all ${
              verificationResult.access_decision === 'granted'
                ? 'bg-emerald-950/20 border-emerald-500/40 shadow-xl shadow-emerald-500/10'
                : 'bg-rose-950/20 border-rose-500/40 shadow-xl shadow-rose-500/10'
            }`}>
              {/* Decision Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {verificationResult.access_decision === 'granted' ? (
                    <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                      <ShieldCheck className="w-7 h-7" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/30">
                      <ShieldAlert className="w-7 h-7" />
                    </div>
                  )}

                  <div>
                    <h3 className={`text-xl font-bold tracking-tight uppercase ${
                      verificationResult.access_decision === 'granted' ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {verificationResult.access_decision === 'granted' ? 'ACCESS GRANTED' : 'ACCESS DENIED'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      NID: <span className="font-mono text-slate-200">{verificationResult.nid_number}</span>
                    </p>
                  </div>
                </div>

                {countdown !== null && (
                  <div className="text-right">
                    <span className="text-xs text-slate-400">Auto-clearing in</span>
                    <p className="font-mono text-lg font-bold text-emerald-400">{countdown}s</p>
                  </div>
                )}
              </div>

              {/* Match Diagnostics */}
              <div className="grid grid-cols-2 gap-3 my-4">
                <div className="p-3 rounded-xl bg-dark-900/60 border border-dark-700/60">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400">Face Recognition</span>
                    {verificationResult.face_result.status === 'match' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    )}
                  </div>
                  <p className="text-sm font-semibold text-white capitalize">
                    {verificationResult.face_result.status}
                  </p>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Score: {verificationResult.face_result.confidence?.toFixed(1) || 'N/A'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-dark-900/60 border border-dark-700/60">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400">Fingerprint</span>
                    {verificationResult.fingerprint_result.status === 'match' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    )}
                  </div>
                  <p className="text-sm font-semibold text-white capitalize">
                    {verificationResult.fingerprint_result.status}
                  </p>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Slot {verificationResult.fingerprint_result.template_id || 'N/A'} (acc: {verificationResult.fingerprint_result.accuracy || 0})
                  </p>
                </div>
              </div>

              {/* Failure reason if denied */}
              {verificationResult.failure_reason && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                  <strong>Security Alert:</strong> {verificationResult.failure_reason}
                </div>
              )}

              {/* Citizen Card if Granted */}
              {citizenInfo && (
                <div className="mt-4 pt-4 border-t border-emerald-500/20">
                  <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">
                    Verified Citizen Record
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400">Full Name</span>
                      <p className="font-semibold text-white text-sm mt-0.5">{citizenInfo.full_name}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Date of Birth</span>
                      <p className="font-mono text-slate-200 mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {citizenInfo.date_of_birth}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Phone</span>
                      <p className="font-mono text-slate-200 mt-0.5 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {citizenInfo.phone || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Address</span>
                      <p className="text-slate-200 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {citizenInfo.address || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
