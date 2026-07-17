// Router del módulo financiero. Se monta en /api/financial desde server.js.
// Permisos por endpoint replican los de las rutas Next originales.

import { Router } from 'express';
import { requirePermission } from '../../middleware/requirePermission.js';
import {
  getAbonos, getAbonosStatsHandler, getAbonosDistinct, exportAbonos,
} from './abonos.controller.js';
import {
  getReconciliations, getReconciliationsStats, getReconciliationsDistinct,
  exportReconciliations, deleteAllReconciliations,
} from './reconciliations.controller.js';
import {
  getCheckouts, getCheckoutsStats, exportCheckouts, getCheckoutHotels,
} from './checkouts.controller.js';

export const financialRouter = Router();

const canView = requirePermission('canViewFinancialModule');
const canExport = requirePermission('canExportFinancialReports');
const canViewCheckouts = requirePermission('canViewCheckoutBalances');
const canImport = requirePermission('canImportReconciliations');

// Abonos (Bitrix)
financialRouter.get('/abonos', canView, getAbonos);
financialRouter.get('/abonos/stats', canView, getAbonosStatsHandler);
financialRouter.get('/abonos/distinct', canView, getAbonosDistinct);
financialRouter.get('/abonos/export', canExport, exportAbonos);

// Conciliaciones (Bitrix)
financialRouter.get('/reconciliations', canView, getReconciliations);
financialRouter.get('/reconciliations/stats', canView, getReconciliationsStats);
financialRouter.get('/reconciliations/distinct', canView, getReconciliationsDistinct);
financialRouter.get('/reconciliations/export', canExport, exportReconciliations);
financialRouter.delete('/reconciliations', canImport, deleteAllReconciliations);

// Saldos pendientes / Checkouts (PMS)
financialRouter.get('/checkouts', canViewCheckouts, getCheckouts);
financialRouter.get('/checkouts/hotels', canViewCheckouts, getCheckoutHotels);
financialRouter.get('/checkouts/stats', canViewCheckouts, getCheckoutsStats);
financialRouter.get('/checkouts/export', canExport, exportCheckouts);
