// Consultor RM — recomendaciones basadas en reglas (NO IA). Port de generateRMRecommendations
// de index.html. Corrige un bug del original: usaba `occAfter * 100` cuando occAfter ya viene
// en 0–100 (aquí se usa Math.round(occAfter)).
import { pickupStatus, PICKUP_LABEL } from './compare.js';

const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function dayLabel(row) {
  if (row.stayDate) {
    const parts = row.stayDate.split('-');
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return `${DAYS_ES[d.getDay()]} ${parts[2]}/${parts[1]}`;
    }
    return row.stayDate;
  }
  return 'D' + row.day;
}

/**
 * @param {any} metrics
 * @param {any[]} rows
 * @param {any[]} [weeklyData]
 */
export function generateRMRecommendations(metrics, rows, weeklyData = []) {
  const opportunityDates = [], riskDates = [], stagnantDates = [], criticalWeeks = [];

  (rows || []).forEach((row) => {
    if (row.pickup === null || row.pickup === undefined) return;
    const st = row.status || pickupStatus(row.pickup);
    const label = dayLabel(row);
    const occ = (row.occAfter !== null && row.occAfter !== undefined) ? Math.round(row.occAfter) : null;
    const rp = (row.roomPickup !== null && row.roomPickup !== undefined) ? row.roomPickup : null;
    const vel = (row.velocityHabs != null) ? row.velocityHabs : (row.velocityPP != null ? row.velocityPP : null);
    const velNote = (prefix) => (vel !== null ? [`⚡ Velocidad: ${typeof vel === 'number' ? vel.toFixed(2) : vel} habs/día — ${prefix}`] : []);

    if (st === 'strong-up' || st === 'moderate-up') {
      const actions = st === 'strong-up'
        ? ['📈 Evaluar incremento tarifario del 8–15%', '🔒 Cerrar tarifas con descuento inmediatamente', '🛡 Proteger inventario; evitar canales de bajo valor']
        : ['📈 Evaluar incremento tarifario del 5–10%', '🔒 Cerrar promociones activas en esta fecha'];
      actions.push('📢 Revisar paridad tarifaria en todos los canales', ...velNote('mantener monitoreo'));
      opportunityDates.push({ date: label, reason: PICKUP_LABEL[st], occ, roomPickup: rp, velocity: vel, actions });
    } else if (st === 'strong-down' || st === 'moderate-down') {
      const actions = st === 'strong-down'
        ? ['📉 Activar promoción táctica urgente (descuento 10–20%)', '👁 Mejorar visibilidad en OTAs (foto principal, descripción)', '🔍 Revisar tarifas vs compset — posible sobrecoste', '⚙ Revisar restricciones de estancia mínima']
        : ['📉 Considerar oferta de último momento o paquete', '👁 Revisar posicionamiento en OTAs', '🔍 Comparar con tarifa de competencia'];
      actions.push('📊 Analizar segmentos — corporativo, grupos, leisure', ...velNote('por debajo de lo esperado'));
      riskDates.push({ date: label, reason: PICKUP_LABEL[st], occ, roomPickup: rp, velocity: vel, actions });
    } else if (st === 'stable' && occ !== null && occ < 50) {
      stagnantDates.push({ date: label, reason: PICKUP_LABEL[st], occ, roomPickup: rp, velocity: vel, actions: [
        '📣 Estimular demanda con campaña de email/metabuscadores',
        '🖼 Revisar contenido y fotos del establecimiento en OTAs',
        '💬 Responder reseñas para mejorar ranking',
      ] });
    }
  });

  (weeklyData || []).forEach((w) => {
    if (w.avgPickup < -3 || w.totalRoomPickup < -5) {
      criticalWeeks.push({ weekLabel: w.weekLabel, pickup: w.avgPickup, roomPickup: w.totalRoomPickup, actions: [
        '🚨 Revisión inmediata de estrategia tarifaria para la semana',
        '📉 Activar promociones en todos los canales',
        '📞 Contactar cuentas corporativas y grupos potenciales',
      ] });
    }
  });

  const strongDownDates = [], modDownDates = [];
  (rows || []).forEach((row) => {
    if (row.pickup === null || row.pickup === undefined) return;
    const st = row.status || pickupStatus(row.pickup);
    if (st === 'strong-down') strongDownDates.push(dayLabel(row));
    else if (st === 'moderate-down') modDownDates.push(dayLabel(row));
  });

  const highItems = [], medItems = [], lowItems = [];
  if (strongDownDates.length) highItems.push({ priority: 'high', title: '🚨 Riesgo Crítico de Pickup', body: 'Fechas con caída fuerte de reservas que requieren acción inmediata: activar promociones, revisar tarifas vs compset y mejorar visibilidad OTA.', dates: strongDownDates });
  if (criticalWeeks.length) highItems.push({ priority: 'high', title: '🔴 Semanas Críticas Detectadas', body: `Semanas con pickup semanal muy negativo (${criticalWeeks.map((w) => w.weekLabel).join(', ')}). Revisión urgente de estrategia.`, dates: criticalWeeks.map((w) => w.weekLabel) });
  if (modDownDates.length) medItems.push({ priority: 'medium', title: '⚠ Riesgo Moderado de Pickup', body: 'Fechas con pickup negativo moderado: considerar ofertas de último momento y revisar posicionamiento en canales.', dates: modDownDates });
  if (stagnantDates.length) medItems.push({ priority: 'medium', title: '😐 Fechas Estancadas con Baja Ocupación', body: 'Fechas estables pero con ocupación baja (<50%). Estimular demanda con campañas y mejorar contenido.', dates: stagnantDates.map((d) => d.date) });
  if (opportunityDates.length) lowItems.push({ priority: 'low', title: '✅ Monitorear Oportunidades Tarifarias', body: 'Fechas con pickup positivo: mantener vigilancia, no bajar tarifas y evaluar incrementos adicionales si la demanda sigue.', dates: opportunityDates.map((d) => d.date) });
  lowItems.push({ priority: 'low', title: '📋 Revisión Semanal de Estrategia', body: 'Revisar esta comparativa al menos 2 veces por semana para anticipar cambios de demanda.', dates: [] });

  const priorityActions = [...highItems, ...medItems, ...lowItems];

  const totalRisk = riskDates.length, totalOpp = opportunityDates.length;
  let generalClass, diagText;
  if (totalRisk > totalOpp && totalRisk > 0) {
    generalClass = 'negative';
    diagText = `El período analizado muestra una tendencia negativa de pickup con ${totalRisk} fecha(s) en riesgo comercial${criticalWeeks.length ? ` y ${criticalWeeks.length} semana(s) crítica(s)` : ''}. Se requieren acciones correctivas inmediatas para sostener la ocupación.`;
  } else if (totalOpp > totalRisk && totalOpp > 0) {
    generalClass = 'positive';
    diagText = `El período muestra una tendencia positiva con ${totalOpp} fecha(s) de oportunidad tarifaria. Aproveche el momentum para optimizar ingresos mediante incrementos controlados.`;
  } else if (totalOpp > 0 && totalRisk > 0) {
    generalClass = 'mixed';
    diagText = `Panorama mixto: ${totalOpp} fecha(s) con oportunidad y ${totalRisk} fecha(s) con riesgo. Gestión diferenciada por fecha recomendada.`;
  } else {
    generalClass = 'stable';
    diagText = 'Pickup estable en el período. Mantener vigilancia y aprovechar para preparar estrategias de medio plazo.';
  }
  if (metrics && metrics.avgPickup != null) diagText += ` Pickup promedio del período: ${typeof metrics.avgPickup === 'number' ? metrics.avgPickup.toFixed(2) : metrics.avgPickup} pp.`;

  return { generalDiagnosis: { text: diagText, generalClass }, opportunityDates, riskDates, stagnantDates, criticalWeeks, priorityActions };
}
