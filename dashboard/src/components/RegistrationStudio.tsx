import React, { useState, useEffect } from 'react'
import {
  UserPlus,
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
} from 'lucide-react'
import { createUser, enrollFace, enrollFingerprint, getCameraSnapshotUrl } from '../lib/api'
import type { User } from '../types'

export const RegistrationStudio: React.FC<{ onRegistered?: () => void }> = ({ onRegistered }) => {
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
  const [templateSlot, setTemplateSlot] = useState(4)
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
    setStatusText('Registering citizen in Supabase database...')

    try {
      const user = await createUser(formData)
      setCreatedUser(user)
      setStep(2)
      setStatusText('Citizen record created. Proceed to face capture.')
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
    setStatusText('Capturing face frames from ESP32 camera & training LBPH model...')

    try {
      await enrollFace(createdUser.id, 5)
      setStep(3)
      setStatusText('Face profile enrolled & saved to Supabase Storage!')
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
    setStatusText('Hardware active: Place finger on R307S sensor (Scan 1), lift, and place again (Scan 2)...')

    try {
      await enrollFingerprint(createdUser.id, templateSlot)
      setStep(4)
      setStatusText('Fingerprint enrolled successfully! Citizen is now active.')
      if (onRegistered) onRegistered()
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Step Progress Tracker */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-bold text-slate-800 tracking-tight">
            Citizen Registration Studio
          </h1>
          <span className="text-xs font-mono text-brand-700 font-semibold">
            Step {step} of 3
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-6">
          Enroll citizen biographical data, multi-frame facial profile, and hardware fingerprint credentials.
        </p>

        <div className="grid grid-cols-3 gap-3">
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
                  ? 'bg-brand-700 text-white'
                  : step === 1
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {step > 1 ? <Check className="w-4 h-4" /> : '1'}
            </div>
            <div className="text-xs">
              <p className="font-bold text-slate-800">NID Bio-Data</p>
              <p className="text-[10px] text-slate-500">Personal Info</p>
            </div>
          </div>

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
                  ? 'bg-brand-700 text-white'
                  : step === 2
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {step > 2 ? <Check className="w-4 h-4" /> : '2'}
            </div>
            <div className="text-xs">
              <p className="font-bold text-slate-800">Face Capture</p>
              <p className="text-[10px] text-slate-500">OpenCV LBPH</p>
            </div>
          </div>

          <div
            className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${
              step >= 3
                ? 'bg-brand-50/70 border-brand-200 text-slate-800'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                step > 3
                  ? 'bg-brand-700 text-white'
                  : step === 3
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {step > 3 ? <Check className="w-4 h-4" /> : '3'}
            </div>
            <div className="text-xs">
              <p className="font-bold text-slate-800">Fingerprint</p>
              <p className="text-[10px] text-slate-500">R307S UART</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
          <div>
            <p className="font-bold">Operation Failed</p>
            <p className="mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* STEP 1: Bio Data Form */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex items-center space-x-2.5 mb-5">
            <UserPlus className="w-5 h-5 text-brand-700" />
            <h2 className="font-bold text-slate-800 text-base">
              Step 1: Citizen Biographical Information
            </h2>
          </div>

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  National ID (NID) Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1998123456789"
                  value={formData.nid_number}
                  onChange={(e) => setFormData({ ...formData, nid_number: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono text-sm focus:outline-none focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Full Legal Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shahriar Alom Masud"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  required
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono text-sm focus:outline-none focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="+8801700000000"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono text-sm focus:outline-none focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Permanent Residential Address
              </label>
              <textarea
                rows={2}
                placeholder="Village / Street, Thana, District"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600 transition-all"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isLoading || !formData.nid_number || !formData.full_name}
                className="px-6 py-2.5 rounded-xl bg-brand-800 hover:bg-brand-900 disabled:opacity-50 text-white font-semibold text-sm transition-all flex items-center gap-2 shadow-sm shadow-brand-950/20"
              >
                {isLoading ? 'Saving Record...' : 'Save & Proceed to Face Capture'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 2: Face Capture Studio */}
      {step === 2 && createdUser && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2.5">
              <Camera className="w-5 h-5 text-brand-700" />
              <h2 className="font-bold text-slate-800 text-base">
                Step 2: Live Facial Capture Studio
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-500 font-medium">
              Citizen: <strong className="text-slate-800">{createdUser.full_name}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            </div>

            <div className="flex flex-col justify-between p-5 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <h3 className="font-bold text-sm text-slate-800 mb-2">
                  Facial Enrollment Instructions
                </h3>
                <ul className="text-xs text-slate-600 space-y-2.5">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1 flex-shrink-0" />
                    <span>Ensure citizen is facing the camera directly (30–50 cm distance).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1 flex-shrink-0" />
                    <span>Good front lighting is required; avoid high backlights or glare.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1 flex-shrink-0" />
                    <span>System captures face samples and updates OpenCV LBPH recognizer.</span>
                  </li>
                </ul>

                <div className="mt-5 p-3 rounded-xl bg-white border border-slate-200 font-mono text-xs text-slate-700">
                  {statusText || 'Ready for face capture'}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSnapshotUrl(getCameraSnapshotUrl(true))}
                  className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold shadow-2xs transition-colors"
                  title="Capture Fresh Frame"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleFaceEnroll}
                  disabled={isLoading}
                  className="px-5 py-2.5 rounded-xl bg-brand-800 hover:bg-brand-900 disabled:opacity-50 text-white font-semibold text-sm transition-all flex items-center gap-2 shadow-sm shadow-brand-950/20"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-brand-300" />
                      <span>Capturing Face...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4" />
                      <span>Capture & Train Face</span>
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
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2.5">
              <Fingerprint className="w-5 h-5 text-brand-700" />
              <h2 className="font-bold text-slate-800 text-base">
                Step 3: Fingerprint Sensor Studio
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-500 font-medium">
              Citizen: <strong className="text-slate-800">{createdUser.full_name}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-8 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-center">
              <div
                className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 transition-colors ${
                  isLoading
                    ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-500 animate-pulse'
                    : 'bg-white text-slate-500 border border-slate-200 shadow-xs'
                }`}
              >
                <Fingerprint className="w-12 h-12" />
              </div>
              <h3 className="font-bold text-slate-800 text-base">
                {isLoading ? 'Sensor Ready — Place Finger!' : 'Hardware Sensor Ready'}
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mt-1.5 leading-relaxed">
                Hardware scan requires 2 successive reads on R307S to register the template.
              </p>
            </div>

            <div className="flex flex-col justify-between p-5 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Sensor Memory Slot (Template ID)
                </label>
                <input
                  type="number"
                  min={1}
                  max={255}
                  value={templateSlot}
                  onChange={(e) => setTemplateSlot(Number(e.target.value))}
                  className="w-32 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 font-mono text-sm focus:outline-none focus:border-brand-600 mb-4"
                />

                <div className="space-y-2 text-xs text-slate-600">
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px]">
                      1
                    </span>
                    <span>Scan 1: Place finger on R307S (hold 1 sec)</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-[10px]">
                      2
                    </span>
                    <span>Lift: Lift finger for 1 second</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px]">
                      3
                    </span>
                    <span>Scan 2: Place SAME finger again</span>
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-xl bg-white border border-slate-200 font-mono text-xs text-slate-700">
                  {statusText}
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleFingerprintEnroll}
                  disabled={isLoading}
                  className="px-6 py-2.5 rounded-xl bg-brand-800 hover:bg-brand-900 disabled:opacity-50 text-white font-semibold text-sm transition-all flex items-center gap-2 shadow-sm shadow-brand-950/20"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-brand-300" />
                      <span>Listening for Finger...</span>
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-4 h-4" />
                      <span>Start Fingerprint Scan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Success Completion */}
      {step === 4 && createdUser && (
        <div className="bg-white rounded-2xl border border-emerald-200 p-8 shadow-xs text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-500/20">
            <ShieldCheck className="w-9 h-9" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              Citizen Enrolled Successfully!
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              All biometric credentials have been verified and linked to NID{' '}
              <span className="font-mono text-brand-800 font-bold">{createdUser.nid_number}</span>.
            </p>
          </div>

          <div className="my-6 max-w-sm mx-auto p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Citizen Name:</span>
              <span className="font-bold text-slate-800">{createdUser.full_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Biometrics:</span>
              <span className="text-emerald-700 font-bold">Face + Fingerprint Linked</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Sensor Slot:</span>
              <span className="font-mono font-bold text-slate-700">Slot {templateSlot}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status:</span>
              <span className="font-bold text-emerald-700">Active</span>
            </div>
          </div>

          <div className="flex items-center justify-center space-x-3 pt-2">
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
              className="px-5 py-2.5 rounded-xl bg-brand-800 hover:bg-brand-900 text-white font-semibold text-xs transition-colors shadow-sm"
            >
              Enroll Another Citizen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
