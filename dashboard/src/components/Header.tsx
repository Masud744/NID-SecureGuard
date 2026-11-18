import React from 'react'
import { ShieldCheck, Cpu, Camera, Fingerprint, Database, Radio } from 'lucide-react'
import type { HealthStatus } from '../types'

interface HeaderProps {
  health: HealthStatus | null
  activeTab: 'kiosk' | 'register' | 'logs' | 'citizens'
  setActiveTab: (tab: 'kiosk' | 'register' | 'logs' | 'citizens') => void
}

export const Header: React.FC<HeaderProps> = ({ health, activeTab, setActiveTab }) => {
  return (
    <header className="border-b border-dark-700 bg-dark-850/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">NID SecureGuard</span>
                <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Dual Biometric
                </span>
              </div>
              <p className="text-xs text-slate-400">IoT-Based NID Protection & Access Control</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1 bg-dark-900/60 p-1 rounded-xl border border-dark-700">
            <button
              onClick={() => setActiveTab('kiosk')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'kiosk'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-dark-700'
              }`}
            >
              Verify Kiosk
            </button>
            <button
              onClick={() => setActiveTab('register')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'register'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-dark-700'
              }`}
            >
              Enroll Citizen
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'logs'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-dark-700'
              }`}
            >
              Audit Logs
            </button>
            <button
              onClick={() => setActiveTab('citizens')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'citizens'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-dark-700'
              }`}
            >
              Citizens
            </button>
          </nav>

          {/* Hardware Telemetry Bar */}
          <div className="hidden lg:flex items-center space-x-3 text-xs">
            {/* ESP32 */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-dark-800 border border-dark-700">
              <Cpu className={`w-3.5 h-3.5 ${health?.device_online ? 'text-emerald-400' : 'text-rose-400'}`} />
              <span className="text-slate-300 font-mono">ESP32</span>
              <span className={`w-1.5 h-1.5 rounded-full ${health?.device_online ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
            </div>

            {/* Camera */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-dark-800 border border-dark-700">
              <Camera className={`w-3.5 h-3.5 ${health?.camera ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span className="text-slate-300 font-mono">OV2640</span>
              <span className={`w-1.5 h-1.5 rounded-full ${health?.camera ? 'bg-emerald-400' : 'bg-slate-500'}`} />
            </div>

            {/* Fingerprint */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-dark-800 border border-dark-700">
              <Fingerprint className={`w-3.5 h-3.5 ${health?.fingerprint_sensor ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span className="text-slate-300 font-mono">R307S</span>
              <span className={`w-1.5 h-1.5 rounded-full ${health?.fingerprint_sensor ? 'bg-emerald-400' : 'bg-slate-500'}`} />
            </div>

            {/* Supabase Cloud */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-dark-800 border border-dark-700">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-300 font-mono">Supabase</span>
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
