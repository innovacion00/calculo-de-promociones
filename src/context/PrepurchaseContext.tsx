'use client';

import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { RawRow, detectMaxDate } from '@/lib/excelParser';
import { ClassifiedRow, classifyReservations } from '@/lib/reservationClassifier';
import { FinancialSummary, HotelSummary, computeFinancials, computeHotelSummaries } from '@/lib/financialCalculations';
import {
  DailyDataPoint,
  WeeklyDataPoint,
  MonthlyDataPoint,
  AccumulatedPoint,
  BalancePoint,
  ReservationDistribution,
  buildDailyData,
  buildWeeklyData,
  buildMonthlyData,
  buildAccumulatedData,
  buildBalanceData,
  buildReservationDistribution,
  buildRealVsProjected,
} from '@/lib/chartDataTransformers';
import { ForecastScenario, computeForecastScenarios } from '@/lib/forecastCalculations';
import { PrepurchaseConfig, DEFAULT_CONFIG, calcCupoTotal } from '@/lib/prepurchaseSettings';

interface ChartData {
  daily: DailyDataPoint[];
  weekly: WeeklyDataPoint[];
  monthly: MonthlyDataPoint[];
  accumulated: AccumulatedPoint[];
  balance: BalancePoint[];
  distribution: ReservationDistribution[];
  realVsProjected: { date: string; real: number; proyectado: number }[];
}

interface PrepurchaseContextValue {
  config: PrepurchaseConfig;
  setConfig: (cfg: PrepurchaseConfig) => void;
  rawRows: RawRow[];
  setRawRows: (rows: RawRow[]) => void;
  classifiedRows: ClassifiedRow[];
  summary: FinancialSummary | null;
  hotelSummaries: HotelSummary[];
  chartData: ChartData | null;
  forecastScenarios: ForecastScenario[];
  maxFileDate: Date | null;
  baseDate: Date;
  fileName: string;
  setFileName: (name: string) => void;
}

const PrepurchaseContext = createContext<PrepurchaseContextValue | null>(null);

export function PrepurchaseProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfigState] = useState<PrepurchaseConfig>(DEFAULT_CONFIG);
  const [rawRows, setRawRowsState] = useState<RawRow[]>([]);
  const [fileName, setFileName] = useState<string>('');

  const setConfig = useCallback((cfg: PrepurchaseConfig) => {
    setConfigState(cfg);
  }, []);

  const setRawRows = useCallback((rows: RawRow[]) => {
    setRawRowsState(rows);
  }, []);

  const classifiedRows = useMemo(() => classifyReservations(rawRows), [rawRows]);

  const maxFileDate = useMemo(() => detectMaxDate(rawRows), [rawRows]);

  const baseDate = useMemo(() => {
    if (config.fechaBasePronostico === 'today') return new Date();
    if (config.fechaBasePronostico === 'manual' && config.fechaBaseManual) {
      return new Date(config.fechaBaseManual);
    }
    return maxFileDate ?? new Date();
  }, [config, maxFileDate]);

  const summary = useMemo(
    () => (classifiedRows.length > 0 ? computeFinancials(classifiedRows, config) : null),
    [classifiedRows, config]
  );

  const hotelSummaries = useMemo(() => computeHotelSummaries(classifiedRows), [classifiedRows]);

  const chartData = useMemo((): ChartData | null => {
    if (classifiedRows.length === 0 || !summary) return null;
    const cupoTotal = calcCupoTotal(config);
    const daily = buildDailyData(classifiedRows);
    const weekly = buildWeeklyData(classifiedRows);
    const monthly = buildMonthlyData(classifiedRows, cupoTotal);
    const accumulated = buildAccumulatedData(daily, cupoTotal);
    const balance = buildBalanceData(daily, cupoTotal, config.valorPrecompra);
    const distribution = buildReservationDistribution(classifiedRows);
    const realVsProjected = buildRealVsProjected(daily, summary.promedioDiario);
    return { daily, weekly, monthly, accumulated, balance, distribution, realVsProjected };
  }, [classifiedRows, config, summary]);

  const forecastScenarios = useMemo(
    () =>
      summary
        ? computeForecastScenarios(classifiedRows, summary, config, baseDate)
        : [],
    [classifiedRows, summary, config, baseDate]
  );

  const value: PrepurchaseContextValue = {
    config,
    setConfig,
    rawRows,
    setRawRows,
    classifiedRows,
    summary,
    hotelSummaries,
    chartData,
    forecastScenarios,
    maxFileDate,
    baseDate,
    fileName,
    setFileName,
  };

  return (
    <PrepurchaseContext.Provider value={value}>
      {children}
    </PrepurchaseContext.Provider>
  );
}

export function usePrepurchase(): PrepurchaseContextValue {
  const ctx = useContext(PrepurchaseContext);
  if (!ctx) throw new Error('usePrepurchase must be used within PrepurchaseProvider');
  return ctx;
}
