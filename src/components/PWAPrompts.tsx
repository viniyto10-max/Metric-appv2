import { AnimatePresence, motion } from 'framer-motion';
import { Download, RefreshCw, Share, SquarePlus, WifiOff, X } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';

export function PWAPrompts({ hasCachedData }: { hasCachedData: boolean }) {
  const pwa = usePWA();

  return (
    <>
      {/* Offline */}
      <AnimatePresence>
        {!pwa.online && (
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="fixed left-1/2 -translate-x-1/2 z-50 flex w-max max-w-[calc(100%-2rem)] items-center gap-2 rounded-full bg-yellow-900/95 border border-yellow-700 text-yellow-100 text-xs px-4 py-2 shadow-lg"
            style={{ bottom: 'calc(var(--safe-bottom) + 16px)' }}
            role="status"
          >
            <WifiOff size={14} />
            {hasCachedData ? 'Sem conexão · exibindo últimos dados salvos' : 'Sem conexão'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nova versão */}
      <AnimatePresence>
        {pwa.needRefresh && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed inset-x-4 z-50 mx-auto max-w-md flex items-center gap-3 rounded-2xl bg-[#1a1a1a] border border-[#333] p-4 shadow-2xl"
            style={{ bottom: 'calc(var(--safe-bottom) + 16px)' }}
            role="alert"
          >
            <RefreshCw size={18} className="text-[#E1306C] shrink-0" />
            <span className="flex-1 text-sm text-white">Nova versão disponível</span>
            <button onClick={pwa.applyUpdate} className="rounded-lg bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] px-3 py-1.5 text-xs font-semibold text-white">
              Atualizar
            </button>
            <button onClick={pwa.closeUpdate} aria-label="Fechar" className="text-gray-500 hover:text-white">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instalar – Android / Chrome / Edge */}
      <AnimatePresence>
        {pwa.canInstallNative && !pwa.needRefresh && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed inset-x-4 z-40 mx-auto max-w-md flex items-center gap-3 rounded-2xl bg-[#1a1a1a] border border-[#333] p-4 shadow-2xl"
            style={{ bottom: 'calc(var(--safe-bottom) + 16px)' }}
          >
            <img src="/icons/icon-192.png" alt="" className="h-10 w-10 rounded-xl" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">Instalar InstaTrack</p>
              <p className="text-xs text-gray-400">Acesso rápido, tela cheia e modo offline</p>
            </div>
            <button onClick={pwa.install} className="flex items-center gap-1 rounded-lg bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] px-3 py-2 text-xs font-semibold text-white">
              <Download size={14} /> Instalar
            </button>
            <button onClick={pwa.dismissInstall} aria-label="Agora não" className="text-gray-500 hover:text-white">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instalar – iOS (Safari não tem prompt, o usuário precisa fazer manualmente) */}
      <AnimatePresence>
        {pwa.showIOSHint && !pwa.needRefresh && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed inset-x-4 z-40 mx-auto max-w-md rounded-2xl bg-[#1a1a1a] border border-[#333] p-4 shadow-2xl"
            style={{ bottom: 'calc(var(--safe-bottom) + 16px)' }}
          >
            <button onClick={pwa.dismissInstall} aria-label="Fechar" className="absolute right-3 top-3 text-gray-500 hover:text-white">
              <X size={16} />
            </button>
            <div className="flex items-center gap-3 mb-3">
              <img src="/icons/icon-192.png" alt="" className="h-10 w-10 rounded-xl" />
              <p className="text-sm font-semibold text-white">Instale o InstaTrack no iPhone</p>
            </div>
            <ol className="space-y-2 text-xs text-gray-300">
              <li className="flex items-center gap-2">
                <span className="text-gray-500">1.</span> Toque em <Share size={14} className="text-[#0A84FF]" /> <b>Compartilhar</b> no Safari
              </li>
              <li className="flex items-center gap-2">
                <span className="text-gray-500">2.</span> Escolha <SquarePlus size={14} /> <b>Adicionar à Tela de Início</b>
              </li>
            </ol>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
