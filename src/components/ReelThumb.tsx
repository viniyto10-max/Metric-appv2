import React, { useState, useEffect } from 'react';
import { Film } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { IMAGE_PROXY_URL } from '../constants';

interface ReelThumbProps {
  url: string;
  width?: string;
  height?: string;
}

const cache = new Map<string, Promise<string>>();
const queue: (() => void)[] = [];
let activeRequests = 0;
const MAX_CONCURRENT = 3;

const processQueue = () => {
    if (activeRequests < MAX_CONCURRENT && queue.length > 0) {
        const task = queue.shift();
        if (task) {
            activeRequests++;
            task();
        }
    }
};

export const ReelThumb: React.FC<ReelThumbProps> = ({ url, width = '48px', height = '85px' }) => {
  const cleanUrl = (url || '').trim().replace(/&amp;/g, '&');
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    if (!cleanUrl) {
      setError(true);
      return;
    }

    const fetchImage = async (retries = 1): Promise<string> => {
      try {
        const response = await fetch(`${IMAGE_PROXY_URL}?url=${encodeURIComponent(cleanUrl)}`, { method: "GET", redirect: "follow" });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const rawText = await response.text();
        let json;
        try {
            json = JSON.parse(rawText);
        } catch (e) {
            console.error("Proxy raw response (not JSON):", rawText);
            throw new Error('Not JSON');
        }

        if (!json.type?.startsWith('image/') || !json.data) {
            console.error("Proxy JSON missing expected fields:", json);
            throw new Error('Invalid response format');
        }
        
        return `data:${json.type};base64,${json.data}`;
      } catch (err) {
        if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 1500));
            return fetchImage(retries - 1);
        }
        console.warn(`Image unavailable (expired/404): ${cleanUrl.substring(0, 100)}`);
        throw err;
      }
    };

    const load = async () => {
        if (!cache.has(cleanUrl)) {
            const promise = new Promise<string>((resolve, reject) => {
                queue.push(async () => {
                    try {
                        const result = await fetchImage();
                        resolve(result);
                    } catch (e) {
                        reject(e);
                    } finally {
                        activeRequests--;
                        processQueue();
                    }
                });
                processQueue();
            });
            cache.set(cleanUrl, promise);
        }

        try {
            const src = await cache.get(cleanUrl)!;
            if (!cancelled) setImgSrc(src);
        } catch {
            // Remove a falha do cache para tentar de novo quando voltar a ter internet
            cache.delete(cleanUrl);
            if (!cancelled) setError(true);
        }
    };

    let cancelled = false;
    setError(false);
    load();
    return () => { cancelled = true; };
  }, [cleanUrl]);

  return (
    <div style={{ width, height }} className="rounded-[8px] overflow-hidden relative bg-[#1A1A1A]">
      <div className="absolute inset-0 flex items-center justify-center animate-pulse bg-[#262626]">
        <Film className="w-6 h-6 text-gray-600" />
      </div>
      <AnimatePresence>
        {!error && imgSrc && (
          <motion.img
            key={imgSrc}
            src={imgSrc}
            alt="Reel"
            draggable={false}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setError(true)}
            decoding="async"
          />
        )}
      </AnimatePresence>
    </div>
  );
};
