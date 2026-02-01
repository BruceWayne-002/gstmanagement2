import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

interface TaxPeriod {
  fy: string;
  q: string;
  p: string;
}

interface TaxPeriodContextType {
  taxPeriod: TaxPeriod | null;
  setTaxPeriod: (tp: TaxPeriod) => void;
}

const TaxPeriodContext = createContext<TaxPeriodContextType | undefined>(undefined);

export const TaxPeriodProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [taxPeriod, setTaxPeriodState] = useState<TaxPeriod | null>(null);
  const [searchParams] = useSearchParams();

  // Sync from URL to Context
  useEffect(() => {
    const fy = searchParams.get('fy');
    const q = searchParams.get('q');
    const p = searchParams.get('p');
    if (fy && q && p) {
      setTaxPeriodState({ fy, q, p });
    }
  }, [searchParams]);

  const setTaxPeriod = (tp: TaxPeriod) => {
    setTaxPeriodState(tp);
  };

  return (
    <TaxPeriodContext.Provider value={{ taxPeriod, setTaxPeriod }}>
      {children}
    </TaxPeriodContext.Provider>
  );
};

export const useTaxPeriod = () => {
  const context = useContext(TaxPeriodContext);
  if (context === undefined) {
    throw new Error('useTaxPeriod must be used within a TaxPeriodProvider');
  }
  return context;
};
