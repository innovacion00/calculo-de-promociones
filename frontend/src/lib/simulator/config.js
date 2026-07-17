// Estado editable por hotel del Simulador de Tarifas — funciones puras (config in, config out).
// `config` tiene la misma forma que RateConfig del backend (ver models/rateConfig.js), así que
// se puede persistir/leer directo contra /api/rate-config sin transformación.
//
// Simplificación consciente frente al original (index.html): las ediciones de fila (label,
// % país, agregar/quitar/reordenar) siempre quedan como una foto completa en `sectionRows[secId]`
// (única fuente de verdad hacia adelante). `labelOverrides` se sigue leyendo por compatibilidad
// con documentos antiguos guardados por la app anterior, pero esta app ya no escribe entradas
// granulares ahí — evita mantener dos rutas de escritura para el mismo dato.

import { CHANNELS_BASE, nextSectionId } from './channels.js';

/** @param {string} hotel @param {string} [roomType] */
export function getRoomKey(hotel, roomType) {
  return roomType ? `${hotel}||${roomType}` : hotel;
}

/** Config vacía (hotel nuevo, sin datos guardados aún). */
export function emptyConfig() {
  return {
    rawBaseInputs: /** @type {Record<string, Record<string, number>>} */ ({}),
    rawPlanPcts: /** @type {Record<string, Record<string, number>>} */ ({}),
    rawPaisPcts: /** @type {Record<string, Record<string, number>>} */ ({}),
    promoVals: /** @type {Record<string, Record<string, number>>} */ ({}),
    titleOverrides: /** @type {Record<string, string>} */ ({}),
    labelOverrides: /** @type {Record<string, string>} */ ({}),
    extraSections: /** @type {Record<string, any[]>} */ ({}),
    deletedSectionIds: /** @type {Record<string, string[]>} */ ({}),
    channelOverrides: /** @type {Record<string, { geniusPct?: number, mobilePct?: number, commissionPct?: number }>} */ ({}),
    sectionOrder: /** @type {Record<string, string[]>} */ ({}),
    sectionRows: /** @type {Record<string, any[]>} */ ({}),
  };
}

/** Normaliza lo que devuelve la API (puede ser null o venir con campos faltantes). */
export function fromApiConfig(apiConfig) {
  const base = emptyConfig();
  if (!apiConfig) return base;
  return {
    rawBaseInputs: apiConfig.rawBaseInputs ?? base.rawBaseInputs,
    rawPlanPcts: apiConfig.rawPlanPcts ?? base.rawPlanPcts,
    rawPaisPcts: apiConfig.rawPaisPcts ?? base.rawPaisPcts,
    promoVals: apiConfig.promoVals ?? base.promoVals,
    titleOverrides: apiConfig.titleOverrides ?? base.titleOverrides,
    labelOverrides: apiConfig.labelOverrides ?? base.labelOverrides,
    extraSections: apiConfig.extraSections ?? base.extraSections,
    deletedSectionIds: apiConfig.deletedSectionIds ?? base.deletedSectionIds,
    channelOverrides: apiConfig.channelOverrides ?? base.channelOverrides,
    sectionOrder: apiConfig.sectionOrder ?? base.sectionOrder,
    sectionRows: apiConfig.sectionRows ?? base.sectionRows,
  };
}

const clone = (v) => JSON.parse(JSON.stringify(v));

/**
 * Asegura que cada sección extra tenga _id (por si viene de un doc guardado antes de
 * tener contador propio) y ancla el próximo contador de _id por encima del máximo visto.
 */
function ensureExtraIds(extraSections) {
  Object.values(extraSections || {}).forEach((arr) => {
    (arr || []).forEach((sec) => { if (!sec._id) sec._id = nextSectionId(); });
  });
}

/**
 * Resuelve las secciones (por defecto + extras, menos eliminadas, en el orden guardado)
 * de un canal para el hotel activo. Devuelve copias — nunca referencias a CHANNELS_BASE.
 * @param {string} chKey
 * @param {ReturnType<typeof emptyConfig>} config
 * @returns {import('./channels.js').Section[]}
 */
export function resolveChannelSections(chKey, config) {
  const ch = CHANNELS_BASE.find((c) => c.key === chKey);
  if (!ch) return [];
  ensureExtraIds(config.extraSections);
  const deleted = new Set((config.deletedSectionIds || {})[chKey] || []);
  const defaults = ch.sections.filter((s) => !deleted.has(s._id));
  const extras = ((config.extraSections || {})[chKey] || []).filter((s) => !deleted.has(s._id));
  const all = [...defaults, ...extras];

  const order = (config.sectionOrder || {})[chKey];
  const ordered = order
    ? (() => {
      const byId = new Map(all.map((s) => [s._id, s]));
      const out = [];
      order.forEach((id) => { if (byId.has(id)) { out.push(byId.get(id)); byId.delete(id); } });
      byId.forEach((s) => out.push(s));
      return out;
    })()
    : all;

  return ordered.map((sec) => resolveSection(sec, config));
}

/** Aplica overrides de título/filas a una sección (copia inmutable). */
function resolveSection(sec, config) {
  const title = (config.titleOverrides || {})[sec._id] ?? sec.title;
  const savedRows = (config.sectionRows || {})[sec._id];

  if (sec.ptMerged) {
    const rowsSin = clone(savedRows?.rowsSin ?? sec.rowsSin ?? []);
    const rowsCon = clone(savedRows?.rowsCon ?? sec.rowsCon ?? []);
    applyLegacyLabelOverrides(rowsSin, sec._id, 'rowsSin', config);
    applyLegacyLabelOverrides(rowsCon, sec._id, 'rowsCon', config);
    return { ...sec, title, rowsSin, rowsCon };
  }
  const rows = clone(savedRows ?? sec.rows ?? []);
  applyLegacyLabelOverrides(rows, sec._id, 'rows', config);
  return { ...sec, title, rows };
}

function applyLegacyLabelOverrides(rows, secId, rowsKey, config) {
  const overrides = config.labelOverrides || {};
  rows.forEach((row, ri) => {
    const key = `${secId}_${rowsKey}_${ri}`;
    if (overrides[key] !== undefined) row.label = overrides[key];
  });
}

// ── Getters (leen config para la room-key activa, con fallback a nivel hotel) ──────

export function getBaseInput(config, roomKey, hotel, chKey, fallback) {
  const v = (config.rawBaseInputs?.[roomKey] ?? {})[chKey];
  if (v !== undefined) return v;
  const hv = (config.rawBaseInputs?.[hotel] ?? {})[chKey];
  return hv !== undefined ? hv : fallback;
}

export function getPlanPct(config, roomKey, hotel, secId, rowIdx, fallback) {
  const key = `${secId}_${rowIdx}`;
  return config.rawPlanPcts?.[roomKey]?.[key] ?? config.rawPlanPcts?.[hotel]?.[key] ?? fallback;
}

export function getPaisPct(config, roomKey, hotel, secId) {
  return config.rawPaisPcts?.[roomKey]?.[secId] ?? config.rawPaisPcts?.[hotel]?.[secId] ?? 5;
}

export function getPromoVal(config, roomKey, hotel, sec) {
  const map = config.promoVals?.[sec._id];
  if (!map) return sec.promoDefault;
  return map[roomKey] ?? map[hotel] ?? sec.promoDefault;
}

export function getChannelOverride(config, chKey) {
  return config.channelOverrides?.[chKey] ?? {};
}

// ── Updaters (inmutables: devuelven una config nueva) ──────────────────────────────

export function setBaseInput(config, roomKey, chKey, value) {
  return {
    ...config,
    rawBaseInputs: { ...config.rawBaseInputs, [roomKey]: { ...(config.rawBaseInputs[roomKey] || {}), [chKey]: value } },
  };
}

export function setPlanPct(config, roomKey, secId, rowIdx, pct) {
  const key = `${secId}_${rowIdx}`;
  return {
    ...config,
    rawPlanPcts: { ...config.rawPlanPcts, [roomKey]: { ...(config.rawPlanPcts[roomKey] || {}), [key]: pct } },
  };
}

export function setPaisPct(config, roomKey, secId, pct) {
  return {
    ...config,
    rawPaisPcts: { ...config.rawPaisPcts, [roomKey]: { ...(config.rawPaisPcts[roomKey] || {}), [secId]: pct } },
  };
}

export function setPromoVal(config, roomKey, secId, val) {
  return {
    ...config,
    promoVals: { ...config.promoVals, [secId]: { ...(config.promoVals[secId] || {}), [roomKey]: val } },
  };
}

export function setTitle(config, secId, title) {
  return { ...config, titleOverrides: { ...config.titleOverrides, [secId]: title } };
}

export function setChannelOverride(config, chKey, patch) {
  return {
    ...config,
    channelOverrides: { ...config.channelOverrides, [chKey]: { ...(config.channelOverrides[chKey] || {}), ...patch } },
  };
}

/** Reemplaza el snapshot de filas de una sección simple (no ptMerged). */
export function setSectionRows(config, secId, rows) {
  return { ...config, sectionRows: { ...config.sectionRows, [secId]: clone(rows) } };
}

/** Reemplaza el snapshot de filas de una sección ptMerged (sin/con comisión). */
export function setSectionRowsPT(config, secId, rowsSin, rowsCon) {
  return { ...config, sectionRows: { ...config.sectionRows, [secId]: { rowsSin: clone(rowsSin), rowsCon: clone(rowsCon) } } };
}

/** Agrega una sección nueva (extra) a un canal. */
export function addExtraSection(config, chKey, newSection) {
  const list = [...((config.extraSections[chKey]) || []), newSection];
  return { ...config, extraSections: { ...config.extraSections, [chKey]: list } };
}

/** Elimina una sección (por defecto o extra) de un canal. */
export function removeSection(config, chKey, secId) {
  const nextExtras = { ...config.extraSections };
  if (nextExtras[chKey]) nextExtras[chKey] = nextExtras[chKey].filter((s) => s._id !== secId);
  const nextDeleted = { ...config.deletedSectionIds };
  const list = nextDeleted[chKey] || [];
  nextDeleted[chKey] = list.includes(secId) ? list : [...list, secId];
  return { ...config, extraSections: nextExtras, deletedSectionIds: nextDeleted };
}

/** Guarda el nuevo orden de secciones de un canal (drag-and-drop). */
export function setSectionOrder(config, chKey, orderedIds) {
  return { ...config, sectionOrder: { ...config.sectionOrder, [chKey]: orderedIds } };
}

/** Copia una sección (con nuevo _id) al final de las extras del canal. */
export function copySection(config, chKey, resolvedSec) {
  const newSec = clone(resolvedSec);
  newSec._id = nextSectionId();
  newSec.title = `${resolvedSec.title} (Copia)`;
  return addExtraSection(config, chKey, newSec);
}
