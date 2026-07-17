// Fila de KPIs. Recibe un arreglo de tarjetas ya formateadas.
/**
 * @param {{ kpis: { label: string, value: string, sub?: string, tone?: 'ok'|'bad'|'alert' }[] }} props
 */
export default function KpiRow({ kpis }) {
  return (
    <div className="fin-kpi-row">
      {kpis.map((k, i) => (
        <div className={`fin-kpi${k.tone ? ' ' + k.tone : ''}`} key={i}>
          <div className="fin-kpi-label">{k.label}</div>
          <div className="fin-kpi-value">{k.value}</div>
          {k.sub && <div className="fin-kpi-sub">{k.sub}</div>}
        </div>
      ))}
    </div>
  );
}
