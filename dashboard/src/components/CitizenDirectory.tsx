import React, { useState, useEffect } from 'react'
import { Users, User, Fingerprint, Camera, Search, Calendar, Phone, MapPin, CheckCircle2, Clock } from 'lucide-react'
import { fetchUsers } from '../lib/api'
import type { User as UserType } from '../types'

export const CitizenDirectory: React.FC = () => {
  const [users, setUsers] = useState<UserType[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const loadData = () => {
    setIsLoading(true)
    fetchUsers()
      .then(data => setUsers(data))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredUsers = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.nid_number.includes(search)
  )

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-dark-850 rounded-2xl border border-dark-700 p-6 mb-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">Citizen Directory</h1>
            <span className="px-2 py-0.5 rounded-full bg-dark-800 text-slate-400 text-xs font-mono border border-dark-700">
              {users.length} Registered
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Directory of enrolled citizens and dual-biometric profile links.</p>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search citizen or NID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 rounded-xl bg-dark-900 border border-dark-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 w-64"
          />
        </div>
      </div>

      {/* Directory Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-500 text-sm">Loading citizen directory...</div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-dark-850 rounded-2xl border border-dark-700 p-12 text-center text-slate-500 text-sm">
          No citizens found matching "{search}".
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredUsers.map(citizen => {
            const hasFace = citizen.face_profiles?.status === 'enrolled'
            const fpRecords = citizen.fingerprint_records
            const hasFingerprint = Array.isArray(fpRecords)
              ? fpRecords.some(r => r.status === 'enrolled')
              : fpRecords?.status === 'enrolled'

            return (
              <div key={citizen.id} className="bg-dark-850 rounded-2xl border border-dark-700 p-5 shadow-lg hover:border-dark-600 transition-colors">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-center text-emerald-400 font-bold">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">{citizen.full_name}</h3>
                      <p className="text-xs font-mono text-emerald-400">NID: {citizen.nid_number}</p>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    citizen.status === 'active'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {citizen.status}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-slate-400 my-3">
                  <p className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>DOB: <span className="font-mono text-slate-300">{citizen.date_of_birth}</span></span>
                  </p>
                  {citizen.phone && (
                    <p className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-mono text-slate-300">{citizen.phone}</span>
                    </p>
                  )}
                  {citizen.address && (
                    <p className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="text-slate-300 truncate">{citizen.address}</span>
                    </p>
                  )}
                </div>

                {/* Biometric credential badges */}
                <div className="pt-3 border-t border-dark-700/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-slate-400" />
                    <span className={`inline-flex items-center gap-1 text-[11px] ${
                      hasFace ? 'text-emerald-400' : 'text-slate-500'
                    }`}>
                      {hasFace ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      Face {hasFace ? 'Enrolled' : 'Pending'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Fingerprint className="w-3.5 h-3.5 text-slate-400" />
                    <span className={`inline-flex items-center gap-1 text-[11px] ${
                      hasFingerprint ? 'text-emerald-400' : 'text-slate-500'
                    }`}>
                      {hasFingerprint ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      Fingerprint {hasFingerprint ? 'Enrolled' : 'Pending'}
                    </span>
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
