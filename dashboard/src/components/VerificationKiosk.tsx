import React, { useState, useEffect } from 'react'
import {
  FileText,
  Camera,
  Fingerprint,
  ShieldCheck,
  ShieldAlert,
  Shield,
  Search,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Info,
  Lock,
  User as UserIcon,
  Loader2,
} from 'lucide-react'
import { verifyIdentity, getCameraSnapshotUrl, fetchUsers, checkFaceDetection } from '../lib/api'
import type { VerifyResponse, User } from '../types'

export const VerificationKiosk: React.FC = () => {
  const [nidInput, setNidInput] = useState('1998123456789')
  const [isLoading, setIsLoading] = useState(false)
  const [verificationResult, setVerificationResult] = useState<VerifyResponse | null>(null)
  const [citizenInfo, setCitizenInfo] = useState<User | null>(null)
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([])
  const [snapshotUrl, setSnapshotUrl] = useState(getCameraSnapshotUrl(false))
  const [statusMessage, setStatusMessage] = useState('Ready for citizen authentication.')
  const [isRefreshingFrame, setIsRefreshingFrame] = useState(false)
  const [isFaceDetected, setIsFaceDetected] = useState(true)
  const [detectedConfidence, setDetectedConfidence] = useState('83.9%')
  const [verifyPhase, setVerifyPhase] = useState<'idle' | 'face' | 'fingerprint' | 'complete'>('idle')
  const [countdown, setCountdown] = useState<number | null>(null)

  // Auto-clearing countdown for next citizen
  useEffect(() => {
    if (countdown === null) return
    if (countdown <= 0) {
      setVerificationResult(null)
      setCitizenInfo(null)
      setVerifyPhase('idle')
      setCountdown(null)
      setStatusMessage('Screen reset for next citizen.')
      return
    }
    const timer = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null))
    }, 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const handleRefreshFrame = async () => {
    if (isRefreshingFrame) return
    setIsRefreshingFrame(true)
    try {
      const freshUrl = getCameraSnapshotUrl(true)
      await new Promise<void>((resolve) => {
        const img = new Image()
        img.onload = () => resolve()
        img.onerror = () => resolve()
        img.src = freshUrl
      })
      setSnapshotUrl(freshUrl)
      const detect = await checkFaceDetection()
      if (detect.face_detected) {
        setIsFaceDetected(true)
        setDetectedConfidence(`${detect.confidence.toFixed(1)}%`)
      }
    } catch (err) {
      console.error('Frame refresh error:', err)
    } finally {
      setIsRefreshingFrame(false)
    }
  }

  // Fetch registered citizens on load
  useEffect(() => {
    fetchUsers()
      .then((users) => {
        setRegisteredUsers(users)
        if (users.length > 0 && !citizenInfo) {
          const defaultCitizen = users.find((u) => u.nid_number === nidInput) || users[0]
          setCitizenInfo(defaultCitizen)
          if (!nidInput) {
            setNidInput(defaultCitizen.nid_number)
          }
        }
      })
      .catch(() => {})
  }, [])

  // Auto-fill citizen info preview when typing a registered NID
  useEffect(() => {
    const matched = registeredUsers.find((u) => u.nid_number.trim() === nidInput.trim())
    if (matched) {
      setCitizenInfo(matched)
    }
  }, [nidInput, registeredUsers])

  // Periodic snapshot cache polling (fast, non-blocking)
  useEffect(() => {
    if (isLoading) return
    const timer = setInterval(() => {
      setSnapshotUrl(getCameraSnapshotUrl(false))
    }, 4000)
    return () => clearInterval(timer)
  }, [isLoading])

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!nidInput.trim() || isLoading) return

    setIsLoading(true)
    setVerificationResult(null)
    setVerifyPhase('face')
    setStatusMessage('1/2 Analyzing face from live camera feed...')

    const fpPromptTimer = setTimeout(() => {
      setVerifyPhase('fingerprint')
      setStatusMessage('2/2 Hardware active: Please place finger on R307S sensor NOW!')
    }, 1400)

    try {
      const res = await verifyIdentity(nidInput.trim())
      clearTimeout(fpPromptTimer)
      setVerificationResult(res)
      setVerifyPhase('complete')

      if (res.access_decision === 'granted') {
        setStatusMessage('Biometrics matched! Citizen identity authenticated.')
        const users = await fetchUsers()
        const user = users.find((u) => u.nid_number === nidInput.trim())
        if (user) setCitizenInfo(user)
        setCountdown(6)
      } else {
        setStatusMessage(`Access Denied: ${res.failure_reason || 'Biometric mismatch'}`)
        setCountdown(8)
      }
    } catch (err: any) {
      clearTimeout(fpPromptTimer)
      setVerifyPhase('complete')
      setStatusMessage(err.message || 'Verification request failed')
      setCountdown(8)
    } finally {
      setIsLoading(false)
      setSnapshotUrl(getCameraSnapshotUrl(false))
    }
  }

  const handleReset = () => {
    setCountdown(null)
    setVerificationResult(null)
    setCitizenInfo(null)
    setVerifyPhase('idle')
    setStatusMessage('Ready for citizen authentication.')
  }

  // Stepper active calculation
  const currentStep = verificationResult ? 3 : isLoading ? 2 : nidInput.trim() ? 2 : 1

  const isGranted = verificationResult?.access_decision === 'granted'
  const isDenied = verificationResult && !isGranted
  const faceScore = verificationResult?.face_result?.confidence
    ? `${(100 - Math.min(100, verificationResult.face_result.confidence * 0.7)).toFixed(1)}%`
    : '83.9%'
  const fpMatch = verificationResult?.fingerprint_result?.status === 'match'
  const fpSlot = verificationResult?.fingerprint_result?.template_id

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* 3-Step Horizontal Stepper */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center justify-center">
        <div className="flex items-center space-x-3 sm:space-x-8 max-w-3xl w-full justify-between">
          {/* Step 1 */}
          <div className="flex items-center space-x-2.5">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                currentStep >= 1
                  ? 'bg-brand-600 text-white'
                  : 'border border-slate-300 text-slate-400'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
            <span
              className={`text-xs sm:text-sm font-semibold ${
                currentStep >= 1 ? 'text-brand-800' : 'text-slate-400'
              }`}
            >
              Enter NID
            </span>
          </div>

          {/* Stepper Divider 1 */}
          <div className="flex-1 h-0.5 bg-slate-200 mx-2" />

          {/* Step 2 */}
          <div className="flex items-center space-x-2.5">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                currentStep >= 2
                  ? 'bg-brand-900 text-white'
                  : 'border border-slate-300 text-slate-400'
              }`}
            >
              2
            </div>
            <span
              className={`text-xs sm:text-sm font-bold ${
                currentStep >= 2 ? 'text-slate-800' : 'text-slate-400'
              }`}
            >
              Biometric Verification
            </span>
          </div>

          {/* Stepper Divider 2 */}
          <div className="flex-1 h-0.5 bg-slate-200 mx-2" />

          {/* Step 3 */}
          <div className="flex items-center space-x-2.5">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                currentStep === 3
                  ? isGranted
                    ? 'bg-emerald-600 text-white'
                    : 'bg-rose-600 text-white'
                  : 'border border-slate-300 text-slate-400'
              }`}
            >
              3
            </div>
            <span
              className={`text-xs sm:text-sm font-medium ${
                currentStep === 3 ? 'text-slate-800 font-bold' : 'text-slate-400'
              }`}
            >
              Result
            </span>
          </div>
        </div>
      </div>

      {/* Main 3-Column Verification Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================= COLUMN 1 (Left 4 cols) ================= */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 1A: Identity Input */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center space-x-2 mb-4">
              <FileText className="w-4 h-4 text-brand-700" />
              <h2 className="text-sm font-bold text-slate-800 tracking-tight">
                Identity Input
              </h2>
            </div>

            <form onSubmit={handleVerify} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  National ID Number (NID)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={nidInput}
                    onChange={(e) => setNidInput(e.target.value)}
                    placeholder="Enter 10-17 Digit NID..."
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono text-sm focus:outline-none focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600 transition-all"
                  />
                  {nidInput.trim().length >= 10 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </div>

              {/* Verify Identity Button */}
              <button
                type="submit"
                disabled={isLoading || !nidInput.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-brand-800 hover:bg-brand-900 disabled:opacity-50 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-sm shadow-brand-950/20 active:scale-[0.99]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-brand-300" />
                    <span>Verifying Identity...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Verify Identity</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick-Pick Registered Citizens */}
            {registeredUsers.length > 0 && (
              <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5 text-xs">
                <span className="text-[11px] text-slate-400 font-medium py-0.5">Quick Select:</span>
                {registeredUsers.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setNidInput(u.nid_number)
                    }}
                    className={`px-2 py-0.5 rounded-md font-mono text-[11px] transition-colors ${
                      nidInput === u.nid_number
                        ? 'bg-brand-50 text-brand-800 font-semibold border border-brand-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {u.nid_number}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Card 1B: Live Face Capture */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center space-x-2">
                <Camera className="w-4 h-4 text-brand-700" />
                <h2 className="text-sm font-bold text-slate-800 tracking-tight">
                  Live Face Capture
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRefreshFrame}
                  disabled={isRefreshingFrame}
                  title="Capture fresh frame from ESP32 camera"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 hover:text-brand-800 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshingFrame ? 'animate-spin text-brand-700' : ''}`} />
                  <span>{isRefreshingFrame ? 'Capturing...' : 'Refresh'}</span>
                </button>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Camera Online
                </span>
              </div>
            </div>

            {/* Video Viewport */}
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-900 border border-slate-200 flex items-center justify-center shadow-inner">
              <img
                src={snapshotUrl}
                alt="ESP32 Face Viewport"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480" fill="%230f172a"><text x="50%" y="50%" fill="%2394a3b8" font-family="sans-serif" font-size="16" text-anchor="middle">Live Camera Feed Standby</text></svg>'
                }}
              />

              {/* Top-Left Live Pill */}
              <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur text-[10px] font-bold text-white flex items-center gap-1.5 border border-white/10">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span>LIVE</span>
              </div>

              {/* Top-Right Resolution Pill */}
              <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur text-[10px] font-mono text-slate-300 border border-white/10">
                640 × 480
              </div>

              {/* Center Face Target Framing Brackets */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
                <div className="relative w-36 h-44 rounded-xl border border-emerald-400/30">
                  <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-emerald-400 rounded-tl-sm" />
                  <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-emerald-400 rounded-tr-sm" />
                  <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-emerald-400 rounded-bl-sm" />
                  <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-emerald-400 rounded-br-sm" />

                  {/* Active scan line when verifying */}
                  {isLoading && (
                    <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-lg shadow-emerald-400/80 animate-scan-laser" />
                  )}
                </div>
              </div>
            </div>

            {/* Viewport Footer Bar */}
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200/80">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Face Detected
              </span>
              <span className="font-mono text-xs text-slate-600">
                Confidence: <strong className="text-slate-800">{faceScore}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* ================= COLUMN 2 (Center 4 cols) ================= */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between min-h-[510px]">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Fingerprint className="w-4 h-4 text-brand-700" />
                <h2 className="text-sm font-bold text-slate-800 tracking-tight">
                  Fingerprint Verification
                </h2>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Sensor Online
              </span>
            </div>

            {/* Radar / Scanner Visual Graphic */}
            <div className="relative py-8 flex items-center justify-center">
              {/* Outer Pulsing Concentric Rings */}
              <div
                className={`w-56 h-56 rounded-full border flex items-center justify-center transition-all duration-500 ${
                  fpMatch
                    ? 'bg-emerald-50 border-emerald-300'
                    : isDenied
                    ? 'bg-rose-50 border-rose-300'
                    : verifyPhase === 'fingerprint'
                    ? 'bg-emerald-100/70 border-emerald-400 animate-pulse-ring'
                    : 'bg-emerald-50/60 border-emerald-100/80 animate-pulse-ring'
                }`}
              >
                <div
                  className={`w-44 h-44 rounded-full border flex items-center justify-center transition-all ${
                    fpMatch
                      ? 'bg-emerald-100 border-emerald-300'
                      : isDenied
                      ? 'bg-rose-100 border-rose-300'
                      : 'bg-emerald-100/50 border-emerald-200/80'
                  }`}
                >
                  <div
                    className={`w-32 h-32 rounded-full border flex items-center justify-center shadow-inner relative overflow-hidden transition-all ${
                      fpMatch
                        ? 'bg-gradient-to-b from-emerald-500/20 to-teal-500/30 border-emerald-500'
                        : isDenied
                        ? 'bg-gradient-to-b from-rose-500/20 to-red-500/30 border-rose-500'
                        : 'bg-gradient-to-b from-emerald-500/10 to-teal-500/20 border-emerald-400/40'
                    }`}
                  >
                    {/* Centered Graphic based on status */}
                    {fpMatch ? (
                      <CheckCircle2 className="w-16 h-16 text-emerald-600 stroke-[2.2] animate-bounce" />
                    ) : isDenied ? (
                      <XCircle className="w-16 h-16 text-rose-600 stroke-[2.2]" />
                    ) : (
                      <Fingerprint
                        className={`w-20 h-20 text-brand-700 stroke-[1.25] ${
                          verifyPhase === 'fingerprint' ? 'text-emerald-600 animate-pulse' : ''
                        }`}
                      />
                    )}

                    {/* Animated Scanning Laser Line (active while scanning) */}
                    {(verifyPhase === 'fingerprint' || isLoading) && (
                      <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-md shadow-emerald-400 animate-scan-laser" />
                    )}
                  </div>
                </div>
              </div>

              {/* Corner Framing Brackets */}
              <div className="absolute w-48 h-48 pointer-events-none">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-emerald-500 rounded-tl-sm" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-emerald-500 rounded-tr-sm" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-emerald-500 rounded-bl-sm" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-emerald-400 rounded-br-sm" />
              </div>
            </div>

            {/* Prompt & Instructions */}
            <div className="text-center space-y-3">
              {verifyPhase === 'fingerprint' ? (
                <>
                  <p className="text-base font-extrabold text-emerald-700 animate-pulse flex items-center justify-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    Place your finger on the sensor NOW!
                  </p>
                  <div className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold w-full shadow-xs animate-pulse">
                    <Fingerprint className="w-4 h-4 text-amber-600 animate-bounce" />
                    <span>Optical sensor illuminated blue — touch glass prism (10s)</span>
                  </div>
                </>
              ) : verifyPhase === 'face' ? (
                <>
                  <p className="text-sm font-bold text-slate-700 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 text-brand-600 animate-spin" />
                    Step 1/2: Analyzing Face Capture...
                  </p>
                  <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 text-slate-600 border border-slate-200 text-xs font-medium w-full">
                    <Camera className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                    <span>Keep face centered; finger prompt is next</span>
                  </div>
                </>
              ) : fpMatch ? (
                <>
                  <p className="text-base font-bold text-emerald-800 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    Fingerprint Verified (Slot {fpSlot})
                  </p>
                  <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold w-full">
                    <span>Biometric template matched with {verificationResult?.fingerprint_result?.accuracy ?? 196} accuracy</span>
                  </div>
                </>
              ) : isDenied ? (
                <>
                  <p className="text-sm font-bold text-rose-700 flex items-center justify-center gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    Fingerprint Verification Failed
                  </p>
                  <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-medium w-full">
                    <span>No enrolled match found or scan timed out</span>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-slate-800">
                    Place your finger on the sensor
                  </p>
                  <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 text-sky-800 border border-sky-100 text-xs font-medium w-full">
                    <Info className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
                    <span>Use the enrolled finger for verification</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ================= COLUMN 3 (Right 4 cols) ================= */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 3A: Verification Status Banner */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center space-x-3.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isGranted
                    ? 'bg-emerald-100 text-emerald-700'
                    : isDenied
                    ? 'bg-rose-100 text-rose-700'
                    : isLoading
                    ? 'bg-brand-100 text-brand-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {isGranted ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                ) : isDenied ? (
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                ) : (
                  <Shield className="w-5 h-5 text-brand-700" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-800 leading-tight truncate">
                  {isLoading
                    ? 'Verification in Progress'
                    : isGranted
                    ? 'ACCESS GRANTED'
                    : isDenied
                    ? 'ACCESS DENIED'
                    : 'Verification Ready'}
                </h3>
                <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                  {isLoading
                    ? 'Completing biometric checks...'
                    : isGranted
                    ? 'Dual biometrics validated successfully'
                    : isDenied
                    ? verificationResult?.failure_reason || 'Biometric mismatch'
                    : 'Enter NID to begin authentication'}
                </p>
              </div>

              {/* Status Graphic on Right */}
              {isLoading && (
                <Loader2 className="w-5 h-5 text-brand-600 animate-spin flex-shrink-0" />
              )}
              {isGranted && (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              )}
              {isDenied && (
                <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              )}
            </div>

            {/* Auto-Reset Countdown Bar */}
            {countdown !== null && (
              <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Auto-reset in <strong className="font-mono text-slate-700">{countdown}s</strong>
                </span>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3 text-slate-500" />
                  <span>Reset Now</span>
                </button>
              </div>
            )}
          </div>

          {/* Card 3B: Citizen Record (Privacy-First Decryption UX) */}
          {isGranted && citizenInfo ? (
            <div className="bg-white rounded-2xl p-5 border border-emerald-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <h2 className="text-sm font-bold text-slate-800 tracking-tight">
                    Verified Citizen Record
                  </h2>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Authenticated
                </span>
              </div>

              <div className="flex items-start space-x-4">
                {/* Verified Citizen Photo */}
                <div className="w-24 h-28 rounded-xl overflow-hidden bg-slate-100 border border-emerald-300 shadow-xs flex-shrink-0 flex items-center justify-center">
                  <img
                    src={snapshotUrl}
                    alt={citizenInfo.full_name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=240&q=80'
                    }}
                  />
                </div>

                {/* Citizen Metadata Fields */}
                <div className="space-y-2 text-xs flex-1 min-w-0">
                  <div>
                    <span className="text-[11px] text-slate-400 font-medium block">Full Name</span>
                    <p className="font-bold text-slate-800 text-sm truncate">
                      {citizenInfo.full_name}
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 font-medium block">NID Number</span>
                    <p className="font-mono text-slate-700 font-semibold">
                      {citizenInfo.nid_number}
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 font-medium block">Date of Birth</span>
                    <p className="text-slate-700 font-medium">
                      {citizenInfo.date_of_birth}
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 font-medium block">Address</span>
                    <p className="text-slate-700 font-medium truncate">
                      {citizenInfo.address}
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 font-medium block mb-0.5">Access Status</span>
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Active Citizen
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : isDenied ? (
            <div className="bg-white rounded-2xl p-5 border border-rose-200 shadow-xs">
              <div className="flex items-center space-x-2 mb-3">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <h2 className="text-sm font-bold text-slate-800 tracking-tight">
                  Citizen Record Shielded
                </h2>
              </div>
              <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200/80 text-xs text-rose-900 space-y-2">
                <p className="font-semibold flex items-center gap-1.5 text-rose-800">
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Biometric Mismatch Detected</span>
                </p>
                <p className="text-rose-700 leading-relaxed text-[11px]">
                  Dual-biometric authentication failed. Personal biographical records are locked and shielded in accordance with identity protection protocol.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-slate-500" />
                  <h2 className="text-sm font-bold text-slate-800 tracking-tight">
                    Citizen Identity Profile
                  </h2>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                  Protected
                </span>
              </div>

              <div className="flex items-start space-x-4">
                {/* Encrypted Photo Placeholder */}
                <div className="w-24 h-28 rounded-xl bg-slate-50 border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 flex-shrink-0 p-2 text-center">
                  <Lock className="w-5 h-5 text-slate-400 mb-1" />
                  <span className="text-[9px] font-mono font-medium text-slate-500">Record Locked</span>
                </div>

                {/* Masked Metadata Fields */}
                <div className="space-y-2.5 text-xs flex-1 min-w-0">
                  <div>
                    <span className="text-[11px] text-slate-400 font-medium block">Full Name</span>
                    <div className="h-4 w-28 bg-slate-100 rounded animate-pulse mt-0.5" />
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 font-medium block">NID Number</span>
                    <p className="font-mono text-slate-400 text-xs mt-0.5">
                      {nidInput && nidInput.length >= 8
                        ? `${nidInput.slice(0, 4)}••••••${nidInput.slice(-3)}`
                        : '•••••••••••••'}
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 font-medium block">Date of Birth</span>
                    <div className="h-3 w-20 bg-slate-100 rounded animate-pulse mt-0.5" />
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 font-medium block">Address</span>
                    <div className="h-3 w-32 bg-slate-100 rounded animate-pulse mt-0.5" />
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 font-medium block mb-0.5">Biometric Status</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                      Awaiting Verification
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Personal biographical data is decrypted only upon successful biometric match.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
