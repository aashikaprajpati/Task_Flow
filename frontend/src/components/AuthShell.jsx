export default function AuthShell({ title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-[44%] bg-ink relative overflow-hidden flex-col justify-between px-12 py-10">
        <div className="flex items-center gap-2.5 relative z-10">
          <svg width="26" height="26" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="8" fill="#6D5FF0" />
            <rect x="6" y="8" width="6" height="16" rx="2" fill="white" opacity="0.95" />
            <rect x="13" y="8" width="6" height="10" rx="2" fill="white" opacity="0.75" />
            <rect x="20" y="8" width="6" height="6" rx="2" fill="white" opacity="0.55" />
          </svg>
          <span className="font-display font-semibold text-lg tracking-tight text-white">TaskFlow</span>
        </div>

        <div className="relative z-10">
          <h1 className="font-display text-4xl font-semibold text-white leading-[1.15] max-w-sm">
            Plan the work. Watch it move.
          </h1>
          <p className="text-white/60 mt-4 max-w-sm leading-relaxed">
            Kanban boards, projects, and deadlines for teams who'd rather build than manage spreadsheets.
          </p>
        </div>

        {/* Signature element: an ambient stack of kanban-card silhouettes drifting behind the copy */}
        <div className="absolute inset-0 opacity-90" aria-hidden="true">
          {[
            { top: '8%', left: '58%', w: 150, h: 56, rot: -8, delay: '0s', color: '#6D5FF0' },
            { top: '28%', left: '78%', w: 120, h: 44, rot: 6, delay: '0.4s', color: '#3F9E8F' },
            { top: '48%', left: '62%', w: 160, h: 50, rot: -4, delay: '0.8s', color: '#DB9A2C' },
            { top: '68%', left: '80%', w: 130, h: 46, rot: 10, delay: '1.2s', color: '#E0554A' },
            { top: '85%', left: '55%', w: 140, h: 48, rot: -6, delay: '1.6s', color: '#4338EC' },
          ].map((c, i) => (
            <div
              key={i}
              className="absolute rounded-xl border border-white/10 backdrop-blur-sm animate-[floatCard_7s_ease-in-out_infinite]"
              style={{
                top: c.top,
                left: c.left,
                width: c.w,
                height: c.h,
                background: 'rgba(255,255,255,0.03)',
                animationDelay: c.delay,
              }}
            >
              <div className="w-8 h-1.5 rounded-full m-3" style={{ background: c.color }} />
              <div className="w-16 h-1.5 rounded-full mx-3 mb-1.5 bg-white/15" />
              <div className="w-10 h-1.5 rounded-full mx-3 bg-white/10" />
            </div>
          ))}
        </div>
        <p className="text-white/30 text-xs relative z-10">Built for the TaskFlow team project.</p>
        <style>{`@keyframes floatCard { 0%, 100% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-10px) rotate(1deg); } }`}</style>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-bg">
        <div className="w-full max-w-sm animate-fadeIn">
          <h2 className="font-display text-2xl font-semibold text-ink">{title}</h2>
          <p className="text-ink-soft text-sm mt-1.5 mb-7">{subtitle}</p>
          {children}
          <p className="text-sm text-ink-soft mt-6 text-center">{footer}</p>
        </div>
      </div>
    </div>
  );
}
