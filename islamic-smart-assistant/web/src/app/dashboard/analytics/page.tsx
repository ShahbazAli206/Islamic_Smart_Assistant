'use client';

import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Sparkles, TrendingUp } from 'lucide-react';

const usage = Array.from({ length: 14 }, (_, i) => ({
  day: `D${i + 1}`,
  azan:  Math.round(800  + Math.random() * 400),
  quran: Math.round(220  + Math.random() * 220),
  schedules: Math.round(60 + Math.random() * 90),
}));

const reciterMix = [
  { name: 'Abdul Basit',   value: 38, color: '#059669' },
  { name: 'Sudais',        value: 24, color: '#C9A227' },
  { name: 'Alafasy',       value: 18, color: '#0EA5E9' },
  { name: 'Husary',        value: 12, color: '#E11D48' },
  { name: 'Other',         value:  8, color: '#6366F1' },
];

const geo = [
  { region: 'Pakistan',     users: 14820 },
  { region: 'Saudi Arabia', users:  9210 },
  { region: 'Türkiye',      users:  7440 },
  { region: 'Egypt',        users:  6105 },
  { region: 'UAE',          users:  4830 },
  { region: 'Indonesia',    users:  4520 },
  { region: 'UK',           users:  2980 },
  { region: 'USA',          users:  2710 },
];

export default function Analytics() {
  return (
    <div className="space-y-6">
      <div>
        <p className="chip-gold mb-2"><Sparkles size={12}/> Insights</p>
        <h1 className="h-display text-4xl font-bold">Analytics</h1>
        <p className="text-ink/60 mt-1">Engagement, retention and reciter mix at a glance.</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="card card-pad h-96">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold">Engagement (14 days)</h3>
            <p className="text-xs text-ink/55">Azan triggers, Quran sessions, scheduled triggers</p>
          </div>
          <span className="chip"><TrendingUp size={12}/> +18.4% vs prior period</span>
        </div>
        <ResponsiveContainer width="100%" height="85%">
          <AreaChart data={usage}>
            <defs>
              <linearGradient id="a1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity={0.45}/><stop offset="100%" stopColor="#10B981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="a2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C9A227" stopOpacity={0.45}/><stop offset="100%" stopColor="#C9A227" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="a3" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.4}/><stop offset="100%" stopColor="#0EA5E9" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#e5e7eb" vertical={false}/>
            <XAxis dataKey="day" stroke="#6b7280" fontSize={12}/>
            <YAxis stroke="#6b7280" fontSize={12}/>
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb' }}/>
            <Legend/>
            <Area dataKey="azan"      stroke="#059669" fill="url(#a1)" strokeWidth={2.5}/>
            <Area dataKey="quran"     stroke="#A6831A" fill="url(#a2)" strokeWidth={2.5}/>
            <Area dataKey="schedules" stroke="#0284C7" fill="url(#a3)" strokeWidth={2.5}/>
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-5">
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card card-pad h-80">
          <h3 className="font-bold mb-3">Reciter mix</h3>
          <ResponsiveContainer width="100%" height="80%">
            <PieChart>
              <Pie data={reciterMix} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
                {reciterMix.map((s) => <Cell key={s.name} fill={s.color} />)}
              </Pie>
              <Tooltip/>
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card card-pad h-80 lg:col-span-2">
          <h3 className="font-bold mb-3">Top regions</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={geo}>
              <CartesianGrid stroke="#e5e7eb" vertical={false}/>
              <XAxis dataKey="region" stroke="#6b7280" fontSize={12}/>
              <YAxis stroke="#6b7280" fontSize={12}/>
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb' }}/>
              <Bar dataKey="users" radius={[8, 8, 0, 0]} fill="#059669"/>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  );
}
