import React, { useState, useRef, useEffect } from 'react';
import {
  Camera, Upload, Link as LinkIcon, Sparkles, Smile, Trash2, Check,
  RefreshCw, Search, Wand2, Image as ImageIcon, CheckCircle2, SwitchCamera,
} from 'lucide-react';
import { Modal, Field, Input, Tabs, Badge } from '@/components/ui';
import ProductImage, { isImageUrl } from './ProductImage';
import { toast } from '@/store/ui';
import { beep, clickSound, successSound, buzz } from '@/lib/sound';
import { cx } from '@/lib/format';

interface Props {
  open: boolean;
  onClose: () => void;
  value?: string | null;
  onSelect: (imageVal: string | null) => void;
  productName?: string;
}

// Curated high-res catalog presets
const PRESETS = [
  {
    category: 'Food & Cafe',
    items: [
      { label: 'Hot Coffee', url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&auto=format&fit=crop&q=80' },
      { label: 'Tea / Chai', url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&auto=format&fit=crop&q=80' },
      { label: 'Burger', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=80' },
      { label: 'Pizza', url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&auto=format&fit=crop&q=80' },
      { label: 'Biryani / Rice', url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&auto=format&fit=crop&q=80' },
      { label: 'French Fries', url: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=400&auto=format&fit=crop&q=80' },
      { label: 'Sandwich', url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&auto=format&fit=crop&q=80' },
      { label: 'Pastry Cake', url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&auto=format&fit=crop&q=80' },
      { label: 'Ice Cream', url: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=400&auto=format&fit=crop&q=80' },
      { label: 'Cold Drink', url: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&auto=format&fit=crop&q=80' },
    ],
  },
  {
    category: 'Groceries & Kirana',
    items: [
      { label: 'Fresh Milk', url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=80' },
      { label: 'Bread', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80' },
      { label: 'Farm Eggs', url: 'https://images.unsplash.com/photo-1516448620398-c5f44bf9f441?w=400&auto=format&fit=crop&q=80' },
      { label: 'Cooking Oil', url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&auto=format&fit=crop&q=80' },
      { label: 'Spices / Masala', url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&auto=format&fit=crop&q=80' },
      { label: 'Fresh Fruits', url: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&auto=format&fit=crop&q=80' },
      { label: 'Vegetables', url: 'https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?w=400&auto=format&fit=crop&q=80' },
      { label: 'Biscuits / Cookies', url: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400&auto=format&fit=crop&q=80' },
      { label: 'Chocolate Bar', url: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=400&auto=format&fit=crop&q=80' },
    ],
  },
  {
    category: 'Pharmacy & Health',
    items: [
      { label: 'Medicine Tablets', url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=80' },
      { label: 'Cough Syrup', url: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=400&auto=format&fit=crop&q=80' },
      { label: 'First Aid / Bandage', url: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=400&auto=format&fit=crop&q=80' },
      { label: 'Hand Sanitizer', url: 'https://images.unsplash.com/photo-1584483766114-2cea6facdf57?w=400&auto=format&fit=crop&q=80' },
      { label: 'Vitamins Bottle', url: 'https://images.unsplash.com/photo-1550572017-ed200f5e5a43?w=400&auto=format&fit=crop&q=80' },
    ],
  },
  {
    category: 'Retail & Fashion',
    items: [
      { label: 'T-Shirt', url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=400&auto=format&fit=crop&q=80' },
      { label: 'Denim Jeans', url: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400&auto=format&fit=crop&q=80' },
      { label: 'Sneakers Shoes', url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&auto=format&fit=crop&q=80' },
      { label: 'Wrist Watch', url: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=400&auto=format&fit=crop&q=80' },
      { label: 'Handbag', url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&auto=format&fit=crop&q=80' },
    ],
  },
];

const EMOJIS = [
  '📦', '🛒', '🛍️', '🏷️', '☕', '🍵', '🍔', '🍕', '🍟', '🥪', '🍜', '🍛',
  '🍰', '🧁', '🍦', '🍩', '🍫', '🍬', '🥛', '🥤', '🧃', '🍎', '🍌', '🥭',
  '🍇', '🥕', '🥔', '🧅', '🥚', '🍞', '🧈', '🧀', '💊', '💉', '🩹', '🩺',
  '🧴', '🧼', '👕', '👖', '👗', '👟', '👠', '👜', '🎒', '🕶️', '⌚', '📱',
  '💻', '🎧', '🔋', '🔌', '🛠️', '🔩', '🔧', '🛢️', '🚗', '🏍️', '✂️', '💈',
];

export default function ImagePickerModal({
  open,
  onClose,
  value,
  onSelect,
  productName = '',
}: Props) {
  // Default tab is Camera per user requirement
  const [tab, setTab] = useState<'camera' | 'hd_search' | 'upload' | 'url' | 'presets' | 'emoji'>('camera');
  const [selectedImg, setSelectedImg] = useState<string | null>(value ?? null);
  const [urlInput, setUrlInput] = useState<string>(isImageUrl(value) ? value || '' : '');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraErr, setCameraErr] = useState('');
  const [processingBg, setProcessingBg] = useState(false);

  // Online HD image lookup states
  const [searchQuery, setSearchQuery] = useState(productName || '');
  const [onlineResults, setOnlineResults] = useState<{ label: string; url: string }[]>([]);
  const [searchingOnline, setSearchingOnline] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSelectedImg(value ?? null);
    if (isImageUrl(value)) {
      setUrlInput(value || '');
    }
    if (productName) {
      setSearchQuery(productName);
    }
  }, [value, open, productName]);

  // Handle live camera stream when camera tab is open
  useEffect(() => {
    if (!open || tab !== 'camera') {
      setCameraActive(false);
      return;
    }

    let stream: MediaStream | null = null;
    let mounted = true;

    (async () => {
      try {
        setCameraErr('');
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        });

        if (mounted && videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraActive(true);
        }
      } catch (e: any) {
        if (mounted) {
          setCameraActive(false);
          setCameraErr('Camera permission denied or camera unavailable. Use native camera button below.');
        }
      }
    })();

    return () => {
      mounted = false;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [open, tab, facingMode]);

  // Snap photo from live camera feed
  const snapLivePhoto = () => {
    if (!videoRef.current) return;
    try {
      const v = videoRef.current;
      const canvas = document.createElement('canvas');
      const MAX = 500;
      let w = v.videoWidth || 640;
      let h = v.videoHeight || 480;

      if (w > h) {
        if (w > MAX) {
          h = Math.round((h * MAX) / w);
          w = MAX;
        }
      } else {
        if (h > MAX) {
          w = Math.round((w * MAX) / h);
          h = MAX;
        }
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(v, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        setSelectedImg(dataUrl);
        beep();
        buzz('light');
        toast('Photo captured! Tap Save or Clean Background.');
      }
    } catch {
      toast('Failed to capture frame', 'err');
    }
  };

  // Process File from Camera / Gallery
  const handleFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      return toast('Please choose an image file', 'err');
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 500;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setSelectedImg(dataUrl);
          clickSound();
          toast('Photo loaded!');
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // 1-Tap AI Studio Background Cleaner & Contrast Booster
  const cleanStudioBackground = () => {
    if (!selectedImg || !selectedImg.startsWith('data:image')) {
      return toast('Capture or upload a photo first to clean background', 'err');
    }

    setProcessingBg(true);
    buzz('medium');

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        setProcessingBg(false);
        return;
      }

      // Draw original
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      // Sample 4 corner regions to compute background color
      const sampleCorners = [
        [0, 0],
        [canvas.width - 1, 0],
        [0, canvas.height - 1],
        [canvas.width - 1, canvas.height - 1],
      ];

      let bgR = 0, bgG = 0, bgB = 0;
      sampleCorners.forEach(([x, y]) => {
        const i = (y * canvas.width + x) * 4;
        bgR += data[i];
        bgG += data[i + 1];
        bgB += data[i + 2];
      });
      bgR /= 4;
      bgG /= 4;
      bgB /= 4;

      // Clean background pixels & boost product contrast
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Euclidean distance from background
        const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

        // If background noise or pale surface, lighten to pure studio white #FFFFFF
        if (dist < 42 || (lum > 225 && dist < 70)) {
          data[i] = 255;
          data[i + 1] = 255;
          data[i + 2] = 255;
        } else {
          // Enhance product color & sharpness
          data[i] = Math.min(255, Math.max(0, (r - 128) * 1.08 + 128));
          data[i + 1] = Math.min(255, Math.max(0, (g - 128) * 1.08 + 128));
          data[i + 2] = Math.min(255, Math.max(0, (b - 128) * 1.08 + 128));
        }
      }

      ctx.putImageData(imgData, 0, 0);
      const cleanedUrl = canvas.toDataURL('image/jpeg', 0.9);
      setSelectedImg(cleanedUrl);
      setProcessingBg(false);
      successSound();
      toast('Studio background cleaned & contrast enhanced ✨');
    };
    img.onerror = () => {
      setProcessingBg(false);
      toast('Could not process photo', 'err');
    };
    img.src = selectedImg;
  };

  // Search Online High-Quality Product Images
  const searchOnlineImages = async () => {
    const term = searchQuery.trim() || productName.trim();
    if (!term) return toast('Enter product name to search online', 'err');

    setSearchingOnline(true);
    try {
      // 1. Search OpenFoodFacts product catalogue
      const res = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(term)}&search_simple=1&action=process&json=1&page_size=8`);
      if (res.ok) {
        const json = await res.json();
        const found: { label: string; url: string }[] = [];

        if (json.products?.length) {
          json.products.forEach((p: any) => {
            const url = p.image_front_url || p.image_url || p.image_small_url;
            if (url && !found.some((x) => x.url === url)) {
              found.push({
                label: p.product_name || term,
                url,
              });
            }
          });
        }

        // Add curated matches
        PRESETS.forEach((cat) => {
          cat.items.forEach((item) => {
            if (item.label.toLowerCase().includes(term.toLowerCase()) && !found.some((x) => x.url === item.url)) {
              found.push(item);
            }
          });
        });

        setOnlineResults(found);
        if (found.length) {
          toast(`Found ${found.length} HD product images online`);
        } else {
          toast(`No online image found for "${term}". You can use Camera or Presets.`, 'err');
        }
      }
    } catch {
      toast('Online search failed. Check internet connection.', 'err');
    } finally {
      setSearchingOnline(false);
    }
  };

  const handleApply = () => {
    onSelect(selectedImg);
    successSound();
    buzz('medium');
    onClose();
  };

  const handleClear = () => {
    setSelectedImg(null);
    setUrlInput('');
    clickSound();
    toast('Image removed');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Product Photo · ${productName || 'New Product'}`}
      wide
      footer={
        <div className="flex items-center justify-between gap-2">
          {selectedImg ? (
            <button
              onClick={handleClear}
              className="btn-danger px-3 text-xs flex items-center gap-1.5"
            >
              <Trash2 size={14} /> Remove Photo
            </button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <button onClick={onClose} className="btn-ghost text-xs">
              Cancel
            </button>
            <button onClick={handleApply} className="btn-primary text-xs px-5">
              <Check size={14} /> Save Photo
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Active Image Preview & AI Tools Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-line bg-surface2/60 p-3.5">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-brand/40 bg-surface shadow-glow flex items-center justify-center">
              <ProductImage src={selectedImg} alt={productName} emojiClassName="text-4xl" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-ink">Selected Photo Preview</p>
              <p className="text-[11px] text-ink3 truncate mt-0.5">
                {selectedImg
                  ? selectedImg.startsWith('data:')
                    ? 'Custom camera capture (Saved in database)'
                    : selectedImg.startsWith('http')
                    ? 'High-Definition Web Image'
                    : `Emoji: ${selectedImg}`
                  : 'No photo selected (Displays 📦 icon)'}
              </p>
              {selectedImg && (
                <Badge tone="ok" className="mt-1.5">
                  <CheckCircle2 size={11} className="mr-1 inline" /> Ready
                </Badge>
              )}
            </div>
          </div>

          {/* 1-Tap AI Clean Background Button */}
          {selectedImg && selectedImg.startsWith('data:image') && (
            <button
              type="button"
              disabled={processingBg}
              onClick={cleanStudioBackground}
              className="btn-primary text-xs py-2 px-3 shrink-0 flex items-center gap-1.5 shadow-glow"
              title="Clean background & boost sharpness"
            >
              <Wand2 size={14} className={processingBg ? 'animate-spin' : ''} />
              {processingBg ? 'Cleaning…' : '✨ Clean Studio BG'}
            </button>
          )}
        </div>

        {/* Source Tabs */}
        <Tabs
          active={tab}
          onChange={(t) => setTab(t as any)}
          tabs={[
            { id: 'camera', label: '📷 Camera Photo (Direct)' },
            { id: 'hd_search', label: '🔍 Search Best HD Online' },
            { id: 'upload', label: 'Gallery / File' },
            { id: 'url', label: 'Web URL' },
            { id: 'presets', label: 'Fast Presets' },
            { id: 'emoji', label: 'Emoji' },
          ]}
        />

        {/* TAB 1: CAMERA PHOTO (DEFAULT) */}
        {tab === 'camera' && (
          <div className="space-y-3">
            {/* Native Mobile Camera Input */}
            <input
              ref={nativeCameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />

            {/* Live Camera Viewfinder */}
            <div className="relative overflow-hidden rounded-2xl border border-line bg-black">
              <video
                ref={videoRef}
                playsInline
                muted
                className="h-56 sm:h-64 w-full object-cover"
              />

              {/* Shutter Button & Camera Switcher Floating Overlay */}
              <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-4 px-4">
                <button
                  type="button"
                  onClick={() =>
                    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
                  }
                  className="rounded-full bg-black/60 p-2.5 text-white backdrop-blur-md hover:bg-black/80 active:scale-90"
                  title="Switch Camera"
                >
                  <SwitchCamera size={18} />
                </button>

                <button
                  type="button"
                  onClick={snapLivePhoto}
                  className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-brand shadow-glow active:scale-90 transition"
                  title="Snap Photo"
                >
                  <Camera size={24} className="text-black" />
                </button>

                <button
                  type="button"
                  onClick={() => nativeCameraInputRef.current?.click()}
                  className="rounded-full bg-black/60 p-2.5 text-white backdrop-blur-md hover:bg-black/80 active:scale-90 text-[11px] font-bold"
                  title="Open Phone Camera App"
                >
                  Native
                </button>
              </div>

              {cameraErr && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-4 text-center">
                  <p className="text-xs text-warn mb-3">{cameraErr}</p>
                  <button
                    type="button"
                    onClick={() => nativeCameraInputRef.current?.click()}
                    className="btn-primary text-xs"
                  >
                    <Camera size={14} /> Open Device Camera App
                  </button>
                </div>
              )}
            </div>

            <p className="text-center text-[11px] text-ink3">
              Point at product and tap the center button to take a crisp photo.
            </p>
          </div>
        )}

        {/* TAB 2: SEARCH BEST HD ONLINE IMAGE */}
        {tab === 'hd_search' && (
          <div className="space-y-3">
            <Field label="Search High-Resolution Studio Image Online">
              <div className="flex gap-2">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. Dairy Milk, Coca Cola, Paracetamol…"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') searchOnlineImages();
                  }}
                />
                <button
                  type="button"
                  disabled={searchingOnline}
                  onClick={searchOnlineImages}
                  className="btn-primary text-xs shrink-0 flex items-center gap-1.5"
                >
                  {searchingOnline ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                  Find HD Image
                </button>
              </div>
            </Field>

            {onlineResults.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-[45dvh] overflow-y-auto p-1">
                {onlineResults.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedImg(item.url);
                      successSound();
                      buzz('light');
                      toast('HD image selected!');
                    }}
                    className={cx(
                      'group flex flex-col items-center rounded-2xl border p-2 text-center transition active:scale-95 bg-surface2/50',
                      selectedImg === item.url
                        ? 'border-brand bg-brand/15 shadow-glow ring-2 ring-brand'
                        : 'border-line hover:border-brand/40',
                    )}
                  >
                    <div className="h-20 w-20 rounded-xl overflow-hidden mb-1.5 bg-white p-1">
                      <img
                        src={item.url}
                        alt={item.label}
                        className="h-full w-full object-contain group-hover:scale-105 transition"
                        loading="lazy"
                      />
                    </div>
                    <span className="text-[10px] font-bold text-ink truncate w-full">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-line p-6 text-center text-xs text-ink3">
                Tap <b>Find HD Image</b> to automatically fetch crystal-clear e-commerce photos online!
              </div>
            )}
          </div>
        )}

        {/* TAB 3: GALLERY / UPLOAD FILE */}
        {tab === 'upload' && (
          <div className="space-y-3">
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />

            <div
              onClick={() => galleryInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-line hover:border-brand/60 bg-surface2/30 p-8 text-center cursor-pointer transition active:scale-[0.99]"
            >
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand/15 text-brand shadow-glow">
                <Upload size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-ink">Choose from Phone Gallery or Computer</p>
                <p className="text-xs text-ink3 mt-1">Supports JPG, PNG, WebP format</p>
              </div>
              <button
                type="button"
                className="btn-soft text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  galleryInputRef.current?.click();
                }}
              >
                Browse Files
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: DIRECT IMAGE URL */}
        {tab === 'url' && (
          <div className="space-y-3">
            <Field label="Direct Image Link (ImgBB, Cloudinary, Imgur, any web URL)">
              <div className="flex gap-2">
                <Input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://i.ibb.co/example/photo.jpg or https://..."
                />
                <button
                  className="btn-primary text-xs shrink-0"
                  onClick={() => {
                    if (!urlInput.trim()) return toast('Enter image URL first', 'err');
                    setSelectedImg(urlInput.trim());
                    clickSound();
                    toast('Image URL applied');
                  }}
                >
                  Apply
                </button>
              </div>
            </Field>
          </div>
        )}

        {/* TAB 5: CURATED PRESETS */}
        {tab === 'presets' && (
          <div className="space-y-4 max-h-[45dvh] overflow-y-auto pr-1">
            {PRESETS.map((cat) => (
              <div key={cat.category} className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink3">
                  {cat.category}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-5">
                  {cat.items.map((item) => {
                    const active = selectedImg === item.url;
                    return (
                      <button
                        key={item.label}
                        onClick={() => {
                          setSelectedImg(item.url);
                          clickSound();
                          buzz('light');
                        }}
                        className={cx(
                          'group flex flex-col items-center rounded-xl border p-2 text-center transition active:scale-95 overflow-hidden',
                          active
                            ? 'border-brand bg-brand/15 shadow-glow ring-1 ring-brand'
                            : 'border-line bg-surface2/50 hover:border-brand/40',
                        )}
                      >
                        <div className="h-14 w-14 rounded-lg overflow-hidden mb-1.5">
                          <img
                            src={item.url}
                            alt={item.label}
                            className="h-full w-full object-cover group-hover:scale-105 transition duration-150"
                            loading="lazy"
                          />
                        </div>
                        <span className="text-[10px] font-bold text-ink truncate w-full">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 6: EMOJI ICONS */}
        {tab === 'emoji' && (
          <div className="space-y-2">
            <p className="label">Pick an Emoji Icon</p>
            <div className="grid grid-cols-8 gap-2 sm:grid-cols-12 max-h-[40dvh] overflow-y-auto p-1">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    setSelectedImg(emoji);
                    clickSound();
                    buzz('light');
                  }}
                  className={cx(
                    'grid h-11 w-11 place-items-center rounded-xl border text-2xl transition active:scale-90',
                    selectedImg === emoji
                      ? 'border-brand bg-brand/20 shadow-glow ring-1 ring-brand'
                      : 'border-line bg-surface2/50 hover:border-brand/40 hover:bg-surface2',
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
