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
import { AuthView } from './components/AuthView'
import { PendingApprovalView } from './components/PendingApprovalView'
import { fetchHealth } from './lib/api'
import { supabase } from './lib/supabase'
import {
  getCurrentOperator,
  signOutOperator,
  extractProfileFromUser,
  type OperatorProfile,
} from './lib/auth'
import type { HealthStatus } from './types'
import { Terminal, Lock, Shield } from 'lucide-react'

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [operator, setOperator] = useState<OperatorProfile | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [isKioskMode, setIsKioskMode] = useState(false)
  const [alertCount, setAlertCount] = useState<number>(() => {
    try {
      const raw = localStorage.getItem('nid_secureguard_active_alerts_count')
      return raw !== null ? parseInt(raw, 10) : 0
    } catch {
      return 0
    }
  })

  // Check Supabase Auth state on mount
  useEffect(() => {
    getCurrentOperator()
      .then((op) => {
        setOperator(op)
        if (op) {
          setIsKioskMode(false)
        }
      })
      .finally(() => {
        setAuthLoading(false)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setOperator(extractProfileFromUser(session.user))
        setIsKioskMode(false)
      } else {
        setOperator(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Guard Kiosk Mode: in kiosk mode without operator login, strictly allow only 'kiosk' and 'registration'
  useEffect(() => {
    if (isKioskMode && !operator) {
      if (activeTab !== 'kiosk' && activeTab !== 'registration') {
        setActiveTab('kiosk')
      }
    }
  }, [isKioskMode, operator, activeTab])

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

  const handleSignOut = async () => {
    await signOutOperator()
    setOperator(null)
    setIsKioskMode(false)
  }

  // Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-900 border border-brand-500/30 flex items-center justify-center animate-pulse">
            <Shield className="w-6 h-6 text-emerald-400" />
          </div>
          <p className="text-xs font-mono text-slate-400 tracking-wide">
            Initializing NID SecureGuard Security Protocol...
          </p>
        </div>
      </div>
    )
  }

  // Not authenticated and not in Kiosk Mode -> Show Auth Portal
  if (!operator && !isKioskMode) {
    return (
      <AuthView
        onAuthenticated={(op) => {
          setOperator(op)
          setIsKioskMode(false)
        }}
        onLaunchKiosk={() => {
          setIsKioskMode(true)
          setActiveTab('kiosk')
        }}
      />
    )
  }

  // Authenticated BUT NOT APPROVED -> Show Pending Approval Lock Screen
  if (operator && !operator.isApproved) {
    return (
      <PendingApprovalView
        operator={operator}
        onSignOut={handleSignOut}
        onRefresh={async () => {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            setOperator(extractProfileFromUser(user))
          }
        }}
      />
    )
  }

  return (
    <div className="min-h-screen flex bg-canvas text-slate-800 font-sans selection:bg-brand-500/20 selection:text-brand-900 overflow-x-hidden">
      {/* Left Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (isKioskMode && !operator && tab !== 'kiosk' && tab !== 'registration') {
            return
          }
          setActiveTab(tab)
        }}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        alertCount={alertCount}
        operator={operator}
        onSignOut={operator ? handleSignOut : undefined}
        isKioskMode={isKioskMode && !operator}
        onExitKiosk={() => setIsKioskMode(false)}
      />

      {/* Main App Canvas */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto overflow-x-hidden">
        {/* Hardware Kiosk Mode Banner (when operating booth without full admin login) */}
        {isKioskMode && !operator && (
          <div className="bg-brand-950 text-white px-4 py-2 border-b border-brand-850 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold">Hardware Station Kiosk Mode</span>
              <span className="text-brand-300 hidden sm:inline">• Live Verification & Registration Active</span>
            </div>
            <button
              onClick={() => setIsKioskMode(false)}
              className="px-3 py-1 rounded-lg bg-brand-800 hover:bg-brand-700 text-emerald-300 text-[11px] font-semibold border border-brand-600/40 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>Admin Portal Sign In</span>
            </button>
          </div>
        )}

        {/* Top Header & Telemetry Bar */}
        <Header
          health={health}
          activeTab={activeTab}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          operator={operator}
          onSignOut={operator ? handleSignOut : undefined}
        />

        {/* Dynamic Main View */}
        <main className="flex-1 pb-12">
          {activeTab === 'dashboard' && (
            <DashboardView health={health} onNavigate={setActiveTab} />
          )}
          {activeTab === 'kiosk' && (
            <VerificationKiosk onNavigate={setActiveTab} />
          )}
          {activeTab === 'registry' && (
            <CitizenDirectory onNavigate={setActiveTab} />
          )}
          {activeTab === 'registration' && (
            <RegistrationStudio
              onRegistered={() => setActiveTab(isKioskMode && !operator ? 'kiosk' : 'registry')}
              onNavigate={(tab) => {
                if (isKioskMode && !operator && tab !== 'kiosk' && tab !== 'registration') {
                  setActiveTab('kiosk')
                } else {
                  setActiveTab(tab)
                }
              }}
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
          {activeTab === 'settings' && <SettingsView operator={operator} />}
          {activeTab === 'roles' && <SettingsView isRoles operator={operator} />}
        </main>
      </div>
    </div>
  )
}

export default App
