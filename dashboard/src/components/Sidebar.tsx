import React from 'react'
import {
  Shield,
  LayoutDashboard,
  ScanFace,
  Users,
  UserPlus,
  FileText,
  Bell,
  Cpu,
  Settings,
  ChevronDown,
  X,
  LogOut,
  Lock,
} from 'lucide-react'
import type { OperatorProfile } from '../lib/auth'

export type NavTab =
  | 'dashboard'
  | 'kiosk'
  | 'registry'
  | 'registration'
  | 'logs'
  | 'alerts'
  | 'device'
  | 'settings'
  | 'roles'

interface SidebarProps {
  activeTab: NavTab
  setActiveTab: (tab: NavTab) => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  alertCount?: number
  operator?: OperatorProfile | null
  onSignOut?: () => void
  isKioskMode?: boolean
  onExitKiosk?: () => void
}

interface NavItem {
  id: NavTab
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

interface NavSection {
  category: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    category: 'Operations',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'registry', label: 'Citizen Directory', icon: Users },
    ],
  },
  {
    category: 'Security & Audit',
    items: [
      { id: 'logs', label: 'Security Audit Logs', icon: FileText },
      { id: 'alerts', label: 'Alerts & Incidents', icon: Bell },
    ],
  },
  {
    category: 'Infrastructure',
    items: [
      { id: 'device', label: 'Hardware & Telemetry', icon: Cpu },
      { id: 'settings', label: 'System Settings', icon: Settings },
    ],
  },
]

const kioskNavSections: NavSection[] = [
  {
    category: 'Hardware Station Terminal',
    items: [
      { id: 'kiosk', label: 'Identity Verification', icon: ScanFace },
      { id: 'registration', label: 'Biometric Enrollment', icon: UserPlus },
    ],
  },
]

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpen,
  setIsOpen,
  alertCount = 0,
  operator,
  onSignOut,
  isKioskMode = false,
  onExitKiosk,
}) => {
  const currentSections = isKioskMode ? kioskNavSections : navSections
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-brand-900 text-white flex flex-col justify-between transition-transform duration-300 ease-in-out border-r border-brand-850 shadow-2xl lg:shadow-none lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header / Brand */}
        <div className="p-5 border-b border-brand-800/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-brand-800 border border-brand-600/30 flex items-center justify-center shadow-lg shadow-brand-950/40">
                <Shield className="w-5 h-5 text-brand-400 fill-brand-400/20" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white tracking-tight leading-tight">
                  NID SecureGuard
                </h1>
                <p className="text-[11px] text-brand-300 font-medium tracking-wide">
                  Identity Security Platform
                </p>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-brand-300 hover:text-white hover:bg-brand-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {currentSections.map((section) => (
            <div key={section.category}>
              <h2 className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-brand-300/80">
                {section.category}
              </h2>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const isActive = activeTab === item.id
                  const badgeValue = item.id === 'alerts' ? alertCount : item.badge

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id)
                        setIsOpen(false)
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-brand-600 text-white font-semibold shadow-md shadow-brand-950/20'
                          : 'text-brand-100 hover:text-white hover:bg-brand-800/60'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon
                          className={`w-4 h-4 ${
                            isActive ? 'text-white' : 'text-brand-300'
                          }`}
                        />
                        <span>{item.label}</span>
                      </div>

                      {badgeValue && badgeValue > 0 && (
                        <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm shadow-rose-950/30">
                          {badgeValue}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* User Profile / Kiosk Exit Card (Bottom) */}
        <div className="p-3 border-t border-brand-800/60 bg-brand-950/60">
          {isKioskMode ? (
            <div className="rounded-xl bg-brand-900/80 border border-brand-700/60 p-3 space-y-2.5">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white leading-tight">
                    Hardware Station Kiosk
                  </p>
                  <p className="text-[10px] text-emerald-300/80 font-mono">
                    Restricted Terminal
                  </p>
                </div>
              </div>
              {onExitKiosk && (
                <button
                  type="button"
                  onClick={onExitKiosk}
                  className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Exit Kiosk & Admin Login</span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between p-2 rounded-xl hover:bg-brand-850/60 transition-colors">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-brand-700 border border-brand-500/40 text-white font-bold text-xs flex items-center justify-center shadow-inner shrink-0">
                  {operator?.fullName ? operator.fullName.slice(0, 2).toUpperCase() : 'OP'}
                </div>
                <div className="text-left min-w-0">
                  <p className="text-xs font-semibold text-white leading-tight truncate">
                    {operator?.fullName || 'Station Terminal'}
                  </p>
                  <p className="text-[10px] text-brand-300 font-medium truncate">
                    {operator?.role === 'super_admin'
                      ? 'Super Administrator'
                      : operator?.role === 'registrar'
                      ? 'Biometric Registrar'
                      : operator?.role === 'auditor'
                      ? 'Compliance Auditor'
                      : 'Terminal Officer'}
                  </p>
                </div>
              </div>
              {onSignOut && (
                <button
                  onClick={onSignOut}
                  className="p-1.5 rounded-lg text-brand-300 hover:text-white hover:bg-brand-800 transition-colors cursor-pointer shrink-0"
                  title="Sign Out of Console"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

