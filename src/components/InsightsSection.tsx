import React, { useMemo } from 'react';
import { InstagramPost } from '../utils/dataParser';
import { ReelThumb } from './ReelThumb';
import { cn } from '@/lib/utils';
import { motion, useReducedMotion } from 'framer-motion';
import { 
  Sparkles, Calendar, TrendingUp, TrendingDown, Eye, 
  MessageSquare, ExternalLink, FileText, Activity, AlertTriangle, CheckCircle2 
} from 'lucide-react';

interface InsightsSectionProps {
  posts: InstagramPost[];
  allPosts: InstagramPost[];
  period: string;
  customStart?: string;
  customEnd?: string;
  darkMode?: boolean;
}

export const InsightsSection: React.FC<InsightsSectionProps> = ({ posts, allPosts, period, customStart, customEnd, darkMode = true }) => {
  const shouldReduceMotion = useReducedMotion();

  const prevPosts = useMemo(() => {
    if (period === 'tudo') return [];
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    if (period === '7') {
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(endDate.getDate() - 7);
      const pEnd = new Date(startDate);
      const pStart = new Date(startDate);
      pStart.setDate(pEnd.getDate() - 7);
      return allPosts.filter(p => p.data >= pStart && p.data < pEnd);
    } else if (period === '30') {
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(endDate.getDate() - 30);
      const pEnd = new Date(startDate);
      const pStart = new Date(startDate);
      pStart.setDate(pEnd.getDate() - 30);
      return allPosts.filter(p => p.data >= pStart && p.data < pEnd);
    } else if (period === '90') {
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(endDate.getDate() - 90);
      const pEnd = new Date(startDate);
      const pStart = new Date(startDate);
      pStart.setDate(pEnd.getDate() - 90);
      return allPosts.filter(p => p.data >= pStart && p.data < pEnd);
    } else if (period === 'ano') {
      const year = now.getFullYear();
      startDate = new Date(year, 0, 1);
      const pStart = new Date(year - 1, 0, 1);
      const pEnd = new Date(year - 1, 11, 31, 23, 59, 59);
      return allPosts.filter(p => p.data >= pStart && p.data <= pEnd);
    } else if (period === 'custom' && customStart && customEnd) {
      const start = new Date(customStart);
      const end = new Date(customEnd);
      const durationMs = end.getTime() - start.getTime();
      const pEnd = new Date(start.getTime() - 1);
      const pStart = new Date(pEnd.getTime() - durationMs);
      return allPosts.filter(p => p.data >= pStart && p.data <= pEnd);
    }
    return [];
  }, [allPosts, period, customStart, customEnd]);

  const insightsData = useMemo(() => {
    if (posts.length === 0) return null;

    const totalPosts = posts.length;
    const geralAvgEng = totalPosts ? posts.reduce((acc, p) => acc + p.engajamentoNum, 0) / totalPosts : 0;
    const geralAvgAlcance = totalPosts ? posts.reduce((acc, p) => acc + p.alcance, 0) / totalPosts : 0;

    const daysMap = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const daysStats: Record<number, { totalEng: number, count: number }> = {};
    posts.forEach(p => {
      const day = p.data.getDay();
      if (!daysStats[day]) daysStats[day] = { totalEng: 0, count: 0 };
      daysStats[day].totalEng += p.engajamentoNum;
      daysStats[day].count += 1;
    });

    type BestDayItem = { dayName: string; avg: number; diff?: number };
    let bestDayEng: BestDayItem | null = null;
    for (const dStr of Object.keys(daysStats)) {
      const day = parseInt(dStr, 10);
      const stat = daysStats[day];
      if (stat.count >= 2) {
        const avg = stat.totalEng / stat.count;
        const diff = geralAvgEng > 0 ? ((avg - geralAvgEng) / geralAvgEng) * 100 : 0;
        if (!bestDayEng || avg > bestDayEng.avg) {
          bestDayEng = { dayName: daysMap[day], avg, diff };
        }
      }
    }

    const daysAlcanceStats: Record<number, { totalAlc: number, count: number }> = {};
    posts.forEach(p => {
      const day = p.data.getDay();
      if (!daysAlcanceStats[day]) daysAlcanceStats[day] = { totalAlc: 0, count: 0 };
      daysAlcanceStats[day].totalAlc += p.alcance;
      daysAlcanceStats[day].count += 1;
    });

    let bestDayAlc: BestDayItem | null = null;
    for (const dStr of Object.keys(daysAlcanceStats)) {
      const day = parseInt(dStr, 10);
      const stat = daysAlcanceStats[day];
      if (stat.count >= 2) {
        const avg = stat.totalAlc / stat.count;
        if (!bestDayAlc || avg > bestDayAlc.avg) {
          bestDayAlc = { dayName: daysMap[day], avg };
        }
      }
    }

    const prevTotalPosts = prevPosts.length;
    const prevAvgAlcance = prevTotalPosts ? prevPosts.reduce((acc, p) => acc + p.alcance, 0) / prevTotalPosts : null;
    const alcanceVar = prevAvgAlcance !== null && prevAvgAlcance > 0 
      ? ((geralAvgAlcance - prevAvgAlcance) / prevAvgAlcance) * 100 
      : null;

    const sortedByDate = [...posts].sort((a, b) => a.data.getTime() - b.data.getTime());
    let tendencia = { status: 'Estável', pct: 0 };
    if (sortedByDate.length >= 2) {
      const mid = Math.floor(sortedByDate.length / 2);
      const olderHalf = sortedByDate.slice(0, mid);
      const recentHalf = sortedByDate.slice(mid);
      const olderAvg = olderHalf.reduce((acc, p) => acc + p.engajamentoNum, 0) / olderHalf.length;
      const recentAvg = recentHalf.reduce((acc, p) => acc + p.engajamentoNum, 0) / recentHalf.length;
      const diffPct = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;
      if (diffPct > 5) tendencia = { status: 'Em alta', pct: diffPct };
      else if (diffPct < -5) tendencia = { status: 'Em queda', pct: Math.abs(diffPct) };
      else tendencia = { status: 'Estável', pct: diffPct };
    }

    const topReel = [...posts].sort((a, b) => b.engajamentoNum - a.engajamentoNum)[0];
    const multiple = geralAvgEng > 0 ? (topReel.engajamentoNum / geralAvgEng).toFixed(1) : '1.0';

    const normalizeText = (t: string) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const withLink = posts.filter(p => {
      const norm = normalizeText(p.legenda || '');
      return norm.includes('link na bio') || norm.includes('link da bio');
    });
    const withoutLink = posts.filter(p => {
      const norm = normalizeText(p.legenda || '');
      return !norm.includes('link na bio') && !norm.includes('link da bio');
    });

    let bioEffect: { text: string, valid: boolean } = { text: 'Dados insuficientes', valid: false };
    if (withLink.length >= 3 && withoutLink.length >= 3) {
      const withAvg = withLink.reduce((acc, p) => acc + p.engajamentoNum, 0) / withLink.length;
      const withoutAvg = withoutLink.reduce((acc, p) => acc + p.engajamentoNum, 0) / withoutLink.length;
      const diffBio = withoutAvg > 0 ? Math.abs(((withAvg - withoutAvg) / withoutAvg) * 100) : 0;
      const direction = withAvg >= withoutAvg ? 'mais' : 'menos';
      bioEffect = {
        text: `Reels com chamada para o link na bio engajam ${diffBio.toFixed(1).replace('.', ',')}% ${direction} que os demais.`,
        valid: true
      };
    }

    const lengths = posts.map(p => (p.legenda || '').length).sort((a, b) => a - b);
    const medianLen = lengths[Math.floor(lengths.length / 2)] || 0;
    const shortLeg = posts.filter(p => (p.legenda || '').length <= medianLen);
    const longLeg = posts.filter(p => (p.legenda || '').length > medianLen);
    let legResult = 'Dados insuficientes';
    if (shortLeg.length >= 2 && longLeg.length >= 2) {
      const shortAvg = shortLeg.reduce((acc, p) => acc + p.engajamentoNum, 0) / shortLeg.length;
      const longAvg = longLeg.reduce((acc, p) => acc + p.engajamentoNum, 0) / longLeg.length;
      legResult = shortAvg >= longAvg ? 'Legendas curtas melhores' : 'Legendas longas melhores';
    }

    const firstDate = sortedByDate[0].data;
    const lastDate = sortedByDate[sortedByDate.length - 1].data;
    const diffDays = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
    const weeks = Math.max(1, diffDays / 7);
    const postsPerWeek = totalPosts / weeks;

    const prevAvgEng = prevTotalPosts ? prevPosts.reduce((acc, p) => acc + p.engajamentoNum, 0) / prevTotalPosts : null;
    const dropAlcance = alcanceVar !== null && alcanceVar < -20;

    return {
      totalPosts,
      bestDayEng,
      bestDayAlc,
      geralAvgAlcance,
      alcanceVar,
      tendencia,
      topReel,
      multiple,
      bioEffect,
      legResult,
      postsPerWeek,
      dropAlcance,
      hasPrev: prevTotalPosts > 0
    };
  }, [posts, prevPosts]);

  if (!insightsData) return null;

  if (insightsData.totalPosts < 5) {
    return (
      <div className={cn("mb-10 border rounded-[16px] p-8 text-center transition-colors", darkMode ? "bg-[#121212] border-[#262626] text-white" : "bg-white border-gray-200 text-gray-900 shadow-sm")}>
        <h3 className={cn("text-xl font-bold mb-2", darkMode ? "text-white" : "text-gray-900")}>Insights Automatizados</h3>
        <p className={darkMode ? "text-gray-400" : "text-gray-600"}>Poucos reels no período para gerar insights confiáveis (mínimo de 5).</p>
      </div>
    );
  }

  return (
    <div className="mb-10">
      <span className="text-[#E1306C] text-xs font-bold tracking-[0.2em]">INSIGHTS</span>
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-2 mb-6">
        <div>
          <h2 className={cn("text-2xl font-bold", darkMode ? "text-white" : "text-gray-900")}>Insights Automatizados</h2>
          <p className="text-xs text-gray-500 mt-1">Período ativo: {period} · {insightsData.totalPosts} reels analisados</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-6">
        {/* Card 1: Melhor dia da semana */}
        <motion.div 
          className={cn("border p-3 sm:p-6 rounded-[12px] hover:border-[#E1306C] transition-all duration-300", darkMode ? "bg-[#121212] border-[#262626]" : "bg-white border-gray-200 shadow-sm")}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-full bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]">
              <Calendar className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
            </div>
            <h3 className={cn("text-[9px] sm:text-xs font-bold uppercase tracking-wider", darkMode ? "text-gray-400" : "text-gray-500")}>Melhor Dia</h3>
          </div>
          <div className={cn("text-lg sm:text-2xl font-bold mb-1", darkMode ? "text-white" : "text-gray-900")}>
            {insightsData.bestDayEng ? insightsData.bestDayEng.dayName : 'Dados insuf.'}
          </div>
          <p className={cn("text-[9px] sm:text-xs", darkMode ? "text-gray-400" : "text-gray-600")}>
            {insightsData.bestDayEng 
              ? `Média ${insightsData.bestDayEng.avg.toFixed(2).replace('.', ',')}% engaj.`
              : 'Mínimo de 2 reels por dia necessário.'}
          </p>
        </motion.div>

        {/* Card 2: Dia com maior alcance médio */}
        <motion.div 
          className={cn("border p-3 sm:p-6 rounded-[12px] hover:border-[#E1306C] transition-all duration-300", darkMode ? "bg-[#121212] border-[#262626]" : "bg-white border-gray-200 shadow-sm")}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-full bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]">
              <Eye className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
            </div>
            <h3 className={cn("text-[9px] sm:text-xs font-bold uppercase tracking-wider", darkMode ? "text-gray-400" : "text-gray-500")}>Maior Alcance</h3>
          </div>
          <div className={cn("text-lg sm:text-2xl font-bold mb-1", darkMode ? "text-white" : "text-gray-900")}>
            {insightsData.bestDayAlc ? insightsData.bestDayAlc.dayName : 'Dados insuf.'}
          </div>
          <p className={cn("text-[9px] sm:text-xs", darkMode ? "text-gray-400" : "text-gray-600")}>
            {insightsData.bestDayAlc
              ? `Média de ${Math.round(insightsData.bestDayAlc.avg).toLocaleString('pt-BR')} alcance/post.`
              : 'Dados insuficientes.'}
          </p>
        </motion.div>

        {/* Card 3: Alcance médio por post */}
        <motion.div 
          className={cn("border p-3 sm:p-6 rounded-[12px] hover:border-[#E1306C] transition-all duration-300", darkMode ? "bg-[#121212] border-[#262626]" : "bg-white border-gray-200 shadow-sm")}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-full bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]">
              <Activity className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
            </div>
            <h3 className={cn("text-[9px] sm:text-xs font-bold uppercase tracking-wider", darkMode ? "text-gray-400" : "text-gray-500")}>Alcance Médio</h3>
          </div>
          <div className={cn("text-xl sm:text-3xl font-bold mb-1", darkMode ? "text-white" : "text-gray-900")}>
            {Math.round(insightsData.geralAvgAlcance).toLocaleString('pt-BR')}
          </div>
          <div className="flex items-center text-[9px] sm:text-sm">
            {insightsData.alcanceVar !== null ? (
              <span className={cn("font-medium flex items-center", insightsData.alcanceVar >= 0 ? "text-green-500" : "text-red-500")}>
                {insightsData.alcanceVar >= 0 ? '▲' : '▼'} {Math.abs(insightsData.alcanceVar).toFixed(1).replace('.', ',')}%
              </span>
            ) : (
              <span className="text-gray-500">Sem comparação</span>
            )}
          </div>
        </motion.div>

        {/* Card 4: Tendência de engajamento */}
        <motion.div 
          className={cn("border p-3 sm:p-6 rounded-[12px] hover:border-[#E1306C] transition-all duration-300", darkMode ? "bg-[#121212] border-[#262626]" : "bg-white border-gray-200 shadow-sm")}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-full bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]">
              {insightsData.tendencia.status === 'Em alta' ? <TrendingUp className="w-3 h-3 sm:w-5 sm:h-5 text-white" /> : <TrendingDown className="w-3 h-3 sm:w-5 sm:h-5 text-white" />}
            </div>
            <h3 className={cn("text-[9px] sm:text-xs font-bold uppercase tracking-wider", darkMode ? "text-gray-400" : "text-gray-500")}>Tendência</h3>
          </div>
          <div className={cn("text-xl sm:text-3xl font-bold mb-1", darkMode ? "text-white" : "text-gray-900")}>
            {insightsData.tendencia.status}
          </div>
          <p className={cn("text-[9px] sm:text-xs", darkMode ? "text-gray-400" : "text-gray-600")}>
            {insightsData.tendencia.pct.toFixed(1).replace('.', ',')}% vs. período anterior
          </p>
        </motion.div>

        {/* Card 5: Reel destaque */}
        <motion.div 
          className={cn("border p-3 sm:p-6 rounded-[12px] hover:border-[#E1306C] transition-all duration-300 flex flex-col", darkMode ? "bg-[#121212] border-[#262626]" : "bg-white border-gray-200 shadow-sm")}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-full bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]">
              <Sparkles className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
            </div>
            <h3 className={cn("text-[9px] sm:text-xs font-bold uppercase tracking-wider", darkMode ? "text-gray-400" : "text-gray-500")}>Reel Destaque</h3>
          </div>
          <div className="flex gap-2 items-center">
            <ReelThumb url={insightsData.topReel.post} width="32px" height="57px" />
            <div className="flex-1">
              <div className={cn("text-sm sm:text-xl font-bold", darkMode ? "text-white" : "text-gray-900")}>{insightsData.topReel.realEngajamento.toFixed(2).replace('.', ',')}%</div>
              <div className="text-[9px] text-[#E1306C] font-semibold">{insightsData.multiple}x a média</div>
            </div>
          </div>
        </motion.div>

        {/* Card 6: Efeito link na bio */}
        <motion.div 
          className={cn("border p-3 sm:p-6 rounded-[12px] hover:border-[#E1306C] transition-all duration-300", darkMode ? "bg-[#121212] border-[#262626]" : "bg-white border-gray-200 shadow-sm")}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-full bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]">
              <ExternalLink className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
            </div>
            <h3 className={cn("text-[9px] sm:text-xs font-bold uppercase tracking-wider", darkMode ? "text-gray-400" : "text-gray-500")}>Link na Bio</h3>
          </div>
          <div className={cn("text-sm font-bold mb-1", darkMode ? "text-white" : "text-gray-900")}>
            {insightsData.bioEffect.valid ? 'Análise Concluída' : 'Dados insuficientes'}
          </div>
          <p className={cn("text-[9px] sm:text-xs", darkMode ? "text-gray-400" : "text-gray-600")}>
            {insightsData.bioEffect.text}
          </p>
        </motion.div>

        {/* Card 7: Tamanho da legenda */}
        <motion.div 
          className={cn("border p-3 sm:p-6 rounded-[12px] hover:border-[#E1306C] transition-all duration-300", darkMode ? "bg-[#121212] border-[#262626]" : "bg-white border-gray-200 shadow-sm")}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-full bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]">
              <FileText className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
            </div>
            <h3 className={cn("text-[9px] sm:text-xs font-bold uppercase tracking-wider", darkMode ? "text-gray-400" : "text-gray-500")}>Legenda</h3>
          </div>
          <div className={cn("text-sm font-bold mb-1", darkMode ? "text-white" : "text-gray-900")}>
            {insightsData.legResult}
          </div>
          <p className={cn("text-[9px] sm:text-xs", darkMode ? "text-gray-400" : "text-gray-600")}>
            Comparação de performance por mediana de caracteres.
          </p>
        </motion.div>

        {/* Card 8: Frequência */}
        <motion.div 
          className={cn("border p-3 sm:p-6 rounded-[12px] hover:border-[#E1306C] transition-all duration-300", darkMode ? "bg-[#121212] border-[#262626]" : "bg-white border-gray-200 shadow-sm")}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-full bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]">
              <Activity className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
            </div>
            <h3 className={cn("text-[9px] sm:text-xs font-bold uppercase tracking-wider", darkMode ? "text-gray-400" : "text-gray-500")}>Frequência</h3>
          </div>
          <div className={cn("text-xl sm:text-3xl font-bold mb-1", darkMode ? "text-white" : "text-gray-900")}>
            {insightsData.postsPerWeek.toFixed(1).replace('.', ',')}
          </div>
          <p className={cn("text-[9px] sm:text-xs", darkMode ? "text-gray-400" : "text-gray-600")}>
            Posts por semana.
          </p>
        </motion.div>
      </div>

      {/* Card 9: Alerta de queda / estabilidade */}
      {period !== 'tudo' && (
        <motion.div 
          className={cn("mt-4 p-4 rounded-[12px] border transition-all duration-300", insightsData.dropAlcance ? (darkMode ? "bg-red-950/25 border-red-900/50" : "bg-red-50 border-red-200") : (darkMode ? "bg-[#121212] border-[#262626]" : "bg-white border-gray-200 shadow-sm"))}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={cn("p-1.5 rounded-full", insightsData.dropAlcance ? "bg-red-600" : "bg-green-600")}>
              {insightsData.dropAlcance ? <AlertTriangle className="w-4 h-4 text-white" /> : <CheckCircle2 className="w-4 h-4 text-white" />}
            </div>
            <h3 className={cn("text-xs font-bold uppercase tracking-wider", darkMode ? "text-gray-400" : "text-gray-500")}>Status de Desempenho</h3>
          </div>
          <div className={cn("text-lg font-bold mb-1", darkMode ? "text-white" : "text-gray-900")}>
            {insightsData.dropAlcance ? 'Alerta de Queda' : 'Tudo estável'}
          </div>
          <p className={cn("text-xs", darkMode ? "text-gray-400" : "text-gray-600")}>
            {insightsData.dropAlcance 
              ? 'O alcance médio por post caiu mais de 20% em comparação ao período anterior.' 
              : 'Nenhuma queda expressiva de alcance detectada em relação ao período anterior.'}
          </p>
        </motion.div>
      )}
    </div>
  );
};
