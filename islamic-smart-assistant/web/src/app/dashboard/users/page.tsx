'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { UserPlus, Sparkles, Search } from 'lucide-react';
import { useState } from 'react';
import { Admin } from '@/lib/api';

const FALLBACK = [
  { id: '1', name: 'Aisha Khan',     email: 'aisha@example.com',    language: 'Urdu',    sect: 'Sunni / Hanafi', device_count: 3 },
  { id: '2', name: 'Yusuf Rahman',   email: 'yusuf@example.com',    language: 'English', sect: 'Sunni / Shafi',  device_count: 2 },
  { id: '3', name: 'Fatimah Ali',    email: 'fatimah@example.com',  language: 'Arabic',  sect: 'Sunni / Maliki', device_count: 4 },
  { id: '4', name: 'Ahmet Kaya',     email: 'ahmet@example.com',    language: 'Turkish', sect: 'Sunni / Hanafi', device_count: 1 },
  { id: '5', name: 'Mehdi Naqvi',    email: 'mehdi@example.com',    language: 'Urdu',    sect: 'Shia / Jafari',  device_count: 5 },
];

export default function UsersPage() {
  const { data } = useQuery({ queryKey: ['users'], queryFn: Admin.users });
  const users = (data && Array.isArray(data) && data.length > 0) ? data : FALLBACK;
  const [q, setQ] = useState('');
  const filtered = users.filter((u: any) =>
    [u.name, u.email, u.language, u.sect].join(' ').toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="chip-gold mb-2"><Sparkles size={12}/> Community</p>
          <h1 className="h-display text-4xl font-bold">Users</h1>
          <p className="text-ink/60 mt-1">All accounts across the ecosystem.</p>
        </div>
        <button className="btn-primary text-sm py-2 px-4"><UserPlus size={16}/> Invite user</button>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-emerald-900/5">
          <p className="text-sm text-ink/60">{filtered.length} users</p>
          <label className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Search users…"
              className="pl-9 pr-3 py-2 rounded-lg border border-emerald-100 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 w-64"
            />
          </label>
        </div>
        <table className="w-full">
          <thead className="bg-emerald-50/50">
            <tr className="text-left text-xs uppercase tracking-wider text-emerald-900/70">
              <th className="p-4">User</th>
              <th className="p-4">Language</th>
              <th className="p-4">Sect / Fiqh</th>
              <th className="p-4">Devices</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u: any, i: number) => (
              <motion.tr
                key={u.id}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="border-t border-emerald-900/5 hover:bg-emerald-50/30"
              >
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center font-bold">
                      {u.name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                    </span>
                    <div>
                      <p className="font-semibold">{u.name}</p>
                      <p className="text-xs text-ink/55">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-sm">{u.language}</td>
                <td className="p-4 text-sm">{u.sect ?? '—'}</td>
                <td className="p-4">
                  <span className="chip">{u.device_count ?? 0} linked</span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
