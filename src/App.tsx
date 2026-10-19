import { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import { SHEET_CSV_URL } from './constants';
import { parseCSVData, InstagramPost, getPostType } from './utils/dataParser';
import { calculateComparisonDateRanges, isDateInRange } from './utils/dateRanges';
import { MetricCard, MOCK_CLIQUES_LINK_BIO } from './components/MetricCard';
import { DataTable } from './components/DataTable';
import { TopReels } from './components/TopReels';
import { InsightsSection } from './components/InsightsSection';
import { Sidebar } from './components/Sidebar';
import { useFollowersDelta } from './hooks/useFollowersDelta';
import { FollowersDelta } from './components/FollowersDelta';
import { PWAPrompts } from './components/PWAPrompts';
import { ComparisonPage } from './components/ComparisonPage';

const ReportPage = lazy(() => import('./components/ReportPage').then(m => ({ default: m.ReportPage })));
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { 
  BarChart3, 
  Users, 
  Heart, 
  MessageCircle, 
  Share2, 
  TrendingUp, 
  RefreshCw, 
  Percent, 
  Grid3X3, 
  MousePointerClick, 
  Sun, 
  Moon,
  Menu,
  FileText,
  LayoutDashboard,
  ArrowLeftRight
} from 'lucide-react';

const CACHE_KEY = 'mf:csv-cache-v1';

export default function App() {
  const [data, setData] = useState<InstagramPost[]>([]);
  const [seguidores, setSeguidores] = useState<number>(0);
  const [seguindo, setSeguindo] = useState<number>(0);
  const [isNetworkData, setIsNetworkData] = useState<number | boolean>(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(true);

  // Hook to track followers delta, history in localStorage and states
  const followersDelta = useFollowersDelta(seguidores, isNetworkData);

  // Navigation State
  const [activeTab, setActiveTab] = useState<'overview' | 'comparison' | 'report'>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  // Overview Filters
  const [period, setPeriod] = useState<'7' | '30' | '90' | 'ano' | 'tudo' | 'custom'>('tudo');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [postTypeFilter, setPostTypeFilter] = useState<'all' | 'video' | 'carrossel' | 'card_unico'>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);

  const filteredData = useMemo(() => {
    const dateRanges = calculateComparisonDateRanges(period, customStart, customEnd);
    const range = dateRanges.current;
    let filtered = data.filter(post => isDateInRange(post.data, range));

    if (postTypeFilter !== 'all') {
      filtered = filtered.filter(post => getPostType(post) === postTypeFilter);
    }

    // Continuous daily chart covering all calendar days in range
    let chartData: Array<{ data: Date; alcance: number; engajamentoTotal: number }>;

    if (dateRanges.current) {
      const dailyMap = new Map<string, { data: Date; alcance: number; engajamentoTotal: number }>();
      const cursor = new Date(dateRanges.current.start);
      const end = new Date(dateRanges.current.end);
      cursor.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      let count = 0;
      while (cursor <= end && count < 370) {
        count++;
        const dayKey = cursor.toLocaleDateString('pt-BR');
        dailyMap.set(dayKey, {
          data: new Date(cursor),
          alcance: 0,
          engajamentoTotal: 0
        });
        cursor.setDate(cursor.getDate() + 1);
      }

      filtered.forEach(curr => {
        const key = curr.data.toLocaleDateString('pt-BR');
        const item = dailyMap.get(key);
        if (item) {
          item.alcance += curr.alcance;
          item.engajamentoTotal += curr.engajamentoTotal;
        }
      });

      chartData = Array.from(dailyMap.values()).sort((a, b) => a.data.getTime() - b.data.getTime());
    } else {
      const grouped = filtered.reduce((acc, curr) => {
        const dateKey = curr.data.toDateString();
        if (!acc[dateKey]) {
          acc[dateKey] = { date: curr.data, alcance: 0, engajamentoTotal: 0 };
        }
        acc[dateKey].alcance += curr.alcance;
        acc[dateKey].engajamentoTotal += curr.engajamentoTotal;
        return acc;
      }, {} as Record<string, any>);

      chartData = Object.values(grouped).map(g => ({
        data: g.date,
        alcance: g.alcance,
        engajamentoTotal: g.engajamentoTotal
      })).sort((a, b) => a.data.getTime() - b.data.getTime());
    }

    return { filtered, chartData };
  }, [data, period, customStart, customEnd, postTypeFilter]);

  const { filtered, chartData } = filteredData;

  const kpis = useMemo(() => {
    let alcance = 0;
    let likes = 0;
    let compartilhamento = 0;
    let comentarios = 0;
    let engajamentoTotal = 0;

    for (const post of filtered) {
      alcance += post.alcance;
      likes += post.likes;
      compartilhamento += post.compartilhamento;
      comentarios += post.comentarios;
      engajamentoTotal += post.engajamentoTotal;
    }

    const engajamento = alcance > 0 ? (engajamentoTotal / alcance) * 100 : 0;

    return {
      alcance,
      likes,
      compartilhamento,
      comentarios,
      engajamentoTotal,
      engajamento,
      posts: filtered.length,
    };
  }, [filtered]);

  const applyCsv = useCallback((csvText: string, updatedAt: Date) => {
    const parsed = parseCSVData(csvText);
    setData(parsed.posts);
    setSeguidores(parsed.seguidores);
    setSeguindo(parsed.seguindo);
    setLastUpdated(updatedAt);
  }, []);

  const fetchData = useCallback(async (hasData = false) => {
    if (hasData) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const response = await fetch(SHEET_CSV_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error('Falha ao buscar dados');
      const csvText = await response.text();
      applyCsv(csvText, new Date());
      // só dados vindos da REDE contam para o histórico de seguidores
      setIsNetworkData(Date.now());
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ csv: csvText, at: Date.now() })); } catch {}
    } catch (err) {
      // offline / erro de rede: se já há dados na tela (cache), mantém sem derrubar o app
      if (!hasData) setError('Erro ao carregar dados. Verifique sua conexão e a URL do CSV.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [applyCsv]);

  // 1) mostra na hora o último CSV salvo  2) atualiza em segundo plano
  useEffect(() => {
    let hadCache = false;
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const { csv, at } = JSON.parse(raw);
        applyCsv(csv, new Date(at));
        hadCache = true;
        setLoading(false);
      }
    } catch {}
    fetchData(hadCache);
  }, [fetchData, applyCsv]);

  // ao voltar para o app (abrir da tela inicial) com mais de 5 min, atualiza sozinho
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && lastUpdated && Date.now() - lastUpdated.getTime() > 5 * 60 * 1000) {
        fetchData(true);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [lastUpdated, fetchData]);

  if (loading) {
    return (
      <div className={cn("h-screen flex flex-col items-center justify-center gap-3", darkMode ? "bg-[#0A0A0A] text-white" : "bg-[#F3F4F6] text-gray-900")}>
        <div className="w-8 h-8 border-3 border-[#DD2A7B] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-medium">Carregando dados do Instagram...</p>
      </div>
    );
  }

  if (error && data.length === 0) {
    return (
      <div className={cn("h-screen flex flex-col items-center justify-center p-6 text-center", darkMode ? "bg-[#0A0A0A] text-white" : "bg-[#F3F4F6] text-gray-900")}>
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-900 text-red-400 max-w-md">
          <p className="font-semibold mb-2">{error}</p>
          <button 
            onClick={() => fetchData(false)} 
            className="mt-2 px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen font-sans transition-colors duration-300", darkMode ? "bg-[#0A0A0A] text-gray-200" : "bg-[#F4F5F7] text-gray-900")}>
      {/* Collapsible Left Sidebar */}
      <Sidebar 
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        seguidores={seguidores}
        seguindo={seguindo}
      />

      {/* Main Content Area */}
      <div className={cn(
        "transition-all duration-300 flex flex-col min-h-screen",
        sidebarCollapsed ? "lg:pl-16" : "lg:pl-60"
      )}>
        {/* Fixed Top Navigation Bar */}
        <header className={cn(
          "fixed top-0 right-0 z-40 flex items-center justify-between px-4 sm:px-8 h-14 sm:h-16 border-b backdrop-blur-md transition-all duration-300 no-print",
          sidebarCollapsed ? "left-0 lg:left-16" : "left-0 lg:left-60",
          darkMode ? "bg-[#0A0A0A]/95 border-[#222222] shadow-sm shadow-black/30" : "bg-white/95 border-gray-200 shadow-xs"
        )}>
          <div className="flex items-center gap-3">
            {/* Hamburger Button (Mobile) */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className={cn(
                "p-2 rounded-xl border transition-colors lg:hidden",
                darkMode ? "border-[#262626] bg-[#141414] text-gray-300 hover:text-white" : "border-gray-200 bg-gray-100 text-gray-700"
              )}
              aria-label="Abrir menu lateral"
            >
              <Menu size={18} />
            </button>

            {/* Breadcrumb / Title Indicator */}
            <div className="flex items-center gap-2">
              <span className={cn("text-xs font-semibold uppercase tracking-wider hidden sm:inline", darkMode ? "text-gray-500" : "text-gray-400")}>
                Analytics
              </span>
              <span className={cn("text-xs hidden sm:inline", darkMode ? "text-gray-700" : "text-gray-300")}>/</span>
              <span className={cn("text-sm sm:text-base font-bold flex items-center gap-1.5", darkMode ? "text-white" : "text-gray-900")}>
                {activeTab === 'overview' ? (
                  <>
                    <LayoutDashboard size={15} className="text-[#DD2A7B]" /> Visão Geral
                  </>
                ) : activeTab === 'comparison' ? (
                  <>
                    <ArrowLeftRight size={15} className="text-[#EC4899]" /> Comparação
                  </>
                ) : (
                  <>
                    <FileText size={15} className="text-[#8134AF]" /> Gerar Relatório
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => fetchData(data.length > 0)} 
              disabled={refreshing}
              className={cn(
                "flex items-center gap-1.5 border px-3 py-1.5 disabled:opacity-60 rounded-xl transition text-xs font-medium shadow-xs", 
                darkMode ? "bg-[#141414] border-[#262626] text-white hover:bg-gray-800" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-100"
              )}
              title="Atualizar dados da planilha"
            >
              <RefreshCw size={13} className={cn((loading || refreshing) && "animate-spin")} /> 
              <span className="hidden sm:inline">Atualizar</span>
            </button>

            <button 
              onClick={() => setDarkMode(!darkMode)}
              aria-label="Alternar modo claro e escuro"
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-xl border transition shadow-xs", 
                darkMode ? "bg-[#141414] border-[#262626] text-amber-400 hover:bg-gray-800" : "bg-white border-gray-200 text-indigo-600 hover:bg-gray-100"
              )}
              title={darkMode ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
            >
              {darkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </header>

        {/* Spacer to prevent content from jumping or being hidden beneath the fixed bar */}
        <div className="h-14 sm:h-16 shrink-0 w-full no-print" aria-hidden="true" />

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' ? (
              <motion.div
                key="overview-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
              >
                {/* Visão Geral Header / Followers / Controls */}
                <header className="mb-6 sm:mb-8">
                  <div className="flex flex-row justify-between items-center gap-2 sm:gap-4 mb-5 sm:mb-6">
                    <h1 className={cn("text-lg sm:text-2xl font-bold truncate shrink-0", darkMode ? "text-white" : "text-gray-900")}>
                      Visão Geral
                    </h1>
                    {seguidores > 0 && (
                      <div className={cn(
                        "flex items-center gap-2 sm:gap-3 border px-2 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-[11px] transition-colors shrink-0",
                        darkMode ? "bg-[#121212] border-[#262626]" : "bg-white border-gray-200 shadow-sm"
                      )}>
                        <div className="flex flex-col text-left">
                          <span className={cn("block uppercase font-semibold text-[9px] sm:text-[11px] tracking-wider leading-tight", darkMode ? "text-gray-400" : "text-gray-500")}>
                            Seguidores
                          </span>
                          <FollowersDelta
                            followers={seguidores}
                            delta={followersDelta.delta}
                            since={followersDelta.since}
                            state={followersDelta.state}
                            darkMode={darkMode}
                          />
                        </div>
                        <div className={cn("self-stretch w-[1px] my-0.5 sm:my-1", darkMode ? "bg-[#262626]" : "bg-gray-200")}></div>
                        <div className="flex flex-col justify-center text-center px-0.5 sm:px-1">
                          <span className={cn("block uppercase font-semibold text-[9px] sm:text-[11px] tracking-wider leading-tight", darkMode ? "text-gray-400" : "text-gray-500")}>
                            Seguindo
                          </span>
                          <span className={cn("font-bold text-xs sm:text-base leading-none mt-0.5 sm:mt-1", darkMode ? "text-white" : "text-gray-900")}>
                            {seguindo.toLocaleString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Period selection */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[{label: '7d', val: '7'}, {label: '30d', val: '30'}, {label: '90d', val: '90'}, {label: 'Ano', val: 'ano'}, {label: 'Tudo', val: 'tudo'}, {label: 'Custom', val: 'custom'}].map((p) => (
                      <button 
                        key={p.val}
                        onClick={() => { setPeriod(p.val as any); setCurrentPage(1); }}
                        className={cn("px-2 py-1.5 rounded-lg transition text-[11px] truncate border", period === p.val ? "bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white border-transparent" : darkMode ? "bg-[#121212] border-[#262626] text-gray-400 hover:bg-gray-800" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm")}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  
                  {period === 'custom' && (
                    <div className={cn("flex gap-2 items-center p-2 rounded-lg border mb-4 transition-colors", darkMode ? "bg-[#121212] border-[#262626]" : "bg-white border-gray-200 shadow-sm")}>
                      <input type="date" className={cn("bg-transparent text-[10px] flex-1", darkMode ? "text-white" : "text-gray-900")} value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
                      <span className="text-gray-500">até</span>
                      <input type="date" className={cn("bg-transparent text-[10px] flex-1", darkMode ? "text-white" : "text-gray-900")} value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
                    </div>
                  )}

                  {/* Post type filters */}
                  <div className="grid grid-cols-4 gap-1.5 items-center">
                    {[
                      { label: 'Todos', val: 'all' },
                      { label: 'Vídeo', val: 'video' },
                      { label: 'Carrossel', val: 'carrossel' },
                      { label: 'Card', val: 'card_unico' },
                    ].map(t => (
                      <button
                        key={t.val}
                        onClick={() => { setPostTypeFilter(t.val as any); setCurrentPage(1); }}
                        className={cn("py-1.5 rounded-md transition text-[10px] text-center border truncate font-medium", postTypeFilter === t.val ? "bg-[#E1306C] text-white border-transparent" : darkMode ? "bg-[#121212] border-[#262626] text-gray-400 hover:bg-gray-800" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm")}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </header>

                {/* Top Reels Ranking */}
                <TopReels posts={filtered} period={period === 'custom' ? `${customStart} até ${customEnd}` : { '7': '7 dias', '30': '30 dias', '90': '90 dias', 'ano': 'Este ano', 'tudo': 'Tudo'}[period]} darkMode={darkMode} />

                {/* Metric KPI Cards */}
                <motion.div 
                  key={period}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-6 mb-10"
                >
                  <MetricCard index={0} title="Alcance" value={kpis.alcance.toLocaleString('pt-BR')} variation={null} isPositive={null} icon={Users} sparklineData={chartData.map(c => ({value: c.alcance}))} darkMode={darkMode} />
                  <MetricCard index={1} title="Curtidas" value={kpis.likes.toLocaleString('pt-BR')} variation={null} isPositive={null} icon={Heart} darkMode={darkMode} />
                  <MetricCard index={2} title="Compartilhamentos" value={kpis.compartilhamento.toLocaleString('pt-BR')} variation={null} isPositive={null} icon={Share2} darkMode={darkMode} />
                  <MetricCard index={3} title="Engajamento %" value={`${kpis.engajamento.toFixed(2).replace('.', ',')}%`} variation={null} isPositive={null} icon={Percent} sparklineData={chartData.map(c => ({value: c.engajamentoTotal}))} darkMode={darkMode} />
                  <MetricCard index={4} title="Engajamento Total" value={kpis.engajamentoTotal.toLocaleString('pt-BR')} variation={null} isPositive={null} icon={Users} darkMode={darkMode} />
                  <MetricCard index={5} title="Comentários" value={kpis.comentarios.toLocaleString('pt-BR')} variation={null} isPositive={null} icon={MessageCircle} darkMode={darkMode} />
                  <MetricCard index={6} title="Posts no Período" value={kpis.posts.toLocaleString('pt-BR')} variation={null} isPositive={null} icon={Grid3X3} darkMode={darkMode} />
                  <MetricCard index={7} title="Cliques Link Bio" value={MOCK_CLIQUES_LINK_BIO.toLocaleString('pt-BR')} variation={null} isPositive={null} icon={MousePointerClick} isMock={true} darkMode={darkMode} />
                </motion.div>

                {/* Charts Area */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                  <div className={cn("p-4 rounded-[12px] border transition-colors duration-300", darkMode ? "bg-[#121212] border-[#262626]" : "bg-white border-gray-200 shadow-sm")}>
                    <h3 className={cn("text-sm font-semibold mb-3", darkMode ? "text-gray-300" : "text-gray-800")}>Evolução do Alcance</h3>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ left: -20, right: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#374151" : "#E5E7EB"} />
                          <XAxis dataKey="data" tickFormatter={(d) => d.toLocaleDateString('pt-BR', {day: 'numeric', month: 'numeric'})} stroke={darkMode ? "#9CA3AF" : "#4B5563"} tick={{fontSize: 10}} />
                          <YAxis stroke={darkMode ? "#9CA3AF" : "#4B5563"} tick={{fontSize: 10}} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: darkMode ? '#1F2937' : '#FFFFFF', borderColor: darkMode ? '#374151' : '#E5E7EB', borderRadius: '8px', fontSize: '12px', color: darkMode ? '#FFFFFF' : '#111827' }}
                            labelFormatter={(label: any) => label instanceof Date ? label.toLocaleDateString('pt-BR') : String(label || '')}
                            formatter={(value: any) => [Number(value || 0).toLocaleString('pt-BR'), 'Alcance']}
                          />
                          <Area type="monotone" dataKey="alcance" stroke="#EC4899" fill="#EC4899" fillOpacity={0.3} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className={cn("p-4 rounded-[12px] border transition-colors duration-300", darkMode ? "bg-[#121212] border-[#262626]" : "bg-white border-gray-200 shadow-sm")}>
                    <h3 className={cn("text-sm font-semibold mb-3", darkMode ? "text-gray-300" : "text-gray-800")}>Evolução do Engajamento</h3>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ left: -20, right: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#374151" : "#E5E7EB"} />
                          <XAxis dataKey="data" tickFormatter={(d) => d.toLocaleDateString('pt-BR', {day: 'numeric', month: 'numeric'})} stroke={darkMode ? "#9CA3AF" : "#4B5563"} tick={{fontSize: 10}} />
                          <YAxis stroke={darkMode ? "#9CA3AF" : "#4B5563"} tick={{fontSize: 10}} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: darkMode ? '#1F2937' : '#FFFFFF', borderColor: darkMode ? '#374151' : '#E5E7EB', borderRadius: '8px', fontSize: '12px', color: darkMode ? '#FFFFFF' : '#111827' }}
                            labelFormatter={(label: any) => label instanceof Date ? label.toLocaleDateString('pt-BR') : String(label || '')}
                            formatter={(value: any) => [Number(value || 0).toFixed(2).replace('.', ',') + '%', 'Engj. Médio']}
                          />
                          <Line type="monotone" dataKey="engajamentoTotal" stroke="#EC4899" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
                
                {/* Detailed Table */}
                <p className={cn("text-xs mb-2", darkMode ? "text-gray-500" : "text-gray-600")}>{filtered.length} reels no período</p>
                <motion.div
                  key={`${period}-table`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <DataTable data={filtered} darkMode={darkMode} />
                </motion.div>

                {/* Automated Insights Section */}
                <div className="mt-10">
                  <InsightsSection posts={filtered} allPosts={data} period={period} customStart={customStart} customEnd={customEnd} darkMode={darkMode} />
                </div>
              </motion.div>
            ) : activeTab === 'comparison' ? (
              <motion.div
                key="comparison-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
              >
                {/* Comparação Mensal Dedicated Page */}
                <ComparisonPage 
                  posts={data}
                  darkMode={darkMode}
                />
              </motion.div>
            ) : (
              <motion.div
                key="report-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
              >
                <Suspense fallback={
                  <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">
                    <RefreshCw className="w-7 h-7 animate-spin text-[#EC4899]" />
                    <span className="text-xs font-medium tracking-wide">Carregando módulo de relatórios executivos...</span>
                  </div>
                }>
                  <ReportPage 
                    posts={data}
                    seguidores={seguidores}
                    seguindo={seguindo}
                    darkMode={darkMode}
                  />
                </Suspense>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <PWAPrompts hasCachedData={data.length > 0} />
    </div>
  );
}
