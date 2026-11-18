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
  ArrowUpRight,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { SecurityLog } from '../types'

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<SecurityLog[]>([])
  const [filter, setFilter] = useState<'all' | 'granted' | 'denied'>('all')
  const [search, setSearch] = useState('')
  const [isLive, setIsLive] = useState(false)

  // Initial load
  useEffect(() => {
    supabase
      .from('security_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(60)
      .then((res: any) => {
        if (res.data) setLogs(res.data as SecurityLog[])
      })

    // Supabase Realtime Subscription
    const channel = supabase
      .channel('security-logs-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'security_logs' },
        (payload: any) => {
          setLogs((prev) => [payload.new as SecurityLog, ...prev])
        }
      )
      .subscribe((status: string) => {
        setIsLive(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const filteredLogs = logs.filter((log) => {
    if (filter !== 'all' && log.access_decision !== filter) return false
    if (
      search &&
      !log.nid_number?.toLowerCase().includes(search.toLowerCase()) &&
      !log.failure_reason?.toLowerCase().includes(search.toLowerCase())
    ) {
      return false
    }
    return true
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-50 border border-brand-200/60 flex items-center justify-center">
              <Shield className="w-4 h-4 text-brand-700" />
            </div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">
              Security Audit Logs
            </h1>
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Realtime
              </span>
            ) : (
              <span className="text-xs text-slate-400">Syncing...</span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Immutable PostgreSQL audit ledger of dual-biometric access requests, scores, and decision timestamps.
          </p>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex items-center space-x-2.5 flex-wrap gap-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter by NID or failure reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600 w-56 sm:w-64 transition-all"
            />
          </div>

          <div className="bg-slate-100 p-1 rounded-xl flex items-center space-x-1 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-white text-slate-800 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({logs.length})
            </button>
            <button
              onClick={() => setFilter('granted')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filter === 'granted'
                  ? 'bg-white text-emerald-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Granted
            </button>
            <button
              onClick={() => setFilter('denied')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filter === 'denied'
                  ? 'bg-white text-rose-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Denied
            </button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Decision</th>
                <th className="py-3.5 px-4">Citizen NID</th>
                <th className="py-3.5 px-4">Face Result</th>
                <th className="py-3.5 px-4">Fingerprint</th>
                <th className="py-3.5 px-4">Failure Reason</th>
                <th className="py-3.5 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    No security events found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isGranted = log.access_decision === 'granted'

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            isGranted
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {isGranted ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          )}
                          <span>{log.access_decision.toUpperCase()}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap font-mono font-semibold text-slate-800">
                        {log.nid_number || '—'}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`font-semibold ${
                            log.face_result === 'match'
                              ? 'text-emerald-700'
                              : 'text-slate-500'
                          }`}
                        >
                          {log.face_result || '—'}
                        </span>
                        {log.face_confidence !== null && log.face_confidence !== undefined && (
                          <span className="text-[11px] text-slate-400 font-mono ml-1.5">
                            ({log.face_confidence.toFixed(1)})
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`font-semibold ${
                            log.fingerprint_result === 'match'
                              ? 'text-emerald-700'
                              : 'text-slate-500'
                          }`}
                        >
                          {log.fingerprint_result || '—'}
                        </span>
                        {log.fingerprint_template_id !== null && log.fingerprint_template_id !== undefined && (
                          <span className="text-[11px] text-slate-400 font-mono ml-1.5">
                            (Slot {log.fingerprint_template_id})
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                        {log.failure_reason ? (
                          <span className="text-rose-600 font-medium">
                            {log.failure_reason}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-right font-mono text-[11px] text-slate-500">
                        {log.created_at
                          ? new Date(log.created_at).toLocaleString()
                          : '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
