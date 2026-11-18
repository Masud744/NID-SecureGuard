import React, { useState, useEffect } from 'react'
import {
  UserPlus,
  Users,
  Camera,
  Fingerprint,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  FileText,
  Check,
  Loader2,
  Calendar,
  Phone,
  MapPin,
  CreditCard,
  User as UserIcon,
  Sparkles,
  Zap,
  Cpu,
  Layers,
  Info,
} from 'lucide-react'
import { createUser, enrollFace, enrollFingerprint, getCameraSnapshotUrl } from '../lib/api'
import type { User } from '../types'

interface RegistrationStudioProps {
  onRegistered?: () => void
  onNavigate?: (tab: any) => void
}

export const RegistrationStudio: React.FC<RegistrationStudioProps> = ({
  onRegistered,
  onNavigate,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [formData, setFormData] = useState({
    nid_number: '',
    full_name: '',
    date_of_birth: '1998-05-15',
    phone: '+8801700000000',
    address: 'Dhaka, Bangladesh',
  })
  const [createdUser, setCreatedUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [statusText, setStatusText] = useState('')
  const [templateSlot, setTemplateSlot] = useState(5)
  const [snapshotUrl, setSnapshotUrl] = useState(getCameraSnapshotUrl(false))

  // Refresh preview from cache every 4s when on Step 2
  useEffect(() => {
    if (step !== 2 || isLoading) return
    const timer = setInterval(() => {
      setSnapshotUrl(getCameraSnapshotUrl(false))
    }, 4000)
    return () => clearInterval(timer)
  }, [step, isLoading])

  // Step 1: Submit Bio-Data Form
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMsg(null)
    setStatusText('Registering citizen biographical record in database...')

    try {
      const user = await createUser(formData)
      setCreatedUser(user)
      setStep(2)
      setStatusText('Citizen record created. Please proceed to facial capture.')
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Step 2: Trigger Live Face Capture from ESP32
  const handleFaceEnroll = async () => {
    if (!createdUser) return
    setIsLoading(true)
    setErrorMsg(null)
    setStatusText('Capturing multi-frame face samples from ESP32 camera & training LBPH recognizer...')

    try {
      await enrollFace(createdUser.id, 5)
      setStep(3)
      setStatusText('Facial profile enrolled and model weights saved!')
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setIsLoading(false)
      setSnapshotUrl(getCameraSnapshotUrl(false))
    }
  }

  // Step 3: Trigger Fingerprint Enrollment on Hardware
  const handleFingerprintEnroll = async () => {
    if (!createdUser) return
    setIsLoading(true)
    setErrorMsg(null)
    setStatusText(
      'R307S Blue Optical LED Active: Place finger on glass prism (Scan 1), lift, and place again (Scan 2)...'
    )

    try {
      await enrollFingerprint(createdUser.id, templateSlot)
      setStep(4)
      setStatusText('Fingerprint enrolled successfully! Citizen biometric profile is now active.')
      if (onRegistered) onRegistered()
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const isNidValid = formData.nid_number.trim().length >= 10

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-5">
      {/* 1. Header Toolbar with Unified Title */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200/80 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-brand-700" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <span>Biometric Enrollment Studio</span>
              <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-800 border border-brand-200 text-xs font-mono font-semibold">
                Step {step} of 3
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Multi-modal onboarding: Biographical registration, OpenCV LBPH facial training, and R307S hardware fingerprint capture.
            </p>
          </div>
        </div>

        {createdUser && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono">
            <span className="text-slate-400">Target Citizen:</span>
            <strong className="text-slate-800 font-bold">{createdUser.full_name}</strong>
            <span className="text-brand-700 font-semibold">({createdUser.nid_number})</span>
          </div>
        )}
      </div>

      {/* 2. Top Interactive Step Progress Tracker */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/80 shadow-xs">
        <div className="grid grid-cols-3 gap-3">
          {/* Step 1 Pill */}
          <div
            className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${
              step >= 1
                ? 'bg-brand-50/70 border-brand-200 text-slate-800'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                step > 1
                  ? 'bg-brand-800 text-white'
                  : 'bg-brand-100 text-brand-800 border border-brand-300'
              }`}
            >
              {step > 1 ? <Check className="w-4 h-4 text-white" /> : '1'}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-xs truncate">1. Citizen Bio-Data</p>
              <p className="text-[10px] text-slate-400 truncate">Personal & Contact Info</p>
            </div>
          </div>

          {/* Step 2 Pill */}
          <div
            className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${
              step >= 2
                ? 'bg-brand-50/70 border-brand-200 text-slate-800'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                step > 2
                  ? 'bg-brand-800 text-white'
                  : step === 2
                  ? 'bg-brand-100 text-brand-800 border border-brand-300'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {step > 2 ? <Check className="w-4 h-4 text-white" /> : '2'}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-xs truncate">2. Facial Model</p>
              <p className="text-[10px] text-slate-400 truncate">OpenCV LBPH Training</p>
            </div>
          </div>

          {/* Step 3 Pill */}
          <div
            className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${
              step >= 3
                ? 'bg-brand-50/70 border-brand-200 text-slate-800'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                step === 4
                  ? 'bg-brand-800 text-white'
                  : step === 3
                  ? 'bg-brand-100 text-brand-800 border border-brand-300'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {step === 4 ? <Check className="w-4 h-4 text-white" /> : '3'}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-xs truncate">3. Fingerprint Template</p>
              <p className="text-[10px] text-slate-400 truncate">R307S Optical Flash</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert Banner */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 shadow-2xs">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold">Enrollment Operation Failed</p>
            <p className="mt-0.5 text-rose-700">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* 3. Main 2-Column Enrollment Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ================= LEFT MAIN WORKSPACE (8 cols) ================= */}
        <div className="lg:col-span-8">
          {/* STEP 1: Bio Data Form */}
          {step === 1 && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
              <div className="flex items-center space-x-2.5 pb-4 border-b border-slate-100">
                <FileText className="w-5 h-5 text-brand-700" />
                <div>
                  <h2 className="font-bold text-slate-800 text-base">
                    Step 1: Citizen Biographical Information
                  </h2>
                  <p className="text-xs text-slate-500">
                    Enter valid National ID bio-data before proceeding to biometric template capture.
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* NID */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>National ID (NID) Number *</span>
                      {isNidValid && (
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Valid Format</span>
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="e.g. 1998123456789"
                        value={formData.nid_number}
                        onChange={(e) => setFormData({ ...formData, nid_number: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono text-sm focus:outline-none focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600 transition-all"
                      />
                      <CreditCard className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                    </div>
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Full Legal Name *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="e.g. Shahriar Alom Masud"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600 transition-all"
                      />
                      <UserIcon className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                    </div>
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Date of Birth *
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        required
                        value={formData.date_of_birth}
                        onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono text-sm focus:outline-none focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600 transition-all"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Contact Phone Number
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="+8801700000000"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono text-sm focus:outline-none focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600 transition-all"
                      />
                      <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Permanent Residential Address
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Village / Street, Thana, District, Bangladesh"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600 transition-all"
                  />
                </div>

                {/* Form Action */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Fields marked with * are required by National Registration standard.
                  </span>
                  <button
                    type="submit"
                    disabled={isLoading || !formData.nid_number || !formData.full_name}
                    className="px-6 py-2.5 rounded-xl bg-brand-850 hover:bg-brand-900 disabled:opacity-50 text-white font-bold text-xs transition-all flex items-center gap-2 shadow-sm shadow-brand-950/20 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-brand-300" />
                        <span>Saving Citizen Record...</span>
                      </>
                    ) : (
                      <>
                        <span>Save & Proceed to Face Capture</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 2: Face Capture Studio */}
          {step === 2 && createdUser && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center space-x-2.5">
                  <Camera className="w-5 h-5 text-brand-700" />
                  <div>
                    <h2 className="font-bold text-slate-800 text-base">
                      Step 2: Live Facial Capture Studio
                    </h2>
                    <p className="text-xs text-slate-500">
                      Capture 5 multi-frame samples from the ESP32 camera to train the OpenCV LBPH recognizer.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-brand-800 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200">
                  {createdUser.full_name}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                {/* Viewport */}
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-900 border border-slate-200 flex items-center justify-center shadow-inner">
                  <img
                    src={snapshotUrl}
                    alt="ESP32 Stream"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480" fill="%230f172a"><text x="50%" y="50%" fill="%2394a3b8" font-family="sans-serif" font-size="16" text-anchor="middle">Live Camera Viewfinder Ready</text></svg>'
                    }}
                  />
                  {/* Framing Brackets */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
                    <div className="relative w-36 h-44 rounded-xl border border-emerald-400/30">
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-emerald-400" />
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-emerald-400" />
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-emerald-400" />
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-emerald-400" />
                      {isLoading && (
                        <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-lg shadow-emerald-400/80 animate-scan-laser" />
                      )}
                    </div>
                  </div>
                  {/* Pill */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-900/85 backdrop-blur text-[9px] font-bold text-white flex items-center gap-1 border border-white/10">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    <span>ESP32-S3 LIVE</span>
                  </div>
                </div>

                {/* Instructions & Trigger */}
                <div className="flex flex-col justify-between p-5 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 mb-2">
                      Facial Enrollment Guidelines
                    </h3>
                    <ul className="text-xs text-slate-600 space-y-2.5">
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-700 mt-1 flex-shrink-0" />
                        <span>Ensure citizen is facing the camera directly (30–50 cm distance).</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-700 mt-1 flex-shrink-0" />
                        <span>Good lighting is required; avoid heavy backlight or glare.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-700 mt-1 flex-shrink-0" />
                        <span>System captures 5 frames and updates OpenCV LBPH recognizer.</span>
                      </li>
                    </ul>

                    <div className="mt-5 p-3 rounded-xl bg-white border border-slate-200 font-mono text-xs text-slate-700">
                      {statusText || 'Camera ready for frame acquisition'}
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-2 pt-3 border-t border-slate-200/60">
                    <button
                      type="button"
                      onClick={() => setSnapshotUrl(getCameraSnapshotUrl(true))}
                      className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
                      title="Capture Fresh Frame"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleFaceEnroll}
                      disabled={isLoading}
                      className="px-5 py-2.5 rounded-xl bg-brand-850 hover:bg-brand-900 disabled:opacity-50 text-white font-bold text-xs transition-all flex items-center gap-2 shadow-sm shadow-brand-950/20 cursor-pointer"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-brand-300" />
                          <span>Capturing Face Frames...</span>
                        </>
                      ) : (
                        <>
                          <Camera className="w-4 h-4" />
                          <span>Capture & Train Face Model</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Fingerprint Sensor Studio */}
          {step === 3 && createdUser && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center space-x-2.5">
                  <Fingerprint className="w-5 h-5 text-brand-700" />
                  <div>
                    <h2 className="font-bold text-slate-800 text-base">
                      Step 3: Fingerprint Sensor Studio
                    </h2>
                    <p className="text-xs text-slate-500">
                      Enroll optical biometric template onto Grow R307S hardware flash memory.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-brand-800 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200">
                  {createdUser.full_name}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                {/* Visual Graphic */}
                <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-center">
                  <div
                    className={`w-28 h-28 rounded-full flex items-center justify-center mb-4 transition-all ${
                      isLoading
                        ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-500 animate-pulse'
                        : 'bg-white text-slate-600 border border-slate-200 shadow-sm'
                    }`}
                  >
                    <Fingerprint className="w-14 h-14 text-brand-700" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    {isLoading ? 'Blue LED Active — Touch Sensor!' : 'R307S Sensor Ready'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-xs mt-1 leading-relaxed">
                    Hardware enrollment performs 2 successive scans on the 500 DPI prism to generate and store the template.
                  </p>
                </div>

                {/* Instructions & Slot Selector */}
                <div className="flex flex-col justify-between p-5 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <div className="mb-4">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Sensor Memory Slot (Template ID)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={templateSlot}
                        onChange={(e) => setTemplateSlot(Number(e.target.value))}
                        className="w-32 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 font-mono text-xs font-bold focus:outline-none focus:border-brand-600"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Auto-suggested empty slot in R307S flash.
                      </p>
                    </div>

                    <div className="space-y-2 text-xs text-slate-600">
                      <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-900 font-bold flex items-center justify-center text-[10px]">
                          1
                        </span>
                        <span>Scan 1: Touch glass prism (optical LED blue).</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-[10px]">
                          2
                        </span>
                        <span>Lift finger and touch again to confirm signature.</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-3 border-t border-slate-200/60 flex justify-end">
                    <button
                      type="button"
                      onClick={handleFingerprintEnroll}
                      disabled={isLoading}
                      className="px-6 py-2.5 rounded-xl bg-brand-850 hover:bg-brand-900 disabled:opacity-50 text-white font-bold text-xs transition-all flex items-center gap-2 shadow-sm shadow-brand-950/20 cursor-pointer"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-brand-300" />
                          <span>Listening for Fingerprint...</span>
                        </>
                      ) : (
                        <>
                          <Fingerprint className="w-4 h-4" />
                          <span>Enroll to Sensor (Slot {templateSlot})</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Success Clearance Certificate */}
          {step === 4 && createdUser && (
            <div className="bg-white rounded-2xl border border-emerald-200 p-8 shadow-xs text-center space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-600/20">
                <ShieldCheck className="w-9 h-9" />
              </div>

              <div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Official Biometric Clearance
                </span>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight mt-2">
                  Citizen Biometrics Successfully Registered!
                </h2>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  National ID <span className="font-mono font-bold text-slate-800">{createdUser.nid_number}</span> is now active with linked facial geometry and hardware fingerprint credentials.
                </p>
              </div>

              {/* Certificate Summary Card */}
              <div className="max-w-md mx-auto p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2.5">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Citizen Name</span>
                  <span className="font-bold text-slate-800">{createdUser.full_name}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">National ID</span>
                  <span className="font-mono font-bold text-brand-800">{createdUser.nid_number}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Biometric Status</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Face + Fingerprint Linked</span>
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Sensor Memory Slot</span>
                  <span className="font-mono font-bold text-slate-800">Slot {templateSlot} (UART1)</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {onNavigate && (
                  <button
                    onClick={() => onNavigate('kiosk')}
                    className="px-5 py-2.5 rounded-xl bg-brand-850 hover:bg-brand-900 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 text-brand-200" />
                    <span>Test Identity Verification</span>
                  </button>
                )}

                {onNavigate && (
                  <button
                    onClick={() => onNavigate('registry')}
                    className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>View in Citizen Directory</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setStep(1)
                    setCreatedUser(null)
                    setFormData({
                      nid_number: '',
                      full_name: '',
                      date_of_birth: '1998-05-15',
                      phone: '+8801700000000',
                      address: 'Dhaka, Bangladesh',
                    })
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200 transition-colors cursor-pointer"
                >
                  Enroll Another Citizen
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ================= RIGHT HARDWARE FLEET & GUIDELINES (4 cols) ================= */}
        <div className="lg:col-span-4 space-y-5">
          {/* Hardware Readiness Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-brand-700" />
                <h3 className="font-bold text-slate-800 text-sm">Hardware Station Readiness</h3>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <Camera className="w-4 h-4 text-brand-700" />
                  <div>
                    <p className="font-bold text-slate-800">OV2640 Camera</p>
                    <p className="text-[10px] text-slate-500 font-mono">DVP DMA 10MHz</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Ready
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <Fingerprint className="w-4 h-4 text-brand-700" />
                  <div>
                    <p className="font-bold text-slate-800">R307S Optical Sensor</p>
                    <p className="text-[10px] text-slate-500 font-mono">500 DPI • UART1</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Ready
                </span>
              </div>
            </div>
          </div>

          {/* Enrollment Progress Checklist */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
              <Layers className="w-4 h-4 text-brand-700" />
              <h3 className="font-bold text-slate-800 text-sm">Enrollment Checklist</h3>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    step > 1 ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {step > 1 ? '✓' : '1'}
                </div>
                <span className={step > 1 ? 'font-semibold text-slate-800' : 'text-slate-500'}>
                  Biographical Record Creation
                </span>
              </div>

              <div className="flex items-center gap-2 text-slate-700">
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    step > 2 ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {step > 2 ? '✓' : '2'}
                </div>
                <span className={step > 2 ? 'font-semibold text-slate-800' : 'text-slate-500'}>
                  5-Frame OpenCV LBPH Facial Model
                </span>
              </div>

              <div className="flex items-center gap-2 text-slate-700">
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    step > 3 ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {step > 3 ? '✓' : '3'}
                </div>
                <span className={step > 3 ? 'font-semibold text-slate-800' : 'text-slate-500'}>
                  Dual-Scan Optical Fingerprint Template
                </span>
              </div>
            </div>
          </div>

          {/* Biometric Operator Best Practices */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2.5 text-xs text-slate-600">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Info className="w-4 h-4 text-brand-700" />
              <span>Operator Best Practices</span>
            </h3>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Maintain stable ambient front lighting. Instruct the citizen to touch the glass prism firmly without twisting to capture high-contrast ridge characteristics.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
