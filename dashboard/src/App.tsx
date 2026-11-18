import React, { useState, useEffect } from 'react'
import { Sidebar, type NavTab } from './components/Sidebar'
import { Header } from './components/Header'
import { VerificationKiosk } from './components/VerificationKiosk'
import { RegistrationStudio } from './components/RegistrationStudio'
import { AuditLogs } from './components/AuditLogs'
import { CitizenDirectory } from './components/CitizenDirectory'
import { DashboardView } from './components/DashboardView'
import { AlertsView } from './components/AlertsView'
import { DeviceView } from './components/DeviceView'
import { SettingsView } from './components/SettingsView'
import { fetchHealth } from './lib/api'
import type { HealthStatus } from './types'

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('kiosk')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [alertCount, setAlertCount] = useState<number>(() => {
    try {
      const raw = localStorage.getItem('nid_secureguard_active_alerts_count')
      return raw !== null ? parseInt(raw, 10) : 0
    } catch {
      return 0
    }
  })

  // Poll hardware status every 5 seconds
  useEffect(() => {
    const check = () => {
      fetchHealth()
        .then(setHealth)
        .catch(() => setHealth(null))
    }
    check()
    const timer = setInterval(check, 5000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen flex bg-canvas text-slate-800 font-sans selection:bg-brand-500/20 selection:text-brand-900 overflow-x-hidden">
      {/* Left Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        alertCount={alertCount}
      />

      {/* Main App Canvas */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto overflow-x-hidden">
        {/* Top Header & Telemetry Bar */}
        <Header
          health={health}
          activeTab={activeTab}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        {/* Dynamic Main View */}
        <main className="flex-1 pb-12">
          {activeTab === 'dashboard' && (
            <DashboardView health={health} onNavigate={setActiveTab} />
          )}
          {activeTab === 'kiosk' && <VerificationKiosk />}
          {activeTab === 'registry' && (
            <CitizenDirectory onNavigate={setActiveTab} />
          )}
          {activeTab === 'registration' && (
            <RegistrationStudio
              onRegistered={() => setActiveTab('registry')}
              onNavigate={setActiveTab}
            />
          )}
          {activeTab === 'logs' && <AuditLogs />}
          {activeTab === 'alerts' && (
            <AlertsView
              onNavigate={setActiveTab}
              onAlertCountChange={setAlertCount}
            />
          )}
          {activeTab === 'device' && <DeviceView health={health} />}
          {activeTab === 'settings' && <SettingsView />}
          {activeTab === 'roles' && <SettingsView isRoles />}
        </main>
      </div>
    </div>
  )
}

export default App
