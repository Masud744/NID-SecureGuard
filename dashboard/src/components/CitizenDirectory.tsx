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
} from 'lucide-react'
import { fetchUsers } from '../lib/api'
import type { User as UserType } from '../types'

export const CitizenDirectory: React.FC = () => {
  const [users, setUsers] = useState<UserType[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-50 border border-brand-200/60 flex items-center justify-center">
              <Users className="w-4 h-4 text-brand-700" />
            </div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">
              Citizen Registry
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-mono font-semibold">
              {users.length} Enrolled
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Directory of verified citizens with multi-modal facial profiles and hardware fingerprint templates.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, NID, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600 w-64 sm:w-72 transition-all"
            />
          </div>

          <button
            onClick={loadData}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
            title="Refresh directory"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Directory Grid */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400 text-sm">
          Loading citizen directory...
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-500 text-sm">
          No citizens found matching "{search}".
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredUsers.map((user) => {
            const hasFace =
              user.face_profiles &&
              ((Array.isArray(user.face_profiles) && user.face_profiles.length > 0) ||
                typeof user.face_profiles === 'object')

            const fpRecords = Array.isArray(user.fingerprint_records)
              ? user.fingerprint_records
              : user.fingerprint_records
              ? [user.fingerprint_records]
              : []

            return (
              <div
                key={user.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Top user row */}
                  <div className="flex items-start justify-between gap-3 mb-3.5">
                    <div className="flex items-center space-x-3">
                      <div className="w-11 h-11 rounded-xl bg-brand-850 text-white font-bold text-sm flex items-center justify-center flex-shrink-0 shadow-xs">
                        {user.full_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm leading-snug">
                          {user.full_name}
                        </h3>
                        <p className="font-mono text-xs text-brand-700 font-semibold mt-0.5">
                          {user.nid_number}
                        </p>
                      </div>
                    </div>

                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Active
                    </span>
                  </div>

                  {/* Metadata fields */}
                  <div className="space-y-1.5 py-3 border-y border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>DOB: {user.date_of_birth}</span>
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

                {/* Biometric Credentials Status */}
                <div className="pt-3.5 flex items-center justify-between text-xs">
                  {/* Face status */}
                  <div className="flex items-center space-x-1.5">
                    <Camera className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[11px] text-slate-500">Face:</span>
                    {hasFace ? (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        Enrolled
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">Pending</span>
                    )}
                  </div>

                  {/* Fingerprint slots */}
                  <div className="flex items-center space-x-1.5">
                    <Fingerprint className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[11px] text-slate-500">Finger:</span>
                    {fpRecords.length > 0 ? (
                      <span className="text-[11px] font-bold text-brand-800 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-200">
                        {fpRecords.length} {fpRecords.length > 1 ? 'slots' : 'slot'}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">Pending</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
