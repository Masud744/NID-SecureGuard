import React, { useState, useEffect } from 'react'
import { Shield, ShieldCheck, ShieldAlert, Radio, Search, Filter } from 'lucide-react'
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
      .limit(50)
      .then((res: any) => {
        if (res.data) setLogs(res.data as SecurityLog[])
      })

    // Supabase Realtime Subscription!
    const channel = supabase
      .channel('security-logs-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'security_logs' },
        (payload: any) => {
          setLogs(prev => [payload.new as SecurityLog, ...prev])
        }
      )
      .subscribe((status: string) => {
        setIsLive(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const filteredLogs = logs.filter(log => {
    if (filter !== 'all' && log.access_decision !== filter) return false
    if (search && !log.nid_number?.toLowerCase().includes(search.toLowerCase()) && !log.failure_reason?.toLowerCase().includes(search.toLowerCase())) {
      return false
    }
    return true
  })

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-dark-850 rounded-2xl border border-dark-700 p-6 mb-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              <h1 className="text-xl font-bold text-white tracking-tight">Security Audit Trail</h1>
              {isLive && (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono">
                  <Radio className="w-3 h-3 animate-pulse" />
                  Realtime Active
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">Live immutable security event stream recorded by Supabase PostgreSQL.</p>
          </div>

          {/* Controls: Search + Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search NID or reason..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-4 py-1.5 rounded-xl bg-dark-900 border border-dark-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 w-48 sm:w-60"
              />
            </div>

            <div className="flex bg-dark-900 p-1 rounded-xl border border-dark-700 text-xs">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  filter === 'all' ? 'bg-dark-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('granted')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  filter === 'granted' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                Granted
              </button>
              <button
                onClick={() => setFilter('denied')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  filter === 'denied' ? 'bg-rose-500/20 text-rose-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                Denied
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-dark-850 rounded-2xl border border-dark-700 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-dark-900/60 text-slate-400 uppercase font-semibold border-b border-dark-700">
              <tr>
                <th className="px-5 py-3.5">Timestamp (UTC)</th>
                <th className="px-5 py-3.5">NID Reference</th>
                <th className="px-5 py-3.5">Face Result</th>
                <th className="px-5 py-3.5">Fingerprint</th>
                <th className="px-5 py-3.5">Decision</th>
                <th className="px-5 py-3.5">Diagnostics / Failure Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700/60 font-mono">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                    No security events recorded matching current filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const isGranted = log.access_decision === 'granted'
                  const date = new Date(log.created_at)
                  const timeStr = date.toLocaleTimeString('en-US', { hour12: false })
                  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

                  return (
                    <tr key={log.id} className="hover:bg-dark-800/40 transition-colors">
                      <td className="px-5 py-3.5 text-slate-400 whitespace-nowrap">
                        <span className="text-slate-200 font-semibold">{timeStr}</span>
                        <span className="text-[10px] text-slate-500 ml-1.5">{dateStr}</span>
                      </td>

                      <td className="px-5 py-3.5 font-bold text-white whitespace-nowrap">
                        {log.nid_number || 'N/A'}
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] ${
                          log.face_result === 'match'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-dark-800 text-slate-400'
                        }`}>
                          {log.face_result || 'no_face'}
                          {log.face_confidence !== null && log.face_confidence !== undefined && (
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({Math.round(log.face_confidence)})
                            </span>
                          )}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] ${
                          log.fingerprint_result === 'match'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-dark-800 text-slate-400'
                        }`}>
                          {log.fingerprint_result || 'error'}
                          {log.fingerprint_template_id && (
                            <span className="text-[10px] text-slate-400">
                              (Slot {log.fingerprint_template_id})
                            </span>
                          )}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
                          isGranted
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                          {isGranted ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                          {log.access_decision}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-slate-300 font-sans">
                        {log.failure_reason ? (
                          <span className="text-rose-400 text-xs font-mono">{log.failure_reason}</span>
                        ) : (
                          <span className="text-slate-500 text-xs">—</span>
                        )}
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
