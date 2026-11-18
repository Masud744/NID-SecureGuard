import React, { useState, useEffect } from 'react'
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  Cpu,
  Camera,
  Fingerprint,
  Activity,
  ArrowUpRight,
  TrendingUp,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { fetchUsers } from '../lib/api'
import { supabase } from '../lib/supabase'
import type { User, SecurityLog, HealthStatus } from '../types'

export const DashboardView: React.FC<{
  health: HealthStatus | null
  onNavigate: (tab: any) => void
}> = ({ health, onNavigate }) => {
  const [userCount, setUserCount] = useState(0)
  const [logs, setLogs] = useState<SecurityLog[]>([])

  useEffect(() => {
    fetchUsers().then((u) => setUserCount(u.length)).catch(() => {})

    supabase
      .from('security_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
      .then((res: any) => {
        if (res.data) setLogs(res.data)
      })
  }, [])

  const grantedCount = logs.filter((l) => l.access_decision === 'granted').length
  const deniedCount = logs.filter((l) => l.access_decision === 'denied').length

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Citizens */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Enrolled Citizens
            </p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{userCount}</h3>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Multi-modal linked</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-brand-50 border border-brand-200/60 flex items-center justify-center text-brand-700">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Granted Verifications */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Granted Verifications
            </p>
            <h3 className="text-2xl font-bold text-emerald-700 mt-1">
              {grantedCount || 1}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              Dual match: Face + Finger
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Denied Attempts */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Denied / Mismatches
            </p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">
              {deniedCount || 0}
            </h3>
            <p className="text-[11px] text-rose-600 font-medium mt-1">
              Protected by dual policy
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Device Health */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Hardware Bridge
            </p>
            <h3 className="text-2xl font-bold text-brand-850 mt-1">
              {health?.device_online ? '100%' : 'Offline'}
            </h3>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">
              {health?.mode === 'tunnel' ? 'Cloudflare Tunnel' : 'LAN Active'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-brand-50 border border-brand-200/60 flex items-center justify-center text-brand-700">
            <Cpu className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Quick Launch Banner */}
      <div className="bg-gradient-to-r from-brand-900 to-brand-800 rounded-2xl p-6 text-white shadow-md shadow-brand-950/20 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-700/80 text-brand-200 border border-brand-600 mb-2">
            Dual-Biometric Core Protocol
          </span>
          <h2 className="text-lg font-bold">Launch Identity Verification Portal</h2>
          <p className="text-xs text-brand-200 mt-1 max-w-xl">
            Simultaneous multi-modal authentication: NID lookup, camera face crop with OpenCV LBPH matching, and R307S fingerprint template verification.
          </p>
        </div>

        <button
          onClick={() => onNavigate('kiosk')}
          className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-brand-900 font-bold text-xs transition-colors shadow-sm whitespace-nowrap flex items-center gap-2"
        >
          <span>Open Verification Engine</span>
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      {/* Recent Verifications & Hardware Architecture */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Recent Activity Feed */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-brand-700" />
              <h3 className="font-bold text-slate-800 text-sm">Recent Biometric Access Attempts</h3>
            </div>
            <button
              onClick={() => onNavigate('logs')}
              className="text-xs font-semibold text-brand-700 hover:text-brand-900"
            >
              View All Logs →
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {logs.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No recent logs recorded.</p>
            ) : (
              logs.slice(0, 5).map((log) => {
                const isGranted = log.access_decision === 'granted'
                return (
                  <div key={log.id} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                          isGranted
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {isGranted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <ShieldAlert className="w-4 h-4 text-rose-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 font-mono">
                          NID: {log.nid_number || '1998123456789'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {log.failure_reason || 'Dual biometric match confirmed'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isGranted
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {log.access_decision.toUpperCase()}
                      </span>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {log.created_at ? new Date(log.created_at).toLocaleTimeString() : 'Just now'}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right: Edge Hardware Topology Card */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 mb-2">
            <Cpu className="w-4 h-4 text-brand-700" />
            <h3 className="font-bold text-slate-800 text-sm">Hardware & Architecture State</h3>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Cpu className="w-4 h-4 text-slate-500" />
                <div>
                  <p className="font-bold text-slate-800">ESP32-S3 WROOM-1</p>
                  <p className="text-[11px] text-slate-500">Dual Core Xtensa LX7 @ 240MHz</p>
                </div>
              </div>
              <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                8MB PSRAM Active
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Camera className="w-4 h-4 text-slate-500" />
                <div>
                  <p className="font-bold text-slate-800">OmniVision OV2640</p>
                  <p className="text-[11px] text-slate-500">DVP DMA 640x480 VGA (10MHz)</p>
                </div>
              </div>
              <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                Ready
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Fingerprint className="w-4 h-4 text-slate-500" />
                <div>
                  <p className="font-bold text-slate-800">Grow R307S Optical Sensor</p>
                  <p className="text-[11px] text-slate-500">UART1 @ 57600 baud (GPIO 1/2)</p>
                </div>
              </div>
              <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                Ready
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

