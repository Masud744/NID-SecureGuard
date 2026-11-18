import React from 'react'
import {
  Menu,
  Cpu,
  Camera,
  Fingerprint,
  Database,
  Bell,
} from 'lucide-react'
import type { HealthStatus } from '../types'
import type { NavTab } from './Sidebar'

interface HeaderProps {
  health: HealthStatus | null
  activeTab: NavTab
  onToggleSidebar: () => void
}

const tabMetadata: Record<NavTab, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'System Dashboard',
    subtitle: 'Real-time overview of biometric verifications, hardware status, and citizen analytics',
  },
  kiosk: {
    title: 'Identity Verification',
    subtitle: 'Dual-biometric authentication engine (Face Recognition + Fingerprint Matching)',
  },
  registry: {
    title: 'Citizen Directory',
    subtitle: 'Verified citizen identity database with enrolled multi-modal credentials',
  },
  registration: {
    title: 'Biometric Enrollment',
    subtitle: 'Step-by-step onboarding for NID bio-data, facial capture, and hardware fingerprint',
  },
  logs: {
    title: 'Security Audit Logs',
    subtitle: 'Immutable authentication trail, access decisions, and biometric scores',
  },
  alerts: {
    title: 'Alerts & Incidents',
    subtitle: 'Security alarms, unauthorized access attempts, and sensor anomalies',
  },
  device: {
    title: 'Hardware & Telemetry',
    subtitle: 'ESP32-S3 FreeRTOS telemetry, camera DMA metrics, and sensor diagnostics',
  },
  settings: {
    title: 'System Settings',
    subtitle: 'Biometric confidence thresholds, timeouts, and network bridge parameters',
  },
  roles: {
    title: 'User & Roles',
    subtitle: 'Role-based access control, operator privileges, and supervisor authorization',
  },
}

export const Header: React.FC<HeaderProps> = ({
  health,
  activeTab,
  onToggleSidebar,
}) => {
  const currentMeta = tabMetadata[activeTab] || tabMetadata.kiosk

  const espOnline = health ? health.device_online : true
  const camOnline = health ? health.camera ?? true : true
  const fpOnline = health ? health.fingerprint_sensor ?? true : true
  const dbConnected = true

  return (
    <header className="bg-canvas border-b border-slate-200/80 px-4 sm:px-6 py-4 sticky top-0 z-30 backdrop-blur-sm bg-canvas/90">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Page Title */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors lg:hidden"
            aria-label="Toggle navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight leading-tight">
              {currentMeta.title}
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {currentMeta.subtitle}
            </p>
          </div>
        </div>

        {/* Right: Telemetry Badges & Quick Actions */}
        <div className="flex items-center space-x-2.5 flex-wrap gap-y-2">
          {/* ESP32 Status */}
          <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-xs flex items-center space-x-2 text-xs">
            <Cpu className="w-4 h-4 text-slate-500" />
            <span className="font-medium text-slate-700">ESP32</span>
            <span
              className={`w-2 h-2 rounded-full ${
                espOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className={`text-[11px] font-medium ${espOnline ? 'text-emerald-700' : 'text-rose-600'}`}>
              {espOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          {/* Camera Status */}
          <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-xs flex items-center space-x-2 text-xs">
            <Camera className="w-4 h-4 text-slate-500" />
            <span className="font-medium text-slate-700">Camera</span>
            <span
              className={`w-2 h-2 rounded-full ${
                camOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className={`text-[11px] font-medium ${camOnline ? 'text-emerald-700' : 'text-rose-600'}`}>
              {camOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          {/* Fingerprint Status */}
          <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-xs flex items-center space-x-2 text-xs">
            <Fingerprint className="w-4 h-4 text-slate-500" />
            <span className="font-medium text-slate-700">Fingerprint</span>
            <span
              className={`w-2 h-2 rounded-full ${
                fpOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className={`text-[11px] font-medium ${fpOnline ? 'text-emerald-700' : 'text-rose-600'}`}>
              {fpOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          {/* Database Status */}
          <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-xs flex items-center space-x-2 text-xs">
            <Database className="w-4 h-4 text-slate-500" />
            <span className="font-medium text-slate-700">Database</span>
            <span
              className={`w-2 h-2 rounded-full ${
                dbConnected ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />
            <span className="text-[11px] font-medium text-emerald-700">
              {dbConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* Notifications Bell */}
          <button className="relative p-2 rounded-xl bg-white border border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-xs transition-colors">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </button>

          {/* Profile Circle */}
          <div className="w-8 h-8 rounded-full bg-brand-850 text-white font-bold text-xs flex items-center justify-center shadow-xs cursor-pointer">
            SM
          </div>
        </div>
      </div>
    </header>
  )
}
