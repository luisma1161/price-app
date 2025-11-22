'use client';

import { useMemo, useState, useEffect, useRef } from "react";

type BoxType = "cooler" | "freezer";
type SalesRep = "Alex" | "Luis";

type PriceSettings = {
  cooler: { wall: number; ceiling: number; floor: number };
  freezer: { wall: number; ceiling: number; floor: number };
  doorCooler: number;
  doorFreezer: number;
  profitPct: number;
  freight: number;
};

type AddOn = { id: string; label: string; qty: number; unit: number };

type Meta = { customer: string; project: string; quoteNo: string; salesRep: SalesRep };

const STORE_KEY = 'cf_pricer_v1';

const DEFAULTS_PRICES: PriceSettings = {
  cooler: { wall: 9.72, ceiling: 9.72, floor: 11.92 },
  freezer: { wall: 12.46, ceiling: 12.46, floor: 14.49 },
  doorCooler: 981.0,
  doorFreezer: 1125.0,
  profitPct: 0,
  freight: 0,
};

function clampNonNeg(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return v < 0 ? 0 : v;
}

function ftInToFeet(ft: number, inch: number) {
  return clampNonNeg(Number(ft) || 0) + clampNonNeg(Number(inch) || 0) / 12;
}

function feetInToText(ft: number, inch: number) {
  const f = clampNonNeg(Number(ft) || 0);
  const i = clampNonNeg(Number(inch) || 0);
  return `${f}' ${i}"`;
}

function currency(n: number) {
  return (Number.isFinite(n) ? n : 0).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function NumberField(props: { 
  label: string; 
  value: number; 
  onChange: (n: number) => void; 
  step?: number; 
  suffix?: string; 
  highlight?: boolean; 
  tabIndex?: number; 
  inputRef?: any;
  nextRef?: any;
}) {
  const { label, value, onChange, step = 1, suffix, highlight, tabIndex, inputRef, nextRef } = props;

  const [inputValue, setInputValue] = useState(value === 0 ? "" : String(value));
  const isFocused = useRef(false);

  useEffect(() => {
    if (!isFocused.current) {
      const parentValue = value || 0;
      setInputValue(parentValue === 0 ? "" : String(parentValue));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputValue(raw);
    if (raw === "") {
      onChange(0);
    } else {
      const parsed = parseFloat(raw);
      if (!isNaN(parsed)) onChange(parsed);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocused.current = true;
    e.target.select();
  };

  const handleBlur = () => {
    isFocused.current = false;
    const parsed = parseFloat(inputValue);
    const clean = isNaN(parsed) ? 0 : clampNonNeg(parsed);
    setInputValue(clean === 0 ? "" : String(clean));
    onChange(clean);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && nextRef?.current) {
      e.preventDefault();
      nextRef.current.focus();
    }
  };

  return (
    <label className="grid gap-1">
      <span className="text-sm opacity-80">{label}</span>
      <div className="flex items-center gap-2">
        <input 
          ref={inputRef} 
          type="number" 
          step={step} 
          className={`border rounded px-2 py-1 half-input${highlight ? " bg-red-200" : ""}`} 
          value={inputValue} 
          onChange={handleChange} 
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          tabIndex={tabIndex}
          enterKeyHint="next"
        />
        {suffix ? <span className="text-xs opacity-70 w-8">{suffix}</span> : null}
      </div>
    </label>
  );
}

function FtInFields(props: { label: string; ft: number; inch: number; onFt: (n: number) => void; onIn: (n: number) => void; feetError?: boolean; firstInputRef?: any; nextRef?: any; }) {
  const { label, ft, inch, onFt, onIn, feetError, firstInputRef, nextRef } = props;
  const inchRef = useRef<HTMLInputElement>(null);
  
  return (
    <div className="grid gap-1">
      <span className="text-sm opacity-80">{label}</span>
      <div className="grid grid-cols-2 gap-2">
        <NumberField inputRef={firstInputRef} label="Feet" value={ft} onChange={(n) => onFt(clampNonNeg(n))} highlight={!!feetError} nextRef={inchRef} />
        <NumberField inputRef={inchRef} label="Inches" value={inch} onChange={(n) => onIn(clampNonNeg(n))} nextRef={nextRef} />
      </div>
    </div>
  );
}

function AddOnsEditor({ addOns, setAddOns, onPrintAndSave, printRef, addRef, onExitPrint }: { addOns: AddOn[]; setAddOns: (x: AddOn[]) => void; onPrintAndSave: () => void; printRef: any; addRef: any; onExitPrint?: () => void; }) {
  const update = (id: string, patch: Partial<AddOn>) => setAddOns(addOns.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const addRow = () => setAddOns([...addOns, { id: Math.random().toString(36).slice(2), label: "Other", qty: 0, unit: 0 }]);
  const del = (id: string) => setAddOns(addOns.filter((a) => a.id !== id));
  return (
    <div className="grid gap-2">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold">Add-ons</h4>
        <div className="flex items-center gap-3">
          <button ref={addRef} type="button" onClick={addRow} onKeyDown={(e) => { if (e.key === 'Enter') addRow(); }} className="border rounded px-2 py-1 text-sm no-print bg-white hover:bg-lime-200 hover:ring-4 ring-lime-500 focus-visible:bg-lime-200 focus-visible:ring-4 focus-visible:ring-lime-500 transition">+ Add Row</button>
          <button ref={printRef} type="button" onClick={onPrintAndSave} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onPrintAndSave(); } else if (e.key === 'Tab' && !e.shiftKey) { if (onExitPrint) { e.preventDefault(); onExitPrint(); } } }} className="border rounded px-3 py-1 text-sm no-print bg-purple-400 text-white font-semibold hover:bg-purple-500 hover:ring-4 ring-purple-500 transition focus-visible:ring-4 focus-visible:ring-purple-500 focus-visible:bg-purple-500">Print and Save</button>
        </div>
      </div>
      {addOns.map((a) => (
        <div key={a.id} className="grid grid-cols-12 gap-2 items-end">
          <label className="col-span-5 grid gap-1"><span className="text-sm opacity-80">Label</span><input className="border rounded px-2 py-1 half-input" value={a.label} onChange={(e) => update(a.id, { label: e.target.value })} type="text" /></label>
          <label className="col-span-2 grid gap-1"><span className="text-sm opacity-80">Qty</span><NumberField label="" value={a.qty} onChange={(n) => update(a.id, { qty: n })} /></label>
          <label className="col-span-3 grid gap-1"><span className="text-sm opacity-80">Unit $</span><NumberField label="" value={a.unit} onChange={(n) => update(a.id, { unit: n })} step={0.01} /></label>
          <div className="col-span-1 self-center text-right text-sm">{currency((a.qty || 0) * (a.unit || 0))}</div>
          <button type="button" onClick={() => del(a.id)} onKeyDown={(e) => { if (e.key === 'Enter') del(a.id); }} className="col-span-1 border rounded px-2 py-1 text-sm no-print hover:shadow-md hover:ring-4 ring-red-500 focus-visible:ring-4 focus-visible:ring-red-500 transition">✕</button>
        </div>
      ))}
    </div>
  );
}

function TypeChooser({ value, onChange, name }: { value: BoxType; onChange: (t: BoxType) => void; name: string; }) {
  return (
    <div className="flex items-center gap-4">
      <label className="flex items-center gap-3 border rounded-xl px-4 py-2 cursor-pointer hover:bg-gray-50"><input type="radio" name={name} className="big-check" checked={value === 'cooler'} onChange={() => onChange('cooler')} aria-label="Set type to Cooler" tabIndex={-1} /><span className="text-base font-medium">Cooler</span></label>
      <label className="flex items-center gap-3 border rounded-xl px-4 py-2 cursor-pointer hover:bg-gray-50"><input type="radio" name={name} className="big-check" checked={value === 'freezer'} onChange={() => onChange('freezer')} aria-label="Set type to Freezer" tabIndex={-1} /><span className="text-base font-medium">Freezer</span></label>
    </div>
  );
}

function SalesRepChooser({ value, onChange, alexRef, luisRef }: { value: SalesRep; onChange: (rep: SalesRep) => void; alexRef?: any; luisRef?: any; }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs opacity-70">Sales Rep:</span>
      <button
        ref={alexRef}
        type="button"
        onClick={() => onChange('Alex')}
        onKeyDown={(e) => { 
          if (e.key === 'Enter') {
            onChange('Alex');
          } else if (e.key === 'Tab' && !e.shiftKey) { 
            e.preventDefault(); 
            luisRef.current?.focus(); 
          } 
        }}
        className={`border rounded px-3 py-1 text-sm transition ${
          value === 'Alex' 
            ? 'bg-yellow-300 text-black ring-4 ring-yellow-500' 
            : 'bg-gray-100 hover:bg-gray-200'
        }`}
      >
        Alex
      </button>
      <button
        ref={luisRef}
        type="button"
        onClick={() => onChange('Luis')}
        onKeyDown={(e) => { if (e.key === 'Enter') onChange('Luis'); }}
        className={`border rounded px-3 py-1 text-sm transition ${
          value === 'Luis' 
            ? 'bg-yellow-300 text-black ring-4 ring-yellow-500' 
            : 'bg-gray-100 hover:bg-gray-200'
        }`}
      >
        Luis
      </button>
    </div>
  );
}

function useBoxCalc(params: { type: BoxType; wFt: number; wIn: number; lFt: number; lIn: number; hFt: number; hIn: number; floorOn: boolean; deductOn: boolean; deductLenFt: number; deductLenIn: number; deductHtFt: number; deductHtIn: number; addOns: AddOn[]; prices: PriceSettings; }) {
  const { type, wFt, wIn, lFt, lIn, hFt, hIn, floorOn, deductOn, deductLenFt, deductLenIn, deductHtFt, deductHtIn, addOns, prices } = params;
  return useMemo(() => {
    const W = ftInToFeet(wFt, wIn); const L = ftInToFeet(lFt, lIn); const H = ftInToFeet(hFt, hIn);
    let wallsArea = 2 * (W + L) * H; const slabArea = W * L;
    let deductedArea = 0;
    if (deductOn) {
      const deductLen = ftInToFeet(deductLenFt, deductLenIn); const deductHt = ftInToFeet(deductHtFt, deductHtIn);
      deductedArea = Math.max(0, deductLen * deductHt); wallsArea = Math.max(0, wallsArea - deductedArea);
    }
    const p = prices[type];
    const wallsCost = wallsArea * (p.wall || 0); const ceilingCost = slabArea * (p.ceiling || 0); const floorCost = floorOn ? slabArea * (p.floor || 0) : 0;
    const addOnsTotal = addOns.reduce((acc, a) => acc + (Number(a.qty) || 0) * (Number(a.unit) || 0), 0);
    const subtotal = wallsCost + ceilingCost + floorCost + addOnsTotal;
    return { W, L, H, deductedArea, wallsArea, slabArea, wallsCost, ceilingCost, floorCost, addOnsTotal, subtotal };
  }, [type, wFt, wIn, lFt, lIn, hFt, hIn, floorOn, deductOn, deductLenFt, deductLenIn, deductHtFt, deductHtIn, addOns, prices]);
}

export default function Page() {
  const quoteNoRef = useRef<HTMLInputElement>(null);
  const alexRef = useRef<HTMLButtonElement>(null);
  const luisRef = useRef<HTMLButtonElement>(null);
  const box1WidthRef = useRef<HTMLInputElement>(null);
  const box1LengthRef = useRef<HTMLInputElement>(null);
  const box1HeightRef = useRef<HTMLInputElement>(null);
  const box1DoorsRef = useRef<HTMLInputElement>(null);
  const box2WidthRef = useRef<HTMLInputElement>(null);
  const box2LengthRef = useRef<HTMLInputElement>(null);
  const box2HeightRef = useRef<HTMLInputElement>(null);
  const box2DoorsRef = useRef<HTMLInputElement>(null);
  const includeBox2Ref = useRef<HTMLInputElement>(null);
  const modalApplyBtnRef = useRef<HTMLButtonElement>(null);
  const initialPricesRef = useRef<PriceSettings | null>(null);
  const resetAllRef = useRef<HTMLButtonElement>(null);
  const box1PrintRef = useRef<HTMLButtonElement>(null);
  const box1AddRef = useRef<HTMLButtonElement>(null);
  const box2PrintRef = useRef<HTMLButtonElement>(null);
  const box2AddRef = useRef<HTMLButtonElement>(null);

  const [includeBox2, setIncludeBox2] = useState(false);
  const [showRequiredErrors, setShowRequiredErrors] = useState(false);
  const [showRequiredMetaErrors, setShowRequiredMetaErrors] = useState(false);
  const [meta, setMeta] = useState<Meta>({ customer: '', project: '', quoteNo: '', salesRep: 'Alex' });
  const [prices, setPrices] = useState<PriceSettings>({ ...DEFAULTS_PRICES });
  const [box1, setBox1] = useState({ type: "cooler" as BoxType, floorOn: false, wFt: 0, wIn: 0, lFt: 0, lIn: 0, hFt: 7, hIn: 6, doors: 0, deductOn: false, deductLenFt: 8, deductLenIn: 0, deductHtFt: 7, deductHtIn: 6 });
  const [box2, setBox2] = useState({ type: "freezer" as BoxType, floorOn: false, wFt: 0, wIn: 0, lFt: 0, lIn: 0, hFt: 7, hIn: 6, doors: 0, deductOn: false, deductLenFt: 8, deductLenIn: 0, deductHtFt: 7, deductHtIn: 6 });
  const [addOns1, setAddOns1] = useState<AddOn[]>([]);
  const [addOns2, setAddOns2] = useState<AddOn[]>([]);
  const [showDeductModal, setShowDeductModal] = useState(false);
  const [deductChoice, setDeductChoice] = useState<'width' | 'length'>('width');
  const isSavingRef = useRef(false);

  useEffect(() => { 
    document.title = "Price App";
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.meta) setMeta(parsed.meta);
        if (parsed.prices) setPrices(parsed.prices);
        if (parsed.box1) setBox1(parsed.box1);
        if (parsed.box2) setBox2(parsed.box2);
        if (parsed.includeBox2 !== undefined) setIncludeBox2(!!parsed.includeBox2);
        if (parsed.addOns1) setAddOns1(parsed.addOns1);
        if (parsed.addOns2) setAddOns2(parsed.addOns2);
        initialPricesRef.current = parsed.prices ?? { ...DEFAULTS_PRICES };
      } else { initialPricesRef.current = { ...DEFAULTS_PRICES }; }
    } catch { initialPricesRef.current = { ...DEFAULTS_PRICES }; }
  }, []);

  useEffect(() => {
    const payload = { meta, prices, box1, box2, includeBox2, addOns1, addOns2 };
    try { localStorage.setItem(STORE_KEY, JSON.stringify(payload)); } catch {}
  }, [meta, prices, box1, box2, includeBox2, addOns1, addOns2]);

  useEffect(() => { if (showDeductModal) { setTimeout(() => { modalApplyBtnRef.current?.focus(); }, 50); } }, [showDeductModal]);

  function toggleIncludeBox2(on: boolean) { 
    setIncludeBox2(on); 
    if (on) { 
      setBox2((b) => ({ ...b, hFt: box1.hFt, hIn: box1.hIn })); 
      setDeductChoice('width'); 
      setShowDeductModal(true); 
    } 
  }
  
  function applyAutoDeduct() {
    if (deductChoice === 'width') setBox1((b) => ({ ...b, deductOn: true, deductLenFt: b.wFt, deductLenIn: b.wIn, deductHtFt: b.hFt, deductHtIn: b.hIn }));
    else setBox1((b) => ({ ...b, deductOn: true, deductLenFt: b.lFt, deductLenIn: b.lIn, deductHtFt: b.hFt, deductHtIn: b.hIn }));
    setShowDeductModal(false); setTimeout(() => { box2WidthRef.current?.focus(); }, 50);
  }
  
  function skipDeduct() { setShowDeductModal(false); setTimeout(() => { box2WidthRef.current?.focus(); }, 50); }
  
  function handleResetAll() {
    localStorage.removeItem(STORE_KEY); setMeta({ customer: '', project: '', quoteNo: '', salesRep: 'Alex' }); setPrices({ ...DEFAULTS_PRICES });
    setBox1({ type: "cooler", floorOn: false, wFt: 0, wIn: 0, lFt: 0, lIn: 0, hFt: 7, hIn: 6, doors: 0, deductOn: false, deductLenFt: 8, deductLenIn: 0, deductHtFt: 7, deductHtIn: 6 });
    setBox2({ type: "freezer", floorOn: false, wFt: 0, wIn: 0, lFt: 0, lIn: 0, hFt: 7, hIn: 6, doors: 0, deductOn: false, deductLenFt: 8, deductLenIn: 0, deductHtFt: 7, deductHtIn: 6 });
    setAddOns1([]); setAddOns2([]); setIncludeBox2(false);
    setTimeout(() => { quoteNoRef.current?.focus(); }, 50);
  }

  const doorPrice1 = box1.type === "cooler" ? prices.doorCooler : prices.doorFreezer;
  const doorPrice2 = box2.type === "cooler" ? prices.doorCooler : prices.doorFreezer;
  const calc1 = useBoxCalc({ ...box1, addOns: [{ id: "door", label: "Doors", qty: box1.doors, unit: doorPrice1 }, ...addOns1], prices });
  const calc2 = useBoxCalc({ ...box2, addOns: [{ id: "door", label: "Doors", qty: box2.doors, unit: doorPrice2 }, ...addOns2], prices });
  const subTotal = calc1.subtotal + (includeBox2 ? calc2.subtotal : 0);
  const profit = subTotal * (clampNonNeg(prices.profitPct) / 100);
  const grand = subTotal + profit + clampNonNeg(prices.freight || 0);

  function validateFields() {
    const box1Missing = box1.wFt === 0 || box1.lFt === 0;
    const box2Missing = includeBox2 && (box2.wFt === 0 || box2.lFt === 0);
    const dimensionsMissing = box1Missing || box2Missing;
    const quoteMissing = meta.quoteNo.trim().length === 0;
    setShowRequiredErrors(dimensionsMissing);
    setShowRequiredMetaErrors(quoteMissing);
    return !dimensionsMissing && !quoteMissing;
  }

  function handlePrint() {
    if (!validateFields()) {
      if (showRequiredMetaErrors) quoteNoRef.current?.focus();
      else if (box1.wFt === 0 || box1.lFt === 0) box1WidthRef.current?.focus();
      else if (includeBox2 && (box2.wFt === 0 || box2.lFt === 0)) box2WidthRef.current?.focus();
      return;
    }
    if (typeof window !== "undefined") {
      const oldTitle = document.title;
      const dateStr = new Date().toISOString().split('T')[0];
      document.title = meta.quoteNo ? `cost-${meta.quoteNo}-${dateStr}` : `cost-${dateStr}`;
      window.print();
      document.title = oldTitle;
    }
  }

  function handlePrintAndSave() {
    // Prevent double-clicks/calls
    if (isSavingRef.current) return;
    
    if (!validateFields()) {
      if (showRequiredMetaErrors) quoteNoRef.current?.focus();
      else if (box1.wFt === 0 || box1.lFt === 0) box1WidthRef.current?.focus();
      else if (includeBox2 && (box2.wFt === 0 || box2.lFt === 0)) box2WidthRef.current?.focus();
      return;
    }
    
    isSavingRef.current = true;
    
    const dateStr = new Date().toISOString().split('T')[0];
    const baseFilename = meta.quoteNo ? `cost-${meta.quoteNo}-${dateStr}` : `cost-${dateStr}`;
    
    // First save as JSON
    const quoteData = {
      meta,
      prices,
      box1,
      box2,
      includeBox2,
      addOns1,
      addOns2,
      savedDate: new Date().toISOString()
    };
    
    const jsonString = JSON.stringify(quoteData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${baseFilename}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // Then print (after a small delay to let the save complete)
    setTimeout(() => {
      if (typeof window !== "undefined") {
        const oldTitle = document.title;
        document.title = baseFilename;
        window.print();
        document.title = oldTitle;
      }
      // Reset flag after everything is done
      setTimeout(() => { isSavingRef.current = false; }, 1000);
    }, 500);
  }

  function handleLoadQuote() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const jsonString = event.target?.result as string;
          const loadedData = JSON.parse(jsonString);
          
          // Load all the data into state
          if (loadedData.meta) setMeta(loadedData.meta);
          if (loadedData.prices) setPrices(loadedData.prices);
          if (loadedData.box1) setBox1(loadedData.box1);
          if (loadedData.box2) setBox2(loadedData.box2);
          if (loadedData.includeBox2 !== undefined) setIncludeBox2(loadedData.includeBox2);
          if (loadedData.addOns1) setAddOns1(loadedData.addOns1);
          if (loadedData.addOns2) setAddOns2(loadedData.addOns2);
          
          alert('Quote loaded successfully!');
        } catch (error) {
          alert('Error loading quote file. Please make sure it is a valid quote JSON file.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  const today = new Date().toLocaleDateString();
  const unit1 = prices[box1.type];
  const unit2 = prices[box2.type];

  return (
    <>
      <style jsx global>{`
        /* Desktop zoom - only apply on screens wider than mobile */
        @media (min-width: 768px) {
          body {
            zoom: 0.95;
          }
        }
        /* Force light mode - override dark mode */
        html, body {
          background-color: white !important;
          color: black !important;
          color-scheme: light;
        }
        .half-input { width: 50%; }
        .big-check { width: 20px; height: 20px; transform: scale(1.6); cursor: pointer; accent-color: #2563eb; }
        input:focus { outline: 3px solid #2563eb; }
        @media print {
          @page { size: Letter portrait; margin: 0.5in; }
          body { zoom: 1; font-family: sans-serif; -webkit-print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .print-container { max-width: 100%; font-size: 16px; line-height: 1.4; }
          .print-header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
          .print-section { margin-bottom: 20px; border: 1px solid #ccc; border-radius: 4px; overflow: hidden; }
          .print-section-header { padding: 8px 10px; font-weight: bold; font-size: 14px; color: white; }
          .print-table { width: 100%; border-collapse: collapse; }
          .print-table th, .print-table td { border: 1px solid #e5e5e5; padding: 6px 8px; text-align: left; font-size: 16px; }
          .print-table th { background-color: #f9f9f9; font-weight: 600; }
          .text-right { text-align: right !important; }
          .text-center { text-align: center !important; }
          .bold { font-weight: bold; }
          .summary-table td { padding: 4px 8px; border: none; }
          .summary-row { border-top: 1px solid #000; }
        }
        .print-only { display: none; }
        .sticky-totals { position: sticky; bottom: 0; background: #ffffff; padding: 20px; border-top: 2px solid #000; z-index: 20; box-shadow: 0 -4px 6px rgba(0,0,0,0.1); }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); display: flex; justify-content: center; align-items: center; z-index: 50; }
        .modal-card { background: white; padding: 20px; border-radius: 10px; width: 500px; }
      `}</style>

      <main className="mx-auto max-w-7xl p-6 grid gap-6 print-scale">
    <header className="space-y-1 no-print">
          <h1 className="text-2xl font-bold">Cooler / Freezer Pricing</h1>
          <div className="grid md:grid-cols-3 gap-3">
            <label className="grid gap-1"><span className="text-sm opacity-80">Quote #</span><input ref={quoteNoRef} className={`border rounded px-2 py-1 ${showRequiredMetaErrors ? " bg-red-200" : ""}`} value={meta.quoteNo} onChange={(e) => setMeta({ ...meta, quoteNo: e.target.value })} type="text" onKeyDown={(e) => { if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); alexRef.current?.focus(); } }} /></label>
            <label className="grid gap-1"><span className="text-sm opacity-80">Customer</span><input className="border rounded px-2 py-1" value={meta.customer} onChange={(e) => setMeta({ ...meta, customer: e.target.value })} type="text" tabIndex={-1} /></label>
            <label className="grid gap-1"><span className="text-sm opacity-80">Project</span><input className="border rounded px-2 py-1" value={meta.project} onChange={(e) => setMeta({ ...meta, project: e.target.value })} type="text" tabIndex={-1} /></label>
          </div>

          <div className="flex gap-3 pt-2 items-center">
            <SalesRepChooser value={meta.salesRep} onChange={(rep) => setMeta({ ...meta, salesRep: rep })} alexRef={alexRef} luisRef={luisRef} />
            <button ref={resetAllRef} type="button" onClick={handleResetAll} onKeyDown={(e) => { if (e.key === 'Enter') handleResetAll(); }} className="border rounded px-3 py-1 text-sm bg-red-400 text-white font-semibold hover:bg-red-500 hover:ring-4 ring-red-500 focus:ring-4 focus:ring-red-500 transition" tabIndex={-1}>Reset All</button>
            <button type="button" onClick={handlePrint} onKeyDown={(e) => { if (e.key === 'Enter') handlePrint(); }} className="border rounded px-3 py-1 text-sm bg-green-400 text-white font-semibold hover:bg-green-500 hover:ring-4 ring-green-500 focus:ring-4 focus:ring-green-500 transition" tabIndex={-1}>Print to PDF</button>
            <button type="button" onClick={handleLoadQuote} onKeyDown={(e) => { if (e.key === 'Enter') handleLoadQuote(); }} className="border rounded px-3 py-1 text-sm bg-blue-400 text-white font-semibold hover:bg-blue-500 hover:ring-4 ring-blue-500 focus:ring-4 focus:ring-blue-500 transition" tabIndex={-1}>Open Quote</button>
            <button type="button" onClick={handlePrintAndSave} onKeyDown={(e) => { if (e.key === 'Enter') handlePrintAndSave(); }} className="border rounded px-3 py-1 text-sm bg-purple-400 text-white font-semibold hover:bg-purple-500 hover:ring-4 ring-purple-500 focus:ring-4 focus:ring-purple-500 transition" tabIndex={-1}>Print and Save</button>
          </div>
        </header>

        <section className="border rounded-2xl p-4 grid gap-3 no-print">
          <h2 className="text-lg font-semibold">Price Settings</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="grid gap-2">
              <h3 className="font-medium">Cooler ($/sq ft)</h3>
              <div className="grid grid-cols-3 gap-2">
                <NumberField label="Walls" value={prices.cooler.wall} onChange={(n) => setPrices({ ...prices, cooler: { ...prices.cooler, wall: n } })} step={0.01} tabIndex={-1} />
                <NumberField label="Ceiling" value={prices.cooler.ceiling} onChange={(n) => setPrices({ ...prices, cooler: { ...prices.cooler, ceiling: n } })} step={0.01} tabIndex={-1} />
                <NumberField label="Floor" value={prices.cooler.floor} onChange={(n) => setPrices({ ...prices, cooler: { ...prices.cooler, floor: n } })} step={0.01} tabIndex={-1} />
              </div>
            </div>
            <div className="grid gap-2">
              <h3 className="font-medium">Freezer ($/sq ft)</h3>
              <div className="grid grid-cols-3 gap-2">
                <NumberField label="Walls" value={prices.freezer.wall} onChange={(n) => setPrices({ ...prices, freezer: { ...prices.freezer, wall: n } })} step={0.01} tabIndex={-1} />
                <NumberField label="Ceiling" value={prices.freezer.ceiling} onChange={(n) => setPrices({ ...prices, freezer: { ...prices.freezer, ceiling: n } })} step={0.01} tabIndex={-1} />
                <NumberField label="Floor" value={prices.freezer.floor} onChange={(n) => setPrices({ ...prices, freezer: { ...prices.freezer, floor: n } })} step={0.01} tabIndex={-1} />
              </div>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <NumberField label="Cooler Door Price" value={prices.doorCooler} onChange={(n) => setPrices({ ...prices, doorCooler: n })} tabIndex={-1} />
            <NumberField label="Freezer Door Price" value={prices.doorFreezer} onChange={(n) => setPrices({ ...prices, doorFreezer: n })} tabIndex={-1} />
          </div>
          <div className="grid md:grid-cols-3 gap-2">
            <NumberField label="Profit %" value={prices.profitPct} onChange={(n) => setPrices({ ...prices, profitPct: n })} step={0.1} suffix="%" tabIndex={-1} />
            <NumberField label="Freight ($)" value={prices.freight} onChange={(n) => setPrices({ ...prices, freight: n })} step={1} tabIndex={-1} />
          </div>
        </section>

        <section className="border rounded-2xl p-4 grid gap-4 no-print">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Box 1</h2>
            <TypeChooser value={box1.type} onChange={(t) => setBox1({ ...box1, type: t })} name="box1Type" />
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <FtInFields firstInputRef={box1WidthRef} label="Width" ft={box1.wFt} inch={box1.wIn} onFt={(n) => setBox1({ ...box1, wFt: n })} onIn={(n) => setBox1({ ...box1, wIn: n })} feetError={showRequiredErrors && box1.wFt === 0} nextRef={box1LengthRef} />
            <FtInFields firstInputRef={box1LengthRef} label="Length" ft={box1.lFt} inch={box1.lIn} onFt={(n) => setBox1({ ...box1, lFt: n })} onIn={(n) => setBox1({ ...box1, lIn: n })} feetError={showRequiredErrors && box1.lFt === 0} nextRef={box1HeightRef} />
            <FtInFields firstInputRef={box1HeightRef} label="Height" ft={box1.hFt} inch={box1.hIn} onFt={(n) => setBox1({ ...box1, hFt: n })} onIn={(n) => setBox1({ ...box1, hIn: n })} nextRef={box1DoorsRef} />
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <label className="flex items-center gap-2"><input type="checkbox" checked={box1.floorOn} onChange={(e) => setBox1({ ...box1, floorOn: e.target.checked })} /><span>Include Floor</span></label>
            <label className="flex items-center gap-2"><span>Doors</span><NumberField inputRef={box1DoorsRef} label="" value={box1.doors} onChange={(n) => setBox1({ ...box1, doors: n })} /></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={box1.deductOn} onChange={(e) => setBox1({ ...box1, deductOn: e.target.checked })} /><span>Deduct a custom wall</span></label>
          </div>
          {box1.deductOn && (
            <div className="grid md:grid-cols-2 gap-4">
              <FtInFields label="Deduct Wall Length" ft={box1.deductLenFt} inch={box1.deductLenIn} onFt={(n) => setBox1({ ...box1, deductLenFt: n })} onIn={(n) => setBox1({ ...box1, deductLenIn: n })} />
              <FtInFields label="Deduct Wall Height" ft={box1.deductHtFt} inch={box1.deductHtIn} onFt={(n) => setBox1({ ...box1, deductHtFt: n })} onIn={(n) => setBox1({ ...box1, deductHtIn: n })} />
            </div>
          )}
          <AddOnsEditor addOns={addOns1} setAddOns={setAddOns1} onPrintAndSave={handlePrintAndSave} printRef={box1PrintRef} addRef={box1AddRef} onExitPrint={() => { includeBox2Ref.current?.focus(); }} />
          <div className="grid sm:grid-cols-2 gap-3 bg-gray-50 rounded-xl p-3">
            <div>Walls area: <strong>{calc1.wallsArea.toFixed(2)}</strong> sq ft</div>
            <div>Ceiling area: <strong>{calc1.slabArea.toFixed(2)}</strong> sq ft</div>
            <div>Floor area: <strong>{box1.floorOn ? calc1.slabArea.toFixed(2) : "0.00"}</strong> sq ft</div>
            <div>Walls cost: <strong>{currency(calc1.wallsCost)}</strong></div>
            <div>Ceiling cost: <strong>{currency(calc1.ceilingCost)}</strong></div>
            <div>Floor cost: <strong>{currency(calc1.floorCost)}</strong></div>
            <div>Add-ons: <strong>{currency(calc1.addOnsTotal)}</strong></div>
            <div className="text-lg">Box 1 Total: <strong>{currency(calc1.subtotal)}</strong></div>
          </div>
        </section>

        <section className="border rounded-2xl p-4 grid gap-4 no-print">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2"><input ref={includeBox2Ref} type="checkbox" checked={includeBox2} onChange={(e) => toggleIncludeBox2(e.target.checked)} /><span>Include Box 2</span></label>
            {includeBox2 && <TypeChooser value={box2.type} onChange={(t) => setBox2({ ...box2, type: t })} name="box2Type" />}
          </div>
          {includeBox2 && (
            <>
              <div className="grid md:grid-cols-3 gap-4">
                <FtInFields firstInputRef={box2WidthRef} label="Width" ft={box2.wFt} inch={box2.wIn} onFt={(n) => setBox2({ ...box2, wFt: n })} onIn={(n) => setBox2({ ...box2, wIn: n })} feetError={showRequiredErrors && includeBox2 && box2.wFt === 0} nextRef={box2LengthRef} />
                <FtInFields firstInputRef={box2LengthRef} label="Length" ft={box2.lFt} inch={box2.lIn} onFt={(n) => setBox2({ ...box2, lFt: n })} onIn={(n) => setBox2({ ...box2, lIn: n })} feetError={showRequiredErrors && includeBox2 && box2.lFt === 0} nextRef={box2HeightRef} />
                <FtInFields firstInputRef={box2HeightRef} label="Height" ft={box2.hFt} inch={box2.hIn} onFt={(n) => setBox2({ ...box2, hFt: n })} onIn={(n) => setBox2({ ...box2, hIn: n })} nextRef={box2DoorsRef} />
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                <label className="flex items-center gap-2"><input type="checkbox" checked={box2.floorOn} onChange={(e) => setBox2({ ...box2, floorOn: e.target.checked })} /><span>Include Floor</span></label>
                <label className="flex items-center gap-2"><span>Doors</span><NumberField inputRef={box2DoorsRef} label="" value={box2.doors} onChange={(n) => setBox2({ ...box2, doors: n })} /></label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={box2.deductOn} onChange={(e) => setBox2({ ...box2, deductOn: e.target.checked })} /><span>Deduct a custom wall</span></label>
              </div>
              {box2.deductOn && (
                <div className="grid md:grid-cols-2 gap-4">
                  <FtInFields label="Deduct Wall Length" ft={box2.deductLenFt} inch={box2.deductLenIn} onFt={(n) => setBox2({ ...box2, deductLenFt: n })} onIn={(n) => setBox2({ ...box2, deductLenIn: n })} />
                  <FtInFields label="Deduct Wall Height" ft={box2.deductHtFt} inch={box2.deductHtIn} onFt={(n) => setBox2({ ...box2, deductHtFt: n })} onIn={(n) => setBox2({ ...box2, deductHtIn: n })} />
                </div>
              )}
              <AddOnsEditor addOns={addOns2} setAddOns={setAddOns2} onPrintAndSave={handlePrintAndSave} printRef={box2PrintRef} addRef={box2AddRef} onExitPrint={() => { resetAllRef.current?.focus(); }} />
              <div className="grid sm:grid-cols-2 gap-3 bg-gray-50 rounded-xl p-3">
                <div>Walls area: <strong>{calc2.wallsArea.toFixed(2)}</strong> sq ft</div>
                <div>Ceiling area: <strong>{calc2.slabArea.toFixed(2)}</strong> sq ft</div>
                <div>Floor area: <strong>{box2.floorOn ? calc2.slabArea.toFixed(2) : "0.00"}</strong> sq ft</div>
                <div>Walls cost: <strong>{currency(calc2.wallsCost)}</strong></div>
                <div>Ceiling cost: <strong>{currency(calc2.ceilingCost)}</strong></div>
                <div>Floor cost: <strong>{currency(calc2.floorCost)}</strong></div>
                <div>Add-ons: <strong>{currency(calc2.addOnsTotal)}</strong></div>
                <div className="text-lg">Box 2 Total: <strong>{currency(calc2.subtotal)}</strong></div>
              </div>
            </>
          )}
        </section>

        <div className="sticky-totals no-print">
          <div className="grid md:grid-cols-5 gap-4 items-center text-lg">
            <div><strong>Grand Total:</strong> <span style={{ fontWeight: 800 }}>{currency(grand)}</span></div>
          </div>
        </div>

        <div className="print-only print-container">
          <div className="print-header">
            <div>
              <h1 style={{ margin: 0, fontSize: '24px' }}>Cooler / Freezer Pricing</h1>
              <div style={{ fontSize: '14px', marginTop: '4px', color: '#555' }}>Detailed Breakdown</div>
            </div>
            <div className="text-right">
              <div className="bold">Date: {today}</div>
              {(meta.customer || meta.project || meta.quoteNo || meta.salesRep) && (
                <div style={{ marginTop: '8px' }}>
                  {meta.quoteNo && <div>Quote #: <span className="bold">{meta.quoteNo}</span></div>}
                  {meta.salesRep && <div>Sales Rep: <span className="bold">{meta.salesRep}</span></div>}
                  {meta.customer && <div>Customer: {meta.customer}</div>}
                  {meta.project && <div>Project: {meta.project}</div>}
                </div>
              )}
            </div>
          </div>

          <div className="print-section">
            <div className="print-section-header" style={{ backgroundColor: box1.type === 'cooler' ? '#1e40af' : '#0e7490', color: 'white' }}>Box 1 - {box1.type.toUpperCase()}</div>
            <table className="print-table">
              <tbody>
                <tr>
                  <td style={{ width: '15%' }}><strong>Dimensions</strong></td>
                  <td>{feetInToText(box1.wFt, box1.wIn)} (W) × {feetInToText(box1.lFt, box1.lIn)} (L) × {feetInToText(box1.hFt, box1.hIn)} (H)</td>
                  <td style={{ width: '15%' }}><strong>Floor?</strong></td>
                  <td>{box1.floorOn ? "Yes" : "No"}</td>
                </tr>
                {box1.deductOn && (<tr><td><strong>Deduct Wall</strong></td><td colSpan={3}>{feetInToText(box1.deductLenFt, box1.deductLenIn)} × {feetInToText(box1.deductHtFt, box1.deductHtIn)} = {calc1.deductedArea.toFixed(1)} ft²</td></tr>)}
                {box1.doors > 0 && (<tr><td><strong>Doors</strong></td><td colSpan={3}>{box1.doors} × {currency(doorPrice1)} = <span className="bold">{currency((box1.doors || 0) * (doorPrice1 || 0))}</span></td></tr>)}
                {addOns1.length > 0 && (<tr><td><strong>Add-ons</strong></td><td colSpan={3}>{addOns1.map((a, i) => <span key={i} style={{ marginRight: '15px' }}>{a.label}: {a.qty} × {currency(a.unit)} = {currency((a.qty || 0) * (a.unit || 0))}</span>)}</td></tr>)}
              </tbody>
            </table>
            <div style={{ display: 'flex', borderTop: '1px solid #ccc' }}>
              <div style={{ flex: 1, borderRight: '1px solid #ccc', padding: '8px' }}>
                <div className="bold" style={{ marginBottom: '4px' }}>Unit Prices ($/ft²)</div>
                <div>Walls: {unit1.wall}</div><div>Ceiling: {unit1.ceiling}</div><div>Floor: {unit1.floor}</div>
              </div>
              <div style={{ flex: 1, borderRight: '1px solid #ccc', padding: '8px' }}>
                <div className="bold" style={{ marginBottom: '4px' }}>Areas (ft²)</div>
                <div>Walls: {calc1.wallsArea.toFixed(2)}</div><div>Ceiling: {calc1.slabArea.toFixed(2)}</div><div>Floor: {box1.floorOn ? calc1.slabArea.toFixed(2) : "0.00"}</div>
              </div>
              <div style={{ flex: 1, padding: '8px', backgroundColor: '#f9f9f9' }}>
                <div className="bold" style={{ marginBottom: '4px' }}>Calculated Costs</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Walls:</span> <span>{currency(calc1.wallsCost)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Ceiling:</span> <span>{currency(calc1.ceilingCost)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Floor:</span> <span>{currency(calc1.floorCost)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', borderTop: '1px solid #ccc', paddingTop: '4px' }}><span className="bold">Box 1 Total:</span> <span className="bold">{currency(calc1.subtotal)}</span></div>
              </div>
            </div>
          </div>

          {includeBox2 && (
            <div className="print-section">
              <div className="print-section-header" style={{ backgroundColor: box2.type === 'cooler' ? '#1e40af' : '#0e7490', color: 'white' }}>Box 2 - {box2.type.toUpperCase()}</div>
              <table className="print-table">
                <tbody>
                  <tr>
                    <td style={{ width: '15%' }}><strong>Dimensions</strong></td>
                    <td>{feetInToText(box2.wFt, box2.wIn)} (W) × {feetInToText(box2.lFt, box2.lIn)} (L) × {feetInToText(box2.hFt, box2.hIn)} (H)</td>
                    <td style={{ width: '15%' }}><strong>Floor?</strong></td>
                    <td>{box2.floorOn ? "Yes" : "No"}</td>
                  </tr>
                  {box2.deductOn && (<tr><td><strong>Deduct Wall</strong></td><td colSpan={3}>{feetInToText(box2.deductLenFt, box2.deductLenIn)} × {feetInToText(box2.deductHtFt, box2.deductHtIn)} = {calc2.deductedArea.toFixed(1)} ft²</td></tr>)}
                  {box2.doors > 0 && (<tr><td><strong>Doors</strong></td><td colSpan={3}>{box2.doors} × {currency(doorPrice2)} = <span className="bold">{currency((box2.doors || 0) * (doorPrice2 || 0))}</span></td></tr>)}
                  {addOns2.length > 0 && (<tr><td><strong>Add-ons</strong></td><td colSpan={3}>{addOns2.map((a, i) => <span key={i} style={{ marginRight: '15px' }}>{a.label}: {a.qty} × {currency(a.unit)} = {currency((a.qty || 0) * (a.unit || 0))}</span>)}</td></tr>)}
                </tbody>
              </table>
              <div style={{ display: 'flex', borderTop: '1px solid #ccc' }}>
                <div style={{ flex: 1, borderRight: '1px solid #ccc', padding: '8px' }}>
                  <div className="bold" style={{ marginBottom: '4px' }}>Unit Prices ($/ft²)</div>
                  <div>Walls: {unit2.wall}</div><div>Ceiling: {unit2.ceiling}</div><div>Floor: {unit2.floor}</div>
                </div>
                <div style={{ flex: 1, borderRight: '1px solid #ccc', padding: '8px' }}>
                  <div className="bold" style={{ marginBottom: '4px' }}>Areas (ft²)</div>
                  <div>Walls: {calc2.wallsArea.toFixed(2)}</div><div>Ceiling: {calc2.slabArea.toFixed(2)}</div><div>Floor: {box2.floorOn ? calc2.slabArea.toFixed(2) : "0.00"}</div>
                </div>
                <div style={{ flex: 1, padding: '8px', backgroundColor: '#f9f9f9' }}>
                  <div className="bold" style={{ marginBottom: '4px' }}>Calculated Costs</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Walls:</span> <span>{currency(calc2.wallsCost)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Ceiling:</span> <span>{currency(calc2.ceilingCost)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Floor:</span> <span>{currency(calc2.floorCost)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', borderTop: '1px solid #ccc', paddingTop: '4px' }}><span className="bold">Box 2 Total:</span> <span className="bold">{currency(calc2.subtotal)}</span></div>
                </div>
              </div>
            </div>
          )}

          <div className="print-section" style={{ breakInside: 'avoid' }}>
            <table className="print-table summary-table">
              <tbody>
                <tr><td className="text-right" style={{ width: '70%' }}>Subtotal (Boxes):</td><td className="text-right bold">{currency(subTotal)}</td></tr>
                <tr><td className="text-right">Profit ({prices.profitPct}%):</td><td className="text-right">{currency(profit)}</td></tr>
                <tr><td className="text-right">Freight:</td><td className="text-right">{currency(prices.freight)}</td></tr>
                <tr className="summary-row" style={{ backgroundColor: '#e0e0e0' }}><td className="text-right bold" style={{ fontSize: '16px' }}>GRAND TOTAL:</td><td className="text-right bold" style={{ fontSize: '16px' }}>{currency(grand)}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {showDeductModal && (
        <div className="modal-overlay no-print">
          <div className="modal-card">
            <h3>Auto-deduct?</h3>
            <div className="grid gap-2 mb-3">
              <label className="flex items-center gap-2"><input type="radio" name="deduct" checked={deductChoice === 'width'} onChange={() => setDeductChoice('width')} /><span>Use Box 1 <strong>Width × Height</strong> (current: {feetInToText(box1.wFt, box1.wIn)} × {feetInToText(box1.hFt, box1.hIn)})</span></label>
              <label className="flex items-center gap-2"><input type="radio" name="deduct" checked={deductChoice === 'length'} onChange={() => setDeductChoice('length')} /><span>Use Box 1 <strong>Length × Height</strong> (current: {feetInToText(box1.lFt, box1.lIn)} × {feetInToText(box1.hFt, box1.hIn)})</span></label>
            </div>
            <div className="flex justify-end gap-2">
              <button className="border rounded px-3 py-1 bg-gray-100 hover:bg-red-300 hover:ring-4 ring-red-500 transition" onClick={skipDeduct} onKeyDown={(e) => { if (e.key === 'Enter') skipDeduct(); }}>Skip</button>
              <button ref={modalApplyBtnRef} className="border rounded px-3 py-1 bg-red-400 text-white font-semibold ring-4 ring-red-500 hover:bg-red-500 transition" onClick={applyAutoDeduct} onKeyDown={(e) => { if (e.key === 'Enter') applyAutoDeduct(); }}>Apply Deduction</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}  