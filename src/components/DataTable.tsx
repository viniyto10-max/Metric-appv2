import React, { useState, useMemo } from 'react';
import { InstagramPost } from '../utils/dataParser';
import { cn } from '../lib/utils';
import { Search, Film, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { ReelThumb } from './ReelThumb';

export const DataTable: React.FC<{ data: InstagramPost[] }> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof InstagramPost, direction: 'asc' | 'desc' }>({ key: 'engajamentoNum', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const sortedData = useMemo(() => {
    let sortable = [...data];
    sortable.sort((a, b) => {
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
    (post.legenda || '').toLowerCase().includes(searchTerm.toLowerCase())
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
    return "bg-gray-800 text-gray-400";
  };

  return (
    <div className="bg-[#0A0A0A] border border-[#262626] rounded-[16px] p-6">
      <h2 className="text-xl font-bold text-white mb-6 text-center">Listagem Detalhada de Reels</h2>
      <div className="flex justify-between items-center mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por legenda..." 
            inputMode="search"
            enterKeyHint="search" 
            className="w-full bg-[#121212] text-white pl-10 pr-4 py-2 rounded-lg border border-[#262626] focus:outline-none focus:ring-2 focus:ring-[#E1306C]"
            value={searchTerm}
            onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
          />
        </div>
      </div>
      <div className="overflow-x-auto -mx-6 sm:mx-0">
        <table className="w-full text-left border-separate border-spacing-y-1 text-[9px] sm:text-xs">
          <thead>
            <tr className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">
              <th className="pb-1 px-1">Reel</th>
              <th className="pb-1 px-1 cursor-pointer" onClick={() => requestSort('likes')}>Lks</th>
              <th className="pb-1 px-1 cursor-pointer" onClick={() => requestSort('alcance')}>Alc</th>
              <th className="pb-1 px-1 cursor-pointer" onClick={() => requestSort('comentarios')}>Com</th>
              <th className="pb-1 px-1 cursor-pointer" onClick={() => requestSort('compartilhamento')}>Cmp</th>
              <th className="pb-1 px-1 cursor-pointer" onClick={() => requestSort('engajamentoTotal')}>Total</th>
              <th className="pb-1 px-1 cursor-pointer" onClick={() => requestSort('realEngajamento')}>Eng%</th>
            </tr>
          </thead>
          <tbody className="text-white">
            {paginatedData.map((post, index) => (
              <tr key={`${post.post}-${post.data.getTime()}-${index}`} className="bg-[#121212] border border-[#262626] rounded-[6px] hover:border-[#E1306C] transition-all">
                <td className="py-1 px-1 flex items-center gap-1">
                  <a href={post.post} target="_blank" rel="noreferrer" className="shrink-0">
                    <ReelThumb url={post.post} width="32px" height="57px" />
                  </a>
                  <span className="text-[8px] text-gray-500">{post.data.toLocaleDateString('pt-BR', {day: 'numeric', month: 'numeric'})}</span>
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
      <div className="flex justify-between items-center mt-4 text-sm text-gray-400">
        <button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)} className="hover:text-white disabled:text-gray-700 flex items-center gap-1"><ChevronLeft size={16}/> Anterior</button>
        <span>Página {currentPage} de {totalPages || 1}</span>
        <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(currentPage + 1)} className="hover:text-white disabled:text-gray-700 flex items-center gap-1">Próximo <ChevronRight size={16}/></button>
      </div>
    </div>
  );
};
