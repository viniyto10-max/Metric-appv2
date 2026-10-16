import { useState, useEffect, useCallback, useMemo } from 'react';
import { SHEET_CSV_URL } from './constants';
import { parseCSVData, parseInputDate, InstagramPost, getPostType } from './utils/dataParser';
import { MetricCard, MOCK_CLIQUES_LINK_BIO } from './components/MetricCard';
import { DataTable } from './components/DataTable';
import { TopReels } from './components/TopReels';
import { InsightsSection } from './components/InsightsSection';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Users, Heart, MessageCircle, Share2, RefreshCw, Percent, Grid3X3, MousePointerClick } from 'lucide-react';

// Cache local do último CSV válido: permite abrir o app instalado mesmo sem internet
const CSV_CACHE_KEY = 'metricflow:last-csv';
const CSV_CACHE_TIME_KEY = 'metricflow:last-csv-time';

const readCachedCSV = (): { csv: string; time: Date | null } | null => {
  try {
    const csv = localStorage.getItem(CSV_CACHE_KEY);
    if (!csv) return null;
    const t = localStorage.getItem(CSV_CACHE_TIME_KEY);
    return { csv, time: t ? new Date(Number(t)) : null };
  } catch {
    return null;
  }
};

const writeCachedCSV = (csv: string) => {
  try {
    localStorage.setItem(CSV_CACHE_KEY, csv);
    localStorage.setItem(CSV_CACHE_TIME_KEY, String(Date.now()));
  } catch {
    /* armazenamento indisponível (modo privado / cota cheia) — segue sem cache */
  }
};

interface DayGroup {
  date: Date;
  alcance: number;
  engajamentoTotal: number;
  engajamentos: number[];
}

const toDate = (v: unknown): Date | null => (v instanceof Date ? v : null);

export default function App() {
  const [data, setData] = useState<InstagramPost[]>([]);
  const [seguidores, setSeguidores] = useState<number>(0);
  const [seguindo, setSeguindo] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [period, setPeriod] = useState<'7' | '30' | '90' | 'ano' | 'tudo' | 'custom'>('tudo');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [postTypeFilter, setPostTypeFilter] = useState<'all' | 'video' | 'carrossel' | 'card_unico'>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);

  const filteredData = useMemo(() => {
    let filtered = data.filter(post => {
      if (period === 'tudo') return true;
      const now = new Date();
      let startDate = new Date();
      let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      if (period === '7') startDate.setDate(now.getDate() - 7);
      else if (period === '30') startDate.setDate(now.getDate() - 30);
      else if (period === '90') startDate.setDate(now.getDate() - 90);
      else if (period === 'ano') startDate = new Date(now.getFullYear(), 0, 1);
      else if (period === 'custom') {
          const s = parseInputDate(customStart);
          const e = parseInputDate(customEnd, true);
          if (!s || !e) return true;
          startDate = s;
          endDate = e;
      }
      return post.data >= startDate && post.data <= endDate;
    });

    if (postTypeFilter !== 'all') {
      filtered = filtered.filter(post => getPostType(post) === postTypeFilter);
    }

    // Grouping for charts
    const grouped = filtered.reduce((acc, curr) => {
        const dateKey = curr.data.toDateString();
        if (!acc[dateKey]) {
            acc[dateKey] = { date: curr.data, alcance: 0, engajamentoTotal: 0, engajamentos: [] };
        }
        acc[dateKey].alcance += curr.alcance;
        acc[dateKey].engajamentoTotal += curr.engajamentoTotal;
        acc[dateKey].engajamentos.push(curr.realEngajamento);
        return acc;
    }, {} as Record<string, DayGroup>);

    const chartData = Object.values(grouped).map(g => ({
        data: g.date,
        alcance: g.alcance,
        engajamentoTotal: g.engajamentos.length ? g.engajamentos.reduce((a, b) => a + b, 0) / g.engajamentos.length : 0
    })).sort((a, b) => a.data.getTime() - b.data.getTime());

    return { filtered, chartData };
  }, [data, period, customStart, customEnd, postTypeFilter]);

  const { filtered, chartData } = filteredData;
  const kpis = {
    alcance: filtered.reduce((acc, curr) => acc + curr.alcance, 0),
    likes: filtered.reduce((acc, curr) => acc + curr.likes, 0),
    compartilhamento: filtered.reduce((acc, curr) => acc + curr.compartilhamento, 0),
    engajamento: (filtered.reduce((acc, curr) => acc + curr.alcance, 0) > 0) 
        ? (filtered.reduce((acc, curr) => acc + curr.engajamentoTotal, 0) / filtered.reduce((acc, curr) => acc + curr.alcance, 0)) * 100 
        : 0,
    engajamentoTotal: filtered.reduce((acc, curr) => acc + curr.engajamentoTotal, 0),
    comentarios: filtered.reduce((acc, curr) => acc + curr.comentarios, 0),
    posts: filtered.length,
  };

  const applyCSV = useCallback((csvText: string) => {
    const parsed = parseCSVData(csvText);
    setData(parsed.posts);
    setSeguidores(parsed.seguidores);
    setSeguindo(parsed.seguindo);
    return parsed;
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(SHEET_CSV_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error('Falha ao buscar dados');
      const csvText = await response.text();
      const parsed = applyCSV(csvText);
      if (parsed.posts.length > 0) writeCachedCSV(csvText);
      setLastUpdated(new Date());
    } catch (err) {
      // Sem internet: usa os últimos dados salvos no aparelho
      const cached = readCachedCSV();
      if (cached) {
        applyCSV(cached.csv);
        setLastUpdated(cached.time);
      } else {
        setError('Erro ao carregar dados. Verifique a URL do CSV.');
      }
    } finally {
      setLoading(false);
    }
  }, [applyCSV]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Ao voltar a ficar online (ou reabrir o app instalado), atualiza sozinho
  useEffect(() => {
    const onOnline = () => fetchData();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [fetchData]);

  // Tela de carregamento só na primeira carga; ao tocar em "Atualizar" os dados continuam visíveis
  if (loading && data.length === 0) return <div className="app-shell text-white p-10">Carregando...</div>;
  if (error && data.length === 0) return (
    <div className="app-shell text-red-500 p-10">
      {error}
      <button onClick={fetchData} className="block mt-4 bg-[#121212] border border-[#262626] text-white px-3 py-1.5 rounded-lg text-xs">Tentar novamente</button>
    </div>
  );

  return (
    <div className="app-shell bg-[#0A0A0A] text-gray-200 font-sans overflow-x-hidden overflow-y-auto">
      <div className="p-4 sm:p-8">
      <header className="mb-10">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-white">Visão Geral</h1>
            {seguidores > 0 && (
                <div className="flex items-center gap-3 bg-[#121212] border border-[#262626] px-3 py-1.5 rounded-lg text-[10px]">
                    <div className="text-center">
                        <span className="text-gray-400 block uppercase font-semibold">Seguidores</span>
                        <span className="text-white font-bold">{seguidores.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="h-6 w-[1px] bg-[#262626]"></div>
                    <div className="text-center">
                        <span className="text-gray-400 block uppercase font-semibold">Seguindo</span>
                        <span className="text-white font-bold">{seguindo.toLocaleString('pt-BR')}</span>
                    </div>
                </div>
            )}
        </div>
        
        <div className="grid grid-cols-3 gap-2 mb-4">
            {[{label: '7d', val: '7'}, {label: '30d', val: '30'}, {label: '90d', val: '90'}, {label: 'Ano', val: 'ano'}, {label: 'Tudo', val: 'tudo'}, {label: 'Custom', val: 'custom'}].map((p) => (
                <button 
                    key={p.val}
                    onClick={() => { setPeriod(p.val as any); setCurrentPage(1); }}
                    className={cn("px-2 py-1.5 rounded-lg transition text-[11px] truncate", period === p.val ? "bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white" : "bg-[#121212] border border-[#262626] text-gray-400 hover:bg-gray-800")}
                >
                    {p.label}
                </button>
            ))}
        </div>
        
        {period === 'custom' && (
            <div className="flex gap-2 items-center bg-[#121212] p-2 rounded-lg border border-[#262626] mb-4">
                <input type="date" className="bg-transparent text-[10px] text-white flex-1" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
                <span className="text-gray-500">até</span>
                <input type="date" className="bg-transparent text-[10px] text-white flex-1" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
            </div>
        )}

        <div className="flex justify-between items-center gap-2">
            <button 
                onClick={fetchData} 
                disabled={loading}
                className="flex items-center gap-1 bg-[#121212] border border-[#262626] hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg transition text-xs"
            >
              <RefreshCw size={14} className={cn(loading && "animate-spin")} /> Atualizar
            </button>
            <div className="flex flex-wrap gap-1 items-center justify-start mt-2">
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mr-1 shrink-0">Tipo:</span>
                {[
                    { label: 'Todos', val: 'all' },
                    { label: 'Vídeo', val: 'video' },
                    { label: 'Carrossel', val: 'carrossel' },
                    { label: 'Card', val: 'card_unico' },
                ].map(t => (
                    <button
                        key={t.val}
                        onClick={() => { setPostTypeFilter(t.val as any); setCurrentPage(1); }}
                        className={cn("px-1.5 py-1 rounded-md transition text-[9px]", postTypeFilter === t.val ? "bg-[#E1306C] text-white font-medium" : "bg-[#121212] border border-[#262626] text-gray-400 hover:bg-gray-800")}
                    >
                        {t.label}
                    </button>
                ))}
            </div>
        </div>
      </header>

      <TopReels posts={filtered} period={period === 'custom' ? `${customStart} até ${customEnd}` : { '7': '7 dias', '30': '30 dias', '90': '90 dias', 'ano': 'Este ano', 'tudo': 'Tudo'}[period]} />

      <motion.div 
        key={period}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-6 mb-10"
      >
        <MetricCard index={0} title="Alcance" value={kpis.alcance.toLocaleString('pt-BR')} variation={null} isPositive={null} icon={Users} sparklineData={chartData.map(c => ({value: c.alcance}))} />
        <MetricCard index={1} title="Curtidas" value={kpis.likes.toLocaleString('pt-BR')} variation={null} isPositive={null} icon={Heart} />
        <MetricCard index={2} title="Compartilhamentos" value={kpis.compartilhamento.toLocaleString('pt-BR')} variation={null} isPositive={null} icon={Share2} />
        <MetricCard index={3} title="Engajamento %" value={`${kpis.engajamento.toFixed(2).replace('.', ',')}%`} variation={null} isPositive={null} icon={Percent} sparklineData={chartData.map(c => ({value: c.engajamentoTotal}))} />
        <MetricCard index={4} title="Engajamento Total" value={kpis.engajamentoTotal.toLocaleString('pt-BR')} variation={null} isPositive={null} icon={Users} />
        <MetricCard index={5} title="Comentários" value={kpis.comentarios.toLocaleString('pt-BR')} variation={null} isPositive={null} icon={MessageCircle} />
        <MetricCard index={6} title="Posts no Período" value={kpis.posts.toLocaleString('pt-BR')} variation={null} isPositive={null} icon={Grid3X3} />
        <MetricCard index={7} title="Cliques Link Bio" value={MOCK_CLIQUES_LINK_BIO.toLocaleString('pt-BR')} variation={null} isPositive={null} icon={MousePointerClick} isMock={true} />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        <div className="bg-[#121212] p-4 rounded-[12px] border border-[#262626]">
            <h3 className="text-sm font-semibold mb-3 text-gray-300">Evolução do Alcance</h3>
            <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ left: -20, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="data" tickFormatter={(d: Date) => d.toLocaleDateString('pt-BR', {day: 'numeric', month: 'numeric'})} stroke="#9CA3AF" tick={{fontSize: 10}} />
                        <YAxis stroke="#9CA3AF" tick={{fontSize: 10}} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '8px', fontSize: '12px' }}
                            labelFormatter={(label) => toDate(label)?.toLocaleDateString('pt-BR') ?? ''}
                            formatter={(value) => [Number(value ?? 0).toLocaleString('pt-BR'), 'Alcance']}
                        />
                        <Area type="monotone" dataKey="alcance" stroke="#EC4899" fill="#EC4899" fillOpacity={0.3} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
        <div className="bg-[#121212] p-4 rounded-[12px] border border-[#262626]">
            <h3 className="text-sm font-semibold mb-3 text-gray-300">Evolução do Engajamento</h3>
            <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ left: -20, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="data" tickFormatter={(d: Date) => d.toLocaleDateString('pt-BR', {day: 'numeric', month: 'numeric'})} stroke="#9CA3AF" tick={{fontSize: 10}} />
                        <YAxis stroke="#9CA3AF" tick={{fontSize: 10}} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '8px', fontSize: '12px' }}
                            labelFormatter={(label) => toDate(label)?.toLocaleDateString('pt-BR') ?? ''}
                            formatter={(value) => [Number(value ?? 0).toFixed(2).replace('.', ',') + '%', 'Engj. Médio']}
                        />
                        <Line type="monotone" dataKey="engajamentoTotal" stroke="#EC4899" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>
      
      <p className="text-xs text-gray-500 mb-2">{filtered.length} reels no período</p>
      <motion.div
        key={`${period}-table`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <DataTable data={filtered} />
      </motion.div>

      <InsightsSection posts={filtered} allPosts={data} period={period} customStart={customStart} customEnd={customEnd} />
      </div>
    </div>
  );
}
