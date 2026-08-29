import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Dependency-free windowed list/grid — renders only what's on screen.
 *  Handles 50,000+ rows at 60fps. */
export function VirtualList<T>({
  items, rowHeight, render, overscan = 6, className = '', gap = 0, columns = 1, height,
}: {
  items: T[];
  rowHeight: number;
  render: (item: T, index: number) => ReactNode;
  overscan?: number;
  className?: string;
  gap?: number;
  columns?: number;
  height?: number | string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewport, setViewport] = useState(800);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => setScrollTop(el.scrollTop);
    el.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(() => setViewport(el.clientHeight || 800));
    ro.observe(el);
    setViewport(el.clientHeight || 800);
    return () => { el.removeEventListener('scroll', onScroll); ro.disconnect(); };
  }, []);

  const stride = rowHeight + gap;
  const rowCount = Math.ceil(items.length / columns);
  const total = rowCount * stride;
  const first = Math.max(0, Math.floor(scrollTop / stride) - overscan);
  const visibleRows = Math.ceil(viewport / stride) + overscan * 2;
  const last = Math.min(rowCount, first + visibleRows);

  const slices: ReactNode[] = [];
  for (let r = first; r < last; r++) {
    const rowItems: ReactNode[] = [];
    for (let c = 0; c < columns; c++) {
      const i = r * columns + c;
      if (i >= items.length) break;
      rowItems.push(
        <div key={i} style={{ minWidth: 0, height: '100%', overflow: 'hidden' }}>
          {render(items[i], i)}
        </div>,
      );
    }
    slices.push(
      <div
        key={r}
        style={{
          position: 'absolute',
          top: r * stride,
          left: 0,
          right: 0,
          height: rowHeight,
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))`,
          gap,
        }}
      >
        {rowItems}
      </div>,
    );
  }

  return (
    <div ref={ref} className={'no-scrollbar overflow-y-auto ' + className} style={{ height: height ?? '100%' }}>
      <div style={{ height: total, position: 'relative' }}>{slices}</div>
    </div>
  );
}
