import React, { useMemo } from 'react';
import { InstagramPost } from '../utils/dataParser';
import { ReelThumb } from './ReelThumb';
import { cn } from '@/lib/utils';
import { motion, useReducedMotion } from 'framer-motion';

interface TopReelsProps {
  posts: InstagramPost[];
  period: string;
  darkMode?: boolean;
}

const AnimatedNumber = ({ value, format = 'number' }: { value: number, format?: 'number' | 'percent' }) => {
    return <span>{format === 'percent' ? value.toFixed(2).replace('.', ',') + '%' : value.toLocaleString('pt-BR')}</span>;
};

export const TopReels: React.FC<TopReelsProps> = ({ posts, period, darkMode = true }) => {
  const shouldReduceMotion = useReducedMotion();
  const topReels = useMemo(() => {
    return [...posts]
      .sort((a, b) => b.engajamentoNum - a.engajamentoNum || b.data.getTime() - a.data.getTime())
      .slice(0, 3);
  }, [posts]);

  if (topReels.length === 0) return <div className="text-gray-500 text-center py-10">Nenhum reel neste período</div>;

  const getMedalStyles = (index: number) => {
    switch (index) {
        case 0: return { border: 'border-[#FBBF24]', shadow: 'shadow-[0_0_15px_rgba(251,191,36,0.3)]', bg: 'bg-[#FBBF24]', text: 'text-black', glow: 'shadow-[0_0_20px_rgba(251,191,36,0.5)]' };
        case 1: return { border: 'border-[#D1D5DB]', shadow: 'shadow-[0_0_15px_rgba(209,213,219,0.3)]', bg: 'bg-[#D1D5DB]', text: 'text-black', glow: '' };
        case 2: return { border: 'border-[#CD7F4F]', shadow: 'shadow-[0_0_15px_rgba(205,127,79,0.3)]', bg: 'bg-[#CD7F4F]', text: 'text-black', glow: '' };
        default: return { border: 'border-transparent', shadow: '', bg: '', text: '', glow: '' };
    }
  };

  const maxTaxa = topReels[0].engajamentoNum;

  return (
    <div className="mb-10">
      <span className="text-[#E1306C] text-xs font-bold tracking-[0.2em]">RANKING</span>
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-2 mb-6">
          <h2 className={cn("text-2xl font-bold", darkMode ? "text-white" : "text-gray-900")}>Top Reels por taxa de engajamento</h2>
          <span className="text-xs text-gray-500">Engajamento total ÷ alcance · {period}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {topReels.map((post, index) => {
            const styles = getMedalStyles(index);
            const progress = (maxTaxa > 0) ? (post.engajamentoNum / maxTaxa) * 100 : 0;
            
            return (
                <motion.a 
                    key={`${post.post}-${period}`}
                    href={post.post} 
                    target="_blank" 
                    rel="noreferrer" 
                    className={cn("p-4 rounded-[12px] border border-solid block group transition-colors duration-300", darkMode ? "bg-[#121212]" : "bg-white shadow-sm", styles.border, styles.shadow)}
                    initial={{ opacity: 0, y: 40, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: index * 0.15, duration: 0.6, type: 'spring', damping: 18 }}
                    whileHover={{ y: -6, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <div className="flex justify-between items-start mb-3">
                        <motion.div 
                            className={cn("w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px]", styles.bg, styles.text)}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', delay: index * 0.15 + 0.3 }}
                        >{index + 1}</motion.div>
                        <span className={cn("text-lg font-bold", styles.border.replace('border', 'text'))}><AnimatedNumber value={post.realEngajamento} format="percent" /></span>
                    </div>
                    <div className="flex gap-3 mb-3">
                        <div className="group-hover:scale-105 transition-transform duration-250 shrink-0">
                            <ReelThumb url={post.post} width="48px" height="85px" />
                        </div>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 flex-1">
                            <div><div className="text-[8px] text-gray-400 uppercase">Alcance</div><div className={cn("font-bold text-xs", darkMode ? "text-white" : "text-gray-900")}><AnimatedNumber value={post.alcance} /></div></div>
                            <div><div className="text-[8px] text-gray-400 uppercase">Curtidas</div><div className={cn("font-bold text-xs", darkMode ? "text-white" : "text-gray-900")}><AnimatedNumber value={post.likes} /></div></div>
                            <div><div className="text-[8px] text-gray-400 uppercase">Coment.</div><div className={cn("font-bold text-xs", darkMode ? "text-white" : "text-gray-900")}><AnimatedNumber value={post.comentarios} /></div></div>
                            <div><div className="text-[8px] text-gray-400 uppercase">Compart.</div><div className={cn("font-bold text-xs", darkMode ? "text-white" : "text-gray-900")}><AnimatedNumber value={post.compartilhamento} /></div></div>
                        </div>
                    </div>
                    <div className="h-1 w-full bg-[#262626] rounded-full overflow-hidden">
                        <motion.div 
                            className={cn("h-full rounded-full relative", styles.bg)} 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 1.2, ease: "easeOut", delay: index * 0.15 + 0.4 }}
                        >
                            {!shouldReduceMotion && <motion.div className="absolute inset-0 bg-white/20" animate={{ x: ['-100%', '100%'] }} transition={{ repeat: Infinity, duration: 3, ease: "linear" }} />}
                        </motion.div>
                    </div>
                </motion.a>
            );
        })}
      </div>
    </div>
  );
};
