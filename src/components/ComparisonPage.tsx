import React, { useState, useMemo } from 'react';
import { InstagramPost } from '../utils/dataParser';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  LabelList,
  Cell
} from 'recharts';
import { 
  ArrowLeftRight, 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Layers, 
  Heart, 
  MessageCircle, 
  Share2, 
  Eye, 
  Bookmark, 
  PlaySquare, 
  Percent, 
  Sparkles, 
  Trophy, 
  AlertCircle, 
  CheckCircle2, 
  Info,
  RefreshCw,
  BarChart3
} from 'lucide-react';

export interface ComparisonPageProps {
  posts: InstagramPost[];
  darkMode?: boolean;
}

export type PerformanceAnalysisResult = 
  | { status: 'empty'; message: string }
  | { status: 'partial'; message: string }
  | {
      status: 'valid';
      winner: 'ref' | 'comp' | 'draw';
      winnerLabel: string;
      refPoints: number;
      compPoints: number;
      highestGrowth?: { name: string; diffPctText: string };
      steepestDrop?: { name: string; diffPctText: string };
      reachDiff: {
        diffAbs: number;
        diffPct: number | null;
        diffPctText: string;
        isPositive: boolean;
        isNegative: boolean;
        isZero: boolean;
      };
      postDiff: {
        diffAbs: number;
        diffPct: number | null;
        diffPctText: string;
        isPositive: boolean;
        isNegative: boolean;
        isZero: boolean;
      };
      avgReachDiff: {
        diffAbs: number;
        diffPct: number | null;
        diffPctText: string;
        isPositive: boolean;
        isNegative: boolean;
        isZero: boolean;
      };
    };

export interface MonthOption {
  key: string; // "YYYY-MM"
  label: string; // "Outubro de 2026"
  shortLabel: string; // "Out/26"
  year: number;
  month: number; // 1-12
  startDate: Date;
  endDate: Date;
  daysInMonth: number;
  postCount: number;
}

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const MONTH_SHORT_PT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

type MetricType = 'alcance' | 'likes' | 'comentarios' | 'compartilhamento' | 'posts' | 'taxaEngajamento' | 'engajamentoTotal';

export const ComparisonPage: React.FC<ComparisonPageProps> = ({ posts, darkMode = true }) => {
  // 1. Extrair dinamicamente todos os meses e anos disponíveis a partir dos dados reais
  const availableMonths = useMemo<MonthOption[]>(() => {
    if (!posts || posts.length === 0) return [];

    const monthMap = new Map<string, { year: number; month: number; count: number }>();

    for (const post of posts) {
      if (!post.data || isNaN(post.data.getTime())) continue;
      const y = post.data.getFullYear();
      const m = post.data.getMonth() + 1; // 1-12
      const key = `${y}-${String(m).padStart(2, '0')}`;

      const curr = monthMap.get(key) || { year: y, month: m, count: 0 };
      curr.count++;
      monthMap.set(key, curr);
    }

    const sortedKeys = Array.from(monthMap.keys()).sort().reverse(); // Mais recente primeiro

    return sortedKeys.map(key => {
      const { year, month, count } = monthMap.get(key)!;
      const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);
      const daysInMonth = new Date(year, month, 0).getDate();

      return {
        key,
        label: `${MONTH_NAMES_PT[month - 1]} de ${year}`,
        shortLabel: `${MONTH_SHORT_PT[month - 1]}/${String(year).slice(-2)}`,
        year,
        month,
        startDate,
        endDate,
        daysInMonth,
        postCount: count
      };
    });
  }, [posts]);

  // Estados dos seletores de meses
  const [selectedRefKey, setSelectedRefKey] = useState<string>(() => availableMonths[0]?.key || '');
  const [selectedCompKey, setSelectedCompKey] = useState<string>(() => availableMonths[1]?.key || availableMonths[0]?.key || '');

  // Estado consolidado (atualizado ao clicar em "Comparar" ou na inicialização)
  const [activeRefKey, setActiveRefKey] = useState<string>(() => availableMonths[0]?.key || '');
  const [activeCompKey, setActiveCompKey] = useState<string>(() => availableMonths[1]?.key || availableMonths[0]?.key || '');

  // Métrica ativa no gráfico de barras
  const [activeMetric, setActiveMetric] = useState<MetricType>('alcance');

  // Feedback de atualização ao clicar em Comparar
  const [justCompared, setJustCompared] = useState(false);

  // Month objects
  const refMonthObj = useMemo(() => availableMonths.find(m => m.key === activeRefKey), [availableMonths, activeRefKey]);
  const compMonthObj = useMemo(() => availableMonths.find(m => m.key === activeCompKey), [availableMonths, activeCompKey]);

  // Botão de Comparar
  const handleApplyComparison = () => {
    if (selectedRefKey === selectedCompKey) return;
    setActiveRefKey(selectedRefKey);
    setActiveCompKey(selectedCompKey);
    setJustCompared(true);
    setTimeout(() => setJustCompared(false), 800);
  };

  // Botão Inverter Meses
  const handleSwapMonths = () => {
    const tempRef = selectedRefKey;
    setSelectedRefKey(selectedCompKey);
    setSelectedCompKey(tempRef);
  };

  // 2. Filtrar posts e calcular métricas para cada mês
  const refStats = useMemo(() => {
    if (!refMonthObj) {
      return {
        posts: [],
        count: 0,
        alcance: 0,
        likes: 0,
        comentarios: 0,
        compartilhamento: 0,
        engajamentoTotal: 0,
        taxaEngajamento: 0,
        alcanceMedio: 0
      };
    }

    // Filtra evitando snapshots ou posts repetidos (garantindo unicidade pelo post ou id/data)
    const seen = new Set<string>();
    const monthPosts = posts.filter(p => {
      if (p.data < refMonthObj.startDate || p.data > refMonthObj.endDate) return false;
      const dedupeKey = p.post ? p.post.trim() : `${p.data.toISOString()}-${p.legenda.slice(0, 20)}`;
      if (seen.has(dedupeKey)) return false;
      seen.add(dedupeKey);
      return true;
    });

    const count = monthPosts.length;
    let alcance = 0;
    let likes = 0;
    let comentarios = 0;
    let compartilhamento = 0;
    let engajamentoTotal = 0;

    for (const p of monthPosts) {
      alcance += p.alcance || 0;
      likes += p.likes || 0;
      comentarios += p.comentarios || 0;
      compartilhamento += p.compartilhamento || 0;
      engajamentoTotal += p.engajamentoTotal || 0;
    }

    const taxaEngajamento = alcance > 0 ? (engajamentoTotal / alcance) * 100 : 0;
    const alcanceMedio = count > 0 ? Math.round(alcance / count) : 0;

    return {
      posts: monthPosts,
      count,
      alcance,
      likes,
      comentarios,
      compartilhamento,
      engajamentoTotal,
      taxaEngajamento,
      alcanceMedio
    };
  }, [posts, refMonthObj]);

  const compStats = useMemo(() => {
    if (!compMonthObj) {
      return {
        posts: [],
        count: 0,
        alcance: 0,
        likes: 0,
        comentarios: 0,
        compartilhamento: 0,
        engajamentoTotal: 0,
        taxaEngajamento: 0,
        alcanceMedio: 0
      };
    }

    const seen = new Set<string>();
    const monthPosts = posts.filter(p => {
      if (p.data < compMonthObj.startDate || p.data > compMonthObj.endDate) return false;
      const dedupeKey = p.post ? p.post.trim() : `${p.data.toISOString()}-${p.legenda.slice(0, 20)}`;
      if (seen.has(dedupeKey)) return false;
      seen.add(dedupeKey);
      return true;
    });

    const count = monthPosts.length;
    let alcance = 0;
    let likes = 0;
    let comentarios = 0;
    let compartilhamento = 0;
    let engajamentoTotal = 0;

    for (const p of monthPosts) {
      alcance += p.alcance || 0;
      likes += p.likes || 0;
      comentarios += p.comentarios || 0;
      compartilhamento += p.compartilhamento || 0;
      engajamentoTotal += p.engajamentoTotal || 0;
    }

    const taxaEngajamento = alcance > 0 ? (engajamentoTotal / alcance) * 100 : 0;
    const alcanceMedio = count > 0 ? Math.round(alcance / count) : 0;

    return {
      posts: monthPosts,
      count,
      alcance,
      likes,
      comentarios,
      compartilhamento,
      engajamentoTotal,
      taxaEngajamento,
      alcanceMedio
    };
  }, [posts, compMonthObj]);

  // Função para cálculo de variações absoluta e percentual
  // Fórmula estrita: ((ref - comp) / comp) * 100. Se comp === 0: 'Não calculável'
  const calcVariation = (refVal: number, compVal: number) => {
    const diffAbs = refVal - compVal;
    let diffPct: number | null = null;
    let diffPctText = '0%';

    if (compVal === 0) {
      diffPctText = 'Não calculável';
    } else {
      diffPct = ((refVal - compVal) / compVal) * 100;
      const sign = diffPct > 0 ? '+' : '';
      diffPctText = `${sign}${diffPct.toFixed(1).replace('.', ',')}%`;
    }

    return {
      diffAbs,
      diffPct,
      diffPctText,
      isPositive: diffAbs > 0,
      isNegative: diffAbs < 0,
      isZero: diffAbs === 0
    };
  };

  // Comparativo de cada métrica
  const metricsComparison = useMemo(() => {
    return {
      alcance: calcVariation(refStats.alcance, compStats.alcance),
      likes: calcVariation(refStats.likes, compStats.likes),
      comentarios: calcVariation(refStats.comentarios, compStats.comentarios),
      compartilhamento: calcVariation(refStats.compartilhamento, compStats.compartilhamento),
      posts: calcVariation(refStats.count, compStats.count),
      engajamentoTotal: calcVariation(refStats.engajamentoTotal, compStats.engajamentoTotal),
      taxaEngajamento: calcVariation(refStats.taxaEngajamento, compStats.taxaEngajamento),
      alcanceMedio: calcVariation(refStats.alcanceMedio, compStats.alcanceMedio)
    };
  }, [refStats, compStats]);

  // Validação de mesma seleção
  const isSameMonthSelected = selectedRefKey === selectedCompKey;

  // 3. Dados para o gráfico de barras
  const chartData = useMemo(() => {
    const refLabel = refMonthObj?.shortLabel || 'Mês Ref.';
    const compLabel = compMonthObj?.shortLabel || 'Mês Comp.';

    switch (activeMetric) {
      case 'alcance':
        return [
          { name: refLabel, valor: refStats.alcance, tipo: 'ref', mes: refMonthObj?.label },
          { name: compLabel, valor: compStats.alcance, tipo: 'comp', mes: compMonthObj?.label }
        ];
      case 'likes':
        return [
          { name: refLabel, valor: refStats.likes, tipo: 'ref', mes: refMonthObj?.label },
          { name: compLabel, valor: compStats.likes, tipo: 'comp', mes: compMonthObj?.label }
        ];
      case 'comentarios':
        return [
          { name: refLabel, valor: refStats.comentarios, tipo: 'ref', mes: refMonthObj?.label },
          { name: compLabel, valor: compStats.comentarios, tipo: 'comp', mes: compMonthObj?.label }
        ];
      case 'compartilhamento':
        return [
          { name: refLabel, valor: refStats.compartilhamento, tipo: 'ref', mes: refMonthObj?.label },
          { name: compLabel, valor: compStats.compartilhamento, tipo: 'comp', mes: compMonthObj?.label }
        ];
      case 'posts':
        return [
          { name: refLabel, valor: refStats.count, tipo: 'ref', mes: refMonthObj?.label },
          { name: compLabel, valor: compStats.count, tipo: 'comp', mes: compMonthObj?.label }
        ];
      case 'taxaEngajamento':
        return [
          { name: refLabel, valor: Number(refStats.taxaEngajamento.toFixed(2)), tipo: 'ref', mes: refMonthObj?.label },
          { name: compLabel, valor: Number(compStats.taxaEngajamento.toFixed(2)), tipo: 'comp', mes: compMonthObj?.label }
        ];
      case 'engajamentoTotal':
        return [
          { name: refLabel, valor: refStats.engajamentoTotal, tipo: 'ref', mes: refMonthObj?.label },
          { name: compLabel, valor: compStats.engajamentoTotal, tipo: 'comp', mes: compMonthObj?.label }
        ];
      default:
        return [];
    }
  }, [activeMetric, refStats, compStats, refMonthObj, compMonthObj]);

  // Informações da métrica ativa para o gráfico
  const activeMetricMeta = useMemo(() => {
    switch (activeMetric) {
      case 'alcance':
        return {
          title: 'Alcance Total',
          unit: 'contas alcançadas',
          formatter: (val: number) => val.toLocaleString('pt-BR'),
          diff: metricsComparison.alcance
        };
      case 'likes':
        return {
          title: 'Curtidas',
          unit: 'curtidas',
          formatter: (val: number) => val.toLocaleString('pt-BR'),
          diff: metricsComparison.likes
        };
      case 'comentarios':
        return {
          title: 'Comentários',
          unit: 'comentários',
          formatter: (val: number) => val.toLocaleString('pt-BR'),
          diff: metricsComparison.comentarios
        };
      case 'compartilhamento':
        return {
          title: 'Compartilhamentos',
          unit: 'compartilhamentos',
          formatter: (val: number) => val.toLocaleString('pt-BR'),
          diff: metricsComparison.compartilhamento
        };
      case 'posts':
        return {
          title: 'Quantidade de Publicações',
          unit: 'posts publicados',
          formatter: (val: number) => `${val} posts`,
          diff: metricsComparison.posts
        };
      case 'taxaEngajamento':
        return {
          title: 'Taxa de Engajamento',
          unit: '% sobre alcance',
          formatter: (val: number) => `${val.toFixed(2).replace('.', ',')}%`,
          diff: metricsComparison.taxaEngajamento
        };
      case 'engajamentoTotal':
        return {
          title: 'Engajamento Total',
          unit: 'interações somadas',
          formatter: (val: number) => val.toLocaleString('pt-BR'),
          diff: metricsComparison.engajamentoTotal
        };
    }
  }, [activeMetric, metricsComparison]);

  // 4. Análise de desempenho executiva detalhada
  const performanceAnalysis = useMemo<PerformanceAnalysisResult | null>(() => {
    if (!refMonthObj || !compMonthObj) {
      return null;
    }

    if (refStats.count === 0 && compStats.count === 0) {
      return {
        status: 'empty',
        message: 'Ambos os meses selecionados não possuem publicações registradas na base de dados.'
      };
    }

    if (refStats.count === 0) {
      return {
        status: 'partial',
        message: `O mês de referência (${refMonthObj.label}) não possui publicações registradas, impedindo conclusões comparativas completas.`
      };
    }

    if (compStats.count === 0) {
      return {
        status: 'partial',
        message: `O mês comparado (${compMonthObj.label}) não possui publicações registradas para comparação com ${refMonthObj.label}.`
      };
    }

    // Avaliação de melhor mês com pesos (alcance, engajamento e interações)
    let refPoints = 0;
    let compPoints = 0;

    if (refStats.alcance > compStats.alcance) refPoints += 2;
    else if (compStats.alcance > refStats.alcance) compPoints += 2;

    if (refStats.taxaEngajamento > compStats.taxaEngajamento) refPoints += 2;
    else if (compStats.taxaEngajamento > refStats.taxaEngajamento) compPoints += 2;

    if (refStats.engajamentoTotal > compStats.engajamentoTotal) refPoints += 1;
    else if (compStats.engajamentoTotal > refStats.engajamentoTotal) compPoints += 1;

    if (refStats.compartilhamento > compStats.compartilhamento) refPoints += 1;
    else if (compStats.compartilhamento > refStats.compartilhamento) compPoints += 1;

    const winner = refPoints > compPoints ? 'ref' : compPoints > refPoints ? 'comp' : 'draw';
    const winnerLabel = winner === 'ref' ? refMonthObj.label : compMonthObj.label;

    // Lista de métricas ordenadas por maior crescimento percentual
    const metricDeltas = [
      { name: 'Alcance', ...metricsComparison.alcance },
      { name: 'Curtidas', ...metricsComparison.likes },
      { name: 'Comentários', ...metricsComparison.comentarios },
      { name: 'Compartilhamentos', ...metricsComparison.compartilhamento },
      { name: 'Engajamento Total', ...metricsComparison.engajamentoTotal },
      { name: 'Taxa de Engajamento', ...metricsComparison.taxaEngajamento },
      { name: 'Publicações', ...metricsComparison.posts }
    ].filter(m => m.diffPct !== null) as Array<{ name: string; diffAbs: number; diffPct: number; diffPctText: string; isPositive: boolean; isNegative: boolean }>;

    metricDeltas.sort((a, b) => b.diffPct - a.diffPct);

    const highestGrowth = metricDeltas.find(m => m.diffPct > 0);
    const steepestDrop = [...metricDeltas].reverse().find(m => m.diffPct < 0);

    return {
      status: 'valid',
      winner,
      winnerLabel,
      refPoints,
      compPoints,
      highestGrowth,
      steepestDrop,
      reachDiff: metricsComparison.alcance,
      postDiff: metricsComparison.posts,
      avgReachDiff: metricsComparison.alcanceMedio
    };
  }, [refMonthObj, compMonthObj, refStats, compStats, metricsComparison]);

  if (availableMonths.length === 0) {
    return (
      <div className={cn("p-8 rounded-2xl border text-center", darkMode ? "bg-[#121212] border-[#222222]" : "bg-white border-gray-200")}>
        <AlertCircle className="w-12 h-12 mx-auto text-amber-500 mb-3" />
        <h2 className={cn("text-lg font-bold mb-1", darkMode ? "text-white" : "text-gray-900")}>
          Nenhum dado mensal disponível
        </h2>
        <p className={cn("text-xs max-w-md mx-auto", darkMode ? "text-gray-400" : "text-gray-600")}>
          Aguarde a sincronização da planilha ou verifique a conexão com a base de dados do Instagram.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-12">
      {/* 1. Header & Seletor de Meses */}
      <div className={cn(
        "p-4 sm:p-6 rounded-2xl border shadow-sm transition-all duration-300",
        darkMode ? "bg-[#121212] border-[#222222]" : "bg-white border-gray-200"
      )}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5 pb-5 border-b border-inherit">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white">
                <ArrowLeftRight size={16} />
              </span>
              <h1 className={cn("text-lg sm:text-2xl font-bold tracking-tight", darkMode ? "text-white" : "text-gray-900")}>
                Comparação Mensal de Desempenho
              </h1>
            </div>
            <p className={cn("text-xs sm:text-sm", darkMode ? "text-gray-400" : "text-gray-600")}>
              Compare métricas consolidadas entre quaisquer dois meses históricos (consecutivos ou avulsos).
            </p>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
            <button
              onClick={handleSwapMonths}
              title="Inverter meses de comparação"
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition active:scale-95",
                darkMode 
                  ? "bg-[#1A1A1A] border-[#2E2E2E] text-gray-300 hover:text-white hover:bg-[#252525]" 
                  : "bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200"
              )}
            >
              <ArrowLeftRight size={13} />
              <span className="hidden sm:inline">Inverter</span>
            </button>

            <button
              onClick={handleApplyComparison}
              disabled={isSameMonthSelected}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
                justCompared 
                  ? "bg-emerald-600 shadow-emerald-500/20" 
                  : "bg-gradient-to-r from-[#DD2A7B] to-[#8134AF] hover:opacity-95 shadow-[#DD2A7B]/20"
              )}
            >
              {justCompared ? (
                <>
                  <CheckCircle2 size={14} className="text-white" />
                  <span>Atualizado!</span>
                </>
              ) : (
                <>
                  <RefreshCw size={14} />
                  <span>Comparar Meses</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Seletores lado a lado */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Seletor: Mês de Referência */}
          <div className={cn(
            "p-3.5 rounded-xl border relative transition-all",
            darkMode ? "bg-[#181818] border-[#2E2E2E]" : "bg-gray-50 border-gray-200"
          )}>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-[#EC4899]">
                <span className="w-2 h-2 rounded-full bg-[#EC4899] animate-pulse" />
                Mês de referência
              </label>
              {refMonthObj && (
                <span className="text-[11px] font-medium text-gray-400">
                  {refMonthObj.postCount} publicações
                </span>
              )}
            </div>

            <select
              value={selectedRefKey}
              onChange={(e) => setSelectedRefKey(e.target.value)}
              className={cn(
                "w-full px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold border transition outline-none cursor-pointer",
                darkMode 
                  ? "bg-[#0F0F0F] border-[#333333] text-white focus:border-[#EC4899]" 
                  : "bg-white border-gray-300 text-gray-900 focus:border-[#EC4899]"
              )}
            >
              {availableMonths.map(m => (
                <option key={m.key} value={m.key} disabled={m.key === selectedCompKey}>
                  {m.label} ({m.postCount} {m.postCount === 1 ? 'post' : 'posts'}) {m.key === selectedCompKey ? '— (selecionado em comparação)' : ''}
                </option>
              ))}
            </select>

            {/* Período detalhado */}
            {refMonthObj && (
              <p className={cn("text-[11px] mt-2 flex items-center gap-1 truncate", darkMode ? "text-gray-400" : "text-gray-500")}>
                <Calendar size={12} className="shrink-0 text-[#EC4899]" />
                <span>01/{String(refMonthObj.month).padStart(2, '0')}/{refMonthObj.year} a {refMonthObj.daysInMonth}/{String(refMonthObj.month).padStart(2, '0')}/{refMonthObj.year} ({refMonthObj.daysInMonth} dias)</span>
              </p>
            )}
          </div>

          {/* Seletor: Comparar com */}
          <div className={cn(
            "p-3.5 rounded-xl border relative transition-all",
            darkMode ? "bg-[#181818] border-[#2E2E2E]" : "bg-gray-50 border-gray-200"
          )}>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-[#8134AF]">
                <span className="w-2 h-2 rounded-full bg-[#8134AF]" />
                Comparar com
              </label>
              {compMonthObj && (
                <span className="text-[11px] font-medium text-gray-400">
                  {compMonthObj.postCount} publicações
                </span>
              )}
            </div>

            <select
              value={selectedCompKey}
              onChange={(e) => setSelectedCompKey(e.target.value)}
              className={cn(
                "w-full px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold border transition outline-none cursor-pointer",
                darkMode 
                  ? "bg-[#0F0F0F] border-[#333333] text-white focus:border-[#8134AF]" 
                  : "bg-white border-gray-300 text-gray-900 focus:border-[#8134AF]"
              )}
            >
              {availableMonths.map(m => (
                <option key={m.key} value={m.key} disabled={m.key === selectedRefKey}>
                  {m.label} ({m.postCount} {m.postCount === 1 ? 'post' : 'posts'}) {m.key === selectedRefKey ? '— (selecionado em referência)' : ''}
                </option>
              ))}
            </select>

            {/* Período detalhado */}
            {compMonthObj && (
              <p className={cn("text-[11px] mt-2 flex items-center gap-1 truncate", darkMode ? "text-gray-400" : "text-gray-500")}>
                <Calendar size={12} className="shrink-0 text-[#8134AF]" />
                <span>01/{String(compMonthObj.month).padStart(2, '0')}/{compMonthObj.year} a {compMonthObj.daysInMonth}/{String(compMonthObj.month).padStart(2, '0')}/{compMonthObj.year} ({compMonthObj.daysInMonth} dias)</span>
              </p>
            )}
          </div>
        </div>

        {/* Alerta caso tente comparar o mesmo mês */}
        {isSameMonthSelected && (
          <div className="mt-3.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>Não é permitido comparar um mês com ele mesmo. Selecione dois meses diferentes nos campos acima.</span>
          </div>
        )}
      </div>

      {/* 2. Indicadores Comparativos (Cards de Métricas) */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-3 px-1">
          <h2 className={cn("text-xs sm:text-sm font-bold uppercase tracking-wider", darkMode ? "text-gray-400" : "text-gray-600")}>
            Indicadores Comparativos
          </h2>
          <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px]">
            <span className="flex items-center gap-1 font-semibold text-[#EC4899]">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#EC4899]" />
              {refMonthObj?.shortLabel}
            </span>
            <span className="text-gray-500">vs</span>
            <span className="flex items-center gap-1 font-semibold text-[#8134AF]">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#8134AF]" />
              {compMonthObj?.shortLabel}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {/* Card 1: Alcance Total */}
          <MetricCompareCard
            title="Alcance Total"
            icon={Eye}
            refLabel={refMonthObj?.shortLabel || 'Ref.'}
            compLabel={compMonthObj?.shortLabel || 'Comp.'}
            refValue={refStats.alcance.toLocaleString('pt-BR')}
            compValue={compStats.alcance.toLocaleString('pt-BR')}
            diffAbs={`${metricsComparison.alcance.diffAbs > 0 ? '+' : ''}${metricsComparison.alcance.diffAbs.toLocaleString('pt-BR')}`}
            diffPct={metricsComparison.alcance.diffPctText}
            isPositive={metricsComparison.alcance.isPositive}
            isNegative={metricsComparison.alcance.isNegative}
            darkMode={darkMode}
          />

          {/* Card 2: Curtidas */}
          <MetricCompareCard
            title="Curtidas"
            icon={Heart}
            refLabel={refMonthObj?.shortLabel || 'Ref.'}
            compLabel={compMonthObj?.shortLabel || 'Comp.'}
            refValue={refStats.likes.toLocaleString('pt-BR')}
            compValue={compStats.likes.toLocaleString('pt-BR')}
            diffAbs={`${metricsComparison.likes.diffAbs > 0 ? '+' : ''}${metricsComparison.likes.diffAbs.toLocaleString('pt-BR')}`}
            diffPct={metricsComparison.likes.diffPctText}
            isPositive={metricsComparison.likes.isPositive}
            isNegative={metricsComparison.likes.isNegative}
            darkMode={darkMode}
          />

          {/* Card 3: Comentários */}
          <MetricCompareCard
            title="Comentários"
            icon={MessageCircle}
            refLabel={refMonthObj?.shortLabel || 'Ref.'}
            compLabel={compMonthObj?.shortLabel || 'Comp.'}
            refValue={refStats.comentarios.toLocaleString('pt-BR')}
            compValue={compStats.comentarios.toLocaleString('pt-BR')}
            diffAbs={`${metricsComparison.comentarios.diffAbs > 0 ? '+' : ''}${metricsComparison.comentarios.diffAbs.toLocaleString('pt-BR')}`}
            diffPct={metricsComparison.comentarios.diffPctText}
            isPositive={metricsComparison.comentarios.isPositive}
            isNegative={metricsComparison.comentarios.isNegative}
            darkMode={darkMode}
          />

          {/* Card 4: Compartilhamentos */}
          <MetricCompareCard
            title="Compartilhamentos"
            icon={Share2}
            refLabel={refMonthObj?.shortLabel || 'Ref.'}
            compLabel={compMonthObj?.shortLabel || 'Comp.'}
            refValue={refStats.compartilhamento.toLocaleString('pt-BR')}
            compValue={compStats.compartilhamento.toLocaleString('pt-BR')}
            diffAbs={`${metricsComparison.compartilhamento.diffAbs > 0 ? '+' : ''}${metricsComparison.compartilhamento.diffAbs.toLocaleString('pt-BR')}`}
            diffPct={metricsComparison.compartilhamento.diffPctText}
            isPositive={metricsComparison.compartilhamento.isPositive}
            isNegative={metricsComparison.compartilhamento.isNegative}
            darkMode={darkMode}
          />

          {/* Card 5: Quantidade de Publicações */}
          <MetricCompareCard
            title="Quantidade de Posts"
            icon={Layers}
            refLabel={refMonthObj?.shortLabel || 'Ref.'}
            compLabel={compMonthObj?.shortLabel || 'Comp.'}
            refValue={`${refStats.count} posts`}
            compValue={`${compStats.count} posts`}
            diffAbs={`${metricsComparison.posts.diffAbs > 0 ? '+' : ''}${metricsComparison.posts.diffAbs} posts`}
            diffPct={metricsComparison.posts.diffPctText}
            isPositive={metricsComparison.posts.isPositive}
            isNegative={metricsComparison.posts.isNegative}
            darkMode={darkMode}
          />

          {/* Card 6: Taxa de Engajamento */}
          <MetricCompareCard
            title="Taxa de Engajamento"
            icon={Percent}
            refLabel={refMonthObj?.shortLabel || 'Ref.'}
            compLabel={compMonthObj?.shortLabel || 'Comp.'}
            refValue={`${refStats.taxaEngajamento.toFixed(2).replace('.', ',')}%`}
            compValue={`${compStats.taxaEngajamento.toFixed(2).replace('.', ',')}%`}
            diffAbs={`${metricsComparison.taxaEngajamento.diffAbs > 0 ? '+' : ''}${metricsComparison.taxaEngajamento.diffAbs.toFixed(2).replace('.', ',')} p.p.`}
            diffPct={metricsComparison.taxaEngajamento.diffPctText}
            isPositive={metricsComparison.taxaEngajamento.isPositive}
            isNegative={metricsComparison.taxaEngajamento.isNegative}
            darkMode={darkMode}
          />

          {/* Card 7: Visualizações ou Reproduções (Nota informativa sem inventar dados) */}
          <UnavailableMetricCard
            title="Visualizações / Reproduções"
            icon={PlaySquare}
            reason="Métrica não reportada na planilha conectada"
            darkMode={darkMode}
          />

          {/* Card 8: Salvamentos (Nota informativa sem inventar dados) */}
          <UnavailableMetricCard
            title="Salvamentos"
            icon={Bookmark}
            reason="Métrica não reportada na planilha conectada"
            darkMode={darkMode}
          />
        </div>
      </div>

      {/* 3. Gráfico de Barras Comparativo */}
      <div className={cn(
        "p-4 sm:p-6 rounded-2xl border shadow-sm transition-all duration-300",
        darkMode ? "bg-[#121212] border-[#222222]" : "bg-white border-gray-200"
      )}>
        {/* Cabeçalho do Gráfico */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className={cn("text-base sm:text-lg font-bold flex items-center gap-2", darkMode ? "text-white" : "text-gray-900")}>
              <BarChart3 size={18} className="text-[#EC4899]" />
              Gráfico Comparativo: {activeMetricMeta.title}
            </h3>
            <p className={cn("text-xs mt-0.5", darkMode ? "text-gray-400" : "text-gray-500")}>
              Valores numéricos e confronto direto entre {refMonthObj?.label} e {compMonthObj?.label}.
            </p>
          </div>

          {/* Destaque da Variação no Gráfico */}
          <div className={cn(
            "flex items-center gap-3 px-3.5 py-2 rounded-xl border text-xs shrink-0",
            darkMode ? "bg-[#181818] border-[#2E2E2E]" : "bg-gray-50 border-gray-200"
          )}>
            <div className="flex flex-col text-left">
              <span className={cn("text-[10px] uppercase font-bold", darkMode ? "text-gray-400" : "text-gray-500")}>
                Diferença no período
              </span>
              <span className="font-bold flex items-center gap-1.5">
                <span className={cn(
                  activeMetricMeta.diff.isPositive ? "text-emerald-400" : activeMetricMeta.diff.isNegative ? "text-rose-400" : "text-gray-400"
                )}>
                  {activeMetricMeta.diff.diffAbs > 0 ? '+' : ''}{activeMetricMeta.diff.diffAbs.toLocaleString('pt-BR')} ({activeMetricMeta.diff.diffPctText})
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Seletor de Métrica do Gráfico - Enquadrado em visualização única sem rolagem horizontal */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5 mb-5">
          {[
            { id: 'alcance' as const, label: 'Alcance Total' },
            { id: 'likes' as const, label: 'Curtidas' },
            { id: 'comentarios' as const, label: 'Comentários' },
            { id: 'compartilhamento' as const, label: 'Compartilhamentos' },
            { id: 'posts' as const, label: 'Publicações' },
            { id: 'taxaEngajamento' as const, label: 'Taxa de Engajamento' },
            { id: 'engajamentoTotal' as const, label: 'Engajamento Total' }
          ].map((m, index) => (
            <button
              key={m.id}
              onClick={() => setActiveMetric(m.id)}
              className={cn(
                "px-2.5 py-2 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold transition-all text-center flex items-center justify-center",
                activeMetric === m.id
                  ? "bg-gradient-to-r from-[#DD2A7B] to-[#8134AF] text-white shadow-sm font-bold"
                  : darkMode
                    ? "bg-[#181818] text-gray-400 hover:text-white hover:bg-[#222222] border border-[#282828]"
                    : "bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200 border border-gray-200",
                index === 6 ? "col-span-2 sm:col-span-1" : ""
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Gráfico Recharts */}
        <div className="h-72 sm:h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 25, right: 30, left: 10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#262626" : "#E5E7EB"} vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke={darkMode ? "#9CA3AF" : "#4B5563"} 
                tick={{ fontSize: 12, fontWeight: 600 }}
                tickLine={false}
              />
              <YAxis 
                stroke={darkMode ? "#9CA3AF" : "#4B5563"} 
                tick={{ fontSize: 11 }}
                tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: darkMode ? '#1A1A1A' : '#FFFFFF',
                  borderColor: darkMode ? '#333333' : '#E5E7EB',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
                  color: darkMode ? '#FFFFFF' : '#111827',
                  fontSize: '12px'
                }}
                formatter={(value: any) => [
                  `${Number(value || 0).toLocaleString('pt-BR')} ${activeMetricMeta.unit}`,
                  activeMetricMeta.title
                ]}
                labelFormatter={(_label, payload) => {
                  const item = payload?.[0]?.payload;
                  return item?.mes || String(_label);
                }}
              />
              <Bar 
                dataKey="valor" 
                radius={[8, 8, 0, 0]} 
                maxBarSize={90}
                isAnimationActive={true}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.tipo === 'ref' ? '#EC4899' : '#8134AF'} 
                  />
                ))}
                <LabelList 
                  dataKey="valor" 
                  position="top" 
                  formatter={(val: any) => typeof val === 'number' ? val.toLocaleString('pt-BR') : val}
                  fill={darkMode ? '#FFFFFF' : '#1F2937'}
                  fontSize={12}
                  fontWeight={700}
                  offset={10}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legenda Explicativa */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-4 pt-4 border-t border-inherit text-xs">
          <div className="flex items-center gap-2 font-medium">
            <span className="w-3.5 h-3.5 rounded bg-[#EC4899] shadow-xs" />
            <span className={darkMode ? "text-gray-300" : "text-gray-700"}>
              {refMonthObj?.label} <span className="text-[#EC4899] font-bold">(Mês de Referência)</span>
            </span>
          </div>
          <div className="flex items-center gap-2 font-medium">
            <span className="w-3.5 h-3.5 rounded bg-[#8134AF] shadow-xs" />
            <span className={darkMode ? "text-gray-300" : "text-gray-700"}>
              {compMonthObj?.label} <span className="text-[#8134AF] font-bold">(Mês Comparado)</span>
            </span>
          </div>
        </div>
      </div>

      {/* 4. Análise de Desempenho Executiva */}
      {performanceAnalysis && (
        <div className={cn(
          "p-5 sm:p-7 rounded-2xl border shadow-sm transition-all duration-300",
          darkMode ? "bg-[#121212] border-[#222222]" : "bg-white border-gray-200"
        )}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                <Trophy size={16} />
              </span>
              <h3 className={cn("text-base sm:text-lg font-bold", darkMode ? "text-white" : "text-gray-900")}>
                Análise Executiva de Desempenho
              </h3>
            </div>
            {performanceAnalysis.status === 'valid' && (
              <span className={cn(
                "px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1",
                performanceAnalysis.winner === 'ref' 
                  ? "bg-[#EC4899]/15 text-[#EC4899]" 
                  : performanceAnalysis.winner === 'comp' 
                    ? "bg-[#8134AF]/15 text-[#8134AF]" 
                    : "bg-gray-500/15 text-gray-400"
              )}>
                {performanceAnalysis.winner === 'ref' && 'Mês de Referência com Melhor Resultado Geral'}
                {performanceAnalysis.winner === 'comp' && 'Mês Comparado com Melhor Resultado Geral'}
                {performanceAnalysis.winner === 'draw' && 'Desempenho Geral Equilibrado'}
              </span>
            )}
          </div>

          {performanceAnalysis.status === 'valid' && refMonthObj && compMonthObj ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Insight 1: Resultado Geral */}
              <div className={cn(
                "p-4 rounded-xl border flex flex-col justify-between",
                darkMode ? "bg-[#181818] border-[#262626]" : "bg-gray-50 border-gray-200"
              )}>
                <span className={cn("text-xs font-bold uppercase tracking-wider mb-2", darkMode ? "text-gray-400" : "text-gray-500")}>
                  Melhor Resultado
                </span>
                <p className={cn("text-xs leading-relaxed", darkMode ? "text-gray-200" : "text-gray-800")}>
                  O mês de <strong className="text-white">{performanceAnalysis.winnerLabel}</strong> apresentou o melhor equilíbrio de entregas, considerando volume de alcance, engajamento e interação do público.
                </p>
                <div className="mt-3 pt-2 border-t border-inherit flex items-center justify-between text-[11px] text-gray-400">
                  <span>Pontuação ponderada</span>
                  <span className="font-bold text-[#EC4899]">{refStats.taxaEngajamento > compStats.taxaEngajamento ? '+ Eficiência' : '+ Volume'}</span>
                </div>
              </div>

              {/* Insight 2: Alcance Total */}
              <div className={cn(
                "p-4 rounded-xl border flex flex-col justify-between",
                darkMode ? "bg-[#181818] border-[#262626]" : "bg-gray-50 border-gray-200"
              )}>
                <span className={cn("text-xs font-bold uppercase tracking-wider mb-2", darkMode ? "text-gray-400" : "text-gray-500")}>
                  Evolução do Alcance
                </span>
                <p className={cn("text-xs leading-relaxed", darkMode ? "text-gray-200" : "text-gray-800")}>
                  O alcance total {performanceAnalysis.reachDiff.isPositive ? 'aumentou' : performanceAnalysis.reachDiff.isNegative ? 'diminuiu' : 'manteve-se estável em'}{' '}
                  <strong className={performanceAnalysis.reachDiff.isPositive ? 'text-emerald-400' : 'text-rose-400'}>
                    {performanceAnalysis.reachDiff.diffAbs > 0 ? '+' : ''}{performanceAnalysis.reachDiff.diffAbs.toLocaleString('pt-BR')} contas ({performanceAnalysis.reachDiff.diffPctText})
                  </strong>{' '}
                  no mês de referência.
                </p>
                <div className="mt-3 pt-2 border-t border-inherit flex items-center justify-between text-[11px] text-gray-400">
                  <span>Média por post</span>
                  <span className="font-bold text-white">{refStats.alcanceMedio.toLocaleString('pt-BR')} vs {compStats.alcanceMedio.toLocaleString('pt-BR')}</span>
                </div>
              </div>

              {/* Insight 3: Maior Crescimento e Queda */}
              <div className={cn(
                "p-4 rounded-xl border flex flex-col justify-between",
                darkMode ? "bg-[#181818] border-[#262626]" : "bg-gray-50 border-gray-200"
              )}>
                <span className={cn("text-xs font-bold uppercase tracking-wider mb-2", darkMode ? "text-gray-400" : "text-gray-500")}>
                  Crescimento & Queda
                </span>
                <div className="text-xs space-y-1.5">
                  {performanceAnalysis.highestGrowth ? (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 flex items-center gap-1">
                        <TrendingUp size={12} className="text-emerald-400" /> Maior alta:
                      </span>
                      <span className="font-bold text-emerald-400">
                        {performanceAnalysis.highestGrowth.name} ({performanceAnalysis.highestGrowth.diffPctText})
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400">Sem métricas com alta</span>
                  )}

                  {performanceAnalysis.steepestDrop ? (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 flex items-center gap-1">
                        <TrendingDown size={12} className="text-rose-400" /> Maior baixa:
                      </span>
                      <span className="font-bold text-rose-400">
                        {performanceAnalysis.steepestDrop.name} ({performanceAnalysis.steepestDrop.diffPctText})
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400">Sem quedas registradas</span>
                  )}
                </div>
                <div className="mt-3 pt-2 border-t border-inherit flex items-center justify-between text-[11px] text-gray-400">
                  <span>Taxa Engajamento</span>
                  <span className="font-bold text-white">{refStats.taxaEngajamento.toFixed(2).replace('.', ',')}% vs {compStats.taxaEngajamento.toFixed(2).replace('.', ',')}%</span>
                </div>
              </div>

              {/* Insight 4: Frequência de Postagem */}
              <div className={cn(
                "p-4 rounded-xl border flex flex-col justify-between",
                darkMode ? "bg-[#181818] border-[#262626]" : "bg-gray-50 border-gray-200"
              )}>
                <span className={cn("text-xs font-bold uppercase tracking-wider mb-2", darkMode ? "text-gray-400" : "text-gray-500")}>
                  Volume de Conteúdo
                </span>
                <p className={cn("text-xs leading-relaxed", darkMode ? "text-gray-200" : "text-gray-800")}>
                  Foram publicadas <strong className="text-white">{refStats.count} publicações</strong> em {refMonthObj.shortLabel} contra <strong className="text-white">{compStats.count}</strong> em {compMonthObj.shortLabel}, uma diferença de{' '}
                  <strong className={performanceAnalysis.postDiff.diffAbs >= 0 ? "text-emerald-400" : "text-rose-400"}>
                    {performanceAnalysis.postDiff.diffAbs > 0 ? `+${performanceAnalysis.postDiff.diffAbs}` : performanceAnalysis.postDiff.diffAbs} posts
                  </strong>.
                </p>
                <div className="mt-3 pt-2 border-t border-inherit flex items-center justify-between text-[11px] text-gray-400">
                  <span>Ritmo de postagens</span>
                  <span className="font-bold text-white">{(refStats.count / (refMonthObj.daysInMonth / 7)).toFixed(1)} posts/sem.</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs flex items-center gap-2">
              <Info size={16} className="shrink-0" />
              <span>{'message' in performanceAnalysis ? performanceAnalysis.message : 'Dados insuficientes para análise comparativa.'}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Subcomponente de Card Comparativo
interface MetricCompareCardProps {
  title: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  refLabel: string;
  compLabel: string;
  refValue: string;
  compValue: string;
  diffAbs: string;
  diffPct: string;
  isPositive: boolean;
  isNegative: boolean;
  darkMode?: boolean;
}

const MetricCompareCard: React.FC<MetricCompareCardProps> = ({
  title,
  icon: Icon,
  refLabel,
  compLabel,
  refValue,
  compValue,
  diffAbs,
  diffPct,
  isPositive,
  isNegative,
  darkMode = true
}) => {
  return (
    <div className={cn(
      "p-2.5 sm:p-4 rounded-xl border flex flex-col justify-between transition-all duration-200 hover:border-gray-500/30 shadow-xs",
      darkMode ? "bg-[#141414] border-[#242424]" : "bg-white border-gray-200"
    )}>
      <div>
        {/* Top Header */}
        <div className="flex items-center justify-between gap-1 mb-2 sm:mb-3">
          <span className={cn("text-[11px] sm:text-xs font-semibold truncate", darkMode ? "text-gray-300" : "text-gray-700")}>
            {title}
          </span>
          <div className="p-1 sm:p-1.5 rounded-lg bg-gray-500/10 text-gray-400 shrink-0">
            <Icon size={13} />
          </div>
        </div>

        {/* Reference Month Value (Hero) */}
        <div className="mb-1.5 sm:mb-2">
          <div className="flex items-baseline justify-between gap-1">
            <span className={cn("text-base sm:text-2xl font-black tracking-tight truncate", darkMode ? "text-white" : "text-gray-900")}>
              {refValue}
            </span>
            <span className="text-[8px] sm:text-[10px] font-bold text-[#EC4899] uppercase px-1 sm:px-1.5 py-0.5 rounded bg-[#EC4899]/15 shrink-0">
              {refLabel}
            </span>
          </div>
        </div>

        {/* Comparison Month Value */}
        <div className={cn("text-[10px] sm:text-xs flex items-center justify-between gap-1 pb-1.5 sm:pb-2 border-b border-inherit", darkMode ? "text-gray-400" : "text-gray-500")}>
          <span className="truncate">Em {compLabel}:</span>
          <span className="font-semibold text-gray-300 shrink-0">{compValue}</span>
        </div>
      </div>

      {/* Footer: Absolute & Percentage Differences */}
      <div className="mt-2 sm:mt-3 flex items-center justify-between gap-1 text-[10px] sm:text-xs">
        <span className={cn(
          "font-bold flex items-center gap-0.5 px-1.5 sm:px-2 py-0.5 rounded-md text-[9px] sm:text-[11px] shrink-0",
          isPositive 
            ? "bg-emerald-500/15 text-emerald-400" 
            : isNegative 
              ? "bg-rose-500/15 text-rose-400" 
              : "bg-gray-500/15 text-gray-400"
        )}>
          {isPositive ? <ArrowUpRight size={12} className="shrink-0 stroke-[2.5]" /> : isNegative ? <ArrowDownRight size={12} className="shrink-0 stroke-[2.5]" /> : <Minus size={12} className="shrink-0" />}
          <span>{diffPct}</span>
        </span>

        <span className={cn("text-[10px] sm:text-[11px] font-medium truncate text-right", darkMode ? "text-gray-400" : "text-gray-500")}>
          {diffAbs}
        </span>
      </div>
    </div>
  );
};

// Subcomponente de Card de Métrica Indisponível
interface UnavailableMetricCardProps {
  title: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  reason: string;
  darkMode?: boolean;
}

const UnavailableMetricCard: React.FC<UnavailableMetricCardProps> = ({
  title,
  icon: Icon,
  reason,
  darkMode = true
}) => {
  return (
    <div className={cn(
      "p-2.5 sm:p-4 rounded-xl border flex flex-col justify-between opacity-80 transition-all duration-200",
      darkMode ? "bg-[#141414] border-[#222222]" : "bg-gray-50 border-gray-200"
    )}>
      <div>
        <div className="flex items-center justify-between gap-1 mb-2 sm:mb-3">
          <span className={cn("text-[11px] sm:text-xs font-semibold truncate", darkMode ? "text-gray-400" : "text-gray-600")}>
            {title}
          </span>
          <div className="p-1 sm:p-1.5 rounded-lg bg-gray-500/10 text-gray-500 shrink-0">
            <Icon size={13} />
          </div>
        </div>

        <div className="mb-1.5 sm:mb-2">
          <span className={cn("text-base sm:text-lg font-bold tracking-tight text-gray-500")}>
            —
          </span>
        </div>
      </div>

      <div className="mt-2 sm:mt-3 pt-1.5 sm:pt-2 border-t border-inherit">
        <span className="text-[9px] sm:text-[10px] leading-tight text-amber-500/90 flex items-start gap-1 font-medium">
          <Info size={11} className="shrink-0 mt-0.5" />
          <span>{reason}</span>
        </span>
      </div>
    </div>
  );
};
