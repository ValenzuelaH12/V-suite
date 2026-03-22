import { Wifi, WifiOff, RefreshCw } from 'lucide-react'

export function NetworkStatus({ 
  isOnline, 
  pendingSyncCount 
}: { 
  isOnline: boolean, 
  pendingSyncCount: number 
}) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
      isOnline 
        ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' 
        : 'bg-amber-500/10 border-amber-500/20 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
    }`}>
      {isOnline ? (
        <>
          <Wifi size={14} />
          <span className="text-[10px] font-black uppercase tracking-wider hidden md:block">Online</span>
        </>
      ) : (
        <>
          <WifiOff size={14} className="animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-wider">Modo Offline</span>
        </>
      )}
      {pendingSyncCount > 0 && (
        <div className="flex items-center gap-1.5 pl-2 ml-2 border-l border-current">
          <RefreshCw size={12} className="animate-spin" />
          <span className="text-[10px] font-bold">{pendingSyncCount}</span>
        </div>
      )}
    </div>
  )
}
