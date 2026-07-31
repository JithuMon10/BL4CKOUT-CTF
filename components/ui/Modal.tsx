'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  maxWidth?: string;
}

export default function Modal({ open, onClose, children, title, maxWidth = 'max-w-2xl' }: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEsc);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = originalOverflow;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const modalContent = (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[99999] overflow-y-auto bg-black/80 backdrop-blur-sm animate-overlay flex items-center justify-center p-4 sm:p-6"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Modal dialog'}
    >
      {/* Content Container */}
      <div
        ref={contentRef}
        className={`relative ${maxWidth} w-full bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-slide-up z-10 text-left max-h-[85vh] my-auto`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between z-20 shrink-0">
          <h2 className="text-base font-semibold text-zinc-100">{title || ''}</h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-zinc-200">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
