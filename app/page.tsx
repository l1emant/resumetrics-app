import { MainWorkspace } from '@/components/main-workspace';

export default function Page() {
  return (
    <div className="min-h-screen w-full relative">
      {/* Dot Matrix + subtle center glow */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundColor: '#060606',
          backgroundImage: `
            radial-gradient(circle at 25% 25%, #1a1a1a 0.5px, transparent 1px),
            radial-gradient(circle at 75% 75%, #111111 0.5px, transparent 1px)
          `,
          backgroundSize: '10px 10px',
          imageRendering: 'pixelated' as const,
        }}
      />
      {/* Soft emerald ambient */}
      <div
        className="fixed inset-0 z-0 pointer-events-none animate-pulse-glow"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 45%, rgba(16,185,129,0.06) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl">
          <MainWorkspace />
        </div>
      </div>
    </div>
  );
}