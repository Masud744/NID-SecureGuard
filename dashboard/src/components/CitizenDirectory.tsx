import React, { useState, useEffect } from 'react'
import {
  Users,
  Fingerprint,
  Camera,
  Search,
  Calendar,
  Phone,
  MapPin,
  CheckCircle2,
  Clock,
  ShieldCheck,
  RefreshCw,
  UserPlus,
  LayoutGrid,
  List,
  Eye,
  Zap,
  X,
  Sparkles,
  ShieldAlert,
} from 'lucide-react'
import { fetchUsers } from '../lib/api'
import type { User as UserType } from '../types'

interface CitizenDirectoryProps {
  onNavigate?: (tab: any) => void
}

export const CitizenDirectory: React.FC<CitizenDirectoryProps> = ({ onNavigate }) => {
  const [users, setUsers] = useState<UserType[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null)

  const loadData = () => {
    setIsLoading(true)
    fetchUsers()
      .then((data) => setUsers(data))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredUsers = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.nid_number.includes(search) ||
      (u.address && u.address.toLowerCase().includes(search.toLowerCase()))
  )

  const activeCount = users.filter((u) => u.status === 'active').length
  const pendingCount = users.filter((u) => u.status !== 'active').length

  const getFpSlots = (user: UserType): number[] => {
    if (!user.fingerprint_records) return []
    if (Array.isArray(user.fingerprint_records)) {
      return user.fingerprint_records
        .map((r: any) => r.template_id)
        .filter((t: any) => typeof t === 'number')
    }
    if (typeof user.fingerprint_records === 'object' && 'template_id' in user.fingerprint_records) {
      return [(user.fingerprint_records as any).template_id]
    }
    return []
  }

  const hasFaceEnrolled = (user: UserType): boolean => {
    if (!user.face_profiles) return false
    if (Array.isArray(user.face_profiles)) {
      return user.face_profiles.some((p: any) => p.status === 'enrolled')
    }
    if (typeof user.face_profiles === 'object') {
      return (user.face_profiles as any).status === 'enrolled'
    }
    return false
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-5">
      {/* 1. Header Toolbar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-200/80 flex items-center justify-center">
              <Users className="w-4 h-4 text-brand-700" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                <span>Citizen Directory</span>
                <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-800 border border-brand-200 text-xs font-mono font-semibold">
                  {users.length} Enrolled
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Verified national citizen identity database and enrolled multi-modal biometric profiles.
              </p>
            </div>
          </div>
        </div>

        {/* Right Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by name, NID, location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600 w-56 sm:w-64 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 font-semibold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-slate-800 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Table view"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 font-semibold transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-800 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cards</span>
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={loadData}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            title="Refresh directory"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-brand-700' : ''}`} />
          </button>

          {/* Primary Action Button */}
          {onNavigate && (
            <button
              onClick={() => onNavigate('registration')}
              className="px-3.5 py-2 rounded-xl bg-brand-850 hover:bg-brand-900 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm shadow-brand-950/20 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Enroll Citizen</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Directory Summary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total Database Citizens
            </span>
            <p className="text-xl font-bold text-slate-800 mt-0.5">{users.length}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Active Dual-Biometric Citizens
            </span>
            <p className="text-xl font-bold text-emerald-700 mt-0.5">{activeCount}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Incomplete / Pending Enrollment
            </span>
            <p className="text-xl font-bold text-amber-700 mt-0.5">{pendingCount}</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 3. Main Content: Table or Grid */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400 text-xs">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto text-brand-700 mb-2" />
          <span>Synchronizing citizen records with Supabase database...</span>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-500 text-xs">
          No citizens found matching "{search}".
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Citizen Profile</th>
                  <th className="py-3 px-4">National ID (NID)</th>
                  <th className="py-3 px-4">Date of Birth</th>
                  <th className="py-3 px-4">Facial Profile</th>
                  <th className="py-3 px-4">Fingerprint Sensor</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => {
                  const hasFace = hasFaceEnrolled(user)
                  const slots = getFpSlots(user)
                  const isActive = user.status === 'active'

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-brand-850 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-2xs">
                            {user.full_name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 leading-tight">
                              {user.full_name}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate max-w-[150px]">
                              {user.address || 'Dhaka, Bangladesh'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* NID */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                        {user.nid_number}
                      </td>

                      {/* DOB */}
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {user.date_of_birth || '15 May 1998'}
                      </td>

                      {/* Face Profile */}
                      <td className="py-3.5 px-4">
                        {hasFace ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Camera className="w-3 h-3 text-emerald-600" />
                            <span>LBPH Enrolled</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-500" />
                            <span>Pending</span>
                          </span>
                        )}
                      </td>

                      {/* Fingerprint Slots */}
                      <td className="py-3.5 px-4 font-mono">
                        {slots.length > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 text-brand-800 border border-brand-200">
                            <Fingerprint className="w-3 h-3 text-brand-700" />
                            <span>
                              {slots.map((s) => `Slot ${s}`).join(', ')}
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-500" />
                            <span>Pending</span>
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isActive ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                          />
                          <span>{isActive ? 'Active' : 'Pending'}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                            title="View Citizen Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {onNavigate && (
                            <button
                              onClick={() => onNavigate('kiosk')}
                              className="px-2 py-1 rounded-lg bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-800 font-bold text-[10px] transition-colors flex items-center gap-1 cursor-pointer"
                              title="Test Verification in Identity Verification"
                            >
                              <Zap className="w-3 h-3 text-brand-700" />
                              <span>Verify</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredUsers.map((user) => {
            const hasFace = hasFaceEnrolled(user)
            const slots = getFpSlots(user)
            const isActive = user.status === 'active'

            return (
              <div
                key={user.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* Top user row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-11 h-11 rounded-xl bg-brand-850 text-white font-bold text-sm flex items-center justify-center flex-shrink-0 shadow-2xs">
                        {user.full_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm leading-snug">
                          {user.full_name}
                        </h3>
                        <p className="font-mono text-xs text-brand-700 font-bold mt-0.5">
                          {user.nid_number}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {isActive ? 'Active' : 'Pending'}
                    </span>
                  </div>

                  {/* Metadata fields */}
                  <div className="space-y-1.5 py-3 border-y border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>DOB: {user.date_of_birth || '15 May 1998'}</span>
                    </div>
                    {user.phone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="font-mono">{user.phone}</span>
                      </div>
                    )}
                    {user.address && (
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{user.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Biometrics Badges */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Camera className="w-3 h-3 text-slate-400" />
                      <span>Face Model:</span>
                    </span>
                    {hasFace ? (
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Enrolled
                      </span>
                    ) : (
                      <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        Pending
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Fingerprint className="w-3 h-3 text-slate-400" />
                      <span>Fingerprint:</span>
                    </span>
                    {slots.length > 0 ? (
                      <span className="font-bold text-brand-800 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200 font-mono">
                        {slots.map((s) => `Slot ${s}`).join(', ')}
                      </span>
                    ) : (
                      <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        Pending
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedUser(user)}
                    className="flex-1 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3 h-3 text-slate-500" />
                    <span>View Profile</span>
                  </button>

                  {onNavigate && (
                    <button
                      onClick={() => onNavigate('kiosk')}
                      className="px-3 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-800 font-bold text-xs border border-brand-200 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Launch Verification"
                    >
                      <Zap className="w-3 h-3 text-brand-700" />
                      <span>Verify</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 4. Interactive Citizen Profile Modal / Drawer */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-brand-850 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                  {selectedUser.full_name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {selectedUser.full_name}
                  </h3>
                  <p className="font-mono text-xs text-brand-800 font-semibold">
                    NID: {selectedUser.nid_number}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              {/* Biographical Details */}
              <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Biographical Record
                </h4>
                <div className="grid grid-cols-2 gap-3 text-slate-700">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Date of Birth</span>
                    <span className="font-semibold">{selectedUser.date_of_birth || '15 May 1998'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Phone</span>
                    <span className="font-mono font-semibold">{selectedUser.phone || '+8801700000000'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 block">Registered Address</span>
                    <span className="font-medium">{selectedUser.address || 'Dhaka, Bangladesh'}</span>
                  </div>
                </div>
              </div>

              {/* Biometric Credentials Details */}
              <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Hardware Biometric Templates
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                    <div className="flex items-center space-x-2">
                      <Camera className="w-4 h-4 text-brand-700" />
                      <div>
                        <p className="font-semibold text-slate-800">Facial Recognition Model</p>
                        <p className="text-[10px] text-slate-400">OpenCV LBPH Multi-frame trained</p>
                      </div>
                    </div>
                    {hasFaceEnrolled(selectedUser) ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Enrolled
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        Pending
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                    <div className="flex items-center space-x-2">
                      <Fingerprint className="w-4 h-4 text-brand-700" />
                      <div>
                        <p className="font-semibold text-slate-800">Fingerprint Sensor Template</p>
                        <p className="text-[10px] text-slate-400">R307S 500 DPI Optical Flash</p>
                      </div>
                    </div>
                    {getFpSlots(selectedUser).length > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 text-brand-800 border border-brand-200 font-mono">
                        {getFpSlots(selectedUser).map((s) => `Slot ${s}`).join(', ')}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400">
                Created: {new Date(selectedUser.created_at).toLocaleDateString()}
              </span>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>

                {onNavigate && (
                  <button
                    onClick={() => {
                      setSelectedUser(null)
                      onNavigate('kiosk')
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-brand-850 hover:bg-brand-900 text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Zap className="w-3.5 h-3.5 text-brand-200" />
                    <span>Authenticate Citizen</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
