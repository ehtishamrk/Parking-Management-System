'use client';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';

export default function RevenueChart({ data }: { data: { day: string; revenue: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#C7D1CE" />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="#5B6E6A" />
          <YAxis tick={{ fontSize: 11 }} stroke="#5B6E6A" />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Bar dataKey="revenue" fill="#00D8B0" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
