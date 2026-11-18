import React, { useState } from 'react'
import {
  Settings,
  Shield,
  Sliders,
  Save,
  CheckCircle2,
  Users,
  Lock,
} from 'lucide-react'

export const SettingsView: React.FC<{ isRoles?: boolean }> = ({ isRoles = false }) => {
  const [faceThreshold, setFaceThreshold] = useState(125)
  const [fpTimeout, setFpTimeout] = useState(15)
  const [kioskResetTime, setKioskResetTime] = useState(20)
  const [saved, setSaved] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (isRoles) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center space-x-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-brand-50 border border-brand-200/60 flex items-center justify-center">
              <Users className="w-4 h-4 text-brand-700" />
            </div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">
              User & Roles Management
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Role-Based Access Control (RBAC) governing biometric kiosk operators, registrars, and system administrators.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Operator Name</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Privileges</th>
                <th className="py-3.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-3.5 px-4 font-bold text-slate-800">
                  Shahriar Alom Masud
                </td>
                <td className="py-3.5 px-4">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 text-brand-800 border border-brand-200">
                    Super Admin
                  </span>
                </td>
                <td className="py-3.5 px-4 text-slate-600">
                  Full Root Access • Hardware Flash • Citizen Enrollment • Security Logs
                </td>
                <td className="py-3.5 px-4 text-right">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium text-slate-700">
                  Verification Officer 01
                </td>
                <td className="py-3.5 px-4">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    Operator
                  </span>
                </td>
                <td className="py-3.5 px-4 text-slate-600">
                  Identity Verification Initiation • Identity Lookup
                </td>
                <td className="py-3.5 px-4 text-right">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
        <div className="flex items-center space-x-2.5 mb-1">
          <div className="w-8 h-8 rounded-xl bg-brand-50 border border-brand-200/60 flex items-center justify-center">
            <Settings className="w-4 h-4 text-brand-700" />
          </div>
          <h1 className="text-lg font-bold text-slate-800 tracking-tight">
            System Parameters & Security Thresholds
          </h1>
        </div>
        <p className="text-xs text-slate-500">
          Tune OpenCV LBPH Euclidean distance thresholds, R307S timeout windows, and kiosk display intervals.
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            OpenCV LBPH Distance Threshold (Face Match)
          </label>
          <input
            type="number"
            min={50}
            max={200}
            value={faceThreshold}
            onChange={(e) => setFaceThreshold(Number(e.target.value))}
            className="w-full sm:w-64 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono text-sm focus:outline-none focus:border-brand-600"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Lower is stricter (e.g. 100); higher allows more lighting variance (default 125).
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Fingerprint Hardware Timeout (Seconds)
          </label>
          <input
            type="number"
            min={5}
            max={60}
            value={fpTimeout}
            onChange={(e) => setFpTimeout(Number(e.target.value))}
            className="w-full sm:w-64 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono text-sm focus:outline-none focus:border-brand-600"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Window allowed for citizen to place finger on optical prism before timeout.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Verification Screen Auto-Reset Interval (Seconds)
          </label>
          <input
            type="number"
            min={5}
            max={60}
            value={kioskResetTime}
            onChange={(e) => setKioskResetTime(Number(e.target.value))}
            className="w-full sm:w-64 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono text-sm focus:outline-none focus:border-brand-600"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Duration to display ACCESS GRANTED screen before returning to standby for next citizen.
          </p>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          {saved ? (
            <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Settings Saved Successfully
            </span>
          ) : (
            <span />
          )}

          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-brand-800 hover:bg-brand-900 text-white font-semibold text-xs transition-colors shadow-sm flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </form>
    </div>
  )
}

