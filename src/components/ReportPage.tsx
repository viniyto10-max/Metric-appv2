import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { InstagramPost, getPostType } from '../utils/dataParser';
import { ReelThumb } from './ReelThumb';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { downloadReportPDF } from '../utils/pdfGenerator';
import { preloadAllCovers, getCachedCover } from '../utils/coverLoader';
import { 
  calculateComparisonDateRanges, 
  isDateInRange, 
  formatDateRange,
  formatDateRangeSimple 
} from '../utils/dateRanges';
import { 
  FileDown, 
  Download,
  Loader2,
  Calendar, 
  TrendingUp, 
  Users, 
  Heart, 
  MessageCircle, 
  Share2, 
  Percent, 
  Grid3X3, 
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  BarChart2,
  Film
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  BarChart, 
  Bar, 
  Cell 
} from 'recharts';

interface ReportPageProps {
  posts: InstagramPost[];
  seguidores: number;
  seguindo: number;
  darkMode: boolean;
}

export const ReportPage: React.FC<ReportPageProps> = ({
  posts,
  seguidores,
  seguindo,
  darkMode
}) => {
  const [period, setPeriod] = useState<'7' | '30' | '90' | 'ano' | 'tudo' | 'custom'>('30');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [postTypeFilter, setPostTypeFilter] = useState<'all' | 'video' | 'carrossel' | 'card_unico'>('all');
  const [rankSortBy, setRankSortBy] = useState<'engajamento' | 'alcance' | 'likes' | 'comentarios' | 'compartilhamentos'>('engajamento');
  const [rankingLimit, setRankingLimit] = useState<number>(10);

  // PDF Export and State
  const reportContainerRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);
  const [pdfProgress, setPdfProgress] = useState<string>('');
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [coverMap, setCoverMap] = useState<Map<string, string>>(new Map());

  // Exact date ranges: current and immediately prior without gap or overlap
  const dateRanges = useMemo(() => {
    return calculateComparisonDateRanges(period, customStart, customEnd);
  }, [period, customStart, customEnd]);

  // Filter current period
  const currentFiltered = useMemo(() => {
    let list = posts.filter(post => isDateInRange(post.data, dateRanges.current));
    if (postTypeFilter !== 'all') {
      list = list.filter(post => getPostType(post) === postTypeFilter);
    }
    return list;
  }, [posts, dateRanges.current, postTypeFilter]);

  // Filter previous period for comparative analysis (immediately anterior, identical duration, zero overlap)
  const previousFiltered = useMemo(() => {
    if (!dateRanges.previous) return [];
    let list = posts.filter(post => isDateInRange(post.data, dateRanges.previous));
    if (postTypeFilter !== 'all') {
      list = list.filter(post => getPostType(post) === postTypeFilter);
    }
    return list;
  }, [posts, dateRanges.previous, postTypeFilter]);

  // Aggregate stats with both percentage and absolute differences
  const stats = useMemo(() => {
    const calc = (list: InstagramPost[]) => {
      const totalAlcance = list.reduce((acc, p) => acc + p.alcance, 0);
      const totalLikes = list.reduce((acc, p) => acc + p.likes, 0);
      const totalComentarios = list.reduce((acc, p) => acc + p.comentarios, 0);
      const totalCompartilhamentos = list.reduce((acc, p) => acc + p.compartilhamento, 0);
      const totalEngajamento = list.reduce((acc, p) => acc + p.engajamentoTotal, 0);
      const taxaMedia = totalAlcance > 0 ? (totalEngajamento / totalAlcance) * 100 : 0;
      const count = list.length;
      const alcanceMedio = count > 0 ? totalAlcance / count : 0;
      return {
        alcance: totalAlcance,
        likes: totalLikes,
        comentarios: totalComentarios,
        compartilhamentos: totalCompartilhamentos,
        engajamentoTotal: totalEngajamento,
        taxaMedia,
        count,
        alcanceMedio
      };
    };

    const current = calc(currentFiltered);
    const prev = calc(previousFiltered);

    const getDiff = (curr: number, past: number) => {
      if (!previousFiltered.length || past === 0) return null;
      return ((curr - past) / past) * 100;
    };

    const getAbsDiff = (curr: number, past: number) => {
      if (!previousFiltered.length) return null;
      return curr - past;
    };

    return {
      current,
      prev,
      diffs: {
        alcance: getDiff(current.alcance, prev.alcance),
        likes: getDiff(current.likes, prev.likes),
        comentarios: getDiff(current.comentarios, prev.comentarios),
        compartilhamentos: getDiff(current.compartilhamentos, prev.compartilhamentos),
        engajamentoTotal: getDiff(current.engajamentoTotal, prev.engajamentoTotal),
        taxaMedia: getDiff(current.taxaMedia, prev.taxaMedia),
        count: getDiff(current.count, prev.count),
        alcanceMedio: getDiff(current.alcanceMedio, prev.alcanceMedio)
      },
      absDiffs: {
        alcance: getAbsDiff(current.alcance, prev.alcance),
        likes: getAbsDiff(current.likes, prev.likes),
        comentarios: getAbsDiff(current.comentarios, prev.comentarios),
        compartilhamentos: getAbsDiff(current.compartilhamentos, prev.compartilhamentos),
        engajamentoTotal: getAbsDiff(current.engajamentoTotal, prev.engajamentoTotal),
        taxaMedia: getAbsDiff(current.taxaMedia, prev.taxaMedia),
        count: getAbsDiff(current.count, prev.count),
        alcanceMedio: getAbsDiff(current.alcanceMedio, prev.alcanceMedio)
      }
    };
  }, [currentFiltered, previousFiltered]);

  // Continuous daily chart data covering EVERY calendar day in the selected period
  const chartData = useMemo(() => {
    if (dateRanges.current) {
      const dailyMap = new Map<string, {
        date: Date;
        dateLabel: string;
        alcance: number;
        engajamentoTotal: number;
        likes: number;
        comentarios: number;
        compartilhamentos: number;
      }>();

      const cursor = new Date(dateRanges.current.start);
      const end = new Date(dateRanges.current.end);
      cursor.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      while (cursor <= end) {
        const dayKey = cursor.toLocaleDateString('pt-BR');
        const dayOfMonth = cursor.getDate().toString().padStart(2, '0');
        const monthNum = (cursor.getMonth() + 1).toString().padStart(2, '0');
        const dateLabel = `${dayOfMonth}/${monthNum}`;

        dailyMap.set(dayKey, {
          date: new Date(cursor),
          dateLabel,
          alcance: 0,
          engajamentoTotal: 0,
          likes: 0,
          comentarios: 0,
          compartilhamentos: 0
        });

        cursor.setDate(cursor.getDate() + 1);
      }

      currentFiltered.forEach(curr => {
        const key = curr.data.toLocaleDateString('pt-BR');
        const item = dailyMap.get(key);
        if (item) {
          item.alcance += curr.alcance;
          item.engajamentoTotal += curr.engajamentoTotal;
          item.likes += curr.likes;
          item.comentarios += curr.comentarios;
          item.compartilhamentos += curr.compartilhamento;
        }
      });

      return Array.from(dailyMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
    }

    // Fallback for 'tudo' (all history)
    const grouped = currentFiltered.reduce((acc, curr) => {
      const dateKey = curr.data.toLocaleDateString('pt-BR');
      const dayOfMonth = curr.data.getDate().toString().padStart(2, '0');
      const monthNum = (curr.data.getMonth() + 1).toString().padStart(2, '0');
      const dateLabel = `${dayOfMonth}/${monthNum}`;

      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: curr.data,
          dateLabel,
          alcance: 0,
          engajamentoTotal: 0,
          likes: 0,
          comentarios: 0,
          compartilhamentos: 0
        };
      }
      acc[dateKey].alcance += curr.alcance;
      acc[dateKey].engajamentoTotal += curr.engajamentoTotal;
      acc[dateKey].likes += curr.likes;
      acc[dateKey].comentarios += curr.comentarios;
      acc[dateKey].compartilhamentos += curr.compartilhamento;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped).sort((a: any, b: any) => a.date.getTime() - b.date.getTime());
  }, [currentFiltered, dateRanges.current]);

  // Content type breakdown - always contains all 3 formats with designated colors
  const typeBreakdown = useMemo(() => {
    const types: Record<string, { count: number, alcance: number, engajamento: number }> = {
      video: { count: 0, alcance: 0, engajamento: 0 },
      carrossel: { count: 0, alcance: 0, engajamento: 0 },
      card_unico: { count: 0, alcance: 0, engajamento: 0 }
    };
    const prevTypes: Record<string, { count: number, alcance: number, engajamento: number }> = {
      video: { count: 0, alcance: 0, engajamento: 0 },
      carrossel: { count: 0, alcance: 0, engajamento: 0 },
      card_unico: { count: 0, alcance: 0, engajamento: 0 }
    };

    currentFiltered.forEach(p => {
      const t = getPostType(p);
      if (types[t]) {
        types[t].count += 1;
        types[t].alcance += p.alcance;
        types[t].engajamento += p.engajamentoTotal;
      }
    });

    previousFiltered.forEach(p => {
      const t = getPostType(p);
      if (prevTypes[t]) {
        prevTypes[t].count += 1;
        prevTypes[t].alcance += p.alcance;
        prevTypes[t].engajamento += p.engajamentoTotal;
      }
    });

    return [
      { 
        name: 'Vídeos / Reels', 
        key: 'video', 
        fill: '#DD2A7B',
        ...types.video, 
        avgTaxa: types.video.alcance ? (types.video.engajamento / types.video.alcance) * 100 : 0,
        prevAvgTaxa: prevTypes.video.alcance ? (prevTypes.video.engajamento / prevTypes.video.alcance) * 100 : 0,
        prevCount: prevTypes.video.count
      },
      { 
        name: 'Carrossel', 
        key: 'carrossel', 
        fill: '#8134AF',
        ...types.carrossel, 
        avgTaxa: types.carrossel.alcance ? (types.carrossel.engajamento / types.carrossel.alcance) * 100 : 0,
        prevAvgTaxa: prevTypes.carrossel.alcance ? (prevTypes.carrossel.engajamento / prevTypes.carrossel.alcance) * 100 : 0,
        prevCount: prevTypes.carrossel.count
      },
      { 
        name: 'Card Único', 
        key: 'card_unico', 
        fill: '#F58529',
        ...types.card_unico, 
        avgTaxa: types.card_unico.alcance ? (types.card_unico.engajamento / types.card_unico.alcance) * 100 : 0,
        prevAvgTaxa: prevTypes.card_unico.alcance ? (prevTypes.card_unico.engajamento / prevTypes.card_unico.alcance) * 100 : 0,
        prevCount: prevTypes.card_unico.count
      },
    ];
  }, [currentFiltered, previousFiltered]);

  // Ranking sorted
  const rankedPosts = useMemo(() => {
    const sorted = [...currentFiltered].sort((a, b) => {
      if (rankSortBy === 'engajamento') return b.realEngajamento - a.realEngajamento;
      if (rankSortBy === 'alcance') return b.alcance - a.alcance;
      if (rankSortBy === 'likes') return b.likes - a.likes;
      if (rankSortBy === 'comentarios') return b.comentarios - a.comentarios;
      if (rankSortBy === 'compartilhamentos') return b.compartilhamento - a.compartilhamento;
      return 0;
    });
    return sorted.slice(0, rankingLimit);
  }, [currentFiltered, rankSortBy, rankingLimit]);

  // Multi-page chunks for PDF export (up to 12 posts per page to prevent row truncation)
  const rankingPdfPages = useMemo(() => {
    if (rankedPosts.length === 0) return [[]];
    const pages: InstagramPost[][] = [];
    const chunkSize = 12;
    for (let i = 0; i < rankedPosts.length; i += chunkSize) {
      pages.push(rankedPosts.slice(i, i + chunkSize));
    }
    return pages;
  }, [rankedPosts]);

  // Human readable period names
  const periodNames: Record<string, string> = useMemo(() => ({
    '7': 'Últimos 7 dias',
    '30': 'Últimos 30 dias',
    '90': 'Últimos 90 dias',
    'ano': 'Este ano',
    'tudo': 'Histórico Completo',
    'custom': customStart && customEnd ? `${customStart} até ${customEnd}` : 'Personalizado'
  }), [customStart, customEnd]);

  // Preload covers in background for instant responsiveness
  useEffect(() => {
    const urls = rankedPosts.slice(0, 15).map(p => p.post);
    preloadAllCovers(urls).then((loaded) => {
      setCoverMap(prev => new Map([...prev, ...loaded]));
    }).catch(() => {});
  }, [rankedPosts]);

  // Export to Excel / CSV
  const handleExportCSV = useCallback(() => {
    const lines: string[] = [];
    const BOM = "\uFEFF";

    lines.push("RELATÓRIO DE DESEMPENHO - INSTAGRAM ANALYTICS");
    lines.push(`Gerado em:;${new Date().toLocaleString('pt-BR')}`);
    lines.push(`Período analisado:;${formatDateRange(dateRanges.current)}`);
    if (dateRanges.previous) {
      lines.push(`Período de comparação (imediatamente anterior):;${formatDateRange(dateRanges.previous)}`);
    }
    lines.push(`Seguidores:;${seguidores}`);
    lines.push(`Seguindo:;${seguindo}`);
    lines.push("");

    lines.push("RESUMO EXECUTIVO DE INDICADORES (KPIS)");
    lines.push("Métrica;Período Atual;Período Anterior;Diferença Absoluta;Variação %");
    lines.push(`Alcance Total;${stats.current.alcance};${stats.prev.alcance || '-'};${stats.absDiffs.alcance !== null ? stats.absDiffs.alcance : '-'};${stats.diffs.alcance !== null ? stats.diffs.alcance.toFixed(2).replace('.', ',') + '%' : '-'}`);
    lines.push(`Total de Curtidas;${stats.current.likes};${stats.prev.likes || '-'};${stats.absDiffs.likes !== null ? stats.absDiffs.likes : '-'};${stats.diffs.likes !== null ? stats.diffs.likes.toFixed(2).replace('.', ',') + '%' : '-'}`);
    lines.push(`Total de Comentários;${stats.current.comentarios};${stats.prev.comentarios || '-'};${stats.absDiffs.comentarios !== null ? stats.absDiffs.comentarios : '-'};${stats.diffs.comentarios !== null ? stats.diffs.comentarios.toFixed(2).replace('.', ',') + '%' : '-'}`);
    lines.push(`Total de Compartilhamentos;${stats.current.compartilhamentos};${stats.prev.compartilhamentos || '-'};${stats.absDiffs.compartilhamentos !== null ? stats.absDiffs.compartilhamentos : '-'};${stats.diffs.compartilhamentos !== null ? stats.diffs.compartilhamentos.toFixed(2).replace('.', ',') + '%' : '-'}`);
    lines.push(`Engajamento Total;${stats.current.engajamentoTotal};${stats.prev.engajamentoTotal || '-'};${stats.absDiffs.engajamentoTotal !== null ? stats.absDiffs.engajamentoTotal : '-'};${stats.diffs.engajamentoTotal !== null ? stats.diffs.engajamentoTotal.toFixed(2).replace('.', ',') + '%' : '-'}`);
    lines.push(`Taxa Média de Engajamento;${stats.current.taxaMedia.toFixed(2).replace('.', ',') + '%'};${stats.prev.taxaMedia ? stats.prev.taxaMedia.toFixed(2).replace('.', ',') + '%' : '-'};${stats.absDiffs.taxaMedia !== null ? stats.absDiffs.taxaMedia.toFixed(2).replace('.', ',') + ' p.p.' : '-'};${stats.diffs.taxaMedia !== null ? stats.diffs.taxaMedia.toFixed(2).replace('.', ',') + '%' : '-'}`);
    lines.push(`Publicações no Período;${stats.current.count};${stats.prev.count || '-'};${stats.absDiffs.count !== null ? stats.absDiffs.count : '-'};${stats.diffs.count !== null ? stats.diffs.count.toFixed(2).replace('.', ',') + '%' : '-'}`);
    lines.push(`Alcance Médio por Publicação;${Math.round(stats.current.alcanceMedio)};${Math.round(stats.prev.alcanceMedio) || '-'};${stats.absDiffs.alcanceMedio !== null ? Math.round(stats.absDiffs.alcanceMedio) : '-'};${stats.diffs.alcanceMedio !== null ? stats.diffs.alcanceMedio.toFixed(2).replace('.', ',') + '%' : '-'}`);
    lines.push("");

    lines.push("DETALHAMENTO DE PUBLICAÇÕES NO PERÍODO");
    lines.push("Posição;Link da Publicação;Data;Tipo;Alcance;Curtidas;Comentários;Compartilhamentos;Engajamento Total;Taxa de Engajamento %;Legenda");

    rankedPosts.forEach((p, idx) => {
      const typeLabel = getPostType(p) === 'video' ? 'Vídeo' : getPostType(p) === 'carrossel' ? 'Carrossel' : 'Card Único';
      const cleanLegenda = (p.legenda || '').replace(/[\r\n;]/g, ' ').substring(0, 150);
      lines.push(`${idx + 1};${p.post};${p.data.toLocaleDateString('pt-BR')};${typeLabel};${p.alcance};${p.likes};${p.comentarios};${p.compartilhamento};${p.engajamentoTotal};${p.realEngajamento.toFixed(2).replace('.', ',') + '%'};"${cleanLegenda}"`);
    });

    const csvContent = BOM + lines.join("\r\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_instagram_${period}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [dateRanges, seguidores, seguindo, stats, rankedPosts, period]);

  // Generate & Download PDF directly to PC / Mobile
  const handleDownloadPDF = useCallback(async () => {
    if (!reportContainerRef.current || isGeneratingPDF) return;
    try {
      setIsGeneratingPDF(true);
      setDownloadError(null);
      setDownloadSuccess(false);
      setPdfProgress('Preparando capas dos posts...');

      // Preload all ranking covers before capturing
      const urls = rankedPosts.map(p => p.post);
      const preloaded = await preloadAllCovers(urls, (cur, tot) => {
        setPdfProgress(`Preparando capas (${cur}/${tot})...`);
      });
      setCoverMap(prev => new Map([...prev, ...preloaded]));

      // Enable export mode DOM
      setIsExporting(true);
      setPdfProgress('Renderizando documento...');

      // Allow DOM & Recharts to settle with animation disabled
      await new Promise(resolve => setTimeout(resolve, 350));

      const periodLabel = formatDateRange(dateRanges.current);
      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `relatorio_instagram_${period}_${dateStr}.pdf`;

      await downloadReportPDF({
        element: reportContainerRef.current,
        fileName,
        darkMode,
        periodLabel,
        onProgress: (msg) => setPdfProgress(msg)
      });

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4500);
    } catch (err: any) {
      console.error('Erro na exportação para PDF:', err);
      setDownloadError(err?.message || 'Erro ao gerar PDF. Tente novamente.');
      setTimeout(() => setDownloadError(null), 6000);
    } finally {
      setIsGeneratingPDF(false);
      setIsExporting(false);
      setPdfProgress('');
    }
  }, [isGeneratingPDF, rankedPosts, dateRanges.current, period, darkMode]);

  // Fallback print
  const handlePrintFallback = useCallback(() => {
    window.print();
  }, []);

  const renderDiffBadge = (diff: number | null, absDiff: number | null = null, isRate = false) => {
    if (diff === null) {
      return (
        <span className={cn("text-[10px] font-medium whitespace-nowrap", darkMode ? "text-gray-500" : "text-gray-400")}>
          — s/ histórico
        </span>
      );
    }
    const isPositive = diff >= 0;
    return (
      <div className="inline-flex items-center gap-1 flex-nowrap shrink-0">
        <span className={cn(
          "inline-flex items-center gap-0.5 text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap",
          isPositive 
            ? (darkMode ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/50" : "bg-emerald-50 text-emerald-700 border border-emerald-200") 
            : (darkMode ? "bg-rose-950/40 text-rose-400 border border-rose-900/50" : "bg-rose-50 text-rose-700 border border-rose-200")
        )}>
          {isPositive ? <ArrowUpRight size={11} className="shrink-0" /> : <ArrowDownRight size={11} className="shrink-0" />}
          {isPositive ? '+' : ''}{diff.toFixed(1).replace('.', ',')}%
        </span>
        {absDiff !== null && (
          <span className={cn(
            "text-[9.5px] sm:text-[10px] font-semibold whitespace-nowrap",
            isPositive ? (darkMode ? "text-emerald-400" : "text-emerald-600") : (darkMode ? "text-rose-400" : "text-rose-600")
          )}>
            ({isPositive ? '+' : ''}{isRate ? absDiff.toFixed(2).replace('.', ',') + ' p.p.' : Math.round(absDiff).toLocaleString('pt-BR')})
          </span>
        )}
      </div>
    );
  };

  return (
    <div ref={reportContainerRef} className="space-y-8 print:p-0">
      {/* Error notification banner */}
      <AnimatePresence>
        {downloadError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3.5 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-400 text-xs flex items-center justify-between no-print"
          >
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-rose-500 shrink-0" />
              <span>{downloadError}</span>
            </div>
            <button
              onClick={handlePrintFallback}
              className="text-[11px] font-semibold underline hover:text-white"
            >
              Tentar imprimir pelo navegador
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 
        ========================================================================
        PDF EXPORT MODE (Active only during PDF generation for pixel-perfect A4)
        ========================================================================
      */}
      {isExporting ? (
        <div className="w-[960px] mx-auto text-left select-none overflow-visible">
          {/* PAGE 1: Header, KPIs and 3 Charts */}
          <div 
            className="pdf-page p-7 rounded-xl space-y-5"
            style={{ backgroundColor: darkMode ? '#0A0A0A' : '#F9FAFB' }}
          >
            {/* Header compact without empty space */}
            <div className={cn(
              "p-4 rounded-xl border flex items-center justify-between gap-4",
              darkMode ? "bg-[#121212] border-[#222222]" : "bg-white border-gray-200"
            )}>
              <div className="space-y-0.5">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-[#F58529]/15 via-[#DD2A7B]/15 to-[#8134AF]/15 text-[#DD2A7B] border border-[#DD2A7B]/20">
                  <Sparkles size={11} /> Relatório de Performance
                </div>
                <h1 className={cn("text-xl font-black tracking-tight", darkMode ? "text-white" : "text-gray-900")}>
                  Relatório Executivo de Performance
                </h1>
                <p className={cn("text-xs", darkMode ? "text-gray-400" : "text-gray-600")}>
                  Análise comparativa automatizada, evolução de alcance, engajamento e formatos.
                </p>
              </div>

              {/* Summary 4-box strip */}
              <div className="grid grid-cols-4 gap-2 text-[11px] shrink-0 border-l pl-4 border-inherit">
                <div>
                  <span className="text-[9px] uppercase font-bold text-gray-500 block">Período</span>
                  <span className="font-bold text-[#DD2A7B] block whitespace-nowrap">{formatDateRangeSimple(dateRanges.current)}</span>
                  <span className="text-[9px] text-gray-400">{dateRanges.current?.days || 0} dias</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-gray-500 block">Comparação</span>
                  <span className="font-bold block whitespace-nowrap">{dateRanges.previous ? formatDateRangeSimple(dateRanges.previous) : '— s/ histórico'}</span>
                  <span className="text-[9px] text-gray-400">Imediatamente anterior</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-gray-500 block">Seguidores</span>
                  <span className="font-bold block">{seguidores.toLocaleString('pt-BR')}</span>
                  <span className="text-[9px] text-gray-400">Seguindo: {seguindo.toLocaleString('pt-BR')}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-gray-500 block">Publicações</span>
                  <span className="font-bold block">{currentFiltered.length} posts</span>
                  <span className="text-[9px] text-gray-400">Anterior: {previousFiltered.length}</span>
                </div>
              </div>
            </div>

            {/* 8 KPIs Grid (4x2) */}
            <div className="grid grid-cols-4 gap-3">
              {/* Alcance Total */}
              <div className={cn("p-3 rounded-xl border", darkMode ? "bg-[#121212] border-[#222222]" : "bg-white border-gray-200")}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Alcance Total</span>
                  <Users size={14} className="text-[#DD2A7B]" />
                </div>
                <div className={cn("text-xl font-bold mb-1", darkMode ? "text-white" : "text-gray-900")}>
                  {stats.current.alcance.toLocaleString('pt-BR')}
                </div>
                <div className="flex items-center justify-between text-xs gap-1 min-w-0">
                  {renderDiffBadge(stats.diffs.alcance, stats.absDiffs.alcance)}
                  <span className="text-[9.5px] text-gray-400 whitespace-nowrap">Ant: {stats.prev.alcance.toLocaleString('pt-BR')}</span>
                </div>
              </div>

              {/* Taxa Média Engj. */}
              <div className={cn("p-3 rounded-xl border", darkMode ? "bg-[#121212] border-[#222222]" : "bg-white border-gray-200")}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Taxa Média Engj.</span>
                  <Percent size={14} className="text-amber-500" />
                </div>
                <div className={cn("text-xl font-bold mb-1", darkMode ? "text-white" : "text-gray-900")}>
                  {stats.current.taxaMedia.toFixed(2).replace('.', ',')}%
                </div>
                <div className="flex items-center justify-between text-xs gap-1 min-w-0">
                  {renderDiffBadge(stats.diffs.taxaMedia, stats.absDiffs.taxaMedia, true)}
                  <span className="text-[9.5px] text-gray-400 whitespace-nowrap">Ant: {stats.prev.taxaMedia ? stats.prev.taxaMedia.toFixed(2).replace('.', ',') + '%' : '—'}</span>
                </div>
              </div>

              {/* Curtidas */}
              <div className={cn("p-3 rounded-xl border", darkMode ? "bg-[#121212] border-[#222222]" : "bg-white border-gray-200")}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Curtidas</span>
                  <Heart size={14} className="text-rose-500" />
                </div>
                <div className={cn("text-xl font-bold mb-1", darkMode ? "text-white" : "text-gray-900")}>
                  {stats.current.likes.toLocaleString('pt-BR')}
                </div>
                <div className="flex items-center justify-between text-xs gap-1 min-w-0">
                  {renderDiffBadge(stats.diffs.likes, stats.absDiffs.likes)}
                  <span className="text-[9.5px] text-gray-400 whitespace-nowrap">Ant: {stats.prev.likes.toLocaleString('pt-BR')}</span>
                </div>
              </div>

              {/* Engajamento Total */}
              <div className={cn("p-3 rounded-xl border", darkMode ? "bg-[#121212] border-[#222222]" : "bg-white border-gray-200")}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Engaj. Total</span>
                  <TrendingUp size={14} className="text-indigo-500" />
                </div>
                <div className={cn("text-xl font-bold mb-1", darkMode ? "text-white" : "text-gray-900")}>
                  {stats.current.engajamentoTotal.toLocaleString('pt-BR')}
                </div>
                <div className="flex items-center justify-between text-xs gap-1 min-w-0">
                  {renderDiffBadge(stats.diffs.engajamentoTotal, stats.absDiffs.engajamentoTotal)}
                  <span className="text-[9.5px] text-gray-400 whitespace-nowrap">Ant: {stats.prev.engajamentoTotal.toLocaleString('pt-BR')}</span>
                </div>
              </div>

              {/* Comentários */}
              <div className={cn("p-3 rounded-xl border", darkMode ? "bg-[#121212] border-[#222222]" : "bg-white border-gray-200")}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Comentários</span>
                  <MessageCircle size={14} className="text-sky-500" />
                </div>
                <div className={cn("text-xl font-bold mb-1", darkMode ? "text-white" : "text-gray-900")}>
                  {stats.current.comentarios.toLocaleString('pt-BR')}
                </div>
                <div className="flex items-center justify-between text-xs gap-1 min-w-0">
                  {renderDiffBadge(stats.diffs.comentarios, stats.absDiffs.comentarios)}
                  <span className="text-[9.5px] text-gray-400 whitespace-nowrap">Ant: {stats.prev.comentarios.toLocaleString('pt-BR')}</span>
                </div>
              </div>

              {/* Compartilhamentos */}
              <div className={cn("p-3 rounded-xl border", darkMode ? "bg-[#121212] border-[#222222]" : "bg-white border-gray-200")}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Compartilhamentos</span>
                  <Share2 size={14} className="text-emerald-500" />
                </div>
                <div className={cn("text-xl font-bold mb-1", darkMode ? "text-white" : "text-gray-900")}>
                  {stats.current.compartilhamentos.toLocaleString('pt-BR')}
                </div>
                <div className="flex items-center justify-between text-xs gap-1 min-w-0">
                  {renderDiffBadge(stats.diffs.compartilhamentos, stats.absDiffs.compartilhamentos)}
                  <span className="text-[9.5px] text-gray-400 whitespace-nowrap">Ant: {stats.prev.compartilhamentos.toLocaleString('pt-BR')}</span>
                </div>
              </div>

              {/* Publicações */}
              <div className={cn("p-3 rounded-xl border", darkMode ? "bg-[#121212] border-[#222222]" : "bg-white border-gray-200")}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Publicações</span>
                  <Grid3X3 size={14} className="text-purple-500" />
                </div>
                <div className={cn("text-xl font-bold mb-1", darkMode ? "text-white" : "text-gray-900")}>
                  {stats.current.count}
                </div>
                <div className="flex items-center justify-between text-xs gap-1 min-w-0">
                  {renderDiffBadge(stats.diffs.count, stats.absDiffs.count)}
                  <span className="text-[9.5px] text-gray-400 whitespace-nowrap">Ant: {stats.prev.count}</span>
                </div>
              </div>

              {/* Alcance Médio / Post */}
              <div className={cn("p-3 rounded-xl border", darkMode ? "bg-[#121212] border-[#222222]" : "bg-white border-gray-200")}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Alcance Médio / Post</span>
                  <BarChart2 size={14} className="text-pink-500" />
                </div>
                <div className={cn("text-xl font-bold mb-1", darkMode ? "text-white" : "text-gray-900")}>
                  {Math.round(stats.current.alcanceMedio).toLocaleString('pt-BR')}
                </div>
                <div className="flex items-center justify-between text-xs gap-1 min-w-0">
                  {renderDiffBadge(stats.diffs.alcanceMedio, stats.absDiffs.alcanceMedio)}
                  <span className="text-[9.5px] text-gray-400 whitespace-nowrap">Ant: {Math.round(stats.prev.alcanceMedio).toLocaleString('pt-BR')}</span>
                </div>
              </div>
            </div>

            {/* 3 CHARTS SECTION */}
            <div className="grid grid-cols-2 gap-3.5">
              {/* Chart 1: Evolução Diária de Alcance */}
              <div className={cn("p-3.5 rounded-xl border", darkMode ? "bg-[#121212] border-[#222222]" : "bg-white border-gray-200")}>
                <div className="mb-2">
                  <h3 className={cn("text-xs font-bold uppercase tracking-wider", darkMode ? "text-gray-200" : "text-gray-800")}>
                    Evolução Diária de Alcance
                  </h3>
                  <p className="text-[10px] text-gray-400">Alcance em cada dia do período selecionado.</p>
                </div>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ left: -15, right: 10, top: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="pdfColorAlcance" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#DD2A7B" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#DD2A7B" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#262626" : "#E5E7EB"} />
                      <XAxis dataKey="dateLabel" stroke={darkMode ? "#888" : "#9CA3AF"} tick={{ fontSize: 9 }} />
                      <YAxis stroke={darkMode ? "#888" : "#9CA3AF"} tick={{ fontSize: 9 }} />
                      <Area isAnimationActive={false} type="monotone" dataKey="alcance" stroke="#DD2A7B" strokeWidth={2} fillOpacity={1} fill="url(#pdfColorAlcance)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Evolução Diária de Engajamento */}
              <div className={cn("p-3.5 rounded-xl border", darkMode ? "bg-[#121212] border-[#222222]" : "bg-white border-gray-200")}>
                <div className="mb-2">
                  <h3 className={cn("text-xs font-bold uppercase tracking-wider", darkMode ? "text-gray-200" : "text-gray-800")}>
                    Evolução Diária de Engajamento
                  </h3>
                  <p className="text-[10px] text-gray-400">Total de interações (curtidas, comentários, compartilhamentos).</p>
                </div>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ left: -15, right: 10, top: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="pdfColorEngajamento" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8134AF" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#8134AF" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#262626" : "#E5E7EB"} />
                      <XAxis dataKey="dateLabel" stroke={darkMode ? "#888" : "#9CA3AF"} tick={{ fontSize: 9 }} />
                      <YAxis stroke={darkMode ? "#888" : "#9CA3AF"} tick={{ fontSize: 9 }} />
                      <Area isAnimationActive={false} type="monotone" dataKey="engajamentoTotal" stroke="#8134AF" strokeWidth={2} fillOpacity={1} fill="url(#pdfColorEngajamento)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Chart 3: Performance por Formato de Post */}
            <div className={cn("p-3.5 rounded-xl border", darkMode ? "bg-[#121212] border-[#222222]" : "bg-white border-gray-200")}>
              <div className="mb-2">
                <h3 className={cn("text-xs font-bold uppercase tracking-wider", darkMode ? "text-gray-200" : "text-gray-800")}>
                  Performance por Formato de Post
                </h3>
                <p className="text-[10px] text-gray-400">Taxa média de engajamento por formato: Vídeos/Reels, Carrossel e Card Único.</p>
              </div>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={typeBreakdown} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#262626" : "#E5E7EB"} />
                    <XAxis dataKey="name" stroke={darkMode ? "#888" : "#9CA3AF"} tick={{ fontSize: 10 }} />
                    <YAxis stroke={darkMode ? "#888" : "#9CA3AF"} tick={{ fontSize: 9 }} unit="%" />
                    <Bar dataKey="avgTaxa" isAnimationActive={false} radius={[6, 6, 0, 0]}>
                      {typeBreakdown.map((entry) => (
                        <Cell key={`pdf-cell-${entry.key}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* PAGE 2+: Ranking Executivo de Publicações */}
          {rankingPdfPages.map((pagePosts, pageIdx) => (
            <div 
              key={`pdf-rank-page-${pageIdx}`}
              className="pdf-page p-7 rounded-xl space-y-4 mt-6"
              style={{ backgroundColor: darkMode ? '#0A0A0A' : '#F9FAFB' }}
            >
              <div className="flex items-center justify-between border-b pb-3 border-inherit">
                <div>
                  <h3 className={cn("text-base font-bold tracking-tight", darkMode ? "text-white" : "text-gray-900")}>
                    Ranking Executivo de Publicações {rankingPdfPages.length > 1 ? `(Parte ${pageIdx + 1} de ${rankingPdfPages.length})` : ''}
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Ordenado por {rankSortBy === 'engajamento' ? 'taxa de engajamento' : rankSortBy} no período ({pagePosts.length} itens)
                  </p>
                </div>
                <div className="text-[10px] uppercase font-bold text-gray-500">
                  {formatDateRangeSimple(dateRanges.current)}
                </div>
              </div>

              {pagePosts.length === 0 ? (
                <div className="text-center py-12 text-xs text-gray-400">
                  Nenhuma publicação no período selecionado.
                </div>
              ) : (
                <div className="w-full">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className={cn(
                        "border-b text-[10px] uppercase font-bold tracking-wider",
                        darkMode ? "border-[#262626] text-gray-400" : "border-gray-200 text-gray-500"
                      )}>
                        <th className="py-2 px-1 text-center w-7">#</th>
                        <th className="py-2 px-2 text-center w-14">Capa</th>
                        <th className="py-2 px-2 whitespace-nowrap">Data</th>
                        <th className="py-2 px-2">Tipo</th>
                        <th className="py-2 px-2 text-right whitespace-nowrap">Alcance</th>
                        <th className="py-2 px-2 text-right whitespace-nowrap">Curtidas</th>
                        <th className="py-2 px-2 text-right whitespace-nowrap">Coment.</th>
                        <th className="py-2 px-2 text-right whitespace-nowrap">Compart.</th>
                        <th className="py-2 px-2 text-right whitespace-nowrap">Engj. Total</th>
                        <th className="py-2 px-2 text-right whitespace-nowrap">Taxa Engj.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-inherit">
                      {pagePosts.map((post, idx) => {
                        const globalPos = pageIdx * 12 + idx + 1;
                        const type = getPostType(post);
                        const typeLabel = type === 'video' ? 'Vídeo' : type === 'carrossel' ? 'Carrossel' : 'Card';
                        const coverSrc = coverMap.get(post.post) || getCachedCover(post.post);

                        return (
                          <tr key={`pdf-row-${post.post}-${idx}`} className="break-inside-avoid">
                            <td className="py-2 px-1 font-bold text-center text-gray-500 text-[11px]">
                              {globalPos}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <div className="flex justify-center">
                                <div className="w-10 h-[72px] rounded-md overflow-hidden bg-[#1e1e1e] flex items-center justify-center border border-white/10 shrink-0 shadow-sm">
                                  {coverSrc ? (
                                    <img 
                                      src={coverSrc} 
                                      alt="Capa" 
                                      className="w-full h-full object-cover" 
                                      loading="eager"
                                      decoding="sync"
                                    />
                                  ) : (
                                    <Film className="w-5 h-5 text-gray-500" />
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-2 px-2 whitespace-nowrap text-gray-400 text-[11px]">
                              {post.data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </td>
                            <td className="py-2 px-2 whitespace-nowrap">
                              <span className={cn(
                                "inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-tight",
                                type === 'video' 
                                  ? "bg-purple-900/30 text-purple-400 border border-purple-800/40" 
                                  : type === 'carrossel' 
                                    ? "bg-blue-900/30 text-blue-400 border border-blue-800/40" 
                                    : "bg-amber-900/30 text-amber-400 border border-amber-800/40"
                              )}>
                                {typeLabel}
                              </span>
                            </td>
                            <td className={cn("py-2 px-2 text-right font-medium tabular-nums whitespace-nowrap", darkMode ? "text-gray-200" : "text-gray-800")}>
                              {post.alcance.toLocaleString('pt-BR')}
                            </td>
                            <td className={cn("py-2 px-2 text-right font-medium tabular-nums whitespace-nowrap", darkMode ? "text-gray-200" : "text-gray-800")}>
                              {post.likes.toLocaleString('pt-BR')}
                            </td>
                            <td className={cn("py-2 px-2 text-right font-medium tabular-nums whitespace-nowrap", darkMode ? "text-gray-200" : "text-gray-800")}>
                              {post.comentarios.toLocaleString('pt-BR')}
                            </td>
                            <td className={cn("py-2 px-2 text-right font-medium tabular-nums whitespace-nowrap", darkMode ? "text-gray-200" : "text-gray-800")}>
                              {post.compartilhamento.toLocaleString('pt-BR')}
                            </td>
                            <td className={cn("py-2 px-2 text-right font-bold tabular-nums whitespace-nowrap", darkMode ? "text-white" : "text-gray-900")}>
                              {post.engajamentoTotal.toLocaleString('pt-BR')}
                            </td>
                            <td className="py-2 px-2 text-right tabular-nums whitespace-nowrap">
                              <span className="font-extrabold text-[#DD2A7B]">
                                {post.realEngajamento.toFixed(2).replace('.', ',')}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* 
          ========================================================================
          INTERACTIVE NORMAL VIEW (Standard UI for Desktop and Mobile Browsing)
          ========================================================================
        */
        <>
          {/* Report Header Card */}
          <div className={cn(
            "p-5 sm:p-6 rounded-2xl border transition-colors shadow-sm",
            darkMode ? "bg-[#121212] border-[#222222]" : "bg-white border-gray-200"
          )}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-[#F58529]/15 via-[#DD2A7B]/15 to-[#8134AF]/15 text-[#DD2A7B] border border-[#DD2A7B]/20">
                  <Sparkles size={13} /> Relatório de Performance
                </div>
                <h1 className={cn("text-2xl sm:text-3xl font-extrabold tracking-tight", darkMode ? "text-white" : "text-gray-900")}>
                  Gerador de Relatórios Executivos
                </h1>
                <p className={cn("text-xs sm:text-sm", darkMode ? "text-gray-400" : "text-gray-600")}>
                  Análise comparativa automatizada, evolução diária e exportação completa em PDF para PC e celular.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 no-print">
                <button
                  onClick={handleExportCSV}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all duration-200 shadow-sm hover:scale-[1.02] active:scale-[0.98]",
                    darkMode 
                      ? "bg-[#181818] border-[#333333] text-gray-200 hover:bg-[#222222] hover:text-white" 
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                  )}
                  title="Baixar planilha compatível com Excel e CSV"
                >
                  <FileDown size={15} className="text-emerald-500" />
                  <span>Exportar Excel / CSV</span>
                </button>

                <button
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPDF}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white transition-all duration-200 shadow-md hover:scale-[1.02] active:scale-[0.98]",
                    isGeneratingPDF
                      ? "bg-gradient-to-r from-[#8134AF] to-[#DD2A7B] opacity-80 cursor-wait"
                      : downloadSuccess
                        ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30"
                        : "bg-gradient-to-r from-[#DD2A7B] to-[#8134AF] hover:opacity-95 shadow-[#DD2A7B]/25"
                  )}
                  title="Gerar e baixar o relatório completo em PDF"
                >
                  {isGeneratingPDF ? (
                    <>
                      <Loader2 size={15} className="animate-spin shrink-0" />
                      <span>{pdfProgress || 'Gerando PDF...'}</span>
                    </>
                  ) : downloadSuccess ? (
                    <>
                      <CheckCircle2 size={15} className="shrink-0" />
                      <span>PDF Baixado com Sucesso!</span>
                    </>
                  ) : (
                    <>
                      <Download size={15} className="shrink-0" />
                      <span>Baixar Relatório em PDF</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Executive summary info strip */}
            <div className={cn(
              "grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t text-xs",
              darkMode ? "border-[#222222] text-gray-300" : "border-gray-100 text-gray-700"
            )}>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-500 block">Período Analisado</span>
                <span className="font-semibold text-[#DD2A7B] block">{formatDateRangeSimple(dateRanges.current)}</span>
                <span className="text-[10px] text-gray-400">({periodNames[period] || period}{dateRanges.current ? ` • ${dateRanges.current.days} dias` : ''})</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-500 block">Período de Comparação</span>
                <span className="font-semibold block">
                  {dateRanges.previous ? formatDateRangeSimple(dateRanges.previous) : '— s/ histórico'}
                </span>
                <span className="text-[10px] text-gray-400">
                  {dateRanges.previous ? `(Imediatamente anterior • ${dateRanges.previous.days} dias)` : 'Histórico completo'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-500 block">Seguidores da Conta</span>
                <span className="font-semibold block">{seguidores.toLocaleString('pt-BR')}</span>
                <span className="text-[10px] text-gray-400">Seguindo: {seguindo.toLocaleString('pt-BR')}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-500 block">Posts no Período</span>
                <span className="font-semibold block">{currentFiltered.length} posts</span>
                <span className="text-[10px] text-gray-400">Período anterior: {previousFiltered.length} posts</span>
              </div>
            </div>

            {/* Filter controls */}
            <div className="mt-5 pt-5 border-t border-inherit space-y-4 no-print">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Period buttons */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={cn("text-[10px] uppercase font-bold tracking-wider mr-1", darkMode ? "text-gray-400" : "text-gray-500")}>
                    Período:
                  </span>
                  {[
                    { label: '7 dias', val: '7' },
                    { label: '30 dias', val: '30' },
                    { label: '90 dias', val: '90' },
                    { label: 'Este ano', val: 'ano' },
                    { label: 'Histórico Completo', val: 'tudo' },
                    { label: 'Personalizado', val: 'custom' },
                  ].map(p => (
                    <button
                      key={p.val}
                      onClick={() => setPeriod(p.val as any)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                        period === p.val
                          ? "bg-gradient-to-r from-[#DD2A7B] to-[#8134AF] text-white border-transparent shadow-sm"
                          : darkMode
                            ? "bg-[#181818] border-[#262626] text-gray-400 hover:text-white hover:bg-[#202020]"
                            : "bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200"
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Post type filters */}
                <div className="flex items-center gap-1.5">
                  <span className={cn("text-[10px] uppercase font-bold tracking-wider mr-1", darkMode ? "text-gray-400" : "text-gray-500")}>
                    Tipo:
                  </span>
                  {[
                    { label: 'Todos', val: 'all' },
                    { label: 'Vídeo', val: 'video' },
                    { label: 'Carrossel', val: 'carrossel' },
                    { label: 'Card', val: 'card_unico' },
                  ].map(t => (
                    <button
                      key={t.val}
                      onClick={() => setPostTypeFilter(t.val as any)}
                      className={cn(
                        "px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                        postTypeFilter === t.val
                          ? "bg-[#E1306C] text-white border-transparent"
                          : darkMode
                            ? "bg-[#181818] border-[#262626] text-gray-400 hover:text-white"
                            : "bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Date Inputs if selected */}
              {period === 'custom' && (
                <div className={cn("flex flex-wrap items-center gap-3 p-3 rounded-xl border text-xs", darkMode ? "bg-[#161616] border-[#2a2a2a]" : "bg-gray-50 border-gray-200")}>
                  <span className="font-semibold text-gray-400 flex items-center gap-1.5">
                    <Calendar size={14} /> Intervalo personalizado:
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className={cn("px-2.5 py-1.5 rounded-lg border", darkMode ? "bg-[#121212] border-[#333] text-white" : "bg-white border-gray-300 text-gray-900")}
                    />
                    <span className="text-gray-400">até</span>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className={cn("px-2.5 py-1.5 rounded-lg border", darkMode ? "bg-[#121212] border-[#333] text-white" : "bg-white border-gray-300 text-gray-900")}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* KPI Comparative Cards */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h2 className={cn("text-lg font-bold tracking-tight", darkMode ? "text-white" : "text-gray-900")}>
                  Desempenho Geral vs. Período Anterior
                </h2>
                <div className={cn("text-xs flex flex-wrap items-center gap-1.5 mt-1", darkMode ? "text-gray-400" : "text-gray-600")}>
                  <span>Período Atual: <strong className={darkMode ? "text-white" : "text-gray-900"}>{formatDateRange(dateRanges.current)}</strong></span>
                  {dateRanges.previous && (
                    <>
                      <span className="text-gray-500">•</span>
                      <span>Período de Comparação: <strong className="text-[#DD2A7B] font-semibold">{formatDateRange(dateRanges.previous)}</strong></span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {/* Alcance Total */}
              <div className={cn("p-4 rounded-xl border transition-colors", darkMode ? "bg-[#121212] border-[#222222]" : "bg-white border-gray-200 shadow-sm")}>
                <div className="flex items-center justify-between mb-2">
                  <span className={cn("text-[10px] font-bold uppercase tracking-wider", darkMode ? "text-gray-400" : "text-gray-500")}>Alcance Total</span>
                  <Users size={16} className="text-[#DD2A7B]" />
                </div>
                <div className={cn("text-xl sm:text-2xl font-bold mb-1.5", darkMode ? "text-white" : "text-gray-900")}>
                  {stats.current.alcance.toLocaleString('pt-BR')}
                </div>
                <div className="flex items-center justify-between text-xs gap-1 min-w-0">
                  {renderDiffBadge(stats.diffs.alcance, stats.absDiffs.alcance)}
                  <span className={cn("text-[10px] whitespace-nowrap shrink-0", darkMode ? "text-gray-500" : "text-gray-400")}>
                    Ant: {stats.prev.alcance.toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>

              {/* Taxa Média */}
              <div className={cn("p-4 rounded-xl border transition-colors", darkMode ? "bg-[#121212] border-[#222222]" : "bg-white border-gray-200 shadow-sm")}>
                <div className="flex items-center justify-between mb-2">
                  <span className={cn("text-[10px] font-bold uppercase tracking-wider", darkMode ? "text-gray-400" : "text-gray-500")}>Taxa Média Engj.</span>
                  <Percent size={16} className="text-amber-500" />
                </div>
                <div className={cn("text-xl sm:text-2xl font-bold mb-1.5", darkMode ? "text-white" : "text-gray-900")}>
                  {stats.current.taxaMedia.toFixed(2).replace('.', ',')}%
                </div>
                <div className="flex items-center justify-between text-xs gap-1 min-w-0">
                  {renderDiffBadge(stats.diffs.taxaMedia, stats.absDiffs.taxaMedia, true)}
                  <span className={cn("text-[10px] whitespace-nowrap shrink-0", darkMode ? "text-gray-500" : "text-gray-400")}>
                    Ant: {stats.prev.taxaMedia ? stats.prev.taxaMedia.toFixed(2).replace('.', ',') + '%' : '—'}
                  </span>
                </div>
              </div>

              {/* Curtidas */}
              <div className={cn("p-4 rounded-xl border transition-colors", darkMode ? "bg-[#121212] border-[#222222]" : "bg-white border-gray-200 shadow-sm")}>
                <div className="flex items-center justify-between mb-2">
                  <span className={cn("text-[10px] font-bold uppercase tracking-wider", darkMode ? "text-gray-400" : "text-gray-500")}>Curtidas</span>
                  <Heart size={16} className="text-rose-500" />
                </div>
                <div className={cn("text-xl sm:text-2xl font-bold mb-1.5", darkMode ? "text-white" : "text-gray-900")}>
                  {stats.current.likes.toLocaleString('pt-BR')}
                </div>
                <div className="flex items-center justify-between text-xs gap-1 min-w-0">
                  {renderDiffBadge(stats.diffs.likes, stats.absDiffs.likes)}
                  <span className={cn("text-[10px] whitespace-nowrap shrink-0", darkMode ? "text-gray-500" : "text-gray-400")}>
                    Ant: {stats.prev.likes.toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>

              {/* Engajamento Total */}
              <div className={cn("p-4 rounded-xl border transition-colors", darkMode ? "bg-[#121212] border-[#222222]" : "bg-white border-gray-200 shadow-sm")}>
                <div className="flex items-center justify-between mb-2">
                  <span className={cn("text-[10px] font-bold uppercase tracking-wider", darkMode ? "text-gray-400" : "text-gray-500")}>Engaj. Total</span>
                  <TrendingUp size={16} className="text-indigo-500" />
                </div>
                <div className={cn("text-xl sm:text-2xl font-bold mb-1.5", darkMode ? "text-white" : "text-gray-900")}>
                  {stats.current.engajamentoTotal.toLocaleString('pt-BR')}
                </div>
                <div className="flex items-center justify-between text-xs gap-1 min-w-0">
                  {renderDiffBadge(stats.diffs.engajamentoTotal, stats.absDiffs.engajamentoTotal)}
                  <span className={cn("text-[10px] whitespace-nowrap shrink-0", darkMode ? "text-gray-500" : "text-gray-400")}>
                    Ant: {stats.prev.engajamentoTotal.toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>

              {/* Comentários */}
              <div className={cn("p-4 rounded-xl border transition-colors", darkMode ? "bg-[#121212] border-[#222222]" : "bg-white border-gray-200 shadow-sm")}>
                <div className="flex items-center justify-between mb-2">
                  <span className={cn("text-[10px] font-bold uppercase tracking-wider", darkMode ? "text-gray-400" : "text-gray-500")}>Comentários</span>
                  <MessageCircle size={16} className="text-sky-500" />
                </div>
                <div className={cn("text-xl sm:text-2xl font-bold mb-1.5", darkMode ? "text-white" : "text-gray-900")}>
                  {stats.current.comentarios.toLocaleString('pt-BR')}
                </div>
                <div className="flex items-center justify-between text-xs gap-1 min-w-0">
                  {renderDiffBadge(stats.diffs.comentarios, stats.absDiffs.comentarios)}
                  <span className={cn("text-[10px] whitespace-nowrap shrink-0", darkMode ? "text-gray-500" : "text-gray-400")}>
                    Ant: {stats.prev.comentarios.toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>

              {/* Compartilhamentos */}
              <div className={cn("p-4 rounded-xl border transition-colors", darkMode ? "bg-[#121212] border-[#222222]" : "bg-white border-gray-200 shadow-sm")}>
                <div className="flex items-center justify-between mb-2">
                  <span className={cn("text-[10px] font-bold uppercase tracking-wider", darkMode ? "text-gray-400" : "text-gray-500")}>Compartilhamentos</span>
                  <Share2 size={16} className="text-emerald-500" />
                </div>
                <div className={cn("text-xl sm:text-2xl font-bold mb-1.5", darkMode ? "text-white" : "text-gray-900")}>
                  {stats.current.compartilhamentos.toLocaleString('pt-BR')}
                </div>
                <div className="flex items-center justify-between text-xs gap-1 min-w-0">
                  {renderDiffBadge(stats.diffs.compartilhamentos, stats.absDiffs.compartilhamentos)}
                  <span className={cn("text-[10px] whitespace-nowrap shrink-0", darkMode ? "text-gray-500" : "text-gray-400")}>
                    Ant: {stats.prev.compartilhamentos.toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>

              {/* Total de Posts */}
              <div className={cn("p-4 rounded-xl border transition-colors", darkMode ? "bg-[#121212] border-[#222222]" : "bg-white border-gray-200 shadow-sm")}>
                <div className="flex items-center justify-between mb-2">
                  <span className={cn("text-[10px] font-bold uppercase tracking-wider", darkMode ? "text-gray-400" : "text-gray-500")}>Publicações</span>
                  <Grid3X3 size={16} className="text-purple-500" />
                </div>
                <div className={cn("text-xl sm:text-2xl font-bold mb-1.5", darkMode ? "text-white" : "text-gray-900")}>
                  {stats.current.count}
                </div>
                <div className="flex items-center justify-between text-xs gap-1 min-w-0">
                  {renderDiffBadge(stats.diffs.count, stats.absDiffs.count)}
                  <span className={cn("text-[10px] whitespace-nowrap shrink-0", darkMode ? "text-gray-500" : "text-gray-400")}>
                    Ant: {stats.prev.count}
                  </span>
                </div>
              </div>

              {/* Média de Alcance por Post */}
              <div className={cn("p-4 rounded-xl border transition-colors", darkMode ? "bg-[#121212] border-[#222222]" : "bg-white border-gray-200 shadow-sm")}>
                <div className="flex items-center justify-between mb-2">
                  <span className={cn("text-[10px] font-bold uppercase tracking-wider", darkMode ? "text-gray-400" : "text-gray-500")}>Alcance Médio / Post</span>
                  <BarChart2 size={16} className="text-pink-500" />
                </div>
                <div className={cn("text-xl sm:text-2xl font-bold mb-1.5", darkMode ? "text-white" : "text-gray-900")}>
                  {Math.round(stats.current.alcanceMedio).toLocaleString('pt-BR')}
                </div>
                <div className="flex items-center justify-between text-xs gap-1 min-w-0">
                  {renderDiffBadge(stats.diffs.alcanceMedio, stats.absDiffs.alcanceMedio)}
                  <span className={cn("text-[10px] whitespace-nowrap shrink-0", darkMode ? "text-gray-500" : "text-gray-400")}>
                    Ant: {Math.round(stats.prev.alcanceMedio).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3 Charts Interactive Section */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 1: Evolução Diária de Alcance */}
              <div className={cn("p-5 rounded-2xl border transition-colors", darkMode ? "bg-[#121212] border-[#222222]" : "bg-white border-gray-200 shadow-sm")}>
                <div className="mb-4">
                  <h3 className={cn("text-sm font-bold uppercase tracking-wider", darkMode ? "text-gray-300" : "text-gray-700")}>
                    Evolução Diária de Alcance
                  </h3>
                  <p className={cn("text-xs", darkMode ? "text-gray-500" : "text-gray-400")}>
                    Oscilação do alcance ao longo dos dias do período selecionado.
                  </p>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ left: -15, right: 10, top: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorAlcance" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#DD2A7B" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#DD2A7B" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#262626" : "#E5E7EB"} />
                      <XAxis dataKey="dateLabel" stroke={darkMode ? "#888" : "#9CA3AF"} tick={{ fontSize: 10 }} />
                      <YAxis stroke={darkMode ? "#888" : "#9CA3AF"} tick={{ fontSize: 10 }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: darkMode ? '#181818' : '#ffffff', 
                          borderColor: darkMode ? '#333' : '#e5e7eb',
                          borderRadius: '10px',
                          fontSize: '12px'
                        }} 
                        formatter={(val: any) => [Number(val || 0).toLocaleString('pt-BR'), 'Alcance']}
                      />
                      <Area type="monotone" dataKey="alcance" stroke="#DD2A7B" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAlcance)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Evolução Diária de Engajamento */}
              <div className={cn("p-5 rounded-2xl border transition-colors", darkMode ? "bg-[#121212] border-[#222222]" : "bg-white border-gray-200 shadow-sm")}>
                <div className="mb-4">
                  <h3 className={cn("text-sm font-bold uppercase tracking-wider", darkMode ? "text-gray-300" : "text-gray-700")}>
                    Evolução Diária de Engajamento
                  </h3>
                  <p className={cn("text-xs", darkMode ? "text-gray-500" : "text-gray-400")}>
                    Total diário de interações (curtidas, comentários e compartilhamentos).
                  </p>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ left: -15, right: 10, top: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorEngajamento" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8134AF" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#8134AF" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#262626" : "#E5E7EB"} />
                      <XAxis dataKey="dateLabel" stroke={darkMode ? "#888" : "#9CA3AF"} tick={{ fontSize: 10 }} />
                      <YAxis stroke={darkMode ? "#888" : "#9CA3AF"} tick={{ fontSize: 10 }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: darkMode ? '#181818' : '#ffffff', 
                          borderColor: darkMode ? '#333' : '#e5e7eb',
                          borderRadius: '10px',
                          fontSize: '12px'
                        }} 
                        formatter={(val: any) => [Number(val || 0).toLocaleString('pt-BR'), 'Engajamento Total']}
                      />
                      <Area type="monotone" dataKey="engajamentoTotal" stroke="#8134AF" strokeWidth={2.5} fillOpacity={1} fill="url(#colorEngajamento)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Chart 3: Performance por Formato de Post */}
            <div className={cn("p-5 rounded-2xl border transition-colors", darkMode ? "bg-[#121212] border-[#222222]" : "bg-white border-gray-200 shadow-sm")}>
              <div className="mb-4">
                <h3 className={cn("text-sm font-bold uppercase tracking-wider", darkMode ? "text-gray-300" : "text-gray-700")}>
                  Performance por Formato de Post
                </h3>
                <p className={cn("text-xs", darkMode ? "text-gray-500" : "text-gray-400")}>
                  Comparativo de taxa média de engajamento entre formatos de conteúdo (Vídeos / Reels, Carrossel e Card Único).
                </p>
              </div>

              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={typeBreakdown} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#262626" : "#E5E7EB"} />
                    <XAxis dataKey="name" stroke={darkMode ? "#888" : "#9CA3AF"} tick={{ fontSize: 11 }} />
                    <YAxis stroke={darkMode ? "#888" : "#9CA3AF"} tick={{ fontSize: 10 }} unit="%" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: darkMode ? '#181818' : '#ffffff', 
                        borderColor: darkMode ? '#333' : '#e5e7eb',
                        borderRadius: '10px',
                        fontSize: '12px'
                      }} 
                      formatter={(val: any, _name: any, item: any) => {
                        const payload = item?.payload;
                        const curr = `${Number(val || 0).toFixed(2).replace('.', ',')}% (${payload?.count || 0} posts)`;
                        const prev = payload?.prevAvgTaxa > 0 
                          ? `${Number(payload.prevAvgTaxa).toFixed(2).replace('.', ',')}%` 
                          : (dateRanges.previous ? '0,00%' : '— s/ histórico');
                        return [`Atual: ${curr} (Anterior: ${prev})`, 'Taxa Média'];
                      }}
                    />
                    <Bar dataKey="avgTaxa" radius={[6, 6, 0, 0]}>
                      {typeBreakdown.map((entry) => (
                        <Cell key={`cell-${entry.key}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Publications Ranking Table */}
          <div className={cn("p-5 rounded-2xl border transition-colors", darkMode ? "bg-[#121212] border-[#222222]" : "bg-white border-gray-200 shadow-sm")}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
              <div>
                <h3 className={cn("text-lg font-bold tracking-tight", darkMode ? "text-white" : "text-gray-900")}>
                  Ranking Executivo de Publicações
                </h3>
                <p className={cn("text-xs", darkMode ? "text-gray-400" : "text-gray-500")}>
                  Publicações filtradas no período atual com ordenação configurável.
                </p>
              </div>

              {/* Sort Controls */}
              <div className="flex flex-wrap items-center gap-2 no-print">
                <span className={cn("text-[10px] font-bold uppercase", darkMode ? "text-gray-400" : "text-gray-500")}>
                  Ordenar por:
                </span>
                {[
                  { label: 'Taxa Engj.', key: 'engajamento' },
                  { label: 'Alcance', key: 'alcance' },
                  { label: 'Curtidas', key: 'likes' },
                  { label: 'Comentários', key: 'comentarios' },
                  { label: 'Compartilhamentos', key: 'compartilhamentos' },
                ].map(s => (
                  <button
                    key={s.key}
                    onClick={() => setRankSortBy(s.key as any)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                      rankSortBy === s.key
                        ? "bg-[#DD2A7B] text-white border-transparent"
                        : darkMode
                          ? "bg-[#181818] border-[#262626] text-gray-400 hover:text-white"
                          : "bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200"
                    )}
                  >
                    {s.label}
                  </button>
                ))}

                <select
                  value={rankingLimit}
                  onChange={(e) => setRankingLimit(Number(e.target.value))}
                  aria-label="Limite de publicações no ranking"
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                    darkMode ? "bg-[#181818] border-[#262626] text-gray-300" : "bg-white border-gray-300 text-gray-700"
                  )}
                >
                  <option value={5}>Top 5</option>
                  <option value={10}>Top 10</option>
                  <option value={20}>Top 20</option>
                  <option value={50}>Top 50</option>
                  <option value={100}>Top 100</option>
                </select>
              </div>
            </div>

            {/* Desktop & Tablet Table */}
            <div className="w-full overflow-hidden">
              {rankedPosts.length === 0 ? (
                <div className={cn("text-center py-10 rounded-xl border text-xs", darkMode ? "bg-[#141414] border-[#222] text-gray-500" : "bg-gray-50 border-gray-200 text-gray-500")}>
                  Nenhuma publicação no período selecionado.
                </div>
              ) : (
                <>
                  <div className="hidden sm:block w-full overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs table-auto">
                      <thead>
                        <tr className={cn(
                          "border-b text-[10px] uppercase font-bold tracking-wider",
                          darkMode ? "border-[#262626] text-gray-400" : "border-gray-200 text-gray-500"
                        )}>
                          <th className="py-2.5 px-1 text-center w-8">#</th>
                          <th className="py-2.5 px-1.5 text-center w-12">Mídia</th>
                          <th className="py-2.5 px-1.5 whitespace-nowrap">Data</th>
                          <th className="py-2.5 px-1.5">Tipo</th>
                          <th className="py-2.5 px-1.5 text-right whitespace-nowrap">Alcance</th>
                          <th className="py-2.5 px-1.5 text-right whitespace-nowrap">Curtidas</th>
                          <th className="py-2.5 px-1.5 text-right whitespace-nowrap">Coment.</th>
                          <th className="py-2.5 px-1.5 text-right whitespace-nowrap">Compart.</th>
                          <th className="py-2.5 px-1.5 text-right whitespace-nowrap">Engj. Total</th>
                          <th className="py-2.5 px-1.5 text-right whitespace-nowrap">Taxa Engj.</th>
                          <th className="py-2.5 px-1 text-center no-print w-8">Link</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-inherit">
                        {rankedPosts.map((post, idx) => {
                          const type = getPostType(post);
                          const typeLabel = type === 'video' ? 'Vídeo' : type === 'carrossel' ? 'Carrossel' : 'Card';
                          return (
                            <tr 
                              key={`${post.post}-${idx}`} 
                              className={cn("transition-colors", darkMode ? "hover:bg-[#181818]" : "hover:bg-gray-50")}
                            >
                              <td className="py-2 px-1 font-bold text-center text-gray-500 text-[11px]">{idx + 1}</td>
                              <td className="py-2 px-1.5 text-center">
                                <div className="flex justify-center">
                                  <ReelThumb url={post.post} width="36px" height="64px" />
                                </div>
                              </td>
                              <td className="py-2 px-1.5 whitespace-nowrap text-gray-400 text-[11px]">
                                {post.data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                              </td>
                              <td className="py-2 px-1.5 whitespace-nowrap">
                                <span className={cn(
                                  "inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-tight",
                                  type === 'video' 
                                    ? "bg-purple-900/30 text-purple-400 border border-purple-800/40" 
                                    : type === 'carrossel' 
                                      ? "bg-blue-900/30 text-blue-400 border border-blue-800/40" 
                                      : "bg-amber-900/30 text-amber-400 border border-amber-800/40"
                                )}>
                                  {typeLabel}
                                </span>
                              </td>
                              <td className={cn("py-2 px-1.5 text-right font-medium tabular-nums whitespace-nowrap", darkMode ? "text-gray-200" : "text-gray-800")}>
                                {post.alcance.toLocaleString('pt-BR')}
                              </td>
                              <td className={cn("py-2 px-1.5 text-right font-medium tabular-nums whitespace-nowrap", darkMode ? "text-gray-200" : "text-gray-800")}>
                                {post.likes.toLocaleString('pt-BR')}
                              </td>
                              <td className={cn("py-2 px-1.5 text-right font-medium tabular-nums whitespace-nowrap", darkMode ? "text-gray-200" : "text-gray-800")}>
                                {post.comentarios.toLocaleString('pt-BR')}
                              </td>
                              <td className={cn("py-2 px-1.5 text-right font-medium tabular-nums whitespace-nowrap", darkMode ? "text-gray-200" : "text-gray-800")}>
                                {post.compartilhamento.toLocaleString('pt-BR')}
                              </td>
                              <td className={cn("py-2 px-1.5 text-right font-bold tabular-nums whitespace-nowrap", darkMode ? "text-white" : "text-gray-900")}>
                                {post.engajamentoTotal.toLocaleString('pt-BR')}
                              </td>
                              <td className="py-2 px-1.5 text-right tabular-nums whitespace-nowrap">
                                <span className="font-extrabold text-[#DD2A7B]">
                                  {post.realEngajamento.toFixed(2).replace('.', ',')}%
                                </span>
                              </td>
                              <td className="py-2 px-1 text-center no-print">
                                <a 
                                  href={post.post} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="inline-flex items-center justify-center p-1 rounded-md text-gray-400 hover:text-white hover:bg-[#222] transition-colors"
                                  title="Ver no Instagram"
                                >
                                  <ExternalLink size={13} />
                                </a>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Executive Cards */}
                  <div className="block sm:hidden space-y-3 no-print">
                    {rankedPosts.map((post, idx) => {
                      const type = getPostType(post);
                      const typeLabel = type === 'video' ? 'Vídeo' : type === 'carrossel' ? 'Carrossel' : 'Card';
                      return (
                        <div 
                          key={`mobile-${post.post}-${idx}`}
                          className={cn(
                            "p-3 rounded-xl border transition-colors",
                            darkMode ? "bg-[#181818] border-[#262626]" : "bg-gray-50 border-gray-200"
                          )}
                        >
                          <div className="flex items-center justify-between gap-3 mb-2.5 pb-2 border-b border-inherit">
                            <div className="flex items-center gap-2.5">
                              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#DD2A7B]/15 text-[#DD2A7B] text-xs font-bold shrink-0">
                                #{idx + 1}
                              </span>
                              <div className="shrink-0">
                                <ReelThumb url={post.post} width="32px" height="56px" />
                              </div>
                              <div>
                                <div className={cn("text-xs font-semibold", darkMode ? "text-white" : "text-gray-900")}>
                                  {post.data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                </div>
                                <span className={cn(
                                  "inline-block px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase mt-0.5",
                                  type === 'video' 
                                    ? "bg-purple-900/30 text-purple-400 border border-purple-800/40" 
                                    : type === 'carrossel' 
                                      ? "bg-blue-900/30 text-blue-400 border border-blue-800/40" 
                                      : "bg-amber-900/30 text-amber-400 border border-amber-800/40"
                                )}>
                                  {typeLabel}
                                </span>
                              </div>
                            </div>

                            <a 
                              href={post.post} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/40 transition-colors"
                              title="Ver no Instagram"
                            >
                              <ExternalLink size={16} />
                            </a>
                          </div>

                          <div className="grid grid-cols-3 gap-1.5 text-center">
                            <div className={cn("p-1.5 rounded-lg", darkMode ? "bg-[#121212]" : "bg-white border border-gray-100")}>
                              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 block">Alcance</span>
                              <span className={cn("text-xs font-bold tabular-nums block", darkMode ? "text-gray-200" : "text-gray-800")}>
                                {post.alcance.toLocaleString('pt-BR')}
                              </span>
                            </div>

                            <div className={cn("p-1.5 rounded-lg", darkMode ? "bg-[#121212]" : "bg-white border border-gray-100")}>
                              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 block">Curtidas</span>
                              <span className={cn("text-xs font-bold tabular-nums block", darkMode ? "text-gray-200" : "text-gray-800")}>
                                {post.likes.toLocaleString('pt-BR')}
                              </span>
                            </div>

                            <div className={cn("p-1.5 rounded-lg", darkMode ? "bg-[#121212]" : "bg-white border border-gray-100")}>
                              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 block">Coment.</span>
                              <span className={cn("text-xs font-bold tabular-nums block", darkMode ? "text-gray-200" : "text-gray-800")}>
                                {post.comentarios.toLocaleString('pt-BR')}
                              </span>
                            </div>

                            <div className={cn("p-1.5 rounded-lg", darkMode ? "bg-[#121212]" : "bg-white border border-gray-100")}>
                              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 block">Compart.</span>
                              <span className={cn("text-xs font-bold tabular-nums block", darkMode ? "text-gray-200" : "text-gray-800")}>
                                {post.compartilhamento.toLocaleString('pt-BR')}
                              </span>
                            </div>

                            <div className={cn("p-1.5 rounded-lg", darkMode ? "bg-[#121212]" : "bg-white border border-gray-100")}>
                              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 block">Engj. Total</span>
                              <span className={cn("text-xs font-bold tabular-nums block", darkMode ? "text-white" : "text-gray-900")}>
                                {post.engajamentoTotal.toLocaleString('pt-BR')}
                              </span>
                            </div>

                            <div className={cn("p-1.5 rounded-lg border border-[#DD2A7B]/30", darkMode ? "bg-[#DD2A7B]/10" : "bg-pink-50")}>
                              <span className="text-[9px] font-bold uppercase tracking-wider text-[#DD2A7B] block">Taxa Engj.</span>
                              <span className="text-xs font-extrabold text-[#DD2A7B] tabular-nums block">
                                {post.realEngajamento.toFixed(2).replace('.', ',')}%
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
