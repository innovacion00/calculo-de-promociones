'use client';

import React, { createContext, useContext, useState, useMemo } from 'react';
import { usePrepurchase } from '@/context/PrepurchaseContext';
import { GEHRow } from '@/lib/gehParser';
import { HotelMapping, DEFAULT_HOTEL_MAPPING } from '@/lib/hotelNormalizer';
import { ReconciliationConfig, ReconciliationResult, runReconciliation } from '@/lib/reconciliationEngine';

interface ReconciliationContextValue {
  gehRows: GEHRow[];
  setGehRows: (rows: GEHRow[]) => void;
  gehFileName: string;
  setGehFileName: (name: string) => void;
  hotelMapping: HotelMapping;
  setHotelMapping: (m: HotelMapping) => void;
  reconciliationConfig: ReconciliationConfig;
  setReconciliationConfig: (c: ReconciliationConfig) => void;
  reconciliationResult: ReconciliationResult | null;
}

const ReconciliationContext = createContext<ReconciliationContextValue | null>(null);

export function ReconciliationProvider({ children }: { children: React.ReactNode }) {
  const { rawRows } = usePrepurchase();
  const [gehRows, setGehRows] = useState<GEHRow[]>([]);
  const [gehFileName, setGehFileName] = useState('');
  const [hotelMapping, setHotelMapping] = useState<HotelMapping>(DEFAULT_HOTEL_MAPPING);
  const [reconciliationConfig, setReconciliationConfig] = useState<ReconciliationConfig>({
    toleranciaValorCOP: 1000,
    toleranciaFechaDias: 0,
    umbralSimilitudHuesped: 0.8,
  });

  const reconciliationResult = useMemo(() => {
    if (gehRows.length === 0 || rawRows.length === 0) return null;
    return runReconciliation(rawRows, gehRows, hotelMapping, reconciliationConfig);
  }, [rawRows, gehRows, hotelMapping, reconciliationConfig]);

  return (
    <ReconciliationContext.Provider
      value={{
        gehRows,
        setGehRows,
        gehFileName,
        setGehFileName,
        hotelMapping,
        setHotelMapping,
        reconciliationConfig,
        setReconciliationConfig,
        reconciliationResult,
      }}
    >
      {children}
    </ReconciliationContext.Provider>
  );
}

export function useReconciliation(): ReconciliationContextValue {
  const ctx = useContext(ReconciliationContext);
  if (!ctx) throw new Error('useReconciliation must be used within ReconciliationProvider');
  return ctx;
}
