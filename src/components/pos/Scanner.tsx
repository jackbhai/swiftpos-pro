import React, { useEffect, useRef, useState } from 'react';
import {
  Camera, ScanLine, Sparkles, CheckCircle2, AlertCircle, Plus, RefreshCw,
  Package, Tag, Image as ImageIcon, Check, X,
} from 'lucide-react';
import { Modal, Field, Input, Badge, Select } from '@/components/ui';
import { beep, successSound, errorSound, buzz } from '@/lib/sound';
import { db, uid } from '@/db/db';
import { useSettings } from '@/store/settings';
import { toast } from '@/store/ui';
import type { Product } from '@/db/types';

interface Props {
  open: boolean;
  onClose: () => void;
  onScan?: (code: string) => void;
  onProductCreated?: (product: Product) => void;
}

export default function Scanner({ open, onClose, onScan, onProductCreated }: Props) {
  const s = useSettings();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState('');
  const [manual, setManual] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [detectedCode, setDetectedCode] = useState<string | null>(null);
  const [foundProduct, setFoundProduct] = useState<Product | null>(null);

  // New product auto-intake draft state
  const [newDraft, setNewDraft] = useState<Partial<Product> | null>(null);

  useEffect(() => {
    if (!open) {
      setDetectedCode(null);
      setFoundProduct(null);
      setNewDraft(null);
      return;
    }

    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;

    (async () => {
      try {
        const Det = (window as any).BarcodeDetector;
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        if (!Det) {
          setErr('Live BarcodeDetector not supported in this browser. Enter code manually or use Chrome/Android.');
          return;
        }

        const det = new Det({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code'],
        });

        const loop = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const codes = await det.detect(videoRef.current);
            if (codes?.length && !detectedCode && !lookingUp) {
              const raw = codes[0].rawValue.trim();
              if (raw) {
                handleCodeDetected(raw);
              }
            }
          } catch {
            /* frame skip */
          }
          if (!stopped) raf = requestAnimationFrame(loop);
        };

        raf = requestAnimationFrame(loop);
      } catch (e: any) {
        setErr('Camera unavailable: ' + (e?.message ?? 'permission denied'));
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [open, detectedCode, lookingUp]);

  // Handle barcode detected from camera or typed manually
  const handleCodeDetected = async (code: string) => {
    setDetectedCode(code);
    setLookingUp(true);
    beep();
    buzz('success');

    try {
      // 1. Check local catalog
      const local = await db.products
        .filter((p: any) => p.barcode === code || p.sku === code)
        .first();

      if (local) {
        setFoundProduct(local);
        setLookingUp(false);
        successSound();
        return;
      }

      // 2. Not in local DB -> Auto-fetch from Open Product Database / Heuristic match
      let onlineName = '';
      let onlineBrand = '';
      let onlineCat = 'General';
      let onlineImg = '';
      let onlineUnit = 'pc';

      try {
        const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
        if (res.ok) {
          const json = await res.json();
          if (json.status === 1 && json.product) {
            onlineName = json.product.product_name || json.product.product_name_en || '';
            onlineBrand = json.product.brands || '';
            onlineCat = json.product.categories_tags?.[0]?.replace('en:', '').replace(/-/g, ' ') || 'General';
            onlineImg = json.product.image_url || json.product.image_front_small_url || '';
            if (json.product.quantity) {
              const q = json.product.quantity.toLowerCase();
              if (q.includes('kg')) onlineUnit = 'kg';
              else if (q.includes('g')) onlineUnit = 'g';
              else if (q.includes('l')) onlineUnit = 'l';
              else if (q.includes('ml')) onlineUnit = 'ml';
            }
          }
        }
      } catch {
        /* online lookup timeout or offline */
      }

      // Auto prefill draft
      setNewDraft({
        barcode: code,
        name: onlineName || '',
        brand: onlineBrand || '',
        category: onlineCat || 'General',
        image: onlineImg || undefined,
        unit: (onlineUnit as any) || 'pc',
        sku: 'SKU' + code.slice(-5),
        price: 0,
        cost: 0,
        mrp: 0,
        stock: 10,
        gst: s.defaultGst || 5,
        active: true,
        trackStock: true,
      });

      setLookingUp(false);
    } catch {
      setLookingUp(false);
    }
  };

  const handleUseFoundProduct = () => {
    if (foundProduct) {
      if (onScan) onScan(foundProduct.barcode || foundProduct.sku);
      onClose();
    }
  };

  const handleSaveNewDraft = async () => {
    if (!newDraft?.name?.trim()) {
      return toast('Please enter a product name', 'err');
    }

    const rec: Product = {
      id: uid('p_'),
      name: newDraft.name.trim(),
      barcode: newDraft.barcode || detectedCode || undefined,
      sku: newDraft.sku || 'SKU' + Date.now().toString().slice(-5),
      brand: newDraft.brand || undefined,
      category: newDraft.category || 'General',
      price: +(newDraft.price || 0),
      cost: +(newDraft.cost || 0),
      mrp: +(newDraft.mrp || 0),
      stock: +(newDraft.stock || 0),
      lowStock: 10,
      gst: +(newDraft.gst ?? s.defaultGst),
      unit: (newDraft.unit as any) || 'pc',
      image: newDraft.image || undefined,
      active: true,
      trackStock: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.products.add(rec);
    successSound();
    buzz('success');
    toast(`Product '${rec.name}' added to inventory!`);

    if (onProductCreated) onProductCreated(rec);
    if (onScan) onScan(rec.barcode || rec.sku);
    onClose();
  };

  const handleResetScanner = () => {
    setDetectedCode(null);
    setFoundProduct(null);
    setNewDraft(null);
    setManual('');
  };

  return (
    <Modal open={open} onClose={onClose} title="Smart Camera Scanner & Auto-Intake" wide>
      <div className="space-y-4">
        {/* If no code detected yet, show live camera viewport */}
        {!detectedCode && (
          <div className="relative overflow-hidden rounded-2xl border border-line bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-64 sm:h-72 w-full object-cover"
            />

            {/* Viewfinder Target Box Overlay */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-44 w-64 rounded-2xl border-2 border-brand/80 shadow-glow flex items-center justify-center">
                {/* Laser scan line animation */}
                <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-brand to-transparent shadow-glow animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand/90 bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-sm">
                  Point at Product Barcode
                </span>
              </div>
            </div>

            {err && (
              <div className="absolute bottom-2 inset-x-2 bg-bad/80 backdrop-blur-md p-2 rounded-xl text-center text-xs text-white">
                {err}
              </div>
            )}
          </div>
        )}

        {/* Manual Barcode Fallback Input */}
        {!detectedCode && (
          <div className="flex gap-2">
            <Input
              placeholder="Or type / paste barcode number manually…"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && manual.trim()) {
                  handleCodeDetected(manual.trim());
                }
              }}
            />
            <button
              className="btn-primary shrink-0"
              onClick={() => manual.trim() && handleCodeDetected(manual.trim())}
            >
              Scan / Lookup
            </button>
          </div>
        )}

        {/* STATE A: Loading lookup */}
        {lookingUp && (
          <div className="p-8 text-center space-y-2 rounded-2xl border border-line bg-surface2/40">
            <RefreshCw size={24} className="animate-spin mx-auto text-brand" />
            <p className="text-sm font-bold text-ink">Analyzing barcode {detectedCode}…</p>
            <p className="text-xs text-ink3">Checking catalog & matching product details</p>
          </div>
        )}

        {/* STATE B: Product already exists in local DB */}
        {!lookingUp && foundProduct && (
          <div className="rounded-2xl border border-ok/40 bg-ok/10 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-ok/20 text-ok border border-ok/30">
                <CheckCircle2 size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <Badge tone="ok">Product Found in Catalog</Badge>
                <h3 className="text-base font-extrabold text-ink truncate mt-1">
                  {foundProduct.name}
                </h3>
                <p className="text-xs text-ink3 font-mono">
                  Barcode: {foundProduct.barcode} · Category: {foundProduct.category} · Stock: {foundProduct.stock} {foundProduct.unit}
                </p>
              </div>
              <div className="text-right font-mono text-base font-extrabold text-brand">
                {s.currency} {foundProduct.price}
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-ok/20">
              <button onClick={handleResetScanner} className="btn-ghost flex-1 text-xs">
                Scan Another Item
              </button>
              <button onClick={handleUseFoundProduct} className="btn-primary flex-1 text-xs">
                Add to Cart / Select
              </button>
            </div>
          </div>
        )}

        {/* STATE C: New Product Detected (Smart Auto-Intake Form) */}
        {!lookingUp && detectedCode && !foundProduct && newDraft && (
          <div className="rounded-2xl border border-brand/40 bg-surface2/60 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-line pb-2">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-brand" />
                <span className="text-xs font-bold text-ink uppercase tracking-wider">
                  New Product Auto-Intake · Barcode: <span className="font-mono text-brand">{detectedCode}</span>
                </span>
              </div>
              <Badge tone="brand">Smart Pre-filled</Badge>
            </div>

            <p className="text-xs text-ink3">
              We pre-filled the barcode and suggested details. Fill remaining fields and save to inventory:
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Product Name *" className="sm:col-span-2">
                <Input
                  value={newDraft.name || ''}
                  onChange={(e) => setNewDraft({ ...newDraft, name: e.target.value })}
                  placeholder="e.g. Paracetamol 500mg or Dairy Milk"
                  autoFocus
                />
              </Field>

              <Field label="Selling Price (₹) *">
                <Input
                  inputMode="decimal"
                  value={newDraft.price || ''}
                  onChange={(e) => setNewDraft({ ...newDraft, price: +e.target.value || 0 })}
                  placeholder="0.00"
                />
              </Field>

              <Field label="MRP (₹)">
                <Input
                  inputMode="decimal"
                  value={newDraft.mrp || ''}
                  onChange={(e) => setNewDraft({ ...newDraft, mrp: +e.target.value || 0 })}
                  placeholder="0.00"
                />
              </Field>

              <Field label="Cost Price (₹)">
                <Input
                  inputMode="decimal"
                  value={newDraft.cost || ''}
                  onChange={(e) => setNewDraft({ ...newDraft, cost: +e.target.value || 0 })}
                  placeholder="0.00"
                />
              </Field>

              <Field label="Opening Stock Quantity">
                <Input
                  inputMode="decimal"
                  value={newDraft.stock || ''}
                  onChange={(e) => setNewDraft({ ...newDraft, stock: +e.target.value || 0 })}
                  placeholder="10"
                />
              </Field>

              <Field label="Category">
                <Input
                  value={newDraft.category || 'General'}
                  onChange={(e) => setNewDraft({ ...newDraft, category: e.target.value })}
                />
              </Field>

              <Field label="Brand / Manufacturer">
                <Input
                  value={newDraft.brand || ''}
                  onChange={(e) => setNewDraft({ ...newDraft, brand: e.target.value })}
                  placeholder="Brand name"
                />
              </Field>
            </div>

            <div className="flex gap-2 pt-3 border-t border-line">
              <button onClick={handleResetScanner} className="btn-ghost flex-1 text-xs">
                Cancel / Re-scan
              </button>
              <button onClick={handleSaveNewDraft} className="btn-primary flex-1 text-xs">
                <Check size={14} /> Save Product & Add to Cart
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
