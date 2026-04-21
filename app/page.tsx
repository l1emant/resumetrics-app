import { MainWorkspace } from '@/components/main-workspace';

export default function Page() {
  return (
    <div className="min-h-screen w-full relative">
      {/* Dot Matrix + subtle center glow */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundColor: 'var(--page-bg)',
          backgroundImage: `
            radial-gradient(circle at 25% 25%, var(--page-dot-a) 0.5px, transparent 1px),
            radial-gradient(circle at 75% 75%, var(--page-dot-b) 0.5px, transparent 1px)
          `,
          backgroundSize: '10px 10px',
          imageRendering: 'pixelated' as const,
        }}
      />
      {/* Soft emerald ambient */}
      <div
        className="fixed inset-0 z-0 pointer-events-none animate-pulse-glow"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 45%, var(--page-glow) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 min-h-screen flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-5xl">
          <MainWorkspace />
        </div>
      </div>
    </div>
  );
}