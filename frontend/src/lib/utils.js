export function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

const AVATAR_PALETTE = ['#4338EC', '#3F9E8F', '#DB9A2C', '#E0554A', '#8B90A0', '#6D5FF0'];

export function avatarColor(seed = '') {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

export function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function isOverdue(dateStr, status) {
  if (!dateStr || status === 'done') return false;
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

export function toInputDate(dateStr) {
  if (!dateStr) return '';
  return dateStr.slice(0, 10);
}
