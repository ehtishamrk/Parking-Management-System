export default function StatCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl p-5 border ${accent ? 'bg-ink text-chalk border-ink' : 'bg-paper border-steel-line'}`}>
      <p className={`text-xs uppercase tracking-wide ${accent ? 'text-mist' : 'text-steel'}`}>{label}</p>
      <p className="font-display text-3xl mt-1">{value}</p>
    </div>
  );
}
