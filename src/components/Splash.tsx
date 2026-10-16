export function Splash({ error, onRetry }: { error?: string | null; onRetry?: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[#0A0A0A] px-6 text-center">
      <img src="/icons/icon-192.png" alt="MetricFlow" className={`h-20 w-20 rounded-[22px] ${error ? '' : 'mf-pulse'}`} />
      {error ? (
        <>
          <p className="text-red-400 text-sm max-w-xs">{error}</p>
          <button
            onClick={onRetry}
            className="rounded-lg bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] px-5 py-2.5 text-sm font-semibold text-white"
          >
            Tentar novamente
          </button>
        </>
      ) : (
        <p className="text-gray-400 text-sm">Carregando métricas…</p>
      )}
    </div>
  );
}
