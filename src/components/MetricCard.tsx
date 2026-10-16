import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, useReducedMotion, useMotionTemplate, useMotionValue } from 'framer-motion';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

export const MOCK_CLIQUES_LINK_BIO = 278;

interface MetricCardProps {
  title: string;
  value: string;
  variation: string | null;
  isPositive: boolean | null;
  icon: LucideIcon;
  isMock?: boolean;
  sparklineData?: any[];
  index: number;
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, variation, isPositive, icon: Icon, isMock, sparklineData, index }) => {
  const shouldReduceMotion = useReducedMotion();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: any) {
    let { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <motion.div 
      className="bg-[#121212] border border-[#262626] p-3 sm:p-6 rounded-[12px] relative overflow-hidden group"
      initial={{ opacity: 0, y: 30, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.08, duration: 0.6, type: 'spring', damping: 18 }}
      whileHover={{ y: -6, scale: 1.02 }}
      onMouseMove={handleMouseMove}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-[12px] opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
            background: useMotionTemplate`radial-gradient(150px circle at ${mouseX}px ${mouseY}px, rgba(225, 48, 108, 0.15), transparent 80%)`,
        }}
      />

      {/* Large background watermark icon */}
      <div className="absolute right-2 bottom-2 pointer-events-none opacity-[0.08] group-hover:opacity-[0.18] transition-all duration-300">
        <motion.div
          whileHover={!shouldReduceMotion ? { scale: 1.15, rotate: 5 } : {}}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <Icon className="w-16 h-16 sm:w-24 sm:h-24 text-white" />
        </motion.div>
      </div>

      <div className="flex items-center gap-2 mb-2 relative z-10">
        <motion.div 
            className={cn("p-1.5 rounded-full bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]", !shouldReduceMotion && "animate-spin-slow")}
            whileHover={!shouldReduceMotion ? { scale: 1.1 } : {}}
        >
          <Icon className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
        </motion.div>
        <h3 className="text-gray-400 text-[9px] sm:text-xs font-bold uppercase tracking-wider">{title}</h3>
      </div>
      <div className="text-xl sm:text-3xl font-bold text-white mb-1 relative z-10">{value}</div>
      <div className="flex items-center text-sm relative z-10">
        {variation ? (
          <motion.span 
              className={cn("font-medium flex items-center", isPositive ? "text-green-500" : "text-red-500")}
              animate={!shouldReduceMotion ? { y: [0, -3, 0] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
          >
            {isPositive ? '▲' : '▼'} {variation}
          </motion.span>
        ) : (
          <span className="text-gray-500">—</span>
        )}
        {isMock && <span className="ml-2 text-[10px] bg-gray-800 text-gray-400 px-1 rounded">dados de exemplo</span>}
      </div>
      {sparklineData && sparklineData.length >= 2 && (
        <div className="absolute bottom-2 right-2 w-[70px] h-[28px] z-10">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineData}>
                    <Line type="monotone" dataKey="value" stroke="#E1306C" strokeWidth={2} dot={false} isAnimationActive={!shouldReduceMotion} />
                </LineChart>
            </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
};
