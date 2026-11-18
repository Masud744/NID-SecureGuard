import React, { useState, useEffect } from 'react'
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Mail,
  UserCheck,
  Users,
  Shield,
  Key,
  Check,
  X,
  Building,
} from 'lucide-react'
import {
  fetchPendingOperators,
  fetchApprovedOperators,
  apiApproveOperator,
  apiRejectOperator,
  type OperatorRecord,
} from '../lib/api'
import { MASTER_ADMIN_EMAIL, MASTER_ADMIN_NAME, type OperatorProfile } from '../lib/auth'

export const OperatorApprovalsView: React.FC<{ operator: OperatorProfile | null }> = ({
  operator,
}) => {
  const [pendingRequests, setPendingRequests] = useState<OperatorRecord[]>([])
  const [approvedList, setApprovedList] = useState<OperatorRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [pending, approved] = await Promise.all([
        fetchPendingOperators(),
        fetchApprovedOperators(),
      ])
      setPendingRequests(pending)
      setApprovedList(approved)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleApprove = async (req: OperatorRecord) => {
    const success = await apiApproveOperator(req.id)
    if (success) {
      setNotice(`Authorization granted: Operator ${req.fullName} (${req.email}) may now sign in.`)
      loadData()
    } else {
      setNotice(`Failed to authorize operator ${req.fullName}.`)
    }
    setTimeout(() => setNotice(null), 4000)
  }

  const handleReject = async (req: OperatorRecord) => {
    const success = await apiRejectOperator(req.id)
    if (success) {
      setNotice(`Registration rejected: Operator request for ${req.email} was purged from database.`)
      loadData()
    } else {
      setNotice(`Failed to purge request for ${req.email}.`)
    }
    setTimeout(() => setNotice(null), 4000)
  }

  const totalActive = approvedList.length
  const superAdminCount = approvedList.filter((o) => o.role === 'super_admin' || o.isMaster).length
  const officerCount = approvedList.filter((o) => o.role !== 'super_admin' && !o.isMaster).length

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* 1. Sovereign Command Banner */}
      <div className="bg-brand-900 text-white rounded-2xl p-6 sm:p-8 border border-brand-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 font-mono">
                  Sovereign Access Governance
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Master Root Authority
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mt-1">
                Operator Identity Authorizations & Approvals
              </h2>
              <p className="text-xs text-brand-200/80 mt-1 max-w-2xl leading-relaxed">
                Central security command governing terminal operators and administrative access. All operator registrations require manual security clearance from this sovereign root console.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-brand-800 hover:bg-brand-700 text-emerald-300 font-bold text-xs border border-brand-600/40 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Syncing...' : 'Sync Database'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Feedback Notice Banner */}
      {notice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* 3. KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block">Total Active Personnel</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{totalActive}</div>
            <span className="text-[11px] text-emerald-600 font-semibold">Authorized in DB</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block">Pending Authorizations</span>
            <div className="text-2xl font-black text-amber-600 mt-1">{pendingRequests.length}</div>
            <span className="text-[11px] text-amber-600 font-semibold">Awaiting Clearance</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block">Root Administrators</span>
            <div className="text-2xl font-black text-brand-900 mt-1">{superAdminCount}</div>
            <span className="text-[11px] text-slate-500 font-semibold">Level 4 Authority</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-800">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block">Terminal Officers</span>
            <div className="text-2xl font-black text-slate-800 mt-1">{officerCount}</div>
            <span className="text-[11px] text-slate-500 font-semibold">Field Verification</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 4. Pending Operator Authorization Queue */}
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
          <span className="text-xs text-slate-500">
            Live Database Synchronization Active
          </span>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-slate-50/60 border border-dashed border-slate-200 flex flex-col items-center justify-center space-y-2">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            <p className="text-xs font-bold text-slate-700">
              All Operator Registrations Reconciled
            </p>
            <p className="text-[11px] text-slate-500 max-w-md">
              There are currently no operator accounts awaiting authorization in the database. When a new personnel registers and confirms their email, their security profile will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
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

      {/* 5. Active System Personnel Directory */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">
              Active Authorized Personnel Directory
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified security personnel holding active clearance in PostgreSQL database.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {totalActive} Active Operators
          </span>
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
                    <div className="w-8 h-8 rounded-full bg-brand-900 text-white font-bold text-xs flex items-center justify-center shadow-xs">
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
                  Full Root Sovereignty • Operator Clearance & Revocation • System Database Authority
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

              {/* Dynamic Database Approved Operators */}
              {approvedList
                .filter(
                  (op) =>
                    !op.isMaster &&
                    op.email.toLowerCase() !== MASTER_ADMIN_EMAIL.toLowerCase()
                )
                .map((op) => (
                  <tr key={op.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">
                          {op.fullName ? op.fullName.slice(0, 2).toUpperCase() : 'OP'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{op.fullName}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{op.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {op.role === 'super_admin'
                          ? 'Administrator'
                          : op.role === 'registrar'
                          ? 'Biometric Registrar'
                          : op.role === 'auditor'
                          ? 'Compliance Auditor'
                          : 'Terminal Operator'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-600 text-[11px] max-w-sm">
                      Station: {op.stationId} • Badge: {op.badgeId} • Biometric Clearance Verification
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        Level 2 (Operator)
                      </span>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap text-right">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Approved
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

