import { useState, useEffect, RefObject } from "react";

interface Options {
  ref:        RefObject<HTMLElement | null>;
  itemCount:  number;
  itemHeight: number;
  overscan?:  number;
}

interface VirtualScrollResult {
  start:   number;
  end:     number;
  totalH:  number;
  offsetY: number;
}

export function useVirtualScroll({
  ref, itemCount, itemHeight, overscan = 6,
}: Options): VirtualScrollResult {
  const [scrollTop, setScrollTop] = useState(0);
  const [viewHeight, setViewHeight] = useState(400);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ro = new ResizeObserver(() => setViewHeight(el.clientHeight));
    ro.observe(el);
    const onScroll = () => setScrollTop(el.scrollTop);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => { ro.disconnect(); el.removeEventListener("scroll", onScroll); };
  }, [ref]);

  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const end   = Math.min(itemCount - 1, Math.ceil((scrollTop + viewHeight) / itemHeight) + overscan);

  return { start, end, totalH: itemCount * itemHeight, offsetY: start * itemHeight };
}
