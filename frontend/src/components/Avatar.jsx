import { initials, avatarColor } from '../lib/utils';

export default function Avatar({ name, size = 28, ring = false }) {
  if (!name) {
    return (
      <div
        className="rounded-full border border-dashed border-border flex items-center justify-center text-ink-faint shrink-0"
        style={{ width: size, height: size, fontSize: size * 0.38 }}
        title="Unassigned"
      >
        ?
      </div>
    );
  }
  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-semibold shrink-0 ${ring ? 'ring-2 ring-surface' : ''}`}
      style={{ width: size, height: size, fontSize: size * 0.38, backgroundColor: avatarColor(name) }}
      title={name}
    >
      {initials(name)}
    </div>
  );
}
