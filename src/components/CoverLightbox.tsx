import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

interface CoverLightboxProps {
  isOpen: boolean;
  imgSrc: string | null;
  postUrl: string;
  onClose: () => void;
}

export const CoverLightbox: React.FC<CoverLightboxProps> = ({ isOpen, imgSrc, postUrl, onClose }) => {
  const shouldReduceMotion = useReducedMotion();
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = '';
      return;
    }

    previousActiveElement.current = document.activeElement as HTMLElement;
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      previousActiveElement.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen || !imgSrc) return null;

  return createPortal(
    <AnimatePresence>
      <div 
        role="dialog"
        aria-modal="true"
        aria-label="Capa do reel"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
        style={{ paddingTop: 'var(--safe-top, 16px)', paddingBottom: 'var(--safe-bottom, 16px)' }}
        onClick={onClose}
      >
        <button
          ref={closeBtnRef}
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 z-50 flex items-center justify-center w-11 h-11 rounded-full bg-black/50 text-white hover:bg-black/80 transition focus:outline-none focus:ring-2 focus:ring-[#E1306C]"
        >
          <X size={24} />
        </button>

        <motion.div 
          className="relative flex flex-col items-center max-w-[90vw] max-h-[80vh]"
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={imgSrc}
            alt="Capa do reel em tamanho grande"
            className="rounded-2xl object-contain max-w-[90vw] max-h-[70vh] shadow-[0_25px_60px_-10px_rgba(0,0,0,0.8)] border border-white/10"
          />

          <a
            href={postUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E1306C] text-white text-xs font-semibold hover:bg-[#c8235c] transition focus:outline-none focus:ring-2 focus:ring-white"
          >
            Abrir no Instagram <ExternalLink size={14} />
          </a>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
