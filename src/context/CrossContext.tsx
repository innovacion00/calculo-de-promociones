'use client';

import { createContext, useContext, useRef, useState, useMemo, ReactNode } from 'react';
import { parseUniversalFile, UniversalParseResult, ColOverrides } from '@/lib/universalParser';
import { runCrossMatch, CrossResult } from '@/lib/crossEngine';

interface CrossContextValue {
  priceResult: UniversalParseResult | null;
  priceFileName: string;
  gehResult: UniversalParseResult | null;
  gehFileName: string;
  priceColOverrides: ColOverrides;
  gehColOverrides: ColOverrides;
  crossResult: CrossResult | null;
  loadPriceFile: (buffer: ArrayBuffer, fileName: string) => void;
  loadGEHFile: (buffer: ArrayBuffer, fileName: string) => void;
  clearPriceFile: () => void;
  clearGEHFile: () => void;
  setPriceColOverrides: (o: ColOverrides) => void;
  setGehColOverrides: (o: ColOverrides) => void;
}

const CrossContext = createContext<CrossContextValue | null>(null);

export function CrossProvider({ children }: { children: ReactNode }) {
  const priceBufferRef = useRef<ArrayBuffer | null>(null);
  const gehBufferRef = useRef<ArrayBuffer | null>(null);

  const [priceResult, setPriceResult] = useState<UniversalParseResult | null>(null);
  const [priceFileName, setPriceFileName] = useState('');
  const [gehResult, setGehResult] = useState<UniversalParseResult | null>(null);
  const [gehFileName, setGehFileName] = useState('');
  const [priceColOverrides, setPriceColOverrides] = useState<ColOverrides>({});
  const [gehColOverrides, setGehColOverrides] = useState<ColOverrides>({});

  const loadPriceFile = (buffer: ArrayBuffer, fileName: string) => {
    priceBufferRef.current = buffer;
    setPriceFileName(fileName);
    setPriceResult(parseUniversalFile(buffer, priceColOverrides));
  };

  const loadGEHFile = (buffer: ArrayBuffer, fileName: string) => {
    gehBufferRef.current = buffer;
    setGehFileName(fileName);
    setGehResult(parseUniversalFile(buffer, gehColOverrides));
  };

  const clearPriceFile = () => {
    priceBufferRef.current = null;
    setPriceResult(null);
    setPriceFileName('');
    setPriceColOverrides({});
  };

  const clearGEHFile = () => {
    gehBufferRef.current = null;
    setGehResult(null);
    setGehFileName('');
    setGehColOverrides({});
  };

  const handleSetPriceColOverrides = (o: ColOverrides) => {
    setPriceColOverrides(o);
    if (priceBufferRef.current) {
      setPriceResult(parseUniversalFile(priceBufferRef.current, o));
    }
  };

  const handleSetGehColOverrides = (o: ColOverrides) => {
    setGehColOverrides(o);
    if (gehBufferRef.current) {
      setGehResult(parseUniversalFile(gehBufferRef.current, o));
    }
  };

  const crossResult = useMemo<CrossResult | null>(() => {
    if (!priceResult || !gehResult) return null;
    return runCrossMatch(priceResult, gehResult);
  }, [priceResult, gehResult]);

  return (
    <CrossContext.Provider
      value={{
        priceResult,
        priceFileName,
        gehResult,
        gehFileName,
        priceColOverrides,
        gehColOverrides,
        crossResult,
        loadPriceFile,
        loadGEHFile,
        clearPriceFile,
        clearGEHFile,
        setPriceColOverrides: handleSetPriceColOverrides,
        setGehColOverrides: handleSetGehColOverrides,
      }}
    >
      {children}
    </CrossContext.Provider>
  );
}

export function useCross(): CrossContextValue {
  const ctx = useContext(CrossContext);
  if (!ctx) throw new Error('useCross must be used within CrossProvider');
  return ctx;
}
