import React, { useState, useEffect } from 'react'
import {
  Settings,
  Shield,
  Sliders,
  Save,
  CheckCircle2,
  Users,
  Lock,
  RefreshCw,
  SlidersHorizontal,
  Eye,
  EyeOff,
  Volume2,
  Wifi,
  Globe,
  Clock,
  Key,
  FileText,
  Check,
  RotateCcw,
  ShieldCheck,
  Terminal,
  Activity,
  UserPlus,
  UserCheck,
  UserX,
  X,
  Mail,
  ShieldAlert,
  BadgeCheck,
  Sparkles,
} from 'lucide-react'
import {
  MASTER_ADMIN_EMAIL,
  MASTER_ADMIN_NAME,
  isMasterAdmin,
  getPendingOperatorRequests,
  approveOperatorRequest,
  rejectOperatorRequest,
  getApprovedOperators,
  type PendingOperatorRequest,
  type OperatorProfile,
} from '../lib/auth'

export interface SystemSettingsConfig {
  // Biometrics
  faceThreshold: number
  fpTimeout: number
  biometricPolicy: 'dual_mandatory' | 'face_preferred' | 'finger_preferred'
  livenessDetection: boolean
  minSamplesRequired: number

  // Station & Display
  autoResetInterval: number
  privacyMasking: boolean
  audioBuzzer: boolean
  ledStatusIndicator: boolean

  // Network & Bridge
  tunnelEndpoint: string
  pollingFrequency: number
  autoReconnect: boolean
  tlsVerification: boolean
}

const DEFAULT_SETTINGS: SystemSettingsConfig = {
  faceThreshold: 100,
  fpTimeout: 15,
  biometricPolicy: 'dual_mandatory',
  livenessDetection: true,
  minSamplesRequired: 10,
  autoResetInterval: 20,
  privacyMasking: true,
  audioBuzzer: true,
  ledStatusIndicator: true,
  tunnelEndpoint: 'https://internal-custody-competitors-elite.trycloudflare.com',
  pollingFrequency: 5,
  autoReconnect: true,
  tlsVerification: true,
}

const SETTINGS_STORAGE_KEY = 'nid_secureguard_system_settings_config'

function loadSavedSettings(): SystemSettingsConfig {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
    }
  } catch (e) {
    console.error('Failed to load settings:', e)
  }
  return DEFAULT_SETTINGS
}

interface SettingsViewProps {
  isRoles?: boolean
  operator?: OperatorProfile | null
}

export const SettingsView: React.FC<SettingsViewProps> = ({ isRoles = false, operator }) => {
  const [activeTab, setActiveTab] = useState<'biometrics' | 'station' | 'network' | 'rbac'>(
    isRoles ? 'rbac' : 'biometrics'
  )
  const [settings, setSettings] = useState<SystemSettingsConfig>(loadSavedSettings)
  const [saved, setSaved] = useState(false)
  const [activePreset, setActivePreset] = useState<'strict' | 'standard' | 'fast' | 'custom'>('standard')
  const [pendingRequests, setPendingRequests] = useState<PendingOperatorRequest[]>(() =>
    getPendingOperatorRequests()
  )
  const [approvedOperators, setApprovedOperators] = useState<Set<string>>(() =>
    getApprovedOperators()
  )
  const [actionNotice, setActionNotice] = useState<string | null>(null)

  const isMaster = isMasterAdmin(operator?.email)

  const handleApprove = (req: PendingOperatorRequest) => {
    approveOperatorRequest(req.email)
    setPendingRequests(getPendingOperatorRequests())
    setApprovedOperators(new Set(getApprovedOperators()))
    setActionNotice(`Operator ${req.fullName} (${req.email}) has been authorized. They may now sign in.`)
    setTimeout(() => setActionNotice(null), 4000)
  }

  const handleReject = (req: PendingOperatorRequest) => {
    rejectOperatorRequest(req.email)
    setPendingRequests(getPendingOperatorRequests())
    setApprovedOperators(new Set(getApprovedOperators()))
    setActionNotice(`Operator registration request for ${req.email} was rejected.`)
    setTimeout(() => setActionNotice(null), 4000)
  }

  useEffect(() => {
    if (isRoles) setActiveTab('rbac')
  }, [isRoles])

  const applyPreset = (preset: 'strict' | 'standard' | 'fast') => {
    setActivePreset(preset)
    if (preset === 'strict') {
      setSettings((prev) => ({
        ...prev,
        faceThreshold: 75,
        fpTimeout: 10,
        biometricPolicy: 'dual_mandatory',
        livenessDetection: true,
        privacyMasking: true,
      }))
    } else if (preset === 'standard') {
      setSettings((prev) => ({
        ...prev,
        faceThreshold: 100,
        fpTimeout: 15,
        biometricPolicy: 'dual_mandatory',
        livenessDetection: true,
        privacyMasking: true,
      }))
    } else if (preset === 'fast') {
      setSettings((prev) => ({
        ...prev,
        faceThreshold: 125,
        fpTimeout: 20,
        biometricPolicy: 'dual_mandatory',
        livenessDetection: false,
        privacyMasking: false,
      }))
    }
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      console.error('Failed to save settings:', e)
    }
  }

  const handleResetDefaults = () => {
    setSettings(DEFAULT_SETTINGS)
    setActivePreset('standard')
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {}
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200/60 flex items-center justify-center">
              <Settings className="w-5 h-5 text-brand-700" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                  System Settings & Security Policies
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Policy Engine Enforced
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Calibrate biometric distance thresholds, terminal privacy masking, Cloudflare tunnel bridge, and operator access permissions.
              </p>
            </div>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center space-x-2.5 self-start md:self-auto">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Reset all settings to factory default"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-900 hover:bg-brand-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            {saved ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Save className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>{saved ? 'Saved Successfully' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="bg-white rounded-2xl p-2 border border-slate-200/80 shadow-xs flex items-center space-x-2 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('biometrics')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'biometrics'
              ? 'bg-brand-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Biometric Policies</span>
        </button>

        <button
          onClick={() => setActiveTab('station')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'station'
              ? 'bg-brand-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>Station & Privacy</span>
        </button>

        <button
          onClick={() => setActiveTab('network')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'network'
              ? 'bg-brand-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Wifi className="w-4 h-4" />
          <span>Network & Bridge</span>
        </button>

        <button
          onClick={() => setActiveTab('rbac')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'rbac'
              ? 'bg-brand-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>RBAC & Operators</span>
        </button>
      </div>

      {/* Tab 1: Biometric Policies */}
      {activeTab === 'biometrics' && (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Quick Security Presets */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                Quick Security Presets
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Apply pre-calibrated security profiles based on institutional risk tolerance.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <button
                type="button"
                onClick={() => applyPreset('strict')}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  activePreset === 'strict'
                    ? 'border-brand-600 bg-brand-50/50 ring-1 ring-brand-600'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800">Maximum Security</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    Strict
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                  LBPH distance &le; 75, 10s sensor timeout, mandatory liveness. Ideal for high-stakes authorization.
                </p>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('standard')}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  activePreset === 'standard'
                    ? 'border-brand-600 bg-brand-50/50 ring-1 ring-brand-600'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800">Standard Enterprise</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Recommended
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                  LBPH distance &le; 100, 15s sensor timeout. Optimal balance between false acceptance and rejection.
                </p>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('fast')}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  activePreset === 'fast'
                    ? 'border-brand-600 bg-brand-50/50 ring-1 ring-brand-600'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800">High-Traffic Flow</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    Relaxed
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                  LBPH distance &le; 125, 20s timeout. Permits variable lighting across rapid public transit checkpoints.
                </p>
              </button>
            </div>
          </div>

          {/* Detailed Tuning Parameters */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6">
            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3">
              Biometric Algorithm Thresholds
            </h3>

            {/* LBPH Threshold */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-slate-800">
                    OpenCV LBPH Euclidean Distance Threshold
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Lower distance indicates higher facial similarity. Scores above this threshold trigger automatic security denial.
                  </p>
                </div>
                <span className="font-mono font-black text-sm px-3 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
                  {settings.faceThreshold}
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-[10px] font-bold text-slate-400 font-mono">50 (Strict)</span>
                <input
                  type="range"
                  min={50}
                  max={200}
                  step={5}
                  value={settings.faceThreshold}
                  onChange={(e) => {
                    setActivePreset('custom')
                    setSettings({ ...settings, faceThreshold: Number(e.target.value) })
                  }}
                  className="flex-1 accent-brand-700 cursor-pointer"
                />
                <span className="text-[10px] font-bold text-slate-400 font-mono">200 (Permissive)</span>
              </div>
            </div>

            {/* Fingerprint Sensor Timeout */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-slate-800">
                    R307S Fingerprint Optical Window Timeout
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Maximum duration allotted for citizen to place enrolled finger on optical glass prism before request abort.
                  </p>
                </div>
                <span className="font-mono font-black text-sm px-3 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
                  {settings.fpTimeout}s
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-[10px] font-bold text-slate-400 font-mono">5s</span>
                <input
                  type="range"
                  min={5}
                  max={60}
                  step={1}
                  value={settings.fpTimeout}
                  onChange={(e) => {
                    setActivePreset('custom')
                    setSettings({ ...settings, fpTimeout: Number(e.target.value) })
                  }}
                  className="flex-1 accent-brand-700 cursor-pointer"
                />
                <span className="text-[10px] font-bold text-slate-400 font-mono">60s</span>
              </div>
            </div>

            {/* Multi-Modal Enforcement Rule */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <label className="text-xs font-bold text-slate-800 block">
                Biometric Modality Clearance Rule
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label
                  onClick={() => setSettings({ ...settings, biometricPolicy: 'dual_mandatory' })}
                  className={`p-3.5 rounded-xl border flex items-center space-x-3 cursor-pointer transition-all ${
                    settings.biometricPolicy === 'dual_mandatory'
                      ? 'border-brand-600 bg-brand-50/40 text-brand-900 font-bold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="biometricPolicy"
                    checked={settings.biometricPolicy === 'dual_mandatory'}
                    onChange={() => {}}
                    className="accent-brand-700"
                  />
                  <div className="text-xs">
                    <div className="font-bold">Dual-Factor Mandatory</div>
                    <div className="text-[10px] text-slate-500">Requires Face AND Fingerprint</div>
                  </div>
                </label>

                <label
                  onClick={() => setSettings({ ...settings, biometricPolicy: 'face_preferred' })}
                  className={`p-3.5 rounded-xl border flex items-center space-x-3 cursor-pointer transition-all ${
                    settings.biometricPolicy === 'face_preferred'
                      ? 'border-brand-600 bg-brand-50/40 text-brand-900 font-bold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="biometricPolicy"
                    checked={settings.biometricPolicy === 'face_preferred'}
                    onChange={() => {}}
                    className="accent-brand-700"
                  />
                  <div className="text-xs">
                    <div className="font-bold">Face-First Primary</div>
                    <div className="text-[10px] text-slate-500">Fingerprint optional fallback</div>
                  </div>
                </label>

                <label
                  onClick={() => setSettings({ ...settings, biometricPolicy: 'finger_preferred' })}
                  className={`p-3.5 rounded-xl border flex items-center space-x-3 cursor-pointer transition-all ${
                    settings.biometricPolicy === 'finger_preferred'
                      ? 'border-brand-600 bg-brand-50/40 text-brand-900 font-bold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="biometricPolicy"
                    checked={settings.biometricPolicy === 'finger_preferred'}
                    onChange={() => {}}
                    className="accent-brand-700"
                  />
                  <div className="text-xs">
                    <div className="font-bold">Fingerprint-First Primary</div>
                    <div className="text-[10px] text-slate-500">Face recognition fallback</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Liveness Toggle */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  Haar Cascade Real-Time Face Alignment Guard
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Verify frontal face presence with confidence threshold &gt; 80% before allowing match query.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, livenessDetection: !settings.livenessDetection })}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.livenessDetection ? 'bg-brand-700' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 shadow-sm ${
                    settings.livenessDetection ? 'right-0.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Tab 2: Station & Privacy */}
      {activeTab === 'station' && (
        <form onSubmit={handleSave} className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6">
          <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3">
            Terminal Behavior & Citizen Privacy Protection
          </h3>

          {/* Auto-Reset Countdown */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-800">
                  Verification Decision Auto-Reset Interval
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Seconds to display ACCESS GRANTED clearance certificate before clearing citizen data and resetting to standby.
                </p>
              </div>
              <span className="font-mono font-black text-sm px-3 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
                {settings.autoResetInterval}s
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-[10px] font-bold text-slate-400 font-mono">5s</span>
              <input
                type="range"
                min={5}
                max={60}
                step={1}
                value={settings.autoResetInterval}
                onChange={(e) => setSettings({ ...settings, autoResetInterval: Number(e.target.value) })}
                className="flex-1 accent-brand-700 cursor-pointer"
              />
              <span className="text-[10px] font-bold text-slate-400 font-mono">60s</span>
            </div>
          </div>

          {/* Privacy Masking Toggle */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                Citizen Privacy-First Shielding
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Automatically mask NID numbers and biographical profile fields on standby screens until biometric match succeeds.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, privacyMasking: !settings.privacyMasking })}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                settings.privacyMasking ? 'bg-brand-700' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 shadow-sm ${
                  settings.privacyMasking ? 'right-0.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {/* LED Indicator Toggle */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                Hardware GPIO LED Output (GPIO 38/39)
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Drive external physical green (Granted) and red (Denied) indicators on edge terminal during clearance decisions.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, ledStatusIndicator: !settings.ledStatusIndicator })}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                settings.ledStatusIndicator ? 'bg-brand-700' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 shadow-sm ${
                  settings.ledStatusIndicator ? 'right-0.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {/* Audio Chime Toggle */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                Audible Verification Confirmation Chimes
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Play operator feedback tones upon successful dual-biometric clearance or policy rejection.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, audioBuzzer: !settings.audioBuzzer })}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                settings.audioBuzzer ? 'bg-brand-700' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 shadow-sm ${
                  settings.audioBuzzer ? 'right-0.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: Network & Bridge */}
      {activeTab === 'network' && (
        <form onSubmit={handleSave} className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6">
          <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3">
            Edge Gateway & Cloudflare Tunnel Parameters
          </h3>

          {/* Tunnel URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 block">
              Cloudflare Ingress Tunnel Endpoint
            </label>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={settings.tunnelEndpoint}
                  onChange={(e) => setSettings({ ...settings, tunnelEndpoint: e.target.value })}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono text-xs focus:outline-none focus:border-brand-600"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Encrypted reverse proxy routing hardware telemetry over cellular hotspot without opening public inbound firewall ports.
            </p>
          </div>

          {/* Polling Frequency */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-800">
                  Telemetry Heartbeat Polling Frequency
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Interval for querying ESP32 FreeRTOS heap and sensor health status.
                </p>
              </div>
              <span className="font-mono font-black text-sm px-3 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
                {settings.pollingFrequency}s
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-[10px] font-bold text-slate-400 font-mono">1s</span>
              <input
                type="range"
                min={1}
                max={30}
                step={1}
                value={settings.pollingFrequency}
                onChange={(e) => setSettings({ ...settings, pollingFrequency: Number(e.target.value) })}
                className="flex-1 accent-brand-700 cursor-pointer"
              />
              <span className="text-[10px] font-bold text-slate-400 font-mono">30s</span>
            </div>
          </div>

          {/* Auto-Reconnect */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                Automatic Bridge Socket Re-negotiation
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Automatically attempt exponential backoff reconnection if cellular WAN connection drops.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, autoReconnect: !settings.autoReconnect })}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                settings.autoReconnect ? 'bg-brand-700' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 shadow-sm ${
                  settings.autoReconnect ? 'right-0.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </form>
      )}

      {/* Tab 4: RBAC & Operators */}
      {activeTab === 'rbac' && (
        <div className="space-y-6">
          {/* Master Sovereign Root Notice */}
          <div className="bg-brand-900 text-white rounded-2xl p-6 border border-brand-800 shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
                      Master Root Sovereign Authority
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      Level 4 Root
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">
                    {MASTER_ADMIN_NAME} ({MASTER_ADMIN_EMAIL})
                  </h3>
                  <p className="text-xs text-brand-200/80 mt-1 max-w-2xl leading-relaxed">
                    Sole sovereign authority over all system operators. Any operator registering with a Gmail address must first verify their inbox and then receive explicit manual authorization from this root administrator before accessing the console.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
                <div className="px-3 py-1.5 rounded-xl bg-brand-950/60 border border-brand-700/50 text-right">
                  <span className="text-[10px] text-brand-300 block font-mono">Authority Status</span>
                  <span className="text-xs font-bold text-emerald-400">Hardcoded Root</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Notice Toast/Banner */}
          {actionNotice && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionNotice}</span>
            </div>
          )}

          {/* Pending Operator Authorization Queue */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-2.5">
                <Clock className="w-4 h-4 text-brand-700" />
                <h3 className="font-bold text-slate-800 text-sm">
                  Pending Operator Authorization Queue
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  {pendingRequests.length} Pending Approval
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Only Master Admin can approve newly verified Gmail accounts
              </p>
            </div>

            {pendingRequests.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-50/60 border border-dashed border-slate-200 flex flex-col items-center justify-center space-y-2">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                <p className="text-xs font-bold text-slate-700">
                  All Operator Registrations Reconciled
                </p>
                <p className="text-[11px] text-slate-500 max-w-md">
                  There are currently no operator accounts awaiting authorization. When a new personnel signs up and validates their Gmail inbox, their dossier will appear here for root approval.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingRequests.map((req) => (
                  <div
                    key={req.email}
                    className="p-4 rounded-xl border border-amber-200/80 bg-amber-50/30 flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{req.fullName}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          Pending Approval
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-xs text-slate-600 font-mono">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{req.email}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-3 pt-1">
                        <span>Badge: <strong className="text-slate-700 font-mono">{req.badgeId}</strong></span>
                        <span>•</span>
                        <span>Station: <strong className="text-slate-700">{req.stationId}</strong></span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Registered: {new Date(req.registeredAt).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 pt-2 border-t border-amber-100">
                      <button
                        type="button"
                        onClick={() => handleApprove(req)}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve Operator</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReject(req)}
                        className="py-1.5 px-3 rounded-lg bg-white hover:bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active RBAC Directory */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">
                  Active Operator & Personnel Directory
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verified security personnel holding live session and audit authorization.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">Operator Name & Identity</th>
                    <th className="py-3.5 px-4">Role Classification</th>
                    <th className="py-3.5 px-4">Security Privilege Scope</th>
                    <th className="py-3.5 px-4">Access Level</th>
                    <th className="py-3.5 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Master Root Admin */}
                  <tr className="bg-emerald-50/40 hover:bg-emerald-50/60 transition-colors">
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-brand-900 text-white font-bold text-xs flex items-center justify-center">
                          SM
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{MASTER_ADMIN_NAME}</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-brand-900 text-emerald-300">
                              ROOT
                            </span>
                          </div>
                          <div className="text-[11px] text-brand-800 font-mono font-semibold">
                            {MASTER_ADMIN_EMAIL}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-brand-900 text-emerald-300 border border-brand-700">
                        Master Root Administrator
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-600 text-[11px] max-w-sm">
                      Full Root Sovereignty • Operator Authorization & Revocation • Citizen Biometrics • System Parameters Override
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="font-mono text-[11px] font-bold text-brand-900 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300">
                        Level 4 (Root)
                      </span>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap text-right">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        Sovereign Active
                      </span>
                    </td>
                  </tr>

                  {/* Standard Verified Field Officer */}
                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">
                          VO
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">Field Officer Alpha</div>
                          <div className="text-[11px] text-slate-400 font-mono">station01@secureguard.gov.bd</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        Terminal Operator
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-600 text-[11px] max-w-sm">
                      Identity Verification Lookup • Optical Biometric Trigger • Citizen Standby Clearance
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        Level 2 (Operator)
                      </span>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap text-right">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    </td>
                  </tr>

                  {/* Compliance Auditor */}
                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center">
                          AU
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">Security Audit Officer</div>
                          <div className="text-[11px] text-slate-400 font-mono">audit@secureguard.gov.bd</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        Compliance Auditor
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-600 text-[11px] max-w-sm">
                      Security Audit Logs Read-Only • Incident Dossier Inspection • CSV Audit Trail Download
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        Level 3 (Auditor)
                      </span>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap text-right">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
