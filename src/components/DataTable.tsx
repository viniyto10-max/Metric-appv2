import React, { useState, useMemo } from 'react';
import { InstagramPost, getPostType } from '../utils/dataParser';
import { cn } from '../lib/utils';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { ReelThumb } from './ReelThumb';

interface DataTableProps {
  data: InstagramPost[];
  darkMode?: boolean;
}

export const DataTable: React.FC<DataTableProps> = ({ data, darkMode = true }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof InstagramPost, direction: 'asc' | 'desc' }>({ key: 'engajamentoNum', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const sortedData = useMemo(() => {
    let sortable = [...data];
    sortable.sort((a, b) => {
      if (sortConfig.key === 'tipoPost') {
        const typeA = getPostType(a);
        const typeB = getPostType(b);
        if (typeA === typeB) {
          return b.data.getTime() - a.data.getTime();
        }
        return sortConfig.direction === 'asc' 
          ? typeA.localeCompare(typeB) 
          : typeB.localeCompare(typeA);
      }

      let aVal = a[sortConfig.key] as any;
      let bVal = b[sortConfig.key] as any;
      
      if (aVal === bVal) {
          return b.data.getTime() - a.data.getTime();
      }
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sortable;
  }, [data, sortConfig]);

  const filteredData = sortedData.filter(post => 
    post.legenda.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const requestSort = (key: keyof InstagramPost) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
    setSortConfig({ key, direction });
  };

  const getEngagementBadge = (val: number) => {
    if (val >= 5) return "bg-green-900 text-green-300";
    if (val >= 2) return "bg-yellow-900 text-yellow-300";
    return darkMode ? "bg-gray-800 text-gray-400" : "bg-gray-200 text-gray-700";
  };

  const renderTypeBadge = (post: InstagramPost) => {
    const type = getPostType(post);
    if (type === 'video') {
      return (
        <span className={cn(
          "inline-flex items-center justify-center px-2 py-0.5 rounded-[5px] text-[8.5px] sm:text-[9.5px] font-bold uppercase tracking-wider border transition-colors",
          darkMode 
            ? "bg-purple-950/40 text-purple-300 border-purple-500/50" 
            : "bg-purple-100 text-purple-700 border-purple-300"
        )}>
          VÍDEO
        </span>
      );
    }
    if (type === 'carrossel') {
      return (
        <span className={cn(
          "inline-flex items-center justify-center px-2 py-0.5 rounded-[5px] text-[8.5px] sm:text-[9.5px] font-bold uppercase tracking-wider border transition-colors",
          darkMode 
            ? "bg-blue-950/40 text-blue-300 border-blue-500/50" 
            : "bg-blue-100 text-blue-700 border-blue-300"
        )}>
          CARROSSEL
        </span>
      );
    }
    return (
      <span className={cn(
        "inline-flex items-center justify-center px-2 py-0.5 rounded-[5px] text-[8.5px] sm:text-[9.5px] font-bold uppercase tracking-wider border transition-colors",
        darkMode 
          ? "bg-amber-950/40 text-amber-300 border-amber-500/50" 
          : "bg-amber-100 text-amber-700 border-amber-300"
      )}>
        CARD
      </span>
    );
  };

  return (
    <div className={cn("border rounded-[16px] p-6 transition-colors duration-300", darkMode ? "bg-[#0A0A0A] border-[#262626]" : "bg-white border-gray-200 shadow-sm")}>
      <h2 className={cn("text-xl font-bold mb-6 text-center", darkMode ? "text-white" : "text-gray-900")}>Listagem Detalhada de Reels</h2>
      <div className="flex justify-between items-center mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por legenda..." 
            className={cn("w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#E1306C] transition-colors", darkMode ? "bg-[#121212] text-white border-[#262626]" : "bg-gray-50 text-gray-900 border-gray-200")}
            value={searchTerm}
            onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
          />
        </div>
      </div>
      <div className="overflow-x-auto -mx-6 sm:mx-0">
        <table className="w-full text-left border-separate border-spacing-y-1 text-[9px] sm:text-xs">
          <thead>
            <tr className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">
              <th className="pb-1 px-1 text-left sm:text-center">Reel</th>
              <th className="pb-1 px-1.5 cursor-pointer text-center" onClick={() => requestSort('tipoPost')}>Tipo</th>
              <th className="pb-1 px-1 cursor-pointer" onClick={() => requestSort('likes')}>Lks</th>
              <th className="pb-1 px-1 cursor-pointer" onClick={() => requestSort('alcance')}>Alc</th>
              <th className="pb-1 px-1 cursor-pointer" onClick={() => requestSort('comentarios')}>Com</th>
              <th className="pb-1 px-1 cursor-pointer" onClick={() => requestSort('compartilhamento')}>Cmp</th>
              <th className="pb-1 px-1 cursor-pointer" onClick={() => requestSort('engajamentoTotal')}>Total</th>
              <th className="pb-1 px-1 cursor-pointer" onClick={() => requestSort('realEngajamento')}>Eng%</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((post, index) => (
              <tr key={index} className={cn("border rounded-[6px] hover:border-[#E1306C] transition-all", darkMode ? "bg-[#121212] border-[#262626] text-white" : "bg-white border-gray-200 text-gray-900 shadow-sm")}>
                <td className="py-1 px-1">
                  <div className="flex items-center gap-1.5">
                    <a href={post.post} target="_blank" rel="noreferrer" className="shrink-0">
                      <ReelThumb url={post.post} width="32px" height="57px" />
                    </a>
                    <span className={cn("text-[9px] font-medium whitespace-nowrap", darkMode ? "text-gray-400" : "text-gray-500")}>
                      {post.data.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}
                    </span>
                  </div>
                </td>
                <td className="py-1 px-1.5 text-center whitespace-nowrap">
                  {renderTypeBadge(post)}
                </td>
                <td className="py-1 px-1 font-bold text-center">{post.likes > 1000 ? (post.likes/1000).toFixed(1)+'k' : post.likes}</td>
                <td className="py-1 px-1 font-bold text-center">{post.alcance > 1000 ? (post.alcance/1000).toFixed(1)+'k' : post.alcance}</td>
                <td className="py-1 px-1 font-bold text-center">{post.comentarios}</td>
                <td className="py-1 px-1 font-bold text-center">{post.compartilhamento}</td>
                <td className="py-1 px-1 font-bold text-center">{post.engajamentoTotal > 1000 ? (post.engajamentoTotal/1000).toFixed(1)+'k' : post.engajamentoTotal}</td>
                <td className="py-1 px-1 text-center">
                  <span className={cn("px-1 py-0.5 rounded-full text-[8px] sm:text-xs font-bold", getEngagementBadge(post.realEngajamento))}>
                    {post.realEngajamento.toFixed(1).replace('.', ',')}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={cn("flex justify-between items-center mt-4 text-sm", darkMode ? "text-gray-400" : "text-gray-600")}>
        <button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)} className="hover:text-white disabled:text-gray-700 flex items-center gap-1"><ChevronLeft size={16}/> Anterior</button>
        <span>Página {currentPage} de {totalPages || 1}</span>
        <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(currentPage + 1)} className="hover:text-white disabled:text-gray-700 flex items-center gap-1">Próximo <ChevronRight size={16}/></button>
      </div>
    </div>
  );
};
