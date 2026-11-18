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
import { OperatorApprovalsView } from './components/OperatorApprovalsView'
import { fetchHealth, fetchPendingOperators } from './lib/api'
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
  // Default to Hardware Verification Booth (Screenshot 3)
  const [activeTab, setActiveTab] = useState<NavTab>('kiosk')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [operator, setOperator] = useState<OperatorProfile | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [isKioskMode, setIsKioskMode] = useState(true)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [pendingOperatorCount, setPendingOperatorCount] = useState(0)
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
        if (op && op.isApproved) {
          setIsKioskMode(false)
          setActiveTab('dashboard')
        } else if (op && !op.isApproved) {
          setIsKioskMode(false)
        }
      })
      .finally(() => {
        setAuthLoading(false)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const prof = extractProfileFromUser(session.user)
        setOperator(prof)
        if (prof.isApproved) {
          setIsKioskMode(false)
          setActiveTab('dashboard')
        } else {
          setIsKioskMode(false)
        }
      } else {
        setOperator(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Poll pending operator authorizations count
  useEffect(() => {
    const updatePending = () => {
      fetchPendingOperators()
        .then((list) => setPendingOperatorCount(list.length))
        .catch(() => {})
    }
    updatePending()
    const timer = setInterval(updatePending, 10000)
    return () => clearInterval(timer)
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
    setIsKioskMode(true)
    setActiveTab('kiosk')
    setShowLoginModal(false)
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

  // Authenticated BUT NOT APPROVED -> Show Pending Approval Lock Screen
  if (operator && !operator.isApproved) {
    return (
      <PendingApprovalView
        operator={operator}
        onSignOut={handleSignOut}
        onRefresh={async () => {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const updated = extractProfileFromUser(user)
            setOperator(updated)
            if (updated.isApproved) {
              setIsKioskMode(false)
              setActiveTab('dashboard')
            }
          }
        }}
      />
    )
  }

  // Show Auth View (when user explicitly clicks "Admin Portal Sign In")
  if (showLoginModal && !operator) {
    return (
      <AuthView
        onAuthenticated={(op) => {
          setOperator(op)
          setShowLoginModal(false)
          if (op.isApproved) {
            setIsKioskMode(false)
            setActiveTab('dashboard')
          }
        }}
        onLaunchKiosk={() => {
          setShowLoginModal(false)
          setIsKioskMode(true)
          setActiveTab('kiosk')
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
        pendingCount={pendingOperatorCount}
        operator={operator}
        onSignOut={operator ? handleSignOut : undefined}
        isKioskMode={isKioskMode && !operator}
        onExitKiosk={() => setShowLoginModal(true)}
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
              onClick={() => setShowLoginModal(true)}
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
          onOpenLogin={() => setShowLoginModal(true)}
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
          {activeTab === 'approvals' && (
            <OperatorApprovalsView operator={operator} />
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
