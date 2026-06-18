# Gestión Financiera — Plan 1: Infraestructura Compartida + Conciliaciones Bancarias

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar el módulo Gestión Financiera con su sub-módulo Conciliaciones Bancarias — infraestructura de permisos, modelos MongoDB, API routes, CSS/HTML/JS en index.html.

**Architecture:** Vanilla JS SPA en `index.html` para frontend (mismo patrón que módulo Reputation/GBP); Next.js 16 API routes bajo `src/app/api/financial/`; MongoDB Atlas (`getDb()`) con dos nuevas colecciones. El Excel se parsea en el browser con SheetJS (ya cargado desde CDN) y se envía como JSON al API.

**Tech Stack:** Vanilla JS (index.html), Next.js 16.2.6 API routes (TypeScript), MongoDB Atlas 7.2.0, SheetJS XLSX 0.20.3 (CDN global `XLSX`), Chart.js 4.4.0 (CDN global `Chart`).

---

## Mapa de archivos

| Acción | Archivo | Responsabilidad |
|---|---|---|
| Modify | `src/types/auth.ts` | Agregar 11 permisos financieros al union type `Permission` |
| Modify | `src/lib/db/models/user.ts` | Agregar permisos financieros a `DEFAULT_ROLE_PERMISSIONS` |
| Create | `src/lib/db/models/financialReconciliation.ts` | Interfaz + CRUD para colección `financial_reconciliations` |
| Create | `src/lib/db/models/financialAuditLog.ts` | Interfaz + insert para colección `financial_audit_logs` |
| Create | `src/app/api/financial/reconciliations/route.ts` | GET lista paginada, POST import desde JSON |
| Create | `src/app/api/financial/reconciliations/stats/route.ts` | GET KPIs y conteos |
| Create | `src/app/api/financial/reconciliations/[id]/route.ts` | PATCH campos + observación |
| Create | `src/app/api/financial/reconciliations/[id]/mark-reconciled/route.ts` | POST marcar conciliado |
| Create | `src/app/api/financial/reconciliations/[id]/mark-unreconciled/route.ts` | POST desmarcar conciliado |
| Create | `src/app/api/financial/reconciliations/export/route.ts` | GET exportar CSV |
| Modify | `index.html` (CSS section) | Clases `.fin-*` para el módulo |
| Modify | `index.html` (before `#toast`) | `<div id="module-financial">` con HTML completo del módulo |
| Modify | `index.html:1790` `setupAppLayout()` toMove array | Agregar `'module-financial'` |
| Modify | `index.html:3689` `switchModule()` | Agregar rama `isFinancial` |
| Modify | `index.html:1712` `getAvailableModulesForUser()` | Agregar grupo "Finanzas" con item 'financial' |
| Modify | `index.html` (before `</script>`) | Funciones `fin*` del módulo financiero |

---

### Task 1: Permisos — `src/types/auth.ts`

**Files:**
- Modify: `src/types/auth.ts:46`

- [ ] **Step 1: Agregar los 11 permisos al union `Permission`**

Reemplazar la línea que termina el union (actualmente cierra con `'canViewGoogleBusinessReviews'`) para agregar los permisos financieros:

```typescript
// En src/types/auth.ts, reemplazar:
  | 'canManageGoogleBusiness'
  | 'canViewGoogleBusinessReviews';

// Por:
  | 'canManageGoogleBusiness'
  | 'canViewGoogleBusinessReviews'
  | 'canViewFinancialModule'
  | 'canImportReconciliations'
  | 'canEditReconciliations'
  | 'canMarkReconciled'
  | 'canViewCheckoutBalances'
  | 'canEditCheckoutBalances'
  | 'canViewAccountsReceivable'
  | 'canUploadReceivableProof'
  | 'canMarkReceivablePaid'
  | 'canExportFinancialReports'
  | 'canViewFinancialAudit';
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/types/auth.ts
git commit -m "feat(financial): add 11 financial permissions to Permission type"
```

---

### Task 2: Permisos en roles — `src/lib/db/models/user.ts`

**Files:**
- Modify: `src/lib/db/models/user.ts:35-66`

- [ ] **Step 1: Actualizar `DEFAULT_ROLE_PERMISSIONS`**

Reemplazar el objeto completo `DEFAULT_ROLE_PERMISSIONS` con la versión que incluye permisos financieros:

```typescript
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  master_admin: [
    'canViewDashboard', 'canViewAllHotels', 'canManageUsers', 'canCreateUsers',
    'canEditUsers', 'canDisableUsers', 'canAssignHotels', 'canManageRoles',
    'canManagePermissions', 'canViewAuditLog', 'canEditRateSimulator',
    'canEditPromotions', 'canEditBookingConfig', 'canEditOtb', 'canUploadOtbFiles',
    'canCreateNotes', 'canEditOwnNotes', 'canEditAllNotes', 'canDeleteNotes',
    'canExportReports', 'canRestoreConfigurations', 'canManageGlobalSettings',
    'canViewAllActivity', 'canManageAgenda', 'canManageOfficialHotelConfig',
    'canManageHotelAssignments', 'canManageGoogleBusiness', 'canViewGoogleBusinessReviews',
    'canViewFinancialModule', 'canImportReconciliations', 'canEditReconciliations',
    'canMarkReconciled', 'canViewCheckoutBalances', 'canEditCheckoutBalances',
    'canViewAccountsReceivable', 'canUploadReceivableProof', 'canMarkReceivablePaid',
    'canExportFinancialReports', 'canViewFinancialAudit',
  ],
  admin: [
    'canViewDashboard', 'canViewAllHotels', 'canEditRateSimulator', 'canEditPromotions',
    'canEditBookingConfig', 'canEditOtb', 'canUploadOtbFiles', 'canCreateNotes',
    'canEditOwnNotes', 'canEditAllNotes', 'canDeleteNotes', 'canExportReports',
    'canManageAgenda', 'canViewAuditLog', 'canManageGoogleBusiness', 'canViewGoogleBusinessReviews',
    'canViewFinancialModule', 'canImportReconciliations', 'canEditReconciliations',
    'canMarkReconciled', 'canViewCheckoutBalances', 'canEditCheckoutBalances',
    'canViewAccountsReceivable', 'canUploadReceivableProof', 'canMarkReceivablePaid',
    'canExportFinancialReports', 'canViewFinancialAudit',
  ],
  revenue_manager: [
    'canViewDashboard', 'canViewAllHotels', 'canEditRateSimulator', 'canEditPromotions',
    'canEditBookingConfig', 'canEditOtb', 'canUploadOtbFiles', 'canCreateNotes',
    'canEditOwnNotes', 'canExportReports', 'canManageAgenda', 'canViewGoogleBusinessReviews',
    'canViewFinancialModule', 'canViewCheckoutBalances', 'canViewAccountsReceivable',
    'canExportFinancialReports',
  ],
  revenue_assistant: [
    'canViewDashboard', 'canViewAllHotels', 'canCreateNotes', 'canEditOwnNotes',
    'canEditOtb', 'canManageAgenda',
    'canViewFinancialModule',
  ],
  operations: [
    'canViewDashboard', 'canViewAllHotels', 'canCreateNotes', 'canEditOwnNotes', 'canManageAgenda',
    'canViewFinancialModule', 'canViewCheckoutBalances',
  ],
  viewer: ['canViewDashboard', 'canViewAllHotels'],
  reservas: ['canViewMonitoreo'],
};
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/models/user.ts
git commit -m "feat(financial): add financial permissions to DEFAULT_ROLE_PERMISSIONS"
```

---

### Task 3: Modelo de datos — `src/lib/db/models/financialReconciliation.ts`

**Files:**
- Create: `src/lib/db/models/financialReconciliation.ts`

- [ ] **Step 1: Crear el archivo con interfaz y CRUD**

```typescript
import { ObjectId, Collection } from 'mongodb';
import { getDb } from '../mongodb';

export type ReconciliationStatus =
  | 'reconciled'
  | 'unreconciled'
  | 'pending_review'
  | 'probable_duplicate'
  | 'requires_support'
  | 'no_hotel'
  | 'under_investigation'
  | 'adjusted';

export interface ReconciliationRecord {
  _id?: ObjectId;
  id: string;
  source: 'excel' | 'api';
  sourceFileName?: string;
  sourceSheet?: string;
  movementName?: string;
  hotelId?: string;
  hotelName?: string;
  companyName?: string;
  legalEntity?: string;
  operationType?: string;
  movementDate?: string;
  bank?: string;
  confirmationNumber?: string;
  reconciledStatus: ReconciliationStatus;
  netAmount?: number;
  receiptUrl?: string;
  transactionId?: string;
  authorizationCode?: string;
  issuer?: string;
  cardBrand?: string;
  terminal?: string;
  purchaseValue?: number;
  iva?: number;
  iac?: number;
  tip?: number;
  netPurchase?: number;
  commission?: number;
  withholdingTax?: number;
  reteIva?: number;
  reteIca?: number;
  duplicateFlag: boolean;
  inconsistencyFlags: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface ReconciliationListOptions {
  hotelId?: string;
  status?: ReconciliationStatus;
  bank?: string;
  cardBrand?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

const COL = 'financial_reconciliations';

async function getCollection(): Promise<Collection<ReconciliationRecord>> {
  const db = await getDb();
  return db.collection<ReconciliationRecord>(COL);
}

export async function ensureIndexes(): Promise<void> {
  const col = await getCollection();
  await col.createIndex({ id: 1 }, { unique: true });
  await col.createIndex({ hotelId: 1 });
  await col.createIndex({ movementDate: -1 });
  await col.createIndex({ reconciledStatus: 1 });
  await col.createIndex({ bank: 1 });
  await col.createIndex({ confirmationNumber: 1 });
}

export async function insertMany(records: Omit<ReconciliationRecord, '_id'>[]): Promise<number> {
  if (records.length === 0) return 0;
  const col = await getCollection();
  const result = await col.insertMany(records as ReconciliationRecord[]);
  return result.insertedCount;
}

export async function findById(id: string): Promise<ReconciliationRecord | null> {
  const col = await getCollection();
  return col.findOne({ id });
}

export async function updateRecord(
  id: string,
  updates: Partial<ReconciliationRecord>,
  updatedBy: string,
): Promise<ReconciliationRecord | null> {
  const col = await getCollection();
  const { _id, ...safe } = updates as ReconciliationRecord;
  void _id;
  return col.findOneAndUpdate(
    { id },
    { $set: { ...safe, updatedAt: new Date().toISOString(), updatedBy } },
    { returnDocument: 'after' },
  );
}

export async function listRecords(opts: ReconciliationListOptions = {}): Promise<{
  data: ReconciliationRecord[];
  total: number;
}> {
  const col = await getCollection();
  const { hotelId, status, bank, cardBrand, dateFrom, dateTo, search, page = 1, pageSize = 18 } = opts;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {};
  if (hotelId) filter.hotelId = hotelId;
  if (status) filter.reconciledStatus = status;
  if (bank) filter.bank = bank;
  if (cardBrand) filter.cardBrand = cardBrand;
  if (dateFrom || dateTo) {
    filter.movementDate = {};
    if (dateFrom) filter.movementDate.$gte = dateFrom;
    if (dateTo) filter.movementDate.$lte = dateTo;
  }
  if (search) {
    filter.$or = [
      { movementName: { $regex: search, $options: 'i' } },
      { hotelName: { $regex: search, $options: 'i' } },
      { confirmationNumber: { $regex: search, $options: 'i' } },
      { bank: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * pageSize;
  const [data, total] = await Promise.all([
    col.find(filter).sort({ movementDate: -1, createdAt: -1 }).skip(skip).limit(pageSize).toArray(),
    col.countDocuments(filter),
  ]);
  return { data, total };
}

export async function getStats(hotelId?: string): Promise<{
  total: number;
  totalAmount: number;
  reconciled: number;
  reconciledAmount: number;
  unreconciled: number;
  unreconciledAmount: number;
  noHotel: number;
  noReceipt: number;
  probableDuplicate: number;
  noConfirmation: number;
  requiresSupport: number;
}> {
  const col = await getCollection();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const baseFilter: Record<string, any> = hotelId ? { hotelId } : {};

  const [all, reconciled, unreconciledDocs] = await Promise.all([
    col.find(baseFilter).toArray(),
    col.find({ ...baseFilter, reconciledStatus: 'reconciled' }).toArray(),
    col.find({ ...baseFilter, reconciledStatus: { $ne: 'reconciled' } }).toArray(),
  ]);

  const sum = (arr: ReconciliationRecord[]) =>
    arr.reduce((acc, r) => acc + (r.netAmount ?? 0), 0);

  return {
    total: all.length,
    totalAmount: sum(all),
    reconciled: reconciled.length,
    reconciledAmount: sum(reconciled),
    unreconciled: unreconciledDocs.length,
    unreconciledAmount: sum(unreconciledDocs),
    noHotel: all.filter(r => r.inconsistencyFlags.includes('no_hotel')).length,
    noReceipt: all.filter(r => r.inconsistencyFlags.includes('no_receipt')).length,
    probableDuplicate: all.filter(r => r.inconsistencyFlags.includes('probable_duplicate')).length,
    noConfirmation: all.filter(r => r.inconsistencyFlags.includes('no_confirmation')).length,
    requiresSupport: all.filter(r => r.reconciledStatus === 'requires_support').length,
  };
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/models/financialReconciliation.ts
git commit -m "feat(financial): add ReconciliationRecord model with CRUD and stats"
```

---

### Task 4: Modelo de auditoría — `src/lib/db/models/financialAuditLog.ts`

**Files:**
- Create: `src/lib/db/models/financialAuditLog.ts`

- [ ] **Step 1: Crear el archivo**

```typescript
import { ObjectId, Collection } from 'mongodb';
import { getDb } from '../mongodb';

export interface FinancialAuditLog {
  _id?: ObjectId;
  id: string;
  userId: string;
  userName: string;
  module: 'reconciliations' | 'balances' | 'accounts_receivable';
  entityType: string;
  entityId: string;
  action: string;
  previousValue?: unknown;
  newValue?: unknown;
  notes?: string;
  createdAt: string;
}

const COL = 'financial_audit_logs';

async function getCollection(): Promise<Collection<FinancialAuditLog>> {
  const db = await getDb();
  return db.collection<FinancialAuditLog>(COL);
}

export async function ensureIndexes(): Promise<void> {
  const col = await getCollection();
  await col.createIndex({ entityId: 1 });
  await col.createIndex({ userId: 1 });
  await col.createIndex({ createdAt: -1 });
  await col.createIndex({ module: 1 });
}

export async function insertAuditLog(
  entry: Omit<FinancialAuditLog, '_id'>,
): Promise<void> {
  const col = await getCollection();
  await col.insertOne(entry as FinancialAuditLog);
}

export async function listByEntity(entityId: string): Promise<FinancialAuditLog[]> {
  const col = await getCollection();
  return col.find({ entityId }).sort({ createdAt: -1 }).toArray();
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/models/financialAuditLog.ts
git commit -m "feat(financial): add FinancialAuditLog model"
```

---

### Task 5: API route principal — `src/app/api/financial/reconciliations/route.ts`

Esta ruta maneja GET (lista paginada) y POST (importación batch desde JSON parseado en el browser con SheetJS).

**Files:**
- Create: `src/app/api/financial/reconciliations/route.ts`

- [ ] **Step 1: Crear el archivo**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth/session';
import { listRecords, insertMany, ensureIndexes } from '../../../../lib/db/models/financialReconciliation';
import { insertAuditLog } from '../../../../lib/db/models/financialAuditLog';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'No autenticado.' }, { status: 401 });
  if (!session.permissions.includes('canViewFinancialModule')) {
    return NextResponse.json({ ok: false, error: 'Sin permisos.' }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  try {
    const result = await listRecords({
      hotelId: sp.get('hotelId') ?? undefined,
      status: sp.get('status') as never ?? undefined,
      bank: sp.get('bank') ?? undefined,
      cardBrand: sp.get('cardBrand') ?? undefined,
      dateFrom: sp.get('dateFrom') ?? undefined,
      dateTo: sp.get('dateTo') ?? undefined,
      search: sp.get('search') ?? undefined,
      page: sp.get('page') ? Number(sp.get('page')) : 1,
      pageSize: sp.get('pageSize') ? Number(sp.get('pageSize')) : 18,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

// Column alias map for flexible Excel header mapping
const COL_ALIASES: Record<string, string[]> = {
  hotel:              ['Hotel', 'Establecimiento', 'Propiedad'],
  companyName:        ['Razón social', 'Razon Social', 'Empresa'],
  movementDate:       ['Fecha del movimiento', 'Fecha Movimiento', 'Fecha'],
  netAmount:          ['Neto abonar', 'Valor Neto', 'Valor'],
  reconciledStatus:   ['Conciliado', 'Estado Conciliación', 'Estado'],
  bank:               ['Banco', 'Entidad bancaria'],
  confirmationNumber: ['Número de confirmación', 'Referencia', 'Confirmación'],
  movementName:       ['Nombre del movimiento', 'Nombre Movimiento', 'Nombre', 'Descripción'],
  operationType:      ['Tipo de operación', 'Tipo Operación', 'Tipo'],
  cardBrand:          ['Franquicia', 'Marca', 'Red'],
  transactionId:      ['ID Transacción', 'ID', 'Transacción'],
  authorizationCode:  ['Código autorización', 'Auth Code', 'Autorización'],
  purchaseValue:      ['Valor compra', 'Compra'],
  commission:         ['Comisión'],
  withholdingTax:     ['Retefuente', 'Rte Fuente'],
  reteIva:            ['ReteIVA', 'Rete IVA'],
  reteIca:            ['ReteICA', 'Rete ICA'],
  receiptUrl:         ['Comprobante', 'URL Comprobante'],
};

function resolveHeader(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const [field, aliases] of Object.entries(COL_ALIASES)) {
    for (const alias of aliases) {
      const idx = headers.findIndex(h => h.trim().toLowerCase() === alias.toLowerCase());
      if (idx !== -1) { map[field] = idx; break; }
    }
  }
  return map;
}

function detectInconsistencies(row: Record<string, unknown>): string[] {
  const flags: string[] = [];
  if (!row.hotelName) flags.push('no_hotel');
  if (!row.receiptUrl) flags.push('no_receipt');
  if (!row.confirmationNumber) flags.push('no_confirmation');
  if (!row.netAmount || row.netAmount === 0) flags.push('zero_amount');
  if (!row.operationType) flags.push('no_operation_type');
  return flags;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'No autenticado.' }, { status: 401 });
  if (!session.permissions.includes('canImportReconciliations')) {
    return NextResponse.json({ ok: false, error: 'Sin permisos de importación.' }, { status: 403 });
  }

  let body: { rows: Record<string, unknown>[][]; headers: string[]; sourceFileName?: string; sourceSheet?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Body JSON inválido.' }, { status: 400 });
  }

  if (!Array.isArray(body.rows) || !Array.isArray(body.headers)) {
    return NextResponse.json({ ok: false, error: 'Se requieren headers y rows.' }, { status: 400 });
  }

  await ensureIndexes();

  const headerMap = resolveHeader(body.headers);
  const now = new Date().toISOString();

  const records = body.rows.map((rawRow: Record<string, unknown>) => {
    const get = (field: string) => {
      const idx = headerMap[field];
      return idx !== undefined ? rawRow[idx] : undefined;
    };

    const hotelName = String(get('hotel') ?? '').trim() || undefined;
    const confirmationNumber = String(get('confirmationNumber') ?? '').trim() || undefined;
    const receiptUrl = String(get('receiptUrl') ?? '').trim() || undefined;
    const netAmount = parseFloat(String(get('netAmount') ?? '0').replace(/[^0-9.-]/g, '')) || undefined;
    const operationType = String(get('operationType') ?? '').trim() || undefined;

    const partial = { hotelName, confirmationNumber, receiptUrl, netAmount, operationType };
    const inconsistencyFlags = detectInconsistencies(partial);

    const rawStatus = String(get('reconciledStatus') ?? '').trim().toLowerCase();
    const reconciledStatus = rawStatus === 'conciliado' || rawStatus === 'reconciled'
      ? 'reconciled' as const
      : 'unreconciled' as const;

    return {
      id: randomUUID(),
      source: 'excel' as const,
      sourceFileName: body.sourceFileName,
      sourceSheet: body.sourceSheet,
      movementName: String(get('movementName') ?? '').trim() || undefined,
      hotelName,
      companyName: String(get('companyName') ?? '').trim() || undefined,
      operationType,
      movementDate: String(get('movementDate') ?? '').trim() || undefined,
      bank: String(get('bank') ?? '').trim() || undefined,
      confirmationNumber,
      reconciledStatus,
      netAmount,
      receiptUrl,
      transactionId: String(get('transactionId') ?? '').trim() || undefined,
      authorizationCode: String(get('authorizationCode') ?? '').trim() || undefined,
      cardBrand: String(get('cardBrand') ?? '').trim() || undefined,
      purchaseValue: parseFloat(String(get('purchaseValue') ?? '').replace(/[^0-9.-]/g, '')) || undefined,
      commission: parseFloat(String(get('commission') ?? '').replace(/[^0-9.-]/g, '')) || undefined,
      withholdingTax: parseFloat(String(get('withholdingTax') ?? '').replace(/[^0-9.-]/g, '')) || undefined,
      reteIva: parseFloat(String(get('reteIva') ?? '').replace(/[^0-9.-]/g, '')) || undefined,
      reteIca: parseFloat(String(get('reteIca') ?? '').replace(/[^0-9.-]/g, '')) || undefined,
      duplicateFlag: false,
      inconsistencyFlags,
      createdAt: now,
      updatedAt: now,
      createdBy: session.userId,
      updatedBy: session.userId,
    };
  });

  try {
    const inserted = await insertMany(records);
    await insertAuditLog({
      id: randomUUID(),
      userId: session.userId,
      userName: session.userName,
      module: 'reconciliations',
      entityType: 'batch_import',
      entityId: body.sourceFileName ?? 'unknown',
      action: 'import_excel',
      newValue: { inserted, fileName: body.sourceFileName, sheet: body.sourceSheet },
      createdAt: now,
    });
    return NextResponse.json({ ok: true, inserted });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/financial/reconciliations/route.ts
git commit -m "feat(financial): add reconciliations GET list and POST import API route"
```

---

### Task 6: API stats — `src/app/api/financial/reconciliations/stats/route.ts`

**Files:**
- Create: `src/app/api/financial/reconciliations/stats/route.ts`

- [ ] **Step 1: Crear el archivo**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/auth/session';
import { getStats } from '../../../../../lib/db/models/financialReconciliation';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'No autenticado.' }, { status: 401 });
  if (!session.permissions.includes('canViewFinancialModule')) {
    return NextResponse.json({ ok: false, error: 'Sin permisos.' }, { status: 403 });
  }

  const hotelId = req.nextUrl.searchParams.get('hotelId') ?? undefined;
  try {
    const stats = await getStats(hotelId);
    return NextResponse.json({ ok: true, stats });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/financial/reconciliations/stats/route.ts
git commit -m "feat(financial): add reconciliations stats API route"
```

---

### Task 7: API PATCH — `src/app/api/financial/reconciliations/[id]/route.ts`

**Files:**
- Create: `src/app/api/financial/reconciliations/[id]/route.ts`

- [ ] **Step 1: Crear el archivo**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/auth/session';
import { findById, updateRecord } from '../../../../../lib/db/models/financialReconciliation';
import { insertAuditLog } from '../../../../../lib/db/models/financialAuditLog';
import { randomUUID } from 'crypto';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'No autenticado.' }, { status: 401 });
  if (!session.permissions.includes('canEditReconciliations')) {
    return NextResponse.json({ ok: false, error: 'Sin permisos.' }, { status: 403 });
  }

  const { id } = await params;
  const existing = await findById(id);
  if (!existing) return NextResponse.json({ ok: false, error: 'Registro no encontrado.' }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Body JSON inválido.' }, { status: 400 });
  }

  // Only allow editing safe fields
  const allowed = ['notes', 'hotelId', 'hotelName', 'reconciledStatus', 'operationType'];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  try {
    const updated = await updateRecord(id, updates, session.userId);
    await insertAuditLog({
      id: randomUUID(),
      userId: session.userId,
      userName: session.userName,
      module: 'reconciliations',
      entityType: 'reconciliation',
      entityId: id,
      action: 'edit',
      previousValue: Object.fromEntries(Object.keys(updates).map(k => [k, (existing as Record<string, unknown>)[k]])),
      newValue: updates,
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, data: updated });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/financial/reconciliations/[id]/route.ts
git commit -m "feat(financial): add reconciliation PATCH route"
```

---

### Task 8: API mark-reconciled — `src/app/api/financial/reconciliations/[id]/mark-reconciled/route.ts`

**Files:**
- Create: `src/app/api/financial/reconciliations/[id]/mark-reconciled/route.ts`

- [ ] **Step 1: Crear el archivo**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../../../lib/auth/session';
import { findById, updateRecord } from '../../../../../../lib/db/models/financialReconciliation';
import { insertAuditLog } from '../../../../../../lib/db/models/financialAuditLog';
import { randomUUID } from 'crypto';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'No autenticado.' }, { status: 401 });
  if (!session.permissions.includes('canMarkReconciled')) {
    return NextResponse.json({ ok: false, error: 'Sin permisos.' }, { status: 403 });
  }

  const { id } = await params;
  const existing = await findById(id);
  if (!existing) return NextResponse.json({ ok: false, error: 'Registro no encontrado.' }, { status: 404 });

  try {
    const updated = await updateRecord(id, { reconciledStatus: 'reconciled' }, session.userId);
    await insertAuditLog({
      id: randomUUID(),
      userId: session.userId,
      userName: session.userName,
      module: 'reconciliations',
      entityType: 'reconciliation',
      entityId: id,
      action: 'mark_reconciled',
      previousValue: { reconciledStatus: existing.reconciledStatus },
      newValue: { reconciledStatus: 'reconciled' },
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, data: updated });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/financial/reconciliations/[id]/mark-reconciled/route.ts"
git commit -m "feat(financial): add mark-reconciled POST route"
```

---

### Task 9: API mark-unreconciled — `src/app/api/financial/reconciliations/[id]/mark-unreconciled/route.ts`

**Files:**
- Create: `src/app/api/financial/reconciliations/[id]/mark-unreconciled/route.ts`

- [ ] **Step 1: Crear el archivo**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../../../lib/auth/session';
import { findById, updateRecord } from '../../../../../../lib/db/models/financialReconciliation';
import { insertAuditLog } from '../../../../../../lib/db/models/financialAuditLog';
import { randomUUID } from 'crypto';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'No autenticado.' }, { status: 401 });
  if (!session.permissions.includes('canMarkReconciled')) {
    return NextResponse.json({ ok: false, error: 'Sin permisos.' }, { status: 403 });
  }

  const { id } = await params;
  const existing = await findById(id);
  if (!existing) return NextResponse.json({ ok: false, error: 'Registro no encontrado.' }, { status: 404 });

  try {
    const updated = await updateRecord(id, { reconciledStatus: 'unreconciled' }, session.userId);
    await insertAuditLog({
      id: randomUUID(),
      userId: session.userId,
      userName: session.userName,
      module: 'reconciliations',
      entityType: 'reconciliation',
      entityId: id,
      action: 'mark_unreconciled',
      previousValue: { reconciledStatus: existing.reconciledStatus },
      newValue: { reconciledStatus: 'unreconciled' },
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, data: updated });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/financial/reconciliations/[id]/mark-unreconciled/route.ts"
git commit -m "feat(financial): add mark-unreconciled POST route"
```

---

### Task 10: API export — `src/app/api/financial/reconciliations/export/route.ts`

Exporta la lista completa como CSV (sin dependencias extra — SheetJS en el backend requeriría instalar la librería del lado del server; CSV es suficiente para MVP y se puede abrir en Excel).

**Files:**
- Create: `src/app/api/financial/reconciliations/export/route.ts`

- [ ] **Step 1: Crear el archivo**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/auth/session';
import { listRecords } from '../../../../../lib/db/models/financialReconciliation';

function escCsv(val: unknown): string {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'No autenticado.' }, { status: 401 });
  if (!session.permissions.includes('canExportFinancialReports')) {
    return NextResponse.json({ ok: false, error: 'Sin permisos.' }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  try {
    const { data } = await listRecords({
      hotelId: sp.get('hotelId') ?? undefined,
      status: sp.get('status') as never ?? undefined,
      bank: sp.get('bank') ?? undefined,
      cardBrand: sp.get('cardBrand') ?? undefined,
      dateFrom: sp.get('dateFrom') ?? undefined,
      dateTo: sp.get('dateTo') ?? undefined,
      search: sp.get('search') ?? undefined,
      page: 1,
      pageSize: 10000,
    });

    const headers = [
      'Fecha', 'Hotel', 'Razón Social', 'Banco', 'Franquicia',
      'Tipo Operación', 'Nº Confirmación', 'Neto Abonar', 'Estado',
      'Duplicado', 'Inconsistencias', 'Observación',
    ];

    const rows = data.map(r => [
      r.movementDate ?? '',
      r.hotelName ?? '',
      r.companyName ?? '',
      r.bank ?? '',
      r.cardBrand ?? '',
      r.operationType ?? '',
      r.confirmationNumber ?? '',
      r.netAmount ?? '',
      r.reconciledStatus,
      r.duplicateFlag ? 'Sí' : 'No',
      r.inconsistencyFlags.join('; '),
      r.notes ?? '',
    ].map(escCsv).join(','));

    const csv = [headers.join(','), ...rows].join('\r\n');
    const fileName = `conciliaciones_${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/financial/reconciliations/export/route.ts
git commit -m "feat(financial): add reconciliations CSV export route"
```

---

### Task 11: CSS del módulo financiero en `index.html`

Busca el cierre de la sección `<style>` (el `</style>` que cierra el bloque principal de CSS cerca de la línea 850) y añade las clases `.fin-*` justo antes de él.

**Files:**
- Modify: `index.html` (dentro del bloque `<style>`)

- [ ] **Step 1: Agregar CSS**

Busca en `index.html` la línea que contiene exactamente `/* END GOOGLE BUSINESS */` o la última sección de CSS del módulo GBP, y agrega después (antes del `</style>`):

```css
/* ═══════════════════════════════════════════════════════════════
   FINANCIAL MODULE
   ═══════════════════════════════════════════════════════════════ */
#module-financial { display:none; flex-direction:column; min-height:0; }
.fin-header { display:flex; align-items:center; justify-content:space-between; padding:18px 24px 0; }
.fin-header h2 { font-size:1.25rem; font-weight:800; color:var(--gold-dark); margin:0; }
.fin-tabs { display:flex; gap:4px; padding:12px 24px 0; border-bottom:1.5px solid var(--gold-border); }
.fin-tab { padding:7px 18px; border:none; background:none; cursor:pointer; font-size:.82rem; font-weight:600;
  color:#888; border-radius:6px 6px 0 0; transition:all .15s; }
.fin-tab.active { background:var(--gold-subtle); color:var(--gold-dark); border-bottom:2px solid var(--gold); }
.fin-tab:hover:not(.active) { background:#f5f5f5; color:#555; }
.fin-body { flex:1; overflow-y:auto; padding:20px 24px; }
.fin-kpi-row { display:flex; gap:14px; flex-wrap:wrap; margin-bottom:18px; }
.fin-kpi { flex:1; min-width:160px; background:#fff; border:1.5px solid var(--gold-border);
  border-radius:10px; padding:14px 18px; }
.fin-kpi-label { font-size:.72rem; font-weight:600; color:#888; text-transform:uppercase; letter-spacing:.5px; }
.fin-kpi-value { font-size:1.45rem; font-weight:800; color:#1a1a2e; margin-top:4px; }
.fin-kpi-sub { font-size:.72rem; color:#aaa; margin-top:2px; }
.fin-kpi.alert { border-color:#f4a800; background:#fffbf0; }
.fin-kpi.alert .fin-kpi-value { color:#b07800; }
.fin-kpi.ok { border-color:#43a047; background:#f0faf0; }
.fin-kpi.ok .fin-kpi-value { color:#2e7d32; }
.fin-kpi.bad { border-color:#e53935; background:#fff5f5; }
.fin-kpi.bad .fin-kpi-value { color:#c62828; }
.fin-charts-row { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:18px; }
.fin-chart-card { background:#fff; border:1.5px solid var(--gold-border); border-radius:10px; padding:16px; }
.fin-chart-title { font-size:.78rem; font-weight:700; color:#666; margin-bottom:10px; text-transform:uppercase; letter-spacing:.4px; }
.fin-toolbar { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom:14px; }
.fin-toolbar input, .fin-toolbar select { padding:7px 12px; border:1.5px solid var(--gold-border);
  border-radius:7px; font-size:.82rem; background:#fff; color:#333; outline:none; }
.fin-toolbar input:focus, .fin-toolbar select:focus { border-color:var(--gold); }
.fin-action-btn { padding:7px 16px; border:1.5px solid var(--gold-border); border-radius:7px;
  background:#fff; color:var(--gold-dark); font-size:.82rem; font-weight:600; cursor:pointer; transition:all .15s; }
.fin-action-btn:hover { background:var(--gold-subtle); }
.fin-action-btn.primary { background:var(--gold); color:#fff; border-color:var(--gold); }
.fin-action-btn.primary:hover { background:var(--gold-dark); border-color:var(--gold-dark); }
.fin-table-wrap { overflow-x:auto; }
.fin-table { width:100%; border-collapse:collapse; font-size:.82rem; }
.fin-table th { background:var(--gold-subtle); color:var(--gold-dark); font-weight:700;
  text-transform:uppercase; letter-spacing:.4px; font-size:.72rem; padding:9px 12px; text-align:left;
  border-bottom:2px solid var(--gold-border); white-space:nowrap; }
.fin-table td { padding:9px 12px; border-bottom:1px solid #f0f0f0; color:#333; vertical-align:middle; }
.fin-table tr:hover td { background:#faf8f5; }
.fin-table tr.no-hotel td { border-left:3px solid var(--gold); }
.fin-table tr.duplicate td { border-left:3px solid #e53935; }
.fin-table tr.reviewing td { background:#fffde7; }
.fin-badge { display:inline-block; padding:3px 9px; border-radius:20px; font-size:.7rem; font-weight:700; }
.fin-badge.reconciled { background:#e8f5e9; color:#2e7d32; }
.fin-badge.unreconciled { background:#ffebee; color:#c62828; }
.fin-badge.pending_review { background:#fff3e0; color:#e65100; }
.fin-badge.probable_duplicate { background:#fce4ec; color:#880e4f; }
.fin-badge.requires_support { background:#e8eaf6; color:#283593; }
.fin-badge.no_hotel { background:#fff9c4; color:#f57f17; }
.fin-badge.under_investigation { background:#e3f2fd; color:#0d47a1; }
.fin-badge.adjusted { background:#e8f5e9; color:#1b5e20; }
.fin-pagination { display:flex; align-items:center; gap:10px; margin-top:14px; font-size:.82rem; color:#666; }
.fin-pagination button { padding:5px 13px; border:1.5px solid var(--gold-border); border-radius:6px;
  background:#fff; color:var(--gold-dark); cursor:pointer; font-size:.8rem; font-weight:600; }
.fin-pagination button:disabled { opacity:.4; cursor:default; }
.fin-modal-overlay { display:none; position:fixed; inset:0; z-index:3000; background:rgba(0,0,0,.52);
  align-items:center; justify-content:center; }
.fin-modal-overlay.open { display:flex; }
.fin-modal { background:#fff; border-radius:14px; width:92%; max-width:640px; max-height:88vh;
  display:flex; flex-direction:column; box-shadow:0 8px 40px rgba(0,0,0,.22);
  border:2px solid var(--gold-border); overflow:hidden; }
.fin-modal-header { padding:16px 22px 12px; border-bottom:1px solid var(--gold-border);
  display:flex; align-items:flex-start; justify-content:space-between; }
.fin-modal-title { font-size:.9rem; font-weight:800; color:var(--gold-dark); }
.fin-modal-body { padding:18px 22px; overflow-y:auto; flex:1; }
.fin-modal-footer { padding:12px 22px; border-top:1px solid var(--gold-border);
  display:flex; gap:10px; justify-content:flex-end; }
.fin-field-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px; }
.fin-field { display:flex; flex-direction:column; gap:4px; }
.fin-field label { font-size:.72rem; font-weight:700; color:#888; text-transform:uppercase; letter-spacing:.4px; }
.fin-field span { font-size:.85rem; color:#333; }
.fin-field textarea { padding:8px 12px; border:1.5px solid var(--gold-border); border-radius:7px;
  font-size:.83rem; resize:vertical; min-height:64px; font-family:inherit; outline:none; }
.fin-field textarea:focus { border-color:var(--gold); }
.fin-import-zone { border:2px dashed var(--gold-border); border-radius:10px; padding:32px 24px;
  text-align:center; cursor:pointer; transition:all .2s; background:var(--gold-subtle); }
.fin-import-zone.drag-over { border-color:var(--gold); background:var(--gold-pale); }
.fin-import-zone p { margin:0; color:#888; font-size:.85rem; }
.fin-import-preview { margin-top:14px; overflow-x:auto; }
.fin-import-preview table { font-size:.75rem; border-collapse:collapse; }
.fin-import-preview th { background:var(--gold-subtle); padding:5px 10px; border:1px solid var(--gold-border); font-weight:700; color:var(--gold-dark); }
.fin-import-preview td { padding:5px 10px; border:1px solid #eee; }
.fin-section-title { font-size:.78rem; font-weight:800; color:var(--gold-dark); text-transform:uppercase;
  letter-spacing:.5px; margin:16px 0 8px; }
.fin-empty { padding:40px; text-align:center; color:#aaa; font-size:.9rem; }
@media(max-width:700px){
  .fin-charts-row{grid-template-columns:1fr;}
  .fin-field-row{grid-template-columns:1fr;}
  .fin-kpi{min-width:calc(50% - 7px);}
}
```

- [ ] **Step 2: Verificar visualmente**

Abre la app en el browser y verifica que no haya errores de CSS en consola. El módulo financial aún no es visible (se agrega en el siguiente task).

---

### Task 12: HTML del módulo — `index.html` (antes de `#toast`)

Agrega el HTML del módulo justo antes de `<div class="toast" id="toast"></div>` (línea ~1251).

**Files:**
- Modify: `index.html` (línea ~1251)

- [ ] **Step 1: Agregar el HTML del módulo**

Busca en `index.html` la línea:
```html
<div class="toast" id="toast"></div>
```

Y agrega el siguiente bloque ANTES de esa línea:

```html
<!-- ═══════════════════════════════════════════════════════════════
     FINANCIAL MODULE
     ═══════════════════════════════════════════════════════════════ -->
<div id="module-financial" style="display:none;flex-direction:column;min-height:0;flex:1;">
  <div class="fin-header">
    <h2>💰 Gestión Financiera</h2>
    <div style="display:flex;gap:8px;">
      <button class="fin-action-btn" onclick="finExportCsv()" id="fin-export-btn">⬇ Exportar CSV</button>
      <button class="fin-action-btn primary" onclick="finOpenImport()" id="fin-import-btn">📥 Importar Excel</button>
    </div>
  </div>
  <div class="fin-tabs">
    <button class="fin-tab active" id="fin-tab-reconciliations" onclick="finSwitchTab('reconciliations')">🏦 Conciliaciones</button>
    <button class="fin-tab" id="fin-tab-balances" onclick="finSwitchTab('balances')" style="opacity:.5;cursor:default;" disabled title="Disponible en Plan 2">💳 Saldos Pendientes</button>
    <button class="fin-tab" id="fin-tab-accounts-receivable" onclick="finSwitchTab('accounts-receivable')" style="opacity:.5;cursor:default;" disabled title="Disponible en Plan 3">📋 Cuentas por Cobrar</button>
  </div>

  <!-- TAB: Conciliaciones -->
  <div class="fin-body" id="fin-pane-reconciliations">
    <!-- KPI row 1: financieros -->
    <div class="fin-kpi-row" id="fin-kpi-financieros">
      <div class="fin-kpi"><div class="fin-kpi-label">Total movimientos</div><div class="fin-kpi-value" id="fin-kpi-total">—</div></div>
      <div class="fin-kpi"><div class="fin-kpi-label">Monto total</div><div class="fin-kpi-value" id="fin-kpi-amount">—</div></div>
      <div class="fin-kpi ok"><div class="fin-kpi-label">Conciliado</div><div class="fin-kpi-value" id="fin-kpi-reconciled">—</div><div class="fin-kpi-sub" id="fin-kpi-reconciled-pct">—</div></div>
      <div class="fin-kpi bad"><div class="fin-kpi-label">No conciliado</div><div class="fin-kpi-value" id="fin-kpi-unreconciled">—</div><div class="fin-kpi-sub" id="fin-kpi-unreconciled-pct">—</div></div>
    </div>
    <!-- KPI row 2: alertas -->
    <div class="fin-section-title">Bandejas de alerta</div>
    <div class="fin-kpi-row" id="fin-kpi-alertas">
      <div class="fin-kpi alert" style="cursor:pointer;" onclick="finFilterBy('no_hotel')"><div class="fin-kpi-label">Sin hotel</div><div class="fin-kpi-value" id="fin-kpi-no-hotel">—</div></div>
      <div class="fin-kpi alert" style="cursor:pointer;" onclick="finFilterBy('no_receipt')"><div class="fin-kpi-label">Sin comprobante</div><div class="fin-kpi-value" id="fin-kpi-no-receipt">—</div></div>
      <div class="fin-kpi alert" style="cursor:pointer;" onclick="finFilterBy('probable_duplicate')"><div class="fin-kpi-label">Duplicados probables</div><div class="fin-kpi-value" id="fin-kpi-duplicates">—</div></div>
      <div class="fin-kpi alert" style="cursor:pointer;" onclick="finFilterBy('no_confirmation')"><div class="fin-kpi-label">Sin referencia</div><div class="fin-kpi-value" id="fin-kpi-no-conf">—</div></div>
      <div class="fin-kpi alert" style="cursor:pointer;" onclick="finFilterBy('requires_support')"><div class="fin-kpi-label">Requiere revisión</div><div class="fin-kpi-value" id="fin-kpi-requires">—</div></div>
    </div>
    <!-- Toolbar filtros -->
    <div class="fin-toolbar">
      <input type="text" id="fin-search" placeholder="Buscar hotel, banco, referencia…" oninput="finDebouncedLoad()" style="min-width:200px;">
      <select id="fin-filter-status" onchange="finLoadTable()">
        <option value="">Todos los estados</option>
        <option value="reconciled">Conciliado</option>
        <option value="unreconciled">No conciliado</option>
        <option value="pending_review">En revisión</option>
        <option value="probable_duplicate">Duplicado probable</option>
        <option value="requires_support">Requiere soporte</option>
        <option value="no_hotel">Sin hotel</option>
        <option value="under_investigation">En investigación</option>
        <option value="adjusted">Ajustado</option>
      </select>
      <select id="fin-filter-bank" onchange="finLoadTable()"><option value="">Todos los bancos</option></select>
      <select id="fin-filter-brand" onchange="finLoadTable()"><option value="">Todas las franquicias</option></select>
      <input type="date" id="fin-filter-from" onchange="finLoadTable()" title="Fecha desde">
      <input type="date" id="fin-filter-to" onchange="finLoadTable()" title="Fecha hasta">
      <button class="fin-action-btn" onclick="finClearFilters()">✕ Limpiar</button>
    </div>
    <!-- Tabla -->
    <div class="fin-table-wrap">
      <table class="fin-table">
        <thead><tr>
          <th>Fecha</th><th>Nombre / Hotel</th><th>Banco</th><th>Franquicia</th>
          <th>Neto abonar</th><th>Estado</th><th></th>
        </tr></thead>
        <tbody id="fin-table-body"><tr><td colspan="7" class="fin-empty">Cargando…</td></tr></tbody>
      </table>
    </div>
    <div class="fin-pagination">
      <button onclick="finPrevPage()" id="fin-btn-prev">◀ Anterior</button>
      <span id="fin-pagination-info"></span>
      <button onclick="finNextPage()" id="fin-btn-next">Siguiente ▶</button>
    </div>
  </div>

  <!-- TAB: Saldos Pendientes (placeholder Plan 2) -->
  <div class="fin-body" id="fin-pane-balances" style="display:none;">
    <div class="fin-empty">💳 Sub-módulo Saldos Pendientes — disponible en Plan 2</div>
  </div>

  <!-- TAB: Cuentas por Cobrar (placeholder Plan 3) -->
  <div class="fin-body" id="fin-pane-accounts-receivable" style="display:none;">
    <div class="fin-empty">📋 Sub-módulo Cuentas por Cobrar — disponible en Plan 3</div>
  </div>
</div>

<!-- MODAL: Detalle conciliación -->
<div class="fin-modal-overlay" id="fin-detail-modal" onclick="if(event.target===this)finCloseDetail()">
  <div class="fin-modal">
    <div class="fin-modal-header">
      <div class="fin-modal-title" id="fin-detail-title">Detalle de movimiento</div>
      <button onclick="finCloseDetail()" style="border:none;background:none;font-size:1.1rem;cursor:pointer;color:#888;">✕</button>
    </div>
    <div class="fin-modal-body" id="fin-detail-body"></div>
    <div class="fin-modal-footer" id="fin-detail-footer"></div>
  </div>
</div>

<!-- MODAL: Importar Excel -->
<div class="fin-modal-overlay" id="fin-import-modal" onclick="if(event.target===this)finCloseImport()">
  <div class="fin-modal" style="max-width:720px;">
    <div class="fin-modal-header">
      <div class="fin-modal-title">📥 Importar conciliaciones desde Excel</div>
      <button onclick="finCloseImport()" style="border:none;background:none;font-size:1.1rem;cursor:pointer;color:#888;">✕</button>
    </div>
    <div class="fin-modal-body">
      <div class="fin-import-zone" id="fin-drop-zone"
           ondragover="event.preventDefault();this.classList.add('drag-over')"
           ondragleave="this.classList.remove('drag-over')"
           ondrop="finHandleDrop(event)"
           onclick="document.getElementById('fin-file-input').click()">
        <p>📂 Arrastra tu archivo Excel aquí o haz clic para seleccionarlo</p>
        <p style="font-size:.72rem;margin-top:6px;color:#bbb;">.xlsx · .xls · Máx 10 MB</p>
      </div>
      <input type="file" id="fin-file-input" accept=".xlsx,.xls" style="display:none;" onchange="finHandleFileInput(event)">
      <div id="fin-sheet-selector" style="display:none;margin-top:12px;">
        <label style="font-size:.8rem;font-weight:700;color:#666;">Hoja:</label>
        <select id="fin-sheet-select" style="margin-left:8px;padding:5px 10px;border:1.5px solid var(--gold-border);border-radius:6px;" onchange="finPreviewSheet()"></select>
      </div>
      <div id="fin-import-preview" class="fin-import-preview"></div>
      <div id="fin-import-result" style="display:none;margin-top:12px;background:#e8f5e9;border:1px solid #c8e6c9;border-radius:6px;padding:10px 14px;font-size:.78rem;color:#2e7d32;"></div>
    </div>
    <div class="fin-modal-footer">
      <button class="fin-action-btn" onclick="finCloseImport()">Cancelar</button>
      <button class="fin-action-btn primary" id="fin-confirm-import-btn" onclick="finExecuteImport()" style="display:none;">✅ Importar</button>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Verificar en browser**

Refresca la app. El módulo aún no aparece en el sidebar (se conecta en Task 13-15), pero no deben aparecer errores de HTML en consola.

---

### Task 13: Actualizar `setupAppLayout()` toMove array

**Files:**
- Modify: `index.html` (línea ~1790-1793, función `setupAppLayout`)

- [ ] **Step 1: Agregar `'module-financial'` al array**

Busca:
```javascript
    'module-simulator','module-otb','module-agenda','module-users','module-reputation',
    'module-google-business','module-monitoreo',
```

Reemplaza por:
```javascript
    'module-simulator','module-otb','module-agenda','module-users','module-reputation',
    'module-google-business','module-monitoreo','module-financial',
    'fin-detail-modal','fin-import-modal',
```

- [ ] **Step 2: Verificar en browser**

Refresca la app. No debe haber errores en consola.

---

### Task 14: Actualizar `switchModule()`

**Files:**
- Modify: `index.html:3689-3737` (función `switchModule`)

- [ ] **Step 1: Agregar rama isFinancial**

Busca la función `switchModule` y reemplázala completa:

```javascript
function switchModule(mod) {
  const isOTB        = mod === 'otb';
  const isAgenda     = mod === 'agenda';
  const isUsers      = mod === 'users';
  const isRep        = mod === 'reputation';
  const isGBP        = mod === 'google-business';
  const isMon        = mod === 'monitoreo';
  const isFinancial  = mod === 'financial';
  const isSim        = !isOTB && !isAgenda && !isUsers && !isRep && !isGBP && !isMon && !isFinancial;
  // Nav buttons
  document.getElementById('nav-simulator').classList.toggle('active', isSim);
  document.getElementById('nav-otb').classList.toggle('active', isOTB);
  const navAgenda = document.getElementById('nav-agenda');
  if (navAgenda) navAgenda.classList.toggle('active', isAgenda);
  const navUsers = document.getElementById('nav-users');
  if (navUsers) navUsers.classList.toggle('active', isUsers);
  // Action bars
  document.getElementById('action-bar-simulator').style.display = isSim  ? '' : 'none';
  document.getElementById('action-bar-otb').style.display       = isOTB  ? '' : 'none';
  const abarAgenda = document.getElementById('action-bar-agenda');
  if (abarAgenda) abarAgenda.style.display = isAgenda ? '' : 'none';
  const abarUsers = document.getElementById('action-bar-users');
  if (abarUsers) abarUsers.style.display = isUsers ? '' : 'none';
  // Modules
  document.getElementById('module-simulator').style.display = isSim  ? '' : 'none';
  document.getElementById('module-otb').style.display       = isOTB  ? '' : 'none';
  const modAgenda = document.getElementById('module-agenda');
  if (modAgenda) modAgenda.style.display = isAgenda ? '' : 'none';
  const modUsers = document.getElementById('module-users');
  if (modUsers) modUsers.style.display = isUsers ? '' : 'none';
  const modRep = document.getElementById('module-reputation');
  if (modRep) modRep.style.display = isRep ? '' : 'none';
  const modGBP = document.getElementById('module-google-business');
  if (modGBP) modGBP.style.display = isGBP ? '' : 'none';
  const modMon = document.getElementById('module-monitoreo');
  if (modMon) modMon.style.display = isMon ? 'flex' : 'none';
  const modFin = document.getElementById('module-financial');
  if (modFin) modFin.style.display = isFinancial ? 'flex' : 'none';
  // Init modules on first open
  const otbPage = document.getElementById('page-otb');
  if (isOTB && !otbPage._initialized) { initOTB(otbPage); otbPage._initialized = true; }
  if (isAgenda)    initAgenda();
  if (isUsers)     initUsersModule();
  if (isRep)       repInit();
  if (isGBP)       gbpInit();
  if (isMon)       monInit();
  if (isFinancial) finInit();
  // Sidebar active state
  sidebarNavSetActive(mod);
  // Audit
  if (AUTH_SESSION) authWriteAudit('navigate_module', AUTH_SESSION.userId, AUTH_SESSION.userName, currentHotel, null, mod);
}
```

- [ ] **Step 2: Verificar en browser**

Refresca. Todavía no aparece en sidebar, pero no debe haber errores de JS.

---

### Task 15: Actualizar `getAvailableModulesForUser()`

**Files:**
- Modify: `index.html:1712-1755` (función `getAvailableModulesForUser`)

- [ ] **Step 1: Agregar grupo "Finanzas"**

Busca dentro de la función la línea donde se construye el array `modules`, justo después de donde se agrega el grupo `Integraciones` (approx línea 1741) y antes del bloque `if (isAdmin)`, agrega el grupo financiero:

Busca este bloque:
```javascript
  const isAdmin = AUTH_SESSION && (AUTH_SESSION.role === 'master_admin' || hasPermission('canManageUsers'));
```

Y agrega ANTES de esa línea:
```javascript
  if (hasPermission('canViewFinancialModule')) {
    modules.push({ group:'Finanzas', items:[
      { id:'financial', icon:'💰', label:'Gestión Financiera' },
    ]});
  }
```

- [ ] **Step 2: Verificar en browser**

Refresca la app con una cuenta que tenga `canViewFinancialModule`. El grupo "Finanzas" con el ítem "💰 Gestión Financiera" debe aparecer en el sidebar. Al hacer clic debe abrirse el módulo (con el dashboard vacío).

---

### Task 16: Funciones JS del módulo — `index.html` (antes de `</script>`)

**Files:**
- Modify: `index.html` (antes del último `</script>`, línea ~10331)

- [ ] **Step 1: Agregar el bloque JS del módulo financiero**

Busca la línea `</script>` que cierra el script principal (última línea del `<script>`) y agrega ANTES de ella:

```javascript
// ═══════════════════════════════════════════════════════════════
// FINANCIAL MODULE — Conciliaciones Bancarias (Plan 1)
// ═══════════════════════════════════════════════════════════════

const FIN_PERMS = ['canViewFinancialModule'];

let _finInitialized = false;
let _finCurrentTab = 'reconciliations';
let _finPage = 1;
const _finPageSize = 18;
let _finTotal = 0;
let _finDebounceTimer = null;
let _finWorkbook = null;   // SheetJS workbook when import modal is open
let _finParsedRows = null; // parsed rows ready to import
let _finParsedHeaders = null;
let _finSourceFileName = '';

function finInit() {
  if (!hasPermission('canViewFinancialModule')) {
    document.getElementById('module-financial').innerHTML =
      '<div class="fin-empty" style="margin-top:60px;">Sin permisos para ver este módulo.</div>';
    return;
  }
  // Show/hide action buttons based on permissions
  const impBtn = document.getElementById('fin-import-btn');
  if (impBtn) impBtn.style.display = hasPermission('canImportReconciliations') ? '' : 'none';
  const expBtn = document.getElementById('fin-export-btn');
  if (expBtn) expBtn.style.display = hasPermission('canExportFinancialReports') ? '' : 'none';

  // Read ?tab= from URL
  const urlTab = new URLSearchParams(window.location.search).get('tab');
  if (urlTab && ['reconciliations','balances','accounts-receivable'].includes(urlTab)) {
    _finCurrentTab = urlTab;
  }
  finSwitchTab(_finCurrentTab, false);
  finLoadStats();
  finLoadTable();
  _finInitialized = true;
}

function finSwitchTab(tab, pushState = true) {
  _finCurrentTab = tab;
  ['reconciliations','balances','accounts-receivable'].forEach(t => {
    const btn = document.getElementById('fin-tab-' + t);
    if (btn) btn.classList.toggle('active', t === tab);
    const pane = document.getElementById('fin-pane-' + t);
    if (pane) pane.style.display = t === tab ? '' : 'none';
  });
  if (pushState) {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url.toString());
  }
}

async function finLoadStats() {
  try {
    const res = await fetch('/api/financial/reconciliations/stats');
    const json = await res.json();
    if (!json.ok) return;
    const s = json.stats;
    const fmt = n => n != null ? n.toLocaleString('es-CO') : '—';
    const fmtCop = n => n != null ? '$ ' + Math.round(n).toLocaleString('es-CO') : '—';
    const pct = (a, b) => b > 0 ? (a / b * 100).toFixed(1) + '%' : '0%';
    document.getElementById('fin-kpi-total').textContent = fmt(s.total);
    document.getElementById('fin-kpi-amount').textContent = fmtCop(s.totalAmount);
    document.getElementById('fin-kpi-reconciled').textContent = fmt(s.reconciled);
    document.getElementById('fin-kpi-reconciled-pct').textContent = pct(s.reconciled, s.total) + ' del total';
    document.getElementById('fin-kpi-unreconciled').textContent = fmt(s.unreconciled);
    document.getElementById('fin-kpi-unreconciled-pct').textContent = pct(s.unreconciled, s.total) + ' del total';
    document.getElementById('fin-kpi-no-hotel').textContent = fmt(s.noHotel);
    document.getElementById('fin-kpi-no-receipt').textContent = fmt(s.noReceipt);
    document.getElementById('fin-kpi-duplicates').textContent = fmt(s.probableDuplicate);
    document.getElementById('fin-kpi-no-conf').textContent = fmt(s.noConfirmation);
    document.getElementById('fin-kpi-requires').textContent = fmt(s.requiresSupport);
  } catch(e) { console.warn('finLoadStats', e); }
}

async function finLoadTable() {
  const tbody = document.getElementById('fin-table-body');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" class="fin-empty">Cargando…</td></tr>';

  const params = new URLSearchParams();
  params.set('page', String(_finPage));
  params.set('pageSize', String(_finPageSize));
  const search = document.getElementById('fin-search')?.value?.trim();
  const status = document.getElementById('fin-filter-status')?.value;
  const bank   = document.getElementById('fin-filter-bank')?.value;
  const brand  = document.getElementById('fin-filter-brand')?.value;
  const from   = document.getElementById('fin-filter-from')?.value;
  const to     = document.getElementById('fin-filter-to')?.value;
  if (search) params.set('search', search);
  if (status) params.set('status', status);
  if (bank)   params.set('bank', bank);
  if (brand)  params.set('cardBrand', brand);
  if (from)   params.set('dateFrom', from);
  if (to)     params.set('dateTo', to);

  try {
    const res = await fetch('/api/financial/reconciliations?' + params.toString());
    const json = await res.json();
    if (!json.ok) { tbody.innerHTML = `<tr><td colspan="7" class="fin-empty">Error: ${finEsc(json.error)}</td></tr>`; return; }
    _finTotal = json.total;
    finRenderTable(json.data);
    finRenderPagination();
  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="7" class="fin-empty">Error de red</td></tr>`;
  }
}

function finRenderTable(rows) {
  const tbody = document.getElementById('fin-table-body');
  if (!rows || rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="fin-empty">Sin registros con los filtros actuales.</td></tr>';
    return;
  }
  const STATUS_LABELS = {
    reconciled:'Conciliado', unreconciled:'No conciliado', pending_review:'En revisión',
    probable_duplicate:'Duplicado probable', requires_support:'Requiere soporte',
    no_hotel:'Sin hotel', under_investigation:'En investigación', adjusted:'Ajustado',
  };
  tbody.innerHTML = rows.map(r => {
    const rowClass = r.inconsistencyFlags?.includes('no_hotel') ? 'no-hotel'
      : r.inconsistencyFlags?.includes('probable_duplicate') ? 'duplicate'
      : r.reconciledStatus === 'pending_review' || r.reconciledStatus === 'under_investigation' ? 'reviewing'
      : '';
    const label = STATUS_LABELS[r.reconciledStatus] ?? r.reconciledStatus;
    const fmtDate = r.movementDate ? r.movementDate.slice(0,10) : '—';
    const fmtAmt = r.netAmount != null ? '$ ' + Math.round(r.netAmount).toLocaleString('es-CO') : '—';
    return `<tr class="${rowClass}" data-id="${finEsc(r.id)}">
      <td>${finEsc(fmtDate)}</td>
      <td><div style="font-weight:600">${finEsc(r.movementName||r.companyName||'—')}</div><div style="font-size:.72rem;color:#888">${finEsc(r.hotelName||'Sin hotel')}</div></td>
      <td>${finEsc(r.bank||'—')}</td>
      <td>${finEsc(r.cardBrand||'—')}</td>
      <td style="font-weight:700">${finEsc(fmtAmt)}</td>
      <td><span class="fin-badge ${finEsc(r.reconciledStatus)}">${finEsc(label)}</span></td>
      <td><button class="fin-action-btn" style="padding:4px 10px;font-size:.75rem;" onclick="finOpenDetail('${finEsc(r.id)}')">Ver</button></td>
    </tr>`;
  }).join('');
}

function finRenderPagination() {
  const totalPages = Math.ceil(_finTotal / _finPageSize) || 1;
  document.getElementById('fin-pagination-info').textContent =
    `Página ${_finPage} de ${totalPages} · ${_finTotal.toLocaleString('es-CO')} registros`;
  document.getElementById('fin-btn-prev').disabled = _finPage <= 1;
  document.getElementById('fin-btn-next').disabled = _finPage >= totalPages;
}

function finPrevPage() { if (_finPage > 1) { _finPage--; finLoadTable(); } }
function finNextPage() {
  if (_finPage < Math.ceil(_finTotal / _finPageSize)) { _finPage++; finLoadTable(); }
}

function finDebouncedLoad() {
  clearTimeout(_finDebounceTimer);
  _finDebounceTimer = setTimeout(() => { _finPage = 1; finLoadTable(); }, 350);
}

function finClearFilters() {
  ['fin-search','fin-filter-status','fin-filter-bank','fin-filter-brand','fin-filter-from','fin-filter-to']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  _finPage = 1;
  finLoadTable();
}

function finFilterBy(inconsistencyFlag) {
  // Map flag to status filter for quick-access from alert KPIs
  const map = {
    no_hotel: 'no_hotel',
    requires_support: 'requires_support',
    probable_duplicate: 'probable_duplicate',
  };
  const statusEl = document.getElementById('fin-filter-status');
  if (statusEl && map[inconsistencyFlag]) {
    statusEl.value = map[inconsistencyFlag];
    _finPage = 1;
    finLoadTable();
  }
}

// ── Detail modal ──────────────────────────────────────────────
let _finDetailRecord = null;

async function finOpenDetail(id) {
  try {
    const res = await fetch(`/api/financial/reconciliations?search=${encodeURIComponent(id)}&pageSize=1`);
    const json = await res.json();
    const r = json.data?.[0];
    if (!r) { finShowToast('❌ Registro no encontrado'); return; }
    _finDetailRecord = r;
    finRenderDetailModal(r);
    document.getElementById('fin-detail-modal').classList.add('open');
  } catch(e) { finShowToast('❌ Error al cargar el registro'); }
}

function finRenderDetailModal(r) {
  const fmt = v => v != null ? v : '—';
  const fmtCop = v => v != null ? '$ ' + Math.round(v).toLocaleString('es-CO') : '—';
  const STATUS_LABELS = {
    reconciled:'Conciliado', unreconciled:'No conciliado', pending_review:'En revisión',
    probable_duplicate:'Duplicado probable', requires_support:'Requiere soporte',
    no_hotel:'Sin hotel', under_investigation:'En investigación', adjusted:'Ajustado',
  };
  document.getElementById('fin-detail-title').textContent = r.movementName || r.companyName || 'Detalle de movimiento';
  document.getElementById('fin-detail-body').innerHTML = `
    <div class="fin-field-row">
      <div class="fin-field"><label>Hotel</label><span>${finEsc(fmt(r.hotelName))}</span></div>
      <div class="fin-field"><label>Razón social</label><span>${finEsc(fmt(r.companyName))}</span></div>
    </div>
    <div class="fin-field-row">
      <div class="fin-field"><label>Fecha</label><span>${finEsc(fmt(r.movementDate?.slice(0,10)))}</span></div>
      <div class="fin-field"><label>Banco</label><span>${finEsc(fmt(r.bank))}</span></div>
    </div>
    <div class="fin-field-row">
      <div class="fin-field"><label>Tipo de operación</label><span>${finEsc(fmt(r.operationType))}</span></div>
      <div class="fin-field"><label>Nº Confirmación</label><span>${finEsc(fmt(r.confirmationNumber))}</span></div>
    </div>
    <div class="fin-section-title">Desglose financiero</div>
    <div class="fin-field-row">
      <div class="fin-field"><label>Valor compra</label><span>${fmtCop(r.purchaseValue)}</span></div>
      <div class="fin-field"><label>Comisión</label><span>${fmtCop(r.commission)}</span></div>
    </div>
    <div class="fin-field-row">
      <div class="fin-field"><label>Neto abonar</label><span style="font-weight:800;font-size:1.05rem">${fmtCop(r.netAmount)}</span></div>
      <div class="fin-field"><label>Retefuente</label><span>${fmtCop(r.withholdingTax)}</span></div>
    </div>
    <div class="fin-field-row">
      <div class="fin-field"><label>ReteIVA</label><span>${fmtCop(r.reteIva)}</span></div>
      <div class="fin-field"><label>ReteICA</label><span>${fmtCop(r.reteIca)}</span></div>
    </div>
    <div class="fin-section-title">Estado e inconsistencias</div>
    <div class="fin-field-row">
      <div class="fin-field"><label>Estado</label><span><span class="fin-badge ${finEsc(r.reconciledStatus)}">${finEsc(STATUS_LABELS[r.reconciledStatus]||r.reconciledStatus)}</span></span></div>
      <div class="fin-field"><label>Duplicado</label><span>${r.duplicateFlag ? '⚠️ Sí' : '—'}</span></div>
    </div>
    ${r.inconsistencyFlags?.length ? `<div class="fin-field" style="margin-bottom:12px"><label>Flags</label><span>${r.inconsistencyFlags.map(f=>`<span class="fin-badge pending_review" style="margin-right:4px">${finEsc(f)}</span>`).join('')}</span></div>` : ''}
    ${r.receiptUrl ? `<div class="fin-field" style="margin-bottom:12px"><label>Comprobante</label><span><a href="${finEsc(r.receiptUrl)}" target="_blank" rel="noopener">Ver comprobante ↗</a></span></div>` : ''}
    <div class="fin-field" style="margin-top:8px">
      <label>Observación</label>
      <textarea id="fin-detail-notes" rows="3" placeholder="Agregar observación…">${finEsc(r.notes||'')}</textarea>
    </div>`;

  const footer = document.getElementById('fin-detail-footer');
  const canEdit = hasPermission('canEditReconciliations');
  const canMark = hasPermission('canMarkReconciled');
  footer.innerHTML = `
    ${canEdit ? `<button class="fin-action-btn primary" onclick="finSaveNotes('${finEsc(r.id)}')">💾 Guardar</button>` : ''}
    ${canMark && r.reconciledStatus !== 'reconciled' ? `<button class="fin-action-btn ok" style="background:#e8f5e9;color:#2e7d32;border-color:#a5d6a7;" onclick="finMarkReconciled('${finEsc(r.id)}')">✅ Marcar conciliado</button>` : ''}
    ${canMark && r.reconciledStatus === 'reconciled' ? `<button class="fin-action-btn" onclick="finMarkUnreconciled('${finEsc(r.id)}')">↩ Desmarcar</button>` : ''}
    <button class="fin-action-btn" onclick="finCloseDetail()">Cerrar</button>`;
}

function finCloseDetail() {
  document.getElementById('fin-detail-modal').classList.remove('open');
  _finDetailRecord = null;
}

async function finSaveNotes(id) {
  const notes = document.getElementById('fin-detail-notes')?.value ?? '';
  try {
    const res = await fetch(`/api/financial/reconciliations/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
    const json = await res.json();
    if (!json.ok) { finShowToast('❌ ' + (json.error||'Error')); return; }
    finShowToast('✅ Observación guardada');
    finCloseDetail();
    finLoadTable();
  } catch(e) { finShowToast('❌ Error de red'); }
}

async function finMarkReconciled(id) {
  try {
    const res = await fetch(`/api/financial/reconciliations/${encodeURIComponent(id)}/mark-reconciled`, { method: 'POST' });
    const json = await res.json();
    if (!json.ok) { finShowToast('❌ ' + (json.error||'Error')); return; }
    finShowToast('✅ Marcado como conciliado');
    finCloseDetail();
    finLoadStats();
    finLoadTable();
  } catch(e) { finShowToast('❌ Error de red'); }
}

async function finMarkUnreconciled(id) {
  try {
    const res = await fetch(`/api/financial/reconciliations/${encodeURIComponent(id)}/mark-unreconciled`, { method: 'POST' });
    const json = await res.json();
    if (!json.ok) { finShowToast('❌ ' + (json.error||'Error')); return; }
    finShowToast('✅ Desmarcado como conciliado');
    finCloseDetail();
    finLoadStats();
    finLoadTable();
  } catch(e) { finShowToast('❌ Error de red'); }
}

// ── Import modal ──────────────────────────────────────────────
function finOpenImport() {
  document.getElementById('fin-import-modal').classList.add('open');
  document.getElementById('fin-import-preview').innerHTML = '';
  document.getElementById('fin-import-result').style.display = 'none';
  document.getElementById('fin-confirm-import-btn').style.display = 'none';
  _finWorkbook = null; _finParsedRows = null; _finParsedHeaders = null;
}

function finCloseImport() {
  document.getElementById('fin-import-modal').classList.remove('open');
}

function finHandleDrop(event) {
  event.preventDefault();
  document.getElementById('fin-drop-zone').classList.remove('drag-over');
  const file = event.dataTransfer.files[0];
  if (file) finProcessFile(file);
}

function finHandleFileInput(event) {
  const file = event.target.files[0];
  if (file) finProcessFile(file);
}

function finProcessFile(file) {
  _finSourceFileName = file.name;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      _finWorkbook = XLSX.read(e.target.result, { type: 'array' });
      const sheetNames = _finWorkbook.SheetNames;
      const sel = document.getElementById('fin-sheet-select');
      sel.innerHTML = sheetNames.map(n => `<option value="${finEsc(n)}">${finEsc(n)}</option>`).join('');
      document.getElementById('fin-sheet-selector').style.display = '';
      finPreviewSheet();
    } catch(err) {
      document.getElementById('fin-import-preview').innerHTML =
        `<p style="color:#c62828;font-size:.83rem">❌ No se pudo leer el archivo: ${finEsc(String(err))}</p>`;
    }
  };
  reader.readAsArrayBuffer(file);
}

function finPreviewSheet() {
  if (!_finWorkbook) return;
  const sheetName = document.getElementById('fin-sheet-select').value;
  const sheet = _finWorkbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (!raw || raw.length < 2) {
    document.getElementById('fin-import-preview').innerHTML =
      '<p style="color:#c62828;font-size:.83rem">❌ Hoja vacía o sin datos suficientes.</p>';
    return;
  }
  _finParsedHeaders = raw[0].map(h => String(h ?? '').trim());
  _finParsedRows = raw.slice(1).filter(row => row.some(v => v !== '' && v != null));

  const preview = _finParsedRows.slice(0, 10);
  let html = `<p style="font-size:.75rem;color:#666;margin:8px 0">Mostrando ${preview.length} de ${_finParsedRows.length} filas</p>`;
  html += '<table><thead><tr>' + _finParsedHeaders.map(h => `<th>${finEsc(h)}</th>`).join('') + '</tr></thead><tbody>';
  html += preview.map(row => '<tr>' + _finParsedHeaders.map((_, i) => `<td>${finEsc(String(row[i]??''))}</td>`).join('') + '</tr>').join('');
  html += '</tbody></table>';
  document.getElementById('fin-import-preview').innerHTML = html;
  document.getElementById('fin-confirm-import-btn').style.display = '';
}

async function finExecuteImport() {
  if (!_finParsedRows || !_finParsedHeaders) return;
  const btn = document.getElementById('fin-confirm-import-btn');
  btn.disabled = true;
  btn.textContent = '⏳ Importando…';
  const sheetName = document.getElementById('fin-sheet-select').value;
  try {
    const res = await fetch('/api/financial/reconciliations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        headers: _finParsedHeaders,
        rows: _finParsedRows,
        sourceFileName: _finSourceFileName,
        sourceSheet: sheetName,
      }),
    });
    const json = await res.json();
    const resultEl = document.getElementById('fin-import-result');
    resultEl.style.display = '';
    if (json.ok) {
      resultEl.style.background = '#e8f5e9';
      resultEl.style.color = '#2e7d32';
      resultEl.textContent = `✅ ${json.inserted} registros importados correctamente.`;
      btn.style.display = 'none';
      finLoadStats();
      finLoadTable();
    } else {
      resultEl.style.background = '#ffebee';
      resultEl.style.color = '#c62828';
      resultEl.textContent = '❌ ' + (json.error || 'Error al importar');
      btn.disabled = false;
      btn.textContent = '✅ Importar';
    }
  } catch(e) {
    finShowToast('❌ Error de red');
    btn.disabled = false;
    btn.textContent = '✅ Importar';
  }
}

// ── Export ────────────────────────────────────────────────────
function finExportCsv() {
  const params = new URLSearchParams();
  const status = document.getElementById('fin-filter-status')?.value;
  const bank   = document.getElementById('fin-filter-bank')?.value;
  const brand  = document.getElementById('fin-filter-brand')?.value;
  const from   = document.getElementById('fin-filter-from')?.value;
  const to     = document.getElementById('fin-filter-to')?.value;
  const search = document.getElementById('fin-search')?.value?.trim();
  if (status) params.set('status', status);
  if (bank)   params.set('bank', bank);
  if (brand)  params.set('cardBrand', brand);
  if (from)   params.set('dateFrom', from);
  if (to)     params.set('dateTo', to);
  if (search) params.set('search', search);
  window.open('/api/financial/reconciliations/export?' + params.toString(), '_blank');
}

// ── Utils ─────────────────────────────────────────────────────
function finEsc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function finShowToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.style.opacity = 1;
  t.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(t._to);
  t._to = setTimeout(() => { t.style.opacity = 0; t.style.transform = 'translateX(-50%) translateY(12px)'; }, 3000);
}
// ═══════════════════════════════════════════════════════════════
// END FINANCIAL MODULE
// ═══════════════════════════════════════════════════════════════
```

- [ ] **Step 2: Verificar en browser**

Refresca la app. Con una cuenta que tenga `canViewFinancialModule`:
1. El sidebar muestra "💰 Gestión Financiera" en el grupo "Finanzas"
2. Al hacer clic, se abre el módulo con los KPIs en `—` (BD vacía) y la tabla vacía
3. El botón "📥 Importar Excel" está visible (si tiene `canImportReconciliations`)
4. Al abrir Import, drag & drop de un `.xlsx` muestra preview
5. Al confirmar la importación, los KPIs y tabla se actualizan
6. Al hacer clic en "Ver" de una fila, se abre el modal con detalle completo
7. Los botones "Marcar conciliado" / "Desmarcar" funcionan y actualizan la tabla
8. "⬇ Exportar CSV" descarga el archivo

- [ ] **Step 3: Commit final**

```bash
git add index.html
git commit -m "feat(financial): add financial module UI — CSS, HTML, JS (Plan 1 Conciliaciones)"
```

---

## Verificación final

- [ ] **TypeScript limpio:**
  ```bash
  npx tsc --noEmit
  ```
  Expected: 0 errores.

- [ ] **Flujo completo de importación:**
  1. Ir a Gestión Financiera con usuario admin
  2. Clic "📥 Importar Excel"
  3. Cargar cualquier `.xlsx`; verificar que aparece el selector de hoja y preview de filas
  4. Confirmar importación; verificar que los KPIs se actualizan y la tabla muestra las filas

- [ ] **Flujo de conciliación:**
  1. Hacer clic "Ver" en cualquier fila
  2. Marcar como conciliado → badge cambia, KPI se actualiza
  3. Desmarcar → vuelve a "No conciliado"

- [ ] **Filtros y exportación:**
  1. Filtrar por estado "Conciliado" → tabla solo muestra conciliados
  2. Clic "⬇ Exportar CSV" → descarga `.csv` con las filas filtradas

---

## Notas para Plan 2 y Plan 3

- Plan 2 (Saldos Pendientes) activa el tab "💳 Saldos Pendientes" e implementa los API routes bajo `src/app/api/financial/checkouts/`
- Plan 3 (Cuentas por Cobrar) activa el tab "📋 Cuentas por Cobrar" e implementa `src/app/api/financial/accounts-receivable/` con carga de comprobantes
- Los modelos `CheckoutBalance` y `AccountReceivable` están definidos en el spec `docs/superpowers/specs/2026-06-18-gestion-financiera-cartera-design.md`
