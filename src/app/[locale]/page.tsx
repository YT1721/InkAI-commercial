import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Sparkles, ArrowRight, Play, Film, ScrollText, Image as ImageIcon } from 'lucide-react';

export default function LandingPage({params: {locale}}: {params: {locale: string}}) {
  const t = useTranslations('Index');

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col items-center justify-center">
      <div className="absolute inset-0 noise-bg opacity-[0.03]" />
      
      {/* Hero Content */}
      <div className="z-10 flex flex-col items-center text-center px-4 max-w-4xl animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="mb-6 flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full backdrop-blur-md">
           <Sparkles size={14} className="text-cyan-400" />
           <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">InkAI Studio v1.14</span>
        </div>
        
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-200 to-zinc-600 drop-shadow-2xl mb-6 italic pr-8">
          InkAI
        </h1>
        
        <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mb-10 leading-relaxed font-light">
          {t('description')}
        </p>

        <div className="flex gap-4">
          <Link href={`/${locale}/dashboard`} className="group flex items-center gap-2 px-8 py-4 bg-white text-black rounded-full font-bold text-lg hover:scale-105 transition-all shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]">
            <Play size={20} fill="currentColor" />
            <span>Start Creating</span>
          </Link>
          <button className="px-8 py-4 bg-white/5 text-white border border-white/10 rounded-full font-bold text-lg hover:bg-white/10 transition-all backdrop-blur-sm">
            View Gallery
          </button>
        </div>
      </div>

      {/* Feature Cards (Visual Only) */}
      <div className="absolute bottom-12 w-full max-w-6xl px-6 grid grid-cols-1 md:grid-cols-3 gap-6 opacity-40 pointer-events-none hidden md:grid">
         <div className="h-32 border border-white/5 rounded-2xl bg-white/5 backdrop-blur-md p-4 flex flex-col justify-end">
            <ScrollText className="text-amber-500 mb-2" />
            <span className="text-sm font-bold">Script Master</span>
         </div>
         <div className="h-32 border border-white/5 rounded-2xl bg-white/5 backdrop-blur-md p-4 flex flex-col justify-end">
            <ImageIcon className="text-cyan-500 mb-2" />
            <span className="text-sm font-bold">Image Gen</span>
         </div>
         <div className="h-32 border border-white/5 rounded-2xl bg-white/5 backdrop-blur-md p-4 flex flex-col justify-end">
            <Film className="text-purple-500 mb-2" />
            <span className="text-sm font-bold">Video Director</span>
         </div>
      </div>
    </div>
  );
}
