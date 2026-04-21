'use client'

import { useState } from 'react';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';

interface CollateralCarouselProps {
  items: string[];
}

export function CollateralCarousel({ items }: CollateralCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!items || items.length === 0) return null;

  const next = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  const prev = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-400" />
          Referenced Collateral
        </h3>
        <div className="text-xs text-zinc-500">
          {currentIndex + 1} of {items.length}
        </div>
      </div>
      
      <div className="relative overflow-hidden rounded-lg bg-zinc-950 p-4 min-h-[100px] flex items-center justify-center border border-zinc-800/50">
        <div className="text-center transition-all duration-300 px-8 w-full">
          <p className="text-sm text-zinc-300 font-medium truncate" title={items[currentIndex]}>
            {items[currentIndex]}
          </p>
          <p className="text-xs text-zinc-500 mt-2">Injected as Social Proof / Specs</p>
        </div>

        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
