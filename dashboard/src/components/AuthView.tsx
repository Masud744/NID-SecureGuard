import React, { useState } from 'react'
import {
  Shield,
  Lock,
  Mail,
  User,
  Building,
  Award,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Key,
  ShieldCheck,
  Cpu,
  Fingerprint,
  Camera,
  Terminal,
  Check,
} from 'lucide-react'
import {
  signInOperator,
  signUpOperator,
  MASTER_ADMIN_EMAIL,
  MASTER_ADMIN_NAME,
  type OperatorProfile,
} from '../lib/auth'

interface AuthViewProps {
  onAuthenticated: (operator: OperatorProfile) => void
  onLaunchKiosk?: () => void
}

export const AuthView: React.FC<AuthViewProps> = ({ onAuthenticated, onLaunchKiosk }) => {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Sign In Form State - Defaulting to Master Admin
  const [signInEmail, setSignInEmail] = useState(MASTER_ADMIN_EMAIL)
  const [signInPassword, setSignInPassword] = useState('Admin@SecureGuard2026')

  // Sign Up Form State with Confirm Password
  const [signUpData, setSignUpData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    badgeId: '',
    stationId: 'Terminal Alpha - Central Station',
    role: 'verification_officer' as 'super_admin' | 'verification_officer' | 'registrar' | 'auditor',
  })

  const fillMasterAdminCredentials = () => {
    setSignInEmail(MASTER_ADMIN_EMAIL)
    setSignInPassword('Admin@SecureGuard2026')
    setErrorMessage(null)
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)
    setIsLoading(true)

    try {
      const profile = await signInOperator(signInEmail.trim(), signInPassword)
      setSuccessMessage('Authentication successful. Loading security console...')
      setTimeout(() => {
        onAuthenticated(profile)
      }, 500)
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to authenticate operator credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!signUpData.fullName.trim() || !signUpData.email.trim() || !signUpData.password.trim()) {
      setErrorMessage('Please fill in all mandatory identity fields.')
      return
    }

    if (signUpData.password.length < 8) {
      setErrorMessage('Password must contain at least 8 characters.')
      return
    }

    if (signUpData.password !== signUpData.confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify your confirm password.')
      return
    }

    setIsLoading(true)

    try {
      const result = await signUpOperator({
        email: signUpData.email.trim(),
        password: signUpData.password,
        fullName: signUpData.fullName.trim(),
        badgeId: signUpData.badgeId.trim() || `OP-${Math.floor(1000 + Math.random() * 9000)}`,
        stationId: signUpData.stationId.trim() || 'Terminal Alpha - Central Station',
        role: signUpData.role,
      })

      if (result.requiresEmailConfirmation) {
        setSuccessMessage(
          `Registration submitted successfully! A confirmation link has been sent to your Gmail (${signUpData.email}). Please verify your email. Access will be unlocked once authorized by Master Administrator (${MASTER_ADMIN_NAME} - ${MASTER_ADMIN_EMAIL}).`
        )
      } else {
        setSuccessMessage('Account provisioned. Please sign in to verify credentials.')
      }

      // Reset signup form and switch to sign in
      setTimeout(() => {
        setTab('signin')
        setSignInEmail(signUpData.email.trim())
        setSignInPassword('')
      }, 3000)
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to provision operator account.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-8 selection:bg-brand-500/20 selection:text-brand-900">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        {/* Left Column: Brand & Security Assurance (5 cols) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-brand-950 via-brand-900 to-brand-850 p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Subtle Background Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            {/* Header Brand */}
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-2xl bg-brand-800/80 border border-brand-500/30 flex items-center justify-center shadow-lg shadow-brand-950/50">
                <Shield className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight leading-tight">
                  NID SecureGuard
                </h1>
                <p className="text-[11px] text-emerald-300 font-medium tracking-wide">
                  Identity Security Platform
                </p>
              </div>
            </div>

            {/* Platform Synopsis */}
            <div className="space-y-2 pt-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/20 text-emerald-300 text-[11px] font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Restricted Government Security Gateway</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-snug">
                Authorized Operator & Administrator Console
              </h2>
              <p className="text-xs text-brand-200/90 leading-relaxed">
                Biometric access clearance gateway governing multi-modal citizen verification, hardware telemetry, and forensic audit ledgers.
              </p>
            </div>

            {/* Core Capability Checklist */}
            <div className="space-y-3 pt-3 text-xs text-brand-100/90">
              <div className="flex items-center space-x-2.5">
                <div className="w-5 h-5 rounded-md bg-emerald-500/20 flex items-center justify-center text-emerald-300 shrink-0">
                  <Camera className="w-3.5 h-3.5" />
                </div>
                <span>OpenCV LBPH Facial Recognition Model</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <div className="w-5 h-5 rounded-md bg-emerald-500/20 flex items-center justify-center text-emerald-300 shrink-0">
                  <Fingerprint className="w-3.5 h-3.5" />
                </div>
                <span>Grow R307S Hardware Optical Biometrics</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <div className="w-5 h-5 rounded-md bg-emerald-500/20 flex items-center justify-center text-emerald-300 shrink-0">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <span>Encrypted PostgreSQL Audit Logging</span>
              </div>
            </div>

            {/* Master Authority Badge */}
            <div className="p-3.5 rounded-xl bg-brand-900/80 border border-brand-700/60 text-xs">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">
                Master Root Authority
              </span>
              <p className="font-bold text-white text-xs mt-0.5">{MASTER_ADMIN_NAME}</p>
              <p className="font-mono text-[11px] text-brand-300">{MASTER_ADMIN_EMAIL}</p>
            </div>
          </div>

          {/* Bottom Kiosk Shortcut Button */}
          {onLaunchKiosk && (
            <div className="relative z-10 pt-6 border-t border-brand-800/80">
              <p className="text-[11px] text-brand-300 mb-2 font-medium">
                Operating a citizen verification station on-site?
              </p>
              <button
                type="button"
                onClick={onLaunchKiosk}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/40 text-emerald-300 hover:text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>Launch Hardware Terminal (Booth Mode)</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Authentication Card (7 cols) */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between">
          <div className="space-y-6">
            {/* Top Switcher Tabs */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setTab('signin')
                    setErrorMessage(null)
                    setSuccessMessage(null)
                  }}
                  className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                    tab === 'signin'
                      ? 'bg-white text-slate-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab('signup')
                    setErrorMessage(null)
                    setSuccessMessage(null)
                  }}
                  className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                    tab === 'signup'
                      ? 'bg-white text-slate-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Register Operator
                </button>
              </div>

              {tab === 'signin' && (
                <button
                  type="button"
                  onClick={fillMasterAdminCredentials}
                  className="text-[11px] font-semibold text-brand-700 hover:text-brand-900 bg-brand-50 hover:bg-brand-100 px-2.5 py-1 rounded-lg border border-brand-200 transition-colors cursor-pointer"
                >
                  Master Admin Credentials
                </button>
              )}
            </div>

            {/* Feedback Banners */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start space-x-2.5 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="font-semibold leading-relaxed">{successMessage}</span>
              </div>
            )}

            {/* ================= SIGN IN TAB ================= */}
            {tab === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Official Service Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      placeholder="masud.nil74@gmail.com"
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600 font-mono transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Security Access Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••••••"
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600 font-mono transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-xl bg-brand-900 hover:bg-brand-800 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-brand-950/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <span>{isLoading ? 'Verifying Credentials...' : 'Authenticate & Enter Console'}</span>
                    <ArrowRight className="w-4 h-4 text-emerald-400" />
                  </button>
                </div>
              </form>
            )}

            {/* ================= SIGN UP TAB ================= */}
            {tab === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Full Legal Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Masud Hasan"
                        value={signUpData.fullName}
                        onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Official Badge ID
                    </label>
                    <div className="relative">
                      <Award className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        placeholder="e.g. SEC-4892"
                        value={signUpData.badgeId}
                        onChange={(e) => setSignUpData({ ...signUpData, badgeId: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-mono focus:outline-none focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Official Service Email (Gmail / Government)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      placeholder="officer@gmail.com"
                      value={signUpData.email}
                      onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-mono focus:outline-none focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600 transition-all"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Verification link will be dispatched to this address.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Password (min 8 chars)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••••••"
                        value={signUpData.password}
                        onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                        className="w-full pl-10 pr-10 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-mono focus:outline-none focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••••••"
                        value={signUpData.confirmPassword}
                        onChange={(e) => setSignUpData({ ...signUpData, confirmPassword: e.target.value })}
                        className="w-full pl-10 pr-10 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-mono focus:outline-none focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Assigned Station / Kiosk
                    </label>
                    <div className="relative">
                      <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        placeholder="Terminal Alpha - Dhaka"
                        value={signUpData.stationId}
                        onChange={(e) => setSignUpData({ ...signUpData, stationId: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Requested Role
                    </label>
                    <select
                      value={signUpData.role}
                      onChange={(e: any) => setSignUpData({ ...signUpData, role: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none focus:border-brand-600 focus:bg-white cursor-pointer"
                    >
                      <option value="verification_officer">
                        Identity Verification Officer
                      </option>
                      <option value="registrar">
                        Biometric Enrollment Registrar
                      </option>
                      <option value="auditor">
                        Security & Compliance Auditor
                      </option>
                      <option value="super_admin">
                        Super Administrator
                      </option>
                    </select>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 leading-relaxed">
                  Notice: All operator registrations require email verification and subsequent approval by Master Administrator ({MASTER_ADMIN_NAME}).
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-xl bg-brand-900 hover:bg-brand-800 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-brand-950/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <span>{isLoading ? 'Submitting Registration...' : 'Submit Operator Registration'}</span>
                    <ArrowRight className="w-4 h-4 text-emerald-400" />
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Bottom Security Notice */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Platform v2.4 Enterprise</span>
            <span>Master Authority: {MASTER_ADMIN_EMAIL}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
