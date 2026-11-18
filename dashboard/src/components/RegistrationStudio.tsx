import React, { useState } from 'react'
import { UserPlus, Camera, Fingerprint, CheckCircle2, ArrowRight, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react'
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
  const [snapshotUrl, setSnapshotUrl] = useState(getCameraSnapshotUrl())

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
    setStatusText('Capturing 10 face frames from ESP32 camera & training LBPH model...')

    try {
      await enrollFace(createdUser.id, 10)
      setStep(3)
      setStatusText('Face profile enrolled & saved to Supabase Storage!')
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setIsLoading(false)
      setSnapshotUrl(getCameraSnapshotUrl())
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
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Step Progress Tracker */}
      <div className="bg-dark-850 rounded-2xl border border-dark-700 p-6 mb-8 shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold text-white tracking-tight">Citizen Registration Studio</h1>
          <span className="text-xs font-mono text-emerald-400">Step {step} of 3</span>
        </div>
        <p className="text-xs text-slate-400 mb-6">Enroll citizen biographical data, facial profile, and fingerprint credentials.</p>

        <div className="grid grid-cols-3 gap-3">
          <div className={`p-3 rounded-xl border flex items-center gap-3 ${
            step >= 1 ? 'bg-dark-800 border-emerald-500/30 text-white' : 'bg-dark-900 border-dark-700 text-slate-500'
          }`}>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
              step > 1 ? 'bg-emerald-500 text-white' : step === 1 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-dark-700 text-slate-400'
            }`}>
              {step > 1 ? <CheckCircle2 className="w-4 h-4" /> : '1'}
            </div>
            <div className="text-xs">
              <p className="font-semibold">NID Bio-Data</p>
              <p className="text-[10px] text-slate-400">Personal Info</p>
            </div>
          </div>

          <div className={`p-3 rounded-xl border flex items-center gap-3 ${
            step >= 2 ? 'bg-dark-800 border-emerald-500/30 text-white' : 'bg-dark-900 border-dark-700 text-slate-500'
          }`}>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
              step > 2 ? 'bg-emerald-500 text-white' : step === 2 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-dark-700 text-slate-400'
            }`}>
              {step > 2 ? <CheckCircle2 className="w-4 h-4" /> : '2'}
            </div>
            <div className="text-xs">
              <p className="font-semibold">Face Capture</p>
              <p className="text-[10px] text-slate-400">OpenCV LBPH</p>
            </div>
          </div>

          <div className={`p-3 rounded-xl border flex items-center gap-3 ${
            step >= 3 ? 'bg-dark-800 border-emerald-500/30 text-white' : 'bg-dark-900 border-dark-700 text-slate-500'
          }`}>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
              step > 3 ? 'bg-emerald-500 text-white' : step === 3 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-dark-700 text-slate-400'
            }`}>
              {step > 3 ? <CheckCircle2 className="w-4 h-4" /> : '3'}
            </div>
            <div className="text-xs">
              <p className="font-semibold">Fingerprint</p>
              <p className="text-[10px] text-slate-400">R307S Hardware</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div className="p-4 mb-6 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
          <div>
            <p className="font-semibold">Operation Failed</p>
            <p className="mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* STEP 1: Bio Data Form */}
      {step === 1 && (
        <div className="bg-dark-850 rounded-2xl border border-dark-700 p-6 shadow-xl">
          <div className="flex items-center space-x-2 mb-4">
            <UserPlus className="w-5 h-5 text-emerald-400" />
            <h2 className="font-semibold text-white">Step 1: Citizen Information</h2>
          </div>

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">National ID (NID) Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1998123456789"
                  value={formData.nid_number}
                  onChange={e => setFormData({ ...formData, nid_number: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-dark-900 border border-dark-700 text-white font-mono text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shahriar Alom Masud"
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-dark-900 border border-dark-700 text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Date of Birth *</label>
                <input
                  type="date"
                  required
                  value={formData.date_of_birth}
                  onChange={e => setFormData({ ...formData, date_of_birth: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-dark-900 border border-dark-700 text-white font-mono text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+8801700000000"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-dark-900 border border-dark-700 text-white font-mono text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Permanent Residential Address</label>
              <textarea
                rows={2}
                placeholder="Village / Street, Thana, District"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-dark-900 border border-dark-700 text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isLoading || !formData.nid_number || !formData.full_name}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold text-sm transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                {isLoading ? 'Saving...' : 'Save & Proceed to Face Capture'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 2: Face Capture Studio */}
      {step === 2 && createdUser && (
        <div className="bg-dark-850 rounded-2xl border border-dark-700 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Camera className="w-5 h-5 text-emerald-400" />
              <h2 className="font-semibold text-white">Step 2: Live Facial Capture Studio</h2>
            </div>
            <span className="text-xs font-mono text-slate-400">Citizen: {createdUser.full_name}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-dark-900 border border-dark-700 flex items-center justify-center">
              <img src={snapshotUrl} alt="ESP32 Stream" className="w-full h-full object-cover" />
              <div className="absolute inset-0 pointer-events-none border border-emerald-500/20 m-6 rounded-lg">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-emerald-400" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-emerald-400" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-emerald-400" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-emerald-400" />
              </div>
            </div>

            <div className="flex flex-col justify-between p-4 rounded-xl bg-dark-900/60 border border-dark-700">
              <div>
                <h3 className="font-semibold text-sm text-white mb-1">Facial Enrollment Instructions</h3>
                <ul className="text-xs text-slate-400 space-y-2 mt-3">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Ensure citizen is facing the camera directly (30-50 cm distance).
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Good lighting is required; avoid strong backlights.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    System captures 10 frames and updates the LBPH recognition model.
                  </li>
                </ul>

                <div className="mt-4 p-3 rounded-lg bg-dark-800 border border-dark-700 font-mono text-xs text-slate-300">
                  {statusText || 'Ready for face capture'}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSnapshotUrl(getCameraSnapshotUrl())}
                  className="px-4 py-2 rounded-xl bg-dark-800 hover:bg-dark-700 text-slate-300 text-xs font-medium"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleFaceEnroll}
                  disabled={isLoading}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold text-sm transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Capturing 10 Frames...</span>
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

      {/* STEP 3: Fingerprint Enrollment Studio */}
      {step === 3 && createdUser && (
        <div className="bg-dark-850 rounded-2xl border border-dark-700 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Fingerprint className="w-5 h-5 text-emerald-400" />
              <h2 className="font-semibold text-white">Step 3: Fingerprint Sensor Studio</h2>
            </div>
            <span className="text-xs font-mono text-slate-400">Citizen: {createdUser.full_name}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-8 rounded-xl bg-dark-900/80 border border-dark-700 flex flex-col items-center justify-center text-center">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 ${
                isLoading ? 'bg-emerald-500/20 text-emerald-400 animate-pulse border-2 border-emerald-400' : 'bg-dark-800 text-slate-400 border border-dark-700'
              }`}>
                <Fingerprint className="w-12 h-12" />
              </div>
              <h3 className="font-semibold text-white text-base">
                {isLoading ? 'Sensor Ready — Place Finger!' : 'Hardware Standby'}
              </h3>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                Scan requires 2 successive finger reads to generate template.
              </p>
            </div>

            <div className="flex flex-col justify-between p-4 rounded-xl bg-dark-900/60 border border-dark-700">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Sensor Memory Slot (Template ID)
                </label>
                <input
                  type="number"
                  min={1}
                  max={255}
                  value={templateSlot}
                  onChange={e => setTemplateSlot(Number(e.target.value))}
                  className="w-32 px-3.5 py-1.5 rounded-lg bg-dark-900 border border-dark-700 text-white font-mono text-sm focus:outline-none focus:border-emerald-500 mb-4"
                />

                <div className="space-y-2 text-xs text-slate-400">
                  <div className="p-2.5 rounded-lg bg-dark-800 border border-dark-700 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px]">1</span>
                    <span>Scan 1: Place finger on R307S (hold 1 sec)</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-dark-800 border border-dark-700 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-dark-700 text-slate-400 font-bold flex items-center justify-center text-[10px]">2</span>
                    <span>Lift: Lift finger for 1 second</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-dark-800 border border-dark-700 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px]">3</span>
                    <span>Scan 2: Place SAME finger again</span>
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-lg bg-dark-800 border border-dark-700 font-mono text-xs text-slate-300">
                  {statusText}
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleFingerprintEnroll}
                  disabled={isLoading}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold text-sm transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
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
        <div className="bg-dark-850 rounded-2xl border border-emerald-500/40 p-8 shadow-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center text-white mx-auto mb-4 shadow-xl shadow-emerald-500/30">
            <ShieldCheck className="w-10 h-10" />
          </div>

          <h2 className="text-2xl font-bold text-white tracking-tight">Citizen Enrolled Successfully!</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto mt-1">
            All biometrics have been verified and linked to NID <span className="font-mono text-emerald-400">{createdUser.nid_number}</span>.
          </p>

          <div className="my-6 max-w-sm mx-auto p-4 rounded-xl bg-dark-900 border border-dark-700 text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Citizen Name:</span>
              <span className="font-semibold text-white">{createdUser.full_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Biometrics:</span>
              <span className="text-emerald-400 font-semibold">Face + Fingerprint Linked</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Account Status:</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 uppercase font-bold text-[10px]">Active</span>
            </div>
          </div>

          <button
            onClick={() => {
              setStep(1)
              setFormData({ nid_number: '', full_name: '', date_of_birth: '1998-05-15', phone: '', address: '' })
              setCreatedUser(null)
            }}
            className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-all"
          >
            Enroll Another Citizen
          </button>
        </div>
      )}
    </div>
  )
}
