import React, { useState } from 'react'
import { ShieldAlert, Clock, RefreshCw, LogOut, CheckCircle2 } from 'lucide-react'
import type { OperatorProfile } from '../lib/auth'

interface PendingApprovalViewProps {
  operator: OperatorProfile
  onSignOut: () => void
  onRefresh: () => Promise<void>
}

export const PendingApprovalView: React.FC<PendingApprovalViewProps> = ({
  operator,
  onSignOut,
  onRefresh,
}) => {
  const [checking, setChecking] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const handleCheck = async () => {
    setChecking(true)
    setNotice(null)
    try {
      await onRefresh()
      setNotice('Clearance verification refreshed. Account status checked.')
    } catch {
      setNotice('Unable to reach security gateway. Please try again.')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200/80 shadow-2xl p-6 sm:p-8 space-y-6 animate-in fade-in">
        {/* Header Badge */}
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold uppercase tracking-wider font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>Pending Security Clearance</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
              Account Awaiting Master Authorization
            </h2>
          </div>
        </div>

        {/* Informational Notice */}
        <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 text-xs text-amber-900 leading-relaxed">
          <p className="font-semibold text-amber-950 mb-1">
            Email Verified • Root Security Approval Required
          </p>
          Your official email has been confirmed. Under National Biometric Access regulations, newly registered operators and field officers must be individually authorized by the Master Administrator before system access is granted.
        </div>

        {/* Operator Profile Dossier */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
            <span className="text-slate-500">Applicant Identity</span>
            <span className="font-bold text-slate-800">{operator.fullName}</span>
          </div>
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
            <span className="text-slate-500">Verified Email</span>
            <span className="font-mono text-slate-700">{operator.email}</span>
          </div>
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
            <span className="text-slate-500">Assigned Badge ID</span>
            <span className="font-mono font-bold text-slate-800">{operator.badgeId}</span>
          </div>
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
            <span className="text-slate-500">Requested Station</span>
            <span className="text-slate-700">{operator.stationId}</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-500">Authorization Status</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
              PENDING ROOT APPROVAL
            </span>
          </div>
        </div>

        {/* Refresh Notice */}
        {notice && (
          <div className="p-3 rounded-lg bg-slate-100 text-slate-700 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {/* Action Controls */}
        <div className="space-y-2.5 pt-2">
          <button
            type="button"
            onClick={handleCheck}
            disabled={checking}
            className="w-full py-2.5 px-4 rounded-xl bg-brand-900 hover:bg-brand-800 text-white font-bold text-xs transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Checking Status...' : 'Check Approval Status'}</span>
          </button>

          <button
            type="button"
            onClick={onSignOut}
            className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-500" />
            <span>Sign Out & Return to Login</span>
          </button>
        </div>
      </div>
    </div>
  )
}
