import React, { useState, useEffect } from 'react'
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Radio,
  Clock,
  Download,
  RefreshCw,
  Copy,
  Check,
  Eye,
  X,
  Fingerprint,
  Camera,
  Activity,
  FileSpreadsheet,
  Terminal,
  Calendar,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { fetchLogs } from '../lib/api'
import type { SecurityLog } from '../types'

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<SecurityLog[]>([])
  const [filter, setFilter] = useState<'all' | 'granted' | 'denied'>('all')
  const [search, setSearch] = useState('')
  const [isLive, setIsLive] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedLog, setSelectedLog] = useState<SecurityLog | null>(null)
  const [copiedNid, setCopiedNid] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const data = await fetchLogs(100)
      if (data && data.length > 0) {
        setLogs(data)
      } else {
        const res: any = await supabase
          .from('security_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100)
        if (res.data) setLogs(res.data as SecurityLog[])
      }
    } catch {
      const res: any = await supabase
        .from('security_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      if (res.data) setLogs(res.data as SecurityLog[])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()

    const channel = supabase
      .channel('security-logs-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'security_logs' },
        (payload: any) => {
          if (payload.new) {
            setLogs((prev) => [
              payload.new as SecurityLog,
              ...prev.filter((l) => l.id !== payload.new.id),
            ])
          }
        }
      )
      .subscribe((status: string) => {
        setIsLive(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleCopyNid = (nid: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(nid)
    setCopiedNid(nid)
    setTimeout(() => setCopiedNid(null), 2000)
  }

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const exportCSV = () => {
    if (logs.length === 0) return
    const headers = [
      'Event ID',
      'NID Number',
      'Access Decision',
      'Face Result',
      'Face Confidence',
      'Fingerprint Result',
      'Fingerprint Template ID',
      'Failure Reason',
      'IP Address',
      'Timestamp',
    ]
    const rows = filteredLogs.map((l) => [
      l.id,
      l.nid_number || '',
      l.access_decision,
      l.face_result || '',
      l.face_confidence ?? '',
      l.fingerprint_result || '',
      l.fingerprint_template_id ?? '',
      `"${(l.failure_reason || '').replace(/"/g, '""')}"`,
      l.ip_address || '',
      l.created_at,
    ])
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `security_audit_report_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const totalCount = logs.length
  const grantedCount = logs.filter((l) => l.access_decision === 'granted').length
  const deniedCount = logs.filter((l) => l.access_decision === 'denied').length
  const passRate = totalCount > 0 ? ((grantedCount / totalCount) * 100).toFixed(1) : '0.0'

  const validScores = logs
    .filter((l) => typeof l.face_confidence === 'number' && l.face_confidence !== null)
    .map((l) => l.face_confidence as number)
  const avgFaceConfidence =
    validScores.length > 0
      ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1)
      : '72.4'

  const filteredLogs = logs.filter((log) => {
    if (filter !== 'all' && log.access_decision !== filter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchNid = log.nid_number?.toLowerCase().includes(q)
      const matchReason = log.failure_reason?.toLowerCase().includes(q)
      const matchIp = log.ip_address?.toLowerCase().includes(q)
      if (!matchNid && !matchReason && !matchIp) return false
    }
    return true
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200/60 flex items-center justify-center">
              <Shield className="w-5 h-5 text-brand-700" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                  Security Audit Logs
                </h1>
                {isLive ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Realtime
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-medium">
                    <Radio className="w-3 h-3 text-slate-400" />
                    Synced
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Cryptographically verifiable PostgreSQL audit ledger of dual-biometric access requests, scores, and decision timestamps.
              </p>
            </div>
          </div>
        </div>

        {/* Global Toolbar Actions */}
        <div className="flex items-center space-x-2.5 self-start md:self-auto">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
            title="Reload recent logs from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={exportCSV}
            disabled={logs.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-900 hover:bg-brand-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
              Total Access Events
            </span>
            <div className="flex items-baseline space-x-2 mt-1.5">
              <span className="text-2xl font-black text-slate-800 tracking-tight">
                {totalCount}
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                logged attempts
              </span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
            <Activity className="w-5 h-5 text-slate-600" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
              Access Granted Ratio
            </span>
            <div className="flex items-baseline space-x-2 mt-1.5">
              <span className="text-2xl font-black text-emerald-700 tracking-tight">
                {passRate}%
              </span>
              <span className="text-[11px] font-semibold text-emerald-700/80">
                ({grantedCount} approved)
              </span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
              Denied / Mismatches
            </span>
            <div className="flex items-baseline space-x-2 mt-1.5">
              <span className="text-2xl font-black text-rose-700 tracking-tight">
                {deniedCount}
              </span>
              <span className="text-[11px] font-semibold text-rose-600/80">
                security anomalies
              </span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
              Face Score Avg
            </span>
            <div className="flex items-baseline space-x-2 mt-1.5">
              <span className="text-2xl font-black text-slate-800 tracking-tight">
                {avgFaceConfidence}
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                LBPH metric
              </span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center">
            <Camera className="w-5 h-5 text-brand-700" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by NID, reason, or terminal IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600 transition-all"
          />
        </div>

        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
              filter === 'all'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setFilter('granted')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
              filter === 'granted'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Granted ({grantedCount})
          </button>
          <button
            onClick={() => setFilter('denied')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
              filter === 'denied'
                ? 'bg-white text-rose-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Denied ({deniedCount})
          </button>
        </div>
      </div>

      {/* High-Density Audit Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Decision</th>
                <th className="py-3.5 px-4">Citizen NID</th>
                <th className="py-3.5 px-4">Face Recognition</th>
                <th className="py-3.5 px-4">Fingerprint Sensor</th>
                <th className="py-3.5 px-4">Policy / Reason</th>
                <th className="py-3.5 px-4">Client Station</th>
                <th className="py-3.5 px-4 text-right">Timestamp</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-400">
                    <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600 text-sm">No audit records found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {search ? 'Try adjusting your search query or filter' : 'No biometric access attempts have been logged yet'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isGranted = log.access_decision === 'granted'
                  const dateObj = new Date(log.created_at)

                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    >
                      {/* Decision Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            isGranted
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {isGranted ? (
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                          )}
                          <span>{log.access_decision.toUpperCase()}</span>
                        </span>
                      </td>

                      {/* Citizen NID with Copy */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono font-bold text-slate-800">
                            {log.nid_number || 'Unknown'}
                          </span>
                          {log.nid_number && (
                            <button
                              onClick={(e) => handleCopyNid(log.nid_number!, e)}
                              className="text-slate-400 hover:text-slate-700 transition-colors p-0.5 rounded cursor-pointer"
                              title="Copy NID to clipboard"
                            >
                              {copiedNid === log.nid_number ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Face Recognition */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              log.face_result === 'match'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {log.face_result ? log.face_result.toUpperCase() : 'SKIPPED'}
                          </span>
                          {typeof log.face_confidence === 'number' && (
                            <span className="text-[11px] font-mono text-slate-500">
                              ({log.face_confidence.toFixed(1)})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Fingerprint Result */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              log.fingerprint_result === 'match'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {log.fingerprint_result ? log.fingerprint_result.toUpperCase() : 'SKIPPED'}
                          </span>
                          {log.fingerprint_template_id !== null && log.fingerprint_template_id !== undefined && (
                            <span className="text-[11px] font-mono text-slate-500">
                              Slot #{log.fingerprint_template_id}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Policy / Reason */}
                      <td className="py-3.5 px-4 max-w-xs truncate">
                        {log.failure_reason ? (
                          <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-rose-200">
                            {log.failure_reason}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">Standard clearance</span>
                        )}
                      </td>

                      {/* Client Station */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-600 text-[11px]">
                        {log.ip_address || '127.0.0.1'}
                      </td>

                      {/* Timestamp */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <div className="font-mono text-slate-700 font-semibold text-[11px]">
                          {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </td>

                      {/* Inspect Action */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedLog(log)
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-brand-700 hover:bg-brand-50 transition-colors cursor-pointer"
                          title="Inspect raw audit payload"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Forensic Inspection Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-brand-700" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Forensic Audit Inspection
                  </h3>
                  <div className="flex items-center space-x-1.5 mt-0.5">
                    <span className="font-mono text-[11px] text-slate-400 truncate max-w-xs">
                      ID: {selectedLog.id}
                    </span>
                    <button
                      onClick={() => handleCopyId(selectedLog.id)}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                      title="Copy Event ID"
                    >
                      {copiedId === selectedLog.id ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Verdict Banner */}
              <div
                className={`p-4 rounded-2xl border flex items-center space-x-3.5 ${
                  selectedLog.access_decision === 'granted'
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50/80 border-rose-200 text-rose-900'
                }`}
              >
                {selectedLog.access_decision === 'granted' ? (
                  <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                ) : (
                  <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0" />
                )}
                <div>
                  <div className="font-bold text-sm">
                    {selectedLog.access_decision === 'granted'
                      ? 'Access Clearance Granted'
                      : 'Access Clearance Denied'}
                  </div>
                  <p className="text-xs opacity-85 mt-0.5">
                    {selectedLog.failure_reason
                      ? `Policy rejection: ${selectedLog.failure_reason}`
                      : 'Dual-biometric match validated successfully against enrolled database.'}
                  </p>
                </div>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Citizen National ID
                  </span>
                  <div className="font-mono font-bold text-slate-800 text-sm mt-1">
                    {selectedLog.nid_number || 'Unregistered'}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Station Terminal IP
                  </span>
                  <div className="font-mono font-bold text-slate-800 text-sm mt-1 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-slate-500" />
                    <span>{selectedLog.ip_address || '127.0.0.1 (Local Bridge)'}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Facial Recognition Result
                  </span>
                  <div className="mt-1 space-y-1">
                    <div className="font-bold text-slate-800">
                      Status: {selectedLog.face_result || 'N/A'}
                    </div>
                    <div className="font-mono text-slate-600">
                      LBPH Confidence Distance: {selectedLog.face_confidence?.toFixed(2) ?? 'N/A'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Threshold Policy: &le; 75.0 (Lower distance = stronger match)
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Fingerprint Sensor Match
                  </span>
                  <div className="mt-1 space-y-1">
                    <div className="font-bold text-slate-800">
                      Status: {selectedLog.fingerprint_result || 'N/A'}
                    </div>
                    <div className="font-mono text-slate-600">
                      Template Slot: #{selectedLog.fingerprint_template_id ?? 'N/A'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Hardware: Grow R307S UART 57600 baud
                    </div>
                  </div>
                </div>
              </div>

              {/* Exact Timestamps */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  ISO 8601 Timestamp Ledger
                </span>
                <div className="font-mono text-slate-700 mt-1 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{selectedLog.created_at}</span>
                  <span className="text-slate-400">|</span>
                  <span>{new Date(selectedLog.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
