'use client';

import { useState } from 'react';
import { usePrepurchase } from '@/context/PrepurchaseContext';
import { PrepurchaseConfig } from '@/lib/prepurchaseSettings';
import { formatCOP, calcBeneficioComercial, calcCupoTotal } from '@/lib/prepurchaseSettings';

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  step,
  prefix,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-1">
      {prefix && <span className="text-gray-500 text-sm">{prefix}</span>}
      <input
        type="number"
        value={value}
        min={min}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {suffix && <span className="text-gray-500 text-sm">{suffix}</span>}
    </div>
  );
}

export default function PrepurchaseSettings() {
  const { config, setConfig } = usePrepurchase();
  const [local, setLocal] = useState<PrepurchaseConfig>({ ...config });
  const [saved, setSaved] = useState(false);

  const beneficio = calcBeneficioComercial(local);
  const cupoTotal = calcCupoTotal(local);

  const update = (patch: Partial<PrepurchaseConfig>) => {
    setLocal((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  };

  const save = () => {
    setConfig(local);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const reset = () => {
    const DEFAULT: PrepurchaseConfig = {
      valorPrecompra: 3_916_220_000,
      porcentajeAdicional: 0.08,
      fechaInicial: '2025-06-01',
      fechaCorte: null,
      fechaBasePronostico: 'maxFile',
      fechaBaseManual: null,
      consumoDiarioManual: null,
      consumoSemanalManual: null,
      consumoMensualManual: null,
    };
    setLocal(DEFAULT);
    setSaved(false);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-blue-800 mb-1">Configuración dinámica de la precompra</h2>
        <p className="text-xs text-blue-700">
          Al guardar los cambios, todos los indicadores, gráficos y proyecciones se recalcularán automáticamente.
        </p>
      </div>

      {/* Preview of computed values */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Valores calculados (vista previa)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-600 font-medium">Valor Precompra</p>
            <p className="text-lg font-bold text-blue-800 mt-1">{formatCOP(local.valorPrecompra)}</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-xs text-green-600 font-medium">Beneficio Comercial ({(local.porcentajeAdicional * 100).toFixed(1)}%)</p>
            <p className="text-lg font-bold text-green-800 mt-1">{formatCOP(beneficio)}</p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <p className="text-xs text-purple-600 font-medium">Cupo Comercial Total</p>
            <p className="text-lg font-bold text-purple-800 mt-1">{formatCOP(cupoTotal)}</p>
          </div>
        </div>
      </div>

      {/* Main settings */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
        <h3 className="text-sm font-semibold text-gray-700">Valores financieros base</h3>

        <Field
          label="Valor total de la precompra (COP)"
          hint="Monto total acordado de la bolsa de precompra"
        >
          <NumberInput
            value={local.valorPrecompra}
            onChange={(v) => update({ valorPrecompra: v })}
            min={0}
            step={1_000_000}
            prefix="$"
          />
        </Field>

        <Field
          label="Porcentaje adicional otorgado a la agencia (%)"
          hint="Beneficio comercial calculado sobre el valor de la precompra"
        >
          <NumberInput
            value={local.porcentajeAdicional * 100}
            onChange={(v) => update({ porcentajeAdicional: v / 100 })}
            min={0}
            step={0.1}
            suffix="%"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Fecha inicial de la bolsa">
            <input
              type="date"
              value={local.fechaInicial}
              onChange={(e) => update({ fechaInicial: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>
          <Field label="Fecha de corte del análisis" hint="Dejar vacío para usar todos los datos">
            <input
              type="date"
              value={local.fechaCorte ?? ''}
              onChange={(e) => update({ fechaCorte: e.target.value || null })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>
        </div>
      </div>

      {/* Forecast base date */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">Fecha base para el pronóstico</h3>
        <div className="space-y-2">
          {([
            { value: 'maxFile', label: 'Fecha máxima del archivo (recomendado)' },
            { value: 'today', label: 'Fecha actual del sistema' },
            { value: 'manual', label: 'Fecha manual' },
          ] as const).map((opt) => (
            <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="fechaBase"
                value={opt.value}
                checked={local.fechaBasePronostico === opt.value}
                onChange={() => update({ fechaBasePronostico: opt.value })}
                className="text-blue-600"
              />
              <span className="text-sm text-gray-700">{opt.label}</span>
            </label>
          ))}
        </div>

        {local.fechaBasePronostico === 'manual' && (
          <Field label="Fecha manual">
            <input
              type="date"
              value={local.fechaBaseManual ?? ''}
              onChange={(e) => update({ fechaBaseManual: e.target.value || null })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>
        )}
      </div>

      {/* Manual consumption scenario */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">Escenario manual de consumo</h3>
        <p className="text-xs text-gray-500">
          Ingrese valores estimados para el escenario manual en el pronóstico.
          Solo complete el campo que desea usar como base.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Consumo diario estimado (COP)">
            <NumberInput
              value={local.consumoDiarioManual ?? 0}
              onChange={(v) => update({ consumoDiarioManual: v || null })}
              min={0}
              step={1_000_000}
              prefix="$"
            />
          </Field>
          <Field label="Consumo semanal estimado (COP)">
            <NumberInput
              value={local.consumoSemanalManual ?? 0}
              onChange={(v) => update({ consumoSemanalManual: v || null })}
              min={0}
              step={1_000_000}
              prefix="$"
            />
          </Field>
          <Field label="Consumo mensual estimado (COP)">
            <NumberInput
              value={local.consumoMensualManual ?? 0}
              onChange={(v) => update({ consumoMensualManual: v || null })}
              min={0}
              step={1_000_000}
              prefix="$"
            />
          </Field>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          Aplicar configuración
        </button>
        <button
          onClick={reset}
          className="px-4 py-2.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
        >
          Restaurar valores predeterminados
        </button>
        {saved && (
          <span className="text-sm text-green-600 font-medium">✓ Configuración aplicada correctamente</span>
        )}
      </div>
    </div>
  );
}
