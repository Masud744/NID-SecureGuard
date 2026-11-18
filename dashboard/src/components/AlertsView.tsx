import React, { useState, useEffect, useCallback } from 'react'
import {
  Bell,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Info,
  Check,
  Search,
  Filter,
  Download,
  RefreshCw,
  ExternalLink,
  Shield,
  Activity,
  Cpu,
  Wifi,
  UserX,
  X,
  Eye,
  FileSpreadsheet,
  RotateCcw,
} from 'lucide-react'
import { fetchLogs } from '../lib/api'
import type { SecurityLog } from '../types'

export interface Incident {
  id: string
  title: string
  description: string
  category: 'biometric' | 'hardware' | 'network'
  severity: 'high' | 'medium' | 'low'
  subsystem: string
  affectedEntity?: string
  timestamp: string
  rawLogId?: string
  resolved: boolean
  rootCause?: string
  recommendation?: string
}

interface AlertsViewProps {
  onNavigate?: (tab: any) => void
  onAlertCountChange?: (count: number) => void
}

const RESOLVED_STORAGE_KEY = 'nid_secureguard_resolved_incident_ids'
const ACTIVE_COUNT_KEY = 'nid_secureguard_active_alerts_count'

function getStoredResolvedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(RESOLVED_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return new Set(parsed)
      }
    }
  } catch (e) {
    console.error('Failed to read resolved incident storage:', e)
  }
  return new Set()
}

function saveStoredResolvedIds(ids: Set<string>) {
  try {
    localStorage.setItem(RESOLVED_STORAGE_KEY, JSON.stringify(Array.from(ids)))
  } catch (e) {
    console.error('Failed to save resolved incident storage:', e)
  }
}

export const AlertsView: React.FC<AlertsViewProps> = ({ onNavigate, onAlertCountChange }) => {
  const [incidents, setIncidents] = useState<Incident[]>(() => {
    const resolvedIds = getStoredResolvedIds()
    return [
      {
        id: 'INC-1092',
        title: 'Biometric Discrepancy: Face Mismatch & Rejection',
        description:
          'Verification attempt for NID 1122334455667 failed LBPH distance threshold (score 125.9 > max 75.0). Access denied per dual-policy mandate.',
        category: 'biometric',
        severity: 'high',
        subsystem: 'BIOMETRIC_LBPH',
        affectedEntity: 'NID: 1122334455667',
        timestamp: 'Today, 01:47:06 UTC',
        resolved: resolvedIds.has('INC-1092'),
        rootCause: 'Camera captured face distance exceeded algorithm confidence threshold (score 125.94).',
        recommendation: 'Verify subject ambient lighting or prompt citizen to perform re-enrollment in Biometric Enrollment Studio.',
      },
      {
        id: 'INC-1091',
        title: 'Camera DMA Buffer Overflow Auto-Recovered',
        description:
          'ESP32 camera HAL driver stabilized frame queue with CAMERA_GRAB_WHEN_EMPTY policy. Frame buffer cleared without dropping telemetry.',
        category: 'hardware',
        severity: 'low',
        subsystem: 'CAMERA_DMA',
        affectedEntity: 'OV2640 DVP DMA',
        timestamp: 'Today, 00:28:40 UTC',
        resolved: resolvedIds.has('INC-1091'),
        rootCause: 'High resolution frame capture caused transient buffer pressure in internal SRAM.',
        recommendation: 'Ensure camera clock remains configured at 10MHz XCLK on ESP32-S3.',
      },
      {
        id: 'INC-1089',
        title: 'Tunnel Connection Established via Cloudflare',
        description:
          'ESP32 hardware node successfully established encrypted WebSocket/HTTPS reverse tunnel over local gateway bridge.',
        category: 'network',
        severity: 'low',
        subsystem: 'TUNNEL_BRIDGE',
        affectedEntity: 'Cloudflare Edge',
        timestamp: 'Yesterday, 23:28:15 UTC',
        resolved: true,
        rootCause: 'Initial boot handshake established secure socket routing.',
        recommendation: 'No action required. Telemetry link operating within standard latency margins.',
      },
    ]
  })

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'biometric' | 'hardware' | 'resolved'>('all')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)

  // Sync active count to parent and localStorage
  const syncActiveCount = useCallback((list: Incident[]) => {
    const active = list.filter((i) => !i.resolved).length
    try {
      localStorage.setItem(ACTIVE_COUNT_KEY, String(active))
    } catch {}
    onAlertCountChange?.(active)
  }, [onAlertCountChange])

  // Fetch real security logs from backend and attach persistence
  const loadRecentAlarms = async () => {
    setIsLoading(true)
    try {
      const resolvedIds = getStoredResolvedIds()
      const logs: SecurityLog[] = await fetchLogs(30)
      const deniedLogs = logs.filter((l) => l.access_decision === 'denied')

      setIncidents((prev) => {
        const existingMap = new Map<string, Incident>(prev.map((i) => [i.id, i]))

        deniedLogs.forEach((log) => {
          const shortId = 'INC-' + log.id.slice(0, 4).toUpperCase()
          const isResolved = resolvedIds.has(shortId)

          if (!existingMap.has(shortId)) {
            existingMap.set(shortId, {
              id: shortId,
              title: `Biometric Security Alert: ${log.failure_reason || 'Verification Denied'}`,
              description: `Subject presenting NID ${log.nid_number || 'Unknown'} failed security policy: ${
                log.failure_reason || 'Access rejected'
              }. Face score: ${log.face_confidence?.toFixed(1) ?? 'N/A'}.`,
              category: 'biometric',
              severity: 'high',
              subsystem: 'VERIFICATION_GATEWAY',
              affectedEntity: log.nid_number ? `NID: ${log.nid_number}` : 'Unregistered Identity',
              timestamp: new Date(log.created_at).toLocaleString(),
              rawLogId: log.id,
              resolved: isResolved,
              rootCause: `Dual policy rejection: ${log.failure_reason || 'Modality mismatch'}.`,
              recommendation: 'Audit biometric credential log in Security Audit Logs.',
            })
          } else {
            // Keep existing entity and ensure resolution matches persistent store
            const existing = existingMap.get(shortId)!
            if (isResolved) {
              existing.resolved = true
            }
          }
        })

        // Also ensure base items match stored resolution
        existingMap.forEach((inc) => {
          if (resolvedIds.has(inc.id)) {
            inc.resolved = true
          }
        })

        const updated = Array.from(existingMap.values())
        syncActiveCount(updated)
        return updated
      })
    } catch {
      // Keep state on failure
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadRecentAlarms()
  }, [])

  const toggleResolve = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const resolvedIds = getStoredResolvedIds()

    setIncidents((prev) => {
      let nextResolved = false
      const next = prev.map((inc) => {
        if (inc.id === id) {
          nextResolved = !inc.resolved
          return { ...inc, resolved: nextResolved }
        }
        return inc
      })

      if (nextResolved) {
        resolvedIds.add(id)
      } else {
        resolvedIds.delete(id)
      }
      saveStoredResolvedIds(resolvedIds)
      syncActiveCount(next)
      return next
    })
  }

  const resolveAll = () => {
    const resolvedIds = getStoredResolvedIds()
    setIncidents((prev) => {
      const next = prev.map((inc) => {
        resolvedIds.add(inc.id)
        return { ...inc, resolved: true }
      })
      saveStoredResolvedIds(resolvedIds)
      syncActiveCount(next)
      return next
    })
  }

  const resetAllIncidents = () => {
    try {
      localStorage.removeItem(RESOLVED_STORAGE_KEY)
    } catch {}
    setIncidents((prev) => {
      const next = prev.map((inc) => ({
        ...inc,
        resolved: inc.id === 'INC-1089', // keep cloudflare tunnel as naturally resolved
      }))
      syncActiveCount(next)
      return next
    })
  }

  const exportCSV = () => {
    const headers = [
      'Incident ID',
      'Title',
      'Category',
      'Severity',
      'Subsystem',
      'Affected Entity',
      'Status',
      'Timestamp',
      'Root Cause',
    ]
    const rows = filteredIncidents.map((i) => [
      i.id,
      `"${i.title.replace(/"/g, '""')}"`,
      i.category,
      i.severity,
      i.subsystem,
      `"${(i.affectedEntity || '').replace(/"/g, '""')}"`,
      i.resolved ? 'Resolved' : 'Active',
      `"${i.timestamp}"`,
      `"${(i.rootCause || '').replace(/"/g, '""')}"`,
    ])
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `security_incidents_report_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Filter calculations
  const totalCount = incidents.length
  const activeCount = incidents.filter((i) => !i.resolved).length
  const biometricCount = incidents.filter((i) => i.category === 'biometric' && !i.resolved).length
  const hardwareCount = incidents.filter((i) => (i.category === 'hardware' || i.category === 'network') && !i.resolved).length
  const highSeverityCount = incidents.filter((i) => i.severity === 'high' && !i.resolved).length

  const filteredIncidents = incidents.filter((inc) => {
    if (filter === 'active' && inc.resolved) return false
    if (filter === 'resolved' && !inc.resolved) return false
    if (filter === 'biometric' && inc.category !== 'biometric') return false
    if (filter === 'hardware' && inc.category !== 'hardware' && inc.category !== 'network') return false

    if (search.trim()) {
      const q = search.toLowerCase()
      const matchId = inc.id.toLowerCase().includes(q)
      const matchTitle = inc.title.toLowerCase().includes(q)
      const matchDesc = inc.description.toLowerCase().includes(q)
      const matchEntity = inc.affectedEntity?.toLowerCase().includes(q)
      if (!matchId && !matchTitle && !matchDesc && !matchEntity) return false
    }
    return true
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200/60 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                  Security Alerts & Incidents
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    activeCount > 0
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      activeCount > 0 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'
                    }`}
                  />
                  <span>{activeCount} Active</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Real-time incident response ledger for unauthorized biometric attempts, sensor faults, and hardware telemetry alarms.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2.5 self-start md:self-auto flex-wrap gap-y-2">
          <button
            onClick={loadRecentAlarms}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
            title="Scan database for new security alarms"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Scan Alarms</span>
          </button>

          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Report</span>
          </button>

          {activeCount > 0 ? (
            <button
              onClick={resolveAll}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-900 hover:bg-brand-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Resolve All</span>
            </button>
          ) : (
            <button
              onClick={resetAllIncidents}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
              title="Reset resolved state for demonstration"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reopen Incidents</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Threat Intelligence Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
              Active Incidents
            </span>
            <div className="flex items-baseline space-x-2 mt-1.5">
              <span className={`text-2xl font-black tracking-tight ${activeCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                {activeCount}
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                unresolved alerts
              </span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
              Biometric Mismatches
            </span>
            <div className="flex items-baseline space-x-2 mt-1.5">
              <span className="text-2xl font-black text-amber-700 tracking-tight">
                {biometricCount}
              </span>
              <span className="text-[11px] font-medium text-amber-700/80">
                policy violations
              </span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
            <UserX className="w-5 h-5 text-amber-600" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
              Hardware & Telemetry
            </span>
            <div className="flex items-baseline space-x-2 mt-1.5">
              <span className="text-2xl font-black text-slate-800 tracking-tight">
                {hardwareCount}
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                recovered alerts
              </span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
            <Cpu className="w-5 h-5 text-slate-600" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
              System Threat Posture
            </span>
            <div className="flex items-baseline space-x-2 mt-1.5">
              <span className={`text-xl font-black tracking-tight ${highSeverityCount > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {highSeverityCount > 0 ? 'ELEVATED' : 'SECURE'}
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                Guarded
              </span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
            <Shield className="w-5 h-5 text-emerald-600" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search alerts by incident ID, NID, or message..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600 transition-all"
          />
        </div>

        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl overflow-x-auto text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              filter === 'all'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              filter === 'active'
                ? 'bg-white text-rose-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setFilter('biometric')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              filter === 'biometric'
                ? 'bg-white text-amber-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Biometric ({biometricCount})
          </button>
          <button
            onClick={() => setFilter('hardware')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              filter === 'hardware'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Hardware & Network ({hardwareCount})
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              filter === 'resolved'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Resolved ({totalCount - activeCount})
          </button>
        </div>
      </div>

      {/* Incidents Stream List */}
      <div className="space-y-3.5">
        {filteredIncidents.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-xs">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h3 className="font-bold text-slate-800 text-sm">
              {filter === 'active' ? 'All Incidents Resolved' : 'No Incidents Matching Criteria'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {filter === 'active'
                ? 'There are currently zero active alarms. All events have been investigated and marked resolved.'
                : search
                ? 'Try adjusting your search terms or filter selection.'
                : 'All system parameters and biometric access policies are operating cleanly.'}
            </p>
          </div>
        ) : (
          filteredIncidents.map((inc) => {
            const isHigh = inc.severity === 'high'
            const isMedium = inc.severity === 'medium'

            return (
              <div
                key={inc.id}
                onClick={() => setSelectedIncident(inc)}
                className={`bg-white rounded-2xl p-5 border shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:border-slate-300 ${
                  inc.resolved
                    ? 'border-slate-200/60 opacity-65 bg-slate-50/40'
                    : isHigh
                    ? 'border-rose-200 hover:border-rose-300'
                    : isMedium
                    ? 'border-amber-200 hover:border-amber-300'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Left Meta & Content */}
                <div className="flex items-start space-x-4">
                  {/* Category / Severity Icon */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 border ${
                      inc.resolved
                        ? 'bg-slate-100 border-slate-200 text-slate-500'
                        : isHigh
                        ? 'bg-rose-50 border-rose-200 text-rose-600'
                        : isMedium
                        ? 'bg-amber-50 border-amber-200 text-amber-600'
                        : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                  >
                    {inc.resolved ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : isHigh ? (
                      <ShieldAlert className="w-5 h-5" />
                    ) : isMedium ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : inc.category === 'hardware' ? (
                      <Cpu className="w-5 h-5" />
                    ) : (
                      <Wifi className="w-5 h-5" />
                    )}
                  </div>

                  <div className="space-y-1.5 flex-1">
                    {/* Header Chips */}
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="font-mono text-xs font-bold text-slate-800">
                        {inc.id}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                          inc.resolved
                            ? 'bg-slate-100 text-slate-600 border-slate-200'
                            : isHigh
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : isMedium
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {inc.severity} priority
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px] font-semibold border border-slate-200">
                        {inc.subsystem}
                      </span>
                      {inc.resolved && (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                          Resolved
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-slate-800 text-sm">{inc.title}</h3>

                    {/* Description */}
                    <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
                      {inc.description}
                    </p>

                    {/* Footer Metadata */}
                    <div className="flex items-center space-x-4 text-[11px] text-slate-400 pt-1 flex-wrap gap-y-1">
                      <div className="flex items-center space-x-1.5 font-mono">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{inc.timestamp}</span>
                      </div>
                      {inc.affectedEntity && (
                        <div className="flex items-center space-x-1.5">
                          <span className="text-slate-400 font-semibold">Entity:</span>
                          <span className="font-mono font-bold text-slate-700">
                            {inc.affectedEntity}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Action Controls */}
                <div className="flex items-center space-x-2 self-start md:self-center shrink-0 pt-2 md:pt-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedIncident(inc)
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors flex items-center space-x-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>Investigate</span>
                  </button>
                  <button
                    onClick={(e) => toggleResolve(inc.id, e)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                      inc.resolved
                        ? 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{inc.resolved ? 'Reopen' : 'Mark Resolved'}</span>
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Incident Investigation Dossier Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                    selectedIncident.severity === 'high'
                      ? 'bg-rose-50 border-rose-200 text-rose-600'
                      : 'bg-amber-50 border-amber-200 text-amber-600'
                  }`}
                >
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Incident Dossier: {selectedIncident.id}
                  </h3>
                  <div className="flex items-center space-x-2 mt-0.5 text-xs text-slate-500 font-mono">
                    <span>Subsystem: {selectedIncident.subsystem}</span>
                    <span>|</span>
                    <span>Severity: {selectedIncident.severity.toUpperCase()}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedIncident(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Status Banner */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between ${
                  selectedIncident.resolved
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50/80 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {selectedIncident.resolved ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                  )}
                  <div>
                    <span className="font-bold">
                      {selectedIncident.resolved ? 'Incident Status: Resolved' : 'Incident Status: Active Alarm'}
                    </span>
                    <p className="text-[11px] opacity-80 mt-0.5">{selectedIncident.title}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleResolve(selectedIncident.id)}
                  className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-slate-800 font-semibold shadow-xs hover:bg-slate-50 cursor-pointer"
                >
                  {selectedIncident.resolved ? 'Reopen Incident' : 'Mark Resolved'}
                </button>
              </div>

              {/* Incident Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Affected Entity
                  </span>
                  <div className="font-mono font-bold text-slate-800 text-sm mt-1">
                    {selectedIncident.affectedEntity || 'None recorded'}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Telemetry Timestamp
                  </span>
                  <div className="font-mono font-bold text-slate-800 text-sm mt-1">
                    {selectedIncident.timestamp}
                  </div>
                </div>
              </div>

              {/* Root Cause Diagnostics */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Root Cause Diagnostics
                </span>
                <p className="text-slate-700 leading-relaxed font-medium">
                  {selectedIncident.rootCause || selectedIncident.description}
                </p>
              </div>

              {/* Recommended Security Response */}
              <div className="p-4 rounded-xl bg-brand-50/60 border border-brand-200/80 space-y-1">
                <span className="text-[11px] font-semibold text-brand-800 uppercase tracking-wider block">
                  Recommended Operator Action
                </span>
                <p className="text-slate-700 leading-relaxed font-medium">
                  {selectedIncident.recommendation || 'Examine security audit log entries and verify hardware bridge status.'}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
              {onNavigate && selectedIncident.category === 'biometric' ? (
                <button
                  onClick={() => {
                    setSelectedIncident(null)
                    onNavigate('logs')
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-900 text-white font-semibold hover:bg-brand-800 transition-colors cursor-pointer text-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Open Security Audit Logs</span>
                </button>
              ) : (
                <div />
              )}

              <button
                onClick={() => setSelectedIncident(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
