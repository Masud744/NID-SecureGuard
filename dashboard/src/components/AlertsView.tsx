import React, { useState } from 'react'
import {
  Bell,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Info,
  Check,
} from 'lucide-react'

interface Incident {
  id: string
  title: string
  description: string
  severity: 'high' | 'medium' | 'low'
  timestamp: string
  resolved: boolean
}

export const AlertsView: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([
    {
      id: 'INC-1092',
      title: 'Biometric Discrepancy: Fingerprint Mismatch',
      description:
        'Verification attempt for NID 1998123456789 presented a non-matching finger. Access denied per dual-policy rule.',
      severity: 'medium',
      timestamp: 'Today, 00:31:00 UTC',
      resolved: false,
    },
    {
      id: 'INC-1091',
      title: 'Camera DMA Buffer Overflow Auto-Recovered',
      description:
        'ESP32 camera HAL stabilized with CAMERA_GRAB_WHEN_EMPTY and 1-frame queue. Frame rate normalized.',
      severity: 'low',
      timestamp: 'Today, 00:28:40 UTC',
      resolved: false,
    },
    {
      id: 'INC-1089',
      title: 'Tunnel Connection Established via Cloudflare',
      description:
        'ESP32 successfully bridged via outbound WebSocket/HTTPS tunnel over cellular hotspot.',
      severity: 'low',
      timestamp: 'Yesterday, 23:28:15 UTC',
      resolved: true,
    },
  ])

  const toggleResolve = (id: string) => {
    setIncidents((prev) =>
      prev.map((inc) => (inc.id === id ? { ...inc, resolved: !inc.resolved } : inc))
    )
  }

  const activeAlerts = incidents.filter((i) => !i.resolved).length

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200/60 flex items-center justify-center">
              <Bell className="w-4 h-4 text-rose-600" />
            </div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">
              Security Alerts & Incidents
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">
              {activeAlerts} Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Automated monitoring for unauthorized biometric attempts, sensor faults, and hardware telemetry alarms.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {incidents.map((inc) => (
          <div
            key={inc.id}
            className={`bg-white rounded-2xl p-5 border shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              inc.resolved ? 'border-slate-200/60 opacity-60' : 'border-slate-200/80'
            }`}
          >
            <div className="flex items-start space-x-3.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  inc.severity === 'high'
                    ? 'bg-rose-100 text-rose-700'
                    : inc.severity === 'medium'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {inc.severity === 'high' ? (
                  <ShieldAlert className="w-5 h-5" />
                ) : inc.severity === 'medium' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <Info className="w-5 h-5" />
                )}
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-[11px] font-bold text-slate-400">
                    {inc.id}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      inc.severity === 'high'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : inc.severity === 'medium'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {inc.severity} priority
                  </span>
                </div>

                <h3 className="font-bold text-slate-800 text-sm mt-1">{inc.title}</h3>
                <p className="text-xs text-slate-600 mt-0.5 max-w-2xl leading-relaxed">
                  {inc.description}
                </p>

                <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-mono mt-2">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{inc.timestamp}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => toggleResolve(inc.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors flex items-center space-x-1.5 whitespace-nowrap self-start sm:self-center ${
                inc.resolved
                  ? 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{inc.resolved ? 'Mark Unresolved' : 'Mark Resolved'}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

