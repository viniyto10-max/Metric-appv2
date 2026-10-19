import React, { useState, useEffect } from 'react';
import { Film } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CoverLightbox } from './CoverLightbox';
import { fetchCoverBase64, getCachedCover, normalizePostUrl } from '../utils/coverLoader';

interface ReelThumbProps {
  url: string;
  width?: string;
  height?: string;
}

export const ReelThumb: React.FC<ReelThumbProps> = ({ url, width = '48px', height = '85px' }) => {
  const cleanUrl = normalizePostUrl(url);
  const [imgSrc, setImgSrc] = useState<string | null>(() => getCachedCover(cleanUrl));
  const [error, setError] = useState<boolean>(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!cleanUrl) {
      setError(true);
      return;
    }

    const cached = getCachedCover(cleanUrl);
    if (cached) {
      setImgSrc(cached);
      return;
    }

    let isMounted = true;
    fetchCoverBase64(cleanUrl)
      .then((src) => {
        if (!isMounted) return;
        if (src) {
          setImgSrc(src);
        } else {
          setError(true);
        }
      })
      .catch(() => {
        if (isMounted) setError(true);
      });

    return () => {
      isMounted = false;
    };
  }, [cleanUrl]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (imgSrc && !error) {
      setIsLightboxOpen(true);
    }
  };

  return (
    <>
      <div 
        style={{ width, height }} 
        className="rounded-[8px] overflow-hidden relative bg-[#1A1A1A] cursor-pointer hover:scale-[1.03] transition-transform duration-200"
        onClick={handleClick}
      >
        <div className={`absolute inset-0 flex items-center justify-center bg-[#262626] ${(!error && !imgSrc) ? 'animate-pulse' : ''}`}>
          <Film className="w-6 h-6 text-gray-600" />
        </div>
        <AnimatePresence>
          {!error && imgSrc && (
            <motion.img
              key={imgSrc}
              src={imgSrc}
              alt="Reel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 w-full h-full object-cover"
              onError={() => setError(true)}
              decoding="async"
            />
          )}
        </AnimatePresence>
      </div>

      <CoverLightbox
        isOpen={isLightboxOpen}
        imgSrc={imgSrc}
        postUrl={cleanUrl}
        onClose={() => setIsLightboxOpen(false)}
      />
    </>
  );
};
