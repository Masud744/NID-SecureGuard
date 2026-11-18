import React, { useState, useEffect } from 'react'
import { Header } from './components/Header'
import { VerificationKiosk } from './components/VerificationKiosk'
import { RegistrationStudio } from './components/RegistrationStudio'
import { AuditLogs } from './components/AuditLogs'
import { CitizenDirectory } from './components/CitizenDirectory'
import { fetchHealth } from './lib/api'
import type { HealthStatus } from './types'

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'kiosk' | 'register' | 'logs' | 'citizens'>('kiosk')
  const [health, setHealth] = useState<HealthStatus | null>(null)

  // Poll hardware status every 5 seconds
  useEffect(() => {
    const check = () => {
      fetchHealth().then(setHealth).catch(() => setHealth(null))
    }
    check()
    const timer = setInterval(check, 5000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-dark-900 text-slate-100 font-sans selection:bg-emerald-500/20 selection:text-emerald-400">
      {/* Top Header & Telemetry Bar */}
      <Header health={health} activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main View Port */}
      <main className="flex-1 pb-16">
        {activeTab === 'kiosk' && <VerificationKiosk />}
        {activeTab === 'register' && <RegistrationStudio onRegistered={() => setActiveTab('citizens')} />}
        {activeTab === 'logs' && <AuditLogs />}
        {activeTab === 'citizens' && <CitizenDirectory />}
      </main>

      {/* Footer */}
      <footer className="border-t border-dark-700/60 bg-dark-850/40 py-6 text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 NID SecureGuard — Dual-Biometric Identity Protection System</p>
          <div className="flex items-center space-x-3 font-mono text-[11px] text-slate-400">
            <span>ESP32-S3 FreeRTOS</span>
            <span>•</span>
            <span>OpenCV LBPH</span>
            <span>•</span>
            <span>R307S UART</span>
            <span>•</span>
            <span>FastAPI & Supabase</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
