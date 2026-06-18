# Diseño: Módulo Gestión Financiera / Cartera

**Fecha:** 2026-06-18  
**Proyecto:** Revenue Master Dashboard — GEH Suites  
**Alcance:** Solo alojamiento. Sin eventos, BEO, ni facturación de eventos.

---

## 1. Resumen

Módulo transversal financiero para la operación hotelera de alojamiento de GEH Suites. Permite visualizar, controlar y gestionar pagos recibidos, conciliaciones bancarias, reservas con saldo pendiente post-checkout, y cuentas por cobrar. La información puede llegar desde Excel (MVP) o desde endpoints de banco/PMS (futuro).

**Tres sub-módulos implementados en tres planes separados:**
1. **Plan 1 — Conciliaciones Bancarias** (incluye infraestructura compartida)
2. **Plan 2 — Saldos Pendientes**
3. **Plan 3 — Cuentas por Cobrar**

---

## 2. Decisiones arquitecturales

| Decisión | Elección | Razón |
|---|---|---|
| Storage | MongoDB Atlas (`getDb()`) | Igual que el resto del proyecto |
| Routing | `ModuleId = 'financial'` + query param `?tab=` | Deep-link sin romper AppShell |
| Roles nuevos | No — permisos granulares en roles existentes | Mapeo sobre roles actuales |
| Planes de implementación | 3 planes separados, uno por sub-módulo | Manejable y validable por partes |

---

## 3. Navegación

### 3.1 Sidebar

Agregar nuevo grupo **"Finanzas"** en `SidebarNavigation.tsx` con ítem:

```
💰 Gestión Financiera   →   ModuleId: 'financial'
```

El ítem usa los mismos estilos que el resto: fondo `var(--gold-subtle)` cuando activo, borde izquierdo `var(--gold)`, color `var(--gold-dark)`.

### 3.2 AppShell

Extender el tipo `ModuleId` en [src/components/layout/AppShell.tsx](src/components/layout/AppShell.tsx):

```ts
export type ModuleId = 'simulator' | 'otb' | 'agenda' | 'users'
  | 'forecast' | 'reportes' | 'configuracion' | 'financial';
```

### 3.3 Tab activo

El tab activo dentro del módulo se lee y escribe con `?tab=reconciliations | balances | accounts-receivable`. El componente principal (`FinancialModule`) lee `searchParams` para saber qué sub-módulo renderizar.

---

## 4. Permisos

Agregar las siguientes `Permission` al tipo en [src/types/auth.ts](src/types/auth.ts) y al `DEFAULT_ROLE_PERMISSIONS` en [src/lib/db/models/user.ts](src/lib/db/models/user.ts):

| Permiso | Descripción |
|---|---|
| `canViewFinancialModule` | Ver el módulo (dashboard, tablas) |
| `canImportReconciliations` | Importar Excel de conciliaciones |
| `canEditReconciliations` | Editar estado, asignar hotel, agregar observación |
| `canMarkReconciled` | Marcar/desmarcar como conciliado |
| `canViewCheckoutBalances` | Ver saldos pendientes |
| `canEditCheckoutBalances` | Cambiar estado, agregar observación |
| `canViewAccountsReceivable` | Ver cuentas por cobrar |
| `canUploadReceivableProof` | Subir comprobante de pago |
| `canMarkReceivablePaid` | Cambiar estado a Pagada (requiere comprobante) |
| `canExportFinancialReports` | Exportar Excel/CSV/PDF |
| `canViewFinancialAudit` | Ver log de auditoría financiera |

**Mapeo a roles existentes:**

| Rol | Permisos financieros |
|---|---|
| `master_admin` | Todos |
| `admin` | Todos |
| `revenue_manager` | `canViewFinancialModule`, `canViewCheckoutBalances`, `canViewAccountsReceivable`, `canExportFinancialReports` |
| `revenue_assistant` | `canViewFinancialModule` |
| `operations` | `canViewFinancialModule`, `canViewCheckoutBalances` |
| `viewer` | — |
| `reservas` | — |

El rol `financiero` no existe como rol nuevo; el acceso completo al módulo se da asignando los permisos individuales a `admin` o `master_admin`.

---

## 5. Estructura de archivos

```
src/
├── types/
│   └── financial.ts                          ← Tipos compartidos de los 3 sub-módulos
├── components/
│   └── financial/
│       ├── FinancialModule.tsx                ← Orquestador principal, lee ?tab=
│       ├── FinancialTabs.tsx                  ← Tres sub-tabs con URL sync
│       ├── reconciliations/
│       │   ├── ReconciliationDashboard.tsx    ← KPIs + gráficos
│       │   ├── ReconciliationTable.tsx        ← Tabla detallada paginada
│       │   ├── ReconciliationFilters.tsx      ← Toolbar de filtros
│       │   ├── ReconciliationImport.tsx       ← Importador Excel (drag & drop + preview)
│       │   ├── ReconciliationStatsCards.tsx   ← KPI cards reutilizables
│       │   ├── ReconciliationCharts.tsx       ← Gráficos (barras, dona, horizontales)
│       │   ├── ReconciliationDetailModal.tsx  ← Modal de detalle + acciones
│       │   ├── ReconciliationInconsistencies.tsx ← Bandejas de inconsistencias
│       │   └── ReconciliationExportButton.tsx
│       ├── balances/                          ← Plan 2
│       │   ├── CheckoutBalancesDashboard.tsx
│       │   ├── CheckoutBalancesTable.tsx
│       │   ├── CheckoutBalancesFilters.tsx
│       │   ├── CheckoutBalanceDetailModal.tsx
│       │   ├── CheckoutBalanceStatsCards.tsx
│       │   └── CheckoutBalanceCharts.tsx
│       └── accountsReceivable/               ← Plan 3
│           ├── AccountsReceivableDashboard.tsx
│           ├── AccountsReceivableTable.tsx
│           ├── AccountsReceivableFilters.tsx
│           ├── AccountsReceivableDetailModal.tsx
│           ├── AccountsReceivableProofUpload.tsx
│           ├── AccountsReceivableStatsCards.tsx
│           └── AccountsReceivableCharts.tsx
├── lib/
│   └── financial/
│       ├── reconciliationParser.ts           ← Normalización de Excel → ReconciliationRecord
│       ├── reconciliationStats.ts            ← Cálculo de KPIs y agrupaciones
│       ├── reconciliationValidation.ts       ← Detección de inconsistencias y duplicados
│       ├── checkoutBalancesService.ts        ← Lógica de saldos pendientes
│       ├── accountsReceivableService.ts      ← Lógica de CxC
│       ├── financialExport.ts                ← Exportación Excel/CSV/PDF
│       └── financialAudit.ts                 ← Registro de auditoría
└── app/
    └── api/
        └── financial/
            ├── reconciliations/
            │   ├── route.ts                  ← GET, POST import
            │   ├── stats/route.ts
            │   ├── export/route.ts
            │   └── [id]/
            │       ├── route.ts              ← PATCH
            │       ├── mark-reconciled/route.ts
            │       └── mark-unreconciled/route.ts
            ├── checkouts/
            │   ├── route.ts                  ← GET, POST import
            │   ├── stats/route.ts
            │   └── [id]/route.ts             ← PATCH
            ├── accounts-receivable/
            │   ├── route.ts                  ← GET
            │   ├── stats/route.ts
            │   ├── export/route.ts
            │   └── [id]/
            │       ├── route.ts              ← PATCH
            │       ├── upload-proof/route.ts
            │       └── mark-paid/route.ts
            ├── proofs/
            │   ├── upload/route.ts
            │   └── [id]/route.ts
            └── audit-logs/route.ts
```

---

## 6. Modelo de datos (MongoDB Atlas)

### 6.1 Colección: `financial_reconciliations`

```ts
interface ReconciliationRecord {
  _id?: ObjectId;
  id: string;                        // UUID
  source: 'excel' | 'api';
  sourceFileName?: string;
  sourceSheet?: string;
  movementName?: string;
  hotelId?: string;
  hotelName?: string;
  companyName?: string;
  legalEntity?: string;
  operationType?: string;
  movementDate?: string;             // ISO date
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
  inconsistencyFlags: string[];      // ['no_hotel', 'no_receipt', 'no_confirmation', ...]
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

type ReconciliationStatus =
  | 'reconciled'
  | 'unreconciled'
  | 'pending_review'
  | 'probable_duplicate'
  | 'requires_support'
  | 'no_hotel'
  | 'under_investigation'
  | 'adjusted';
```

### 6.2 Colección: `checkout_balances`

```ts
interface CheckoutBalance {
  _id?: ObjectId;
  id: string;
  source: 'excel' | 'api';
  hotelId: string;
  hotelName: string;
  companyName?: string;
  reservationId: string;
  guestName?: string;
  checkInDate?: string;
  checkoutDate: string;
  totalAmount: number;
  paidAmount: number;
  pendingBalance: number;
  balanceStatus: CheckoutBalanceStatus;
  paymentMethod?: string;
  channel?: string;
  responsibleUserId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

type CheckoutBalanceStatus =
  | 'no_balance'
  | 'pending_balance'
  | 'under_investigation'
  | 'collection_requested'
  | 'paid'
  | 'adjusted'
  | 'uncollectable';
```

### 6.3 Colección: `accounts_receivable`

```ts
interface AccountReceivable {
  _id?: ObjectId;
  id: string;
  hotelId: string;
  hotelName: string;
  companyName?: string;
  reservationId: string;
  guestName?: string;
  checkoutDate: string;
  concept: string;
  totalAmount: number;
  pendingAmount: number;
  dueDate?: string;
  overdueDays?: never;               // NO almacenado — se computa en read: Math.floor((now - dueDate) / 86400000)
  status: AccountReceivableStatus;
  responsibleUserId?: string;
  proofFileUrl?: string;
  proofUploadedAt?: string;
  proofUploadedBy?: string;
  paymentDate?: string;
  bank?: string;
  confirmationNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

type AccountReceivableStatus =
  | 'pending'
  | 'in_management'
  | 'proof_received'
  | 'paid'
  | 'overdue'
  | 'in_dispute'
  | 'adjusted'
  | 'uncollectable';
```

### 6.4 Colección: `financial_proofs`

```ts
interface FinancialProof {
  _id?: ObjectId;
  id: string;
  entityType: 'reconciliation' | 'checkout_balance' | 'account_receivable';
  entityId: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: string;
  paymentValue?: number;
  paymentDate?: string;
  bank?: string;
  confirmationNumber?: string;
  notes?: string;
}
```

### 6.5 Colección: `financial_audit_logs`

```ts
interface FinancialAuditLog {
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
```

---

## 7. Sub-módulo 1: Conciliaciones Bancarias (Plan 1)

### 7.1 Layout

El sub-módulo tiene dos vistas internas controladas por un segundo nivel de tabs:

- **Dashboard** — KPIs + gráficos ejecutivos + bandejas de inconsistencias
- **Detalle** — Tabla paginada con filtros
- **Inconsistencias** — Bandejas agrupadas por tipo de problema

### 7.2 KPIs del dashboard

Fila 1 (financieros): Total movimientos, Monto total recibido, Total conciliado (verde + barra %), No conciliado (rojo + barra %)

Fila 2 (bandejas de alerta): Sin hotel asignado, Sin comprobante, Duplicados probables, Sin referencia, Requiere revisión

### 7.3 Gráficos

- Barras verticales: Monto recibido por día (con diferenciación fin de semana)
- Dona: Conciliado vs No conciliado (porcentaje central)
- Barras horizontales: Valor por banco, Transacciones por franquicia, No conciliado por hotel

### 7.4 Tabla detallada

Columnas: Fecha, Nombre/Hotel, Banco, Franquicia, Neto abonar, Estado, Acción

Indicadores visuales por fila:
- Borde izquierdo dorado → sin hotel asignado
- Borde izquierdo rojo → duplicado probable
- Fondo amarillo claro → en revisión

Filtros inline: búsqueda libre, Estado, Banco, Franquicia. Filtros de fecha en barra superior.

Paginación del lado del servidor (18 registros por página).

### 7.5 Modal de detalle

Campos: nombre, hotel, razón social, fecha, banco, tipo de operación. Desglose financiero: valor compra, comisión, neto, retefuente, reteIVA, reteICA. Campo de observación editable. Botonera: Marcar conciliado, Abrir comprobante, Asignar hotel, Marcar duplicado, Ver historial.

### 7.6 Importador Excel

1. Drag & drop o selector de archivo
2. Lectura de hojas (detecta hojas mensuales: `Abril2026`, `Mayo2026`, etc.)
3. Mapeo flexible de columnas con `RECONCILIATION_COL_ALIASES`
4. Vista previa: primeras 10 filas con columnas mapeadas + errores detectados
5. Confirmación → importación → log de resultado

El parser vive en `src/lib/financial/reconciliationParser.ts`. No rompe con columnas vacías.

**Aliases de columnas:**
```ts
const RECONCILIATION_COL_ALIASES: Record<string, string[]> = {
  hotel:              ['Hotel', 'Establecimiento', 'Propiedad'],
  companyName:        ['Razón social', 'Razon Social', 'Empresa'],
  movementDate:       ['Fecha del movimiento', 'Fecha Movimiento', 'Fecha'],
  netAmount:          ['Neto abonar', 'Valor Neto', 'Valor'],
  reconciledStatus:   ['Conciliado', 'Estado Conciliación', 'Estado'],
  bank:               ['Banco', 'Entidad bancaria'],
  confirmationNumber: ['Número de confirmación', 'Referencia', 'Confirmación'],
};
```

### 7.7 Validaciones automáticas

Al importar o en tiempo real, marcar `inconsistencyFlags` con:
- `no_hotel` — hotel vacío
- `no_receipt` — comprobante vacío
- `no_confirmation` — número de confirmación vacío
- `zero_amount` — neto abonar vacío o cero
- `no_operation_type` — tipo de operación vacío
- `probable_duplicate` — mismo ID / banco+confirmación+valor
- `conflict_same_ref_two_hotels` — mismo número de confirmación en dos hoteles

### 7.8 Reglas de negocio

- Marcar como conciliado requiere usuario autenticado → se registra en auditoría
- Sin comprobante: se puede conciliar solo con observación obligatoria
- Duplicado probable: exige confirmación explícita antes de conciliar
- Sin hotel: va a bandeja `no_hotel`, no se puede conciliar hasta asignar hotel
- Toda modificación queda en `financial_audit_logs`

### 7.9 Exportación

Permite exportar a Excel con hojas: Resumen, Detalle completo, Conciliados, No conciliados, Inconsistencias, Posibles duplicados, Por hotel, Por banco, Por franquicia.

---

## 8. Sub-módulo 2: Saldos Pendientes (Plan 2)

### 8.1 Objetivo

Mostrar checkouts del día/periodo e identificar cuáles tienen saldo pendiente. Fuente: endpoint del PMS (`GET /api/financial/checkouts`) o importación Excel temporal.

### 8.2 KPIs

Total checkouts del periodo, Sin saldo (verde), Con saldo pendiente (rojo), Valor total pendiente, % reservas con saldo, Hotel con mayor saldo, Promedio de saldo.

### 8.3 Tabla

Columnas: Fecha checkout, Hotel, Empresa, Reserva, Huésped, Check-in, Checkout, Valor total, Valor pagado, Saldo pendiente, Estado, Responsable, Acción.

Colores por estado: verde = sin saldo, rojo = con saldo, amarillo = en investigación, azul = cobro solicitado.

### 8.4 Reglas de negocio

- Reserva con saldo pendiente → resaltado visual automático
- Saldo supera umbral configurable → prioridad alta
- Saldo pendiente después de N días → escalar a cartera
- Cambio a `paid` requiere comprobante subido

---

## 9. Sub-módulo 3: Cuentas por Cobrar (Plan 3)

### 9.1 Objetivo

Mostrar **únicamente** las reservas con concepto `"cuentas por cobrar"`. No todos los checkouts, solo los clasificados. Permite hacer seguimiento, subir comprobante y cambiar estado a pagado.

### 9.2 KPIs

Total cuentas activas, Valor total por cobrar, Cuentas vencidas, Valor vencido, Empresas con mayor saldo, Promedio días vencidos.

### 9.3 Flujo obligatorio para marcar pagada

```
Seleccionar cuenta → Clic "Subir comprobante" → Cargar archivo →
Sistema valida que exista → Se habilita "Marcar como pagada" →
Usuario confirma → Estado = 'paid' → Sale del listado activo →
Pasa a histórico → Se registra auditoría
```

No se puede saltar ningún paso.

### 9.4 Comprobantes

Formatos aceptados: PDF, JPG, PNG, WebP. Metadata almacenada en `financial_proofs`. Los archivos se guardan en storage (URL configurable). No se exponen sin permisos.

### 9.5 Histórico

Las cuentas pagadas no se eliminan. Toggle: Ver activas / Ver pagadas / Ver todas.

---

## 10. Diseño visual

El módulo sigue exactamente el sistema de diseño existente de GEH Suites:

| Elemento | Valor |
|---|---|
| Fondo sidebar | `var(--white)` |
| Borde sidebar | `var(--gold-border)` `#e8c88a` |
| Ítem activo | `var(--gold-subtle)` + borde izq. `var(--gold)` |
| Acento primario | `var(--gold)` `#CE7E1F` |
| Estado conciliado | `#d4edda` (verde) |
| Estado no conciliado | `#fce8e8` (rojo) |
| Estado pendiente | `#faf0e0` (dorado claro) |
| Estado duplicado | `#fce8e8` + borde izq. rojo |
| KPI cards | Fondo blanco + borde `var(--gold-border)` |

---

## 11. Criterios de aceptación (MVP Plan 1)

> Plan 1 incluye la infraestructura compartida (tipos, permisos, sidebar, auditoría) además del sub-módulo Conciliaciones Bancarias.

- [ ] Existe ítem "Gestión Financiera" en sidebar con grupo "Finanzas"
- [ ] Tab activo se persiste en URL como `?tab=reconciliations`
- [ ] Permisos financieros existen en el tipo `Permission` y en roles
- [ ] Sub-módulo Conciliaciones muestra dashboard con KPIs y gráficos
- [ ] Sub-módulo Conciliaciones muestra tabla detallada paginada
- [ ] Importador Excel lee múltiples hojas, mapea columnas con aliases, muestra preview
- [ ] Validaciones detectan: sin hotel, duplicados, sin comprobante, sin referencia
- [ ] Marcar conciliado requiere usuario autenticado y queda auditado
- [ ] Sin comprobante solo permite conciliar con observación obligatoria
- [ ] Duplicado probable requiere confirmación explícita
- [ ] Exportación genera Excel multi-hoja
- [ ] Todo el diseño usa los estilos GEH Suites (sidebar blanco, acentos dorados)
- [ ] Módulo no mezcla eventos con alojamiento

---

## 12. Fuera de alcance (explícito)

- Cartera de eventos, BEO, cotizaciones de eventos
- Integración real con banco (arquitectura preparada, no implementada)
- Integración real con PMS (endpoints preparados como stubs)
- Nuevos roles de usuario (se usan permisos granulares en roles existentes)
