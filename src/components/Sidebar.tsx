import React from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  ArrowLeftRight,
  ChevronLeft, 
  ChevronRight, 
  X, 
  Sun, 
  Moon
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const InstagramIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

interface SidebarProps {
  activeTab: 'overview' | 'comparison' | 'report';
  onSelectTab: (tab: 'overview' | 'comparison' | 'report') => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  seguidores?: number;
  seguindo?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  darkMode,
  setDarkMode,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  seguidores = 0,
  seguindo = 0
}) => {
  const isCompact = collapsed && !mobileOpen;

  const navItems = [
    {
      id: 'overview' as const,
      label: 'Visão Geral',
      badge: null,
      icon: LayoutDashboard,
      description: 'Dashboard interativo e KPIs'
    },
    {
      id: 'comparison' as const,
      label: 'Comparação',
      badge: 'Mensal',
      icon: ArrowLeftRight,
      description: 'Comparativo entre meses'
    },
    {
      id: 'report' as const,
      label: 'Gerar Relatório',
      badge: 'PDF / XLS',
      icon: FileText,
      description: 'Exportação e comparativo'
    }
  ];

  const handleItemClick = (id: 'overview' | 'comparison' | 'report') => {
    onSelectTab(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onCloseMobile}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden no-print"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex flex-col border-r transition-all duration-300 no-print",
          darkMode 
            ? "bg-[#0D0D0D] border-[#222222] text-gray-200" 
            : "bg-white border-gray-200 text-gray-800 shadow-xl lg:shadow-none",
          // Mobile responsive placement
          mobileOpen ? "translate-x-0 w-64 pointer-events-auto" : "-translate-x-full w-64 pointer-events-none lg:pointer-events-auto lg:translate-x-0",
          // Desktop width: 64px when compact/collapsed, 240px when expanded
          collapsed ? "lg:w-16" : "lg:w-60"
        )}
      >
        {/* Header / Brand Top - Clean centered logo without overlapping arrows */}
        <div className={cn(
          "h-16 flex items-center border-b border-inherit px-3 shrink-0",
          isCompact ? "justify-center" : "justify-between"
        )}>
          <div className={cn(
            "flex items-center",
            isCompact ? "justify-center w-full" : "gap-3 truncate"
          )}>
            {/* Instagram Logo: resized to exactly 30px, centered and framed */}
            <div 
              className="w-[30px] h-[30px] rounded-lg bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] flex items-center justify-center shrink-0 shadow-sm"
              title="InstaTrack"
            >
              <InstagramIcon className="w-4 h-4 text-white" />
            </div>

            {/* Brand text only in expanded/mobile mode */}
            {!isCompact && (
              <div className="flex flex-col truncate">
                <span className="font-bold text-sm tracking-tight truncate flex items-center gap-1.5">
                  InstaTrack
                  <span className="px-1.5 py-0.5 text-[8px] rounded font-semibold bg-[#DD2A7B]/15 text-[#DD2A7B]">PRO</span>
                </span>
                <span className={cn("text-[10px] truncate", darkMode ? "text-gray-400" : "text-gray-500")}>
                  Painel de Métricas
                </span>
              </div>
            )}
          </div>

          {/* Close button on Mobile only */}
          {mobileOpen && (
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white lg:hidden"
              aria-label="Fechar menu"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-2.5 space-y-2 overflow-y-auto">
          {!isCompact && (
            <p className={cn("px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider", darkMode ? "text-gray-500" : "text-gray-400")}>
              Navegação
            </p>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                title={item.label}
                className={cn(
                  "transition-all duration-200 group relative flex items-center rounded-xl",
                  isActive
                    ? "bg-gradient-to-r from-[#DD2A7B] to-[#8134AF] text-white shadow-md shadow-[#DD2A7B]/20"
                    : darkMode
                      ? "text-gray-400 hover:text-white hover:bg-[#181818]"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
                  // Compact mode: perfectly centered 42px touch target in 64px bar
                  isCompact 
                    ? "w-10 h-10 mx-auto justify-center p-0" 
                    : "w-full px-3 py-2.5 justify-between gap-3 text-xs font-medium"
                )}
              >
                <div className={cn("flex items-center", isCompact ? "justify-center" : "gap-3 truncate")}>
                  <Icon className={cn("w-5 h-5 shrink-0 transition-transform group-hover:scale-110", isActive ? "text-white" : darkMode ? "text-gray-400" : "text-gray-600")} />
                  {!isCompact && (
                    <div className="text-left truncate">
                      <div className="truncate font-semibold">{item.label}</div>
                      <div className={cn("text-[10px] truncate font-normal opacity-80", isActive ? "text-white/80" : darkMode ? "text-gray-500" : "text-gray-500")}>
                        {item.description}
                      </div>
                    </div>
                  )}
                </div>

                {!isCompact && item.badge && (
                  <span className={cn(
                    "px-1.5 py-0.5 text-[9px] rounded-md font-bold uppercase shrink-0",
                    isActive ? "bg-white/20 text-white" : darkMode ? "bg-[#222222] text-gray-300" : "bg-gray-200 text-gray-700"
                  )}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Area: Stats (if expanded), Repositioned Toggle Arrow, and Theme Button */}
        <div className="p-2.5 border-t border-inherit space-y-2 shrink-0">
          {/* Stats summary in expanded mode */}
          {!isCompact && seguidores > 0 && (
            <div className={cn("p-2.5 rounded-xl border text-[11px]", darkMode ? "bg-[#141414] border-[#222222]" : "bg-gray-50 border-gray-200")}>
              <div className="flex justify-between items-center mb-1">
                <span className={cn("text-[10px] uppercase font-bold", darkMode ? "text-gray-400" : "text-gray-500")}>Seguidores</span>
                <span className={cn("font-bold", darkMode ? "text-white" : "text-gray-900")}>{seguidores.toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className={cn("text-[10px] uppercase font-bold", darkMode ? "text-gray-400" : "text-gray-500")}>Seguindo</span>
                <span className={cn("font-bold", darkMode ? "text-white" : "text-gray-900")}>{seguindo.toLocaleString('pt-BR')}</span>
              </div>
            </div>
          )}

          {/* Repositioned Collapse / Expand Arrow - placed in footer, completely separate from the logo */}
          <button
            onClick={onToggleCollapse}
            className={cn(
              "hidden lg:flex items-center rounded-xl border transition-colors",
              darkMode 
                ? "border-[#262626] bg-[#141414] text-gray-400 hover:text-white hover:bg-[#1e1e1e]" 
                : "border-gray-200 bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200",
              isCompact 
                ? "w-10 h-10 mx-auto justify-center" 
                : "w-full px-3 py-2 justify-between text-xs font-medium"
            )}
            title={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
            aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
          >
            {isCompact ? (
              <ChevronRight size={16} />
            ) : (
              <>
                <span className="flex items-center gap-2">
                  <ChevronLeft size={16} />
                  <span>Recolher</span>
                </span>
                <span className="text-[10px] text-gray-500">64px</span>
              </>
            )}
          </button>

          {/* Theme switch button: adapts seamlessly to 64px compact width */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={cn(
              "flex items-center rounded-xl border transition-colors",
              darkMode 
                ? "bg-[#141414] border-[#262626] text-gray-300 hover:text-white hover:bg-[#1e1e1e]" 
                : "bg-gray-100 border-gray-200 text-gray-700 hover:text-gray-900 hover:bg-gray-200",
              isCompact 
                ? "w-10 h-10 mx-auto justify-center" 
                : "w-full px-3 py-2 justify-between text-xs font-medium"
            )}
            title={darkMode ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
            aria-label={darkMode ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
          >
            {isCompact ? (
              darkMode ? <Sun size={16} className="text-amber-400 shrink-0" /> : <Moon size={16} className="text-indigo-600 shrink-0" />
            ) : (
              <>
                <div className="flex items-center gap-2.5 truncate">
                  {darkMode ? <Sun size={16} className="text-amber-400 shrink-0" /> : <Moon size={16} className="text-indigo-600 shrink-0" />}
                  <span>{darkMode ? "Modo Claro" : "Modo Escuro"}</span>
                </div>
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-mono", darkMode ? "bg-black/40 text-gray-400" : "bg-white text-gray-600")}>
                  {darkMode ? 'DARK' : 'LIGHT'}
                </span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};
