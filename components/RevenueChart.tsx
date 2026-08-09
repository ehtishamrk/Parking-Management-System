'use client';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';

export default function RevenueChart({ data }: { data: { day: string; revenue: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E4E4C8" />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="#8A9A6E" />
          <YAxis tick={{ fontSize: 11 }} stroke="#8A9A6E" />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Bar dataKey="revenue" fill="#A0C878" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
