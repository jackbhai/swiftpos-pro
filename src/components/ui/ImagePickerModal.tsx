import React, { useState, useRef } from 'react';
import { Upload, Link as LinkIcon, Sparkles, Smile, Trash2, Check, Camera, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { Modal, Field, Input, Tabs, Badge } from '@/components/ui';
import ProductImage, { isImageUrl } from './ProductImage';
import { toast } from '@/store/ui';
import { clickSound, successSound, buzz } from '@/lib/sound';
import { cx } from '@/lib/format';

interface Props {
  open: boolean;
  onClose: () => void;
  value?: string | null;
  onSelect: (imageVal: string | null) => void;
  productName?: string;
}

// Curated high quality web presets (fast Unsplash/CDN optimized thumbnails)
const PRESETS = [
  {
    category: 'Food & Cafe',
    items: [
      { label: 'Hot Coffee', url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300&auto=format&fit=crop&q=80' },
      { label: 'Tea / Chai', url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=300&auto=format&fit=crop&q=80' },
      { label: 'Burger', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&auto=format&fit=crop&q=80' },
      { label: 'Pizza', url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&auto=format&fit=crop&q=80' },
      { label: 'Biryani / Rice', url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300&auto=format&fit=crop&q=80' },
      { label: 'French Fries', url: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=300&auto=format&fit=crop&q=80' },
      { label: 'Sandwich', url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=300&auto=format&fit=crop&q=80' },
      { label: 'Cake / Pastry', url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300&auto=format&fit=crop&q=80' },
      { label: 'Ice Cream', url: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=300&auto=format&fit=crop&q=80' },
      { label: 'Cold Drink', url: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=300&auto=format&fit=crop&q=80' },
    ],
  },
  {
    category: 'Groceries & Kirana',
    items: [
      { label: 'Fresh Milk', url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&auto=format&fit=crop&q=80' },
      { label: 'Bread', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&auto=format&fit=crop&q=80' },
      { label: 'Farm Eggs', url: 'https://images.unsplash.com/photo-1516448620398-c5f44bf9f441?w=300&auto=format&fit=crop&q=80' },
      { label: 'Cooking Oil', url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300&auto=format&fit=crop&q=80' },
      { label: 'Spices / Masala', url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=300&auto=format&fit=crop&q=80' },
      { label: 'Fresh Fruits', url: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=300&auto=format&fit=crop&q=80' },
      { label: 'Vegetables', url: 'https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?w=300&auto=format&fit=crop&q=80' },
      { label: 'Cookies / Biscuits', url: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=300&auto=format&fit=crop&q=80' },
      { label: 'Chocolate', url: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=300&auto=format&fit=crop&q=80' },
    ],
  },
  {
    category: 'Pharmacy & Health',
    items: [
      { label: 'Medicine Tablets', url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80' },
      { label: 'Cough Syrup', url: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=300&auto=format&fit=crop&q=80' },
      { label: 'First Aid / Bandage', url: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=300&auto=format&fit=crop&q=80' },
      { label: 'Hand Sanitizer', url: 'https://images.unsplash.com/photo-1584483766114-2cea6facdf57?w=300&auto=format&fit=crop&q=80' },
      { label: 'Vitamins / Health', url: 'https://images.unsplash.com/photo-1550572017-ed200f5e5a43?w=300&auto=format&fit=crop&q=80' },
    ],
  },
  {
    category: 'Fashion & Retail',
    items: [
      { label: 'T-Shirt', url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300&auto=format&fit=crop&q=80' },
      { label: 'Denim Jeans', url: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=300&auto=format&fit=crop&q=80' },
      { label: 'Casual Shoes', url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&auto=format&fit=crop&q=80' },
      { label: 'Wrist Watch', url: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=300&auto=format&fit=crop&q=80' },
      { label: 'Handbag', url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=300&auto=format&fit=crop&q=80' },
    ],
  },
  {
    category: 'Electronics',
    items: [
      { label: 'Smartphone', url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&auto=format&fit=crop&q=80' },
      { label: 'Earphones', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&auto=format&fit=crop&q=80' },
      { label: 'Smartwatch', url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&auto=format&fit=crop&q=80' },
      { label: 'USB Cable', url: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=300&auto=format&fit=crop&q=80' },
    ],
  },
  {
    category: 'Hardware & Auto',
    items: [
      { label: 'Engine Oil', url: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=300&auto=format&fit=crop&q=80' },
      { label: 'Tool Kit', url: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=300&auto=format&fit=crop&q=80' },
      { label: 'Paint Can', url: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=300&auto=format&fit=crop&q=80' },
      { label: 'Car Battery', url: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=300&auto=format&fit=crop&q=80' },
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
  productName = 'Product',
}: Props) {
  const [tab, setTab] = useState<'upload' | 'url' | 'presets' | 'emoji'>('upload');
  const [selectedImg, setSelectedImg] = useState<string | null>(value ?? null);
  const [urlInput, setUrlInput] = useState<string>(isImageUrl(value) ? value || '' : '');
  const [compressing, setCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setSelectedImg(value ?? null);
    if (isImageUrl(value)) {
      setUrlInput(value || '');
    }
  }, [value, open]);

  // Handle local file upload and compress to 400x400 JPEG WebReady Base64
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return toast('Please select an image file (JPG, PNG, WebP)', 'err');
    }

    setCompressing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 400;
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
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          setSelectedImg(compressedDataUrl);
          setCompressing(false);
          clickSound();
          buzz('light');
          toast('Image uploaded and optimized for offline use');
        }
      };
      img.onerror = () => {
        setCompressing(false);
        toast('Failed to load image file', 'err');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
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
    toast('Image cleared');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Product Image · ${productName}`}
      wide
      footer={
        <div className="flex items-center justify-between gap-2">
          {selectedImg ? (
            <button
              onClick={handleClear}
              className="btn-danger px-3 text-xs flex items-center gap-1.5"
            >
              <Trash2 size={14} /> Remove Image
            </button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <button onClick={onClose} className="btn-ghost text-xs">
              Cancel
            </button>
            <button onClick={handleApply} className="btn-primary text-xs px-5">
              <Check size={14} /> Done / Save Image
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Live Preview Header */}
        <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface2/60 p-3.5">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-brand/40 bg-surface shadow-glow">
            <ProductImage src={selectedImg} alt={productName} emojiClassName="text-4xl" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-ink">Active Image Preview</p>
            <p className="text-[11px] text-ink3 truncate mt-0.5">
              {selectedImg
                ? selectedImg.startsWith('data:')
                  ? 'Local compressed photo (Offline IndexedDB)'
                  : selectedImg.startsWith('http')
                  ? selectedImg
                  : `Emoji: ${selectedImg}`
                : 'No image chosen (Default 📦 icon will be displayed)'}
            </p>
            {selectedImg && (
              <Badge tone="ok" className="mt-2">
                <CheckCircle2 size={11} className="mr-1 inline" /> Image Selected
              </Badge>
            )}
          </div>
        </div>

        {/* Source Tabs */}
        <Tabs
          active={tab}
          onChange={(t) => setTab(t as any)}
          tabs={[
            { id: 'upload', label: 'Upload File / Camera' },
            { id: 'url', label: 'Web URL / ImgBB' },
            { id: 'presets', label: 'Fast Presets' },
            { id: 'emoji', label: 'Emoji / Icon' },
          ]}
        />

        {/* TAB 1: File Upload */}
        {tab === 'upload' && (
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-line hover:border-brand/60 bg-surface2/30 p-8 text-center cursor-pointer transition active:scale-[0.99]"
            >
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand/15 text-brand shadow-glow">
                <Camera size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-ink">
                  {compressing ? 'Optimizing image…' : 'Tap to upload or take a photo'}
                </p>
                <p className="text-xs text-ink3 mt-1">
                  Supports JPG, PNG, WebP · Auto-compressed to lightweight offline format
                </p>
              </div>
              <button
                type="button"
                className="btn-soft text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                <Upload size={14} /> Browse from Device
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: Direct Image URL / ImgBB */}
        {tab === 'url' && (
          <div className="space-y-3">
            <Field
              label="Direct Image Link (ImgBB, Cloudinary, Imgur, any web URL)"
              hint="Paste public image link ending with .jpg, .png, .webp or ImgBB direct link"
            >
              <div className="flex gap-2">
                <Input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://i.ibb.co/example/photo.jpg or https://..."
                  autoFocus
                />
                <button
                  className="btn-primary text-xs shrink-0"
                  onClick={() => {
                    if (!urlInput.trim()) return toast('Enter image URL first', 'err');
                    setSelectedImg(urlInput.trim());
                    clickSound();
                    toast('Image URL applied to preview');
                  }}
                >
                  <LinkIcon size={14} /> Test & Apply
                </button>
              </div>
            </Field>

            <div className="rounded-xl border border-line bg-surface2/40 p-3 text-xs text-ink3 space-y-1.5 leading-relaxed">
              <p className="font-bold text-ink flex items-center gap-1.5">
                <Sparkles size={13} className="text-brand" /> Tip: Free Image Hosting with ImgBB
              </p>
              <p>
                1. Open <a href="https://imgbb.com" target="_blank" rel="noreferrer" className="text-brand underline font-semibold">imgbb.com</a> in a new tab.
              </p>
              <p>2. Upload product photo and choose <b>'Direct links'</b>.</p>
              <p>3. Paste the direct URL here to load crisp product images everywhere!</p>
            </div>
          </div>
        )}

        {/* TAB 3: Curated Presets */}
        {tab === 'presets' && (
          <div className="space-y-4 max-h-[50dvh] overflow-y-auto pr-1">
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

        {/* TAB 4: Emoji / Icons Grid */}
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
