export type RiskLevel = 'alto' | 'medio' | 'bajo';

export function classifyRisk(diasRestantes: number): RiskLevel {
  if (diasRestantes < 30) return 'alto';
  if (diasRestantes <= 90) return 'medio';
  return 'bajo';
}

export function riskColor(risk: RiskLevel): string {
  if (risk === 'alto') return 'text-red-600';
  if (risk === 'medio') return 'text-yellow-600';
  return 'text-green-600';
}

export function riskBg(risk: RiskLevel): string {
  if (risk === 'alto') return 'bg-red-100 text-red-800';
  if (risk === 'medio') return 'bg-yellow-100 text-yellow-800';
  return 'bg-green-100 text-green-800';
}
