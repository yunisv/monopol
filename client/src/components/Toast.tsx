'use client';

export interface ToastItem {
  id: number;
  text: string;
  emoji: string;
  color: string;
}

interface Props {
  toasts: ToastItem[];
}

export default function Toast({ toasts }: Props) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-16 right-3 flex flex-col gap-2 z-50 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className="toast-enter flex items-center gap-2 bg-black/85 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2.5 shadow-2xl"
        >
          <span className="text-xl leading-none">{t.emoji}</span>
          <span className={`text-sm font-bold ${t.color}`}>{t.text}</span>
        </div>
      ))}
    </div>
  );
}
