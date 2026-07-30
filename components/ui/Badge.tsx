import { ReactNode } from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  danger: 'bg-red-500/10 text-red-400 border-red-500/20',
  info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  outline: 'bg-transparent text-zinc-400 border-zinc-700',
};

export default function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

// Pre-built category badge
const categoryColors: Record<string, BadgeVariant> = {
  Web: 'info',
  Forensics: 'warning',
  Pwn: 'danger',
  Crypto: 'success',
  Reverse: 'default',
  Misc: 'outline',
};

export function CategoryBadge({ category }: { category: string }) {
  return <Badge variant={categoryColors[category] || 'default'}>{category}</Badge>;
}

// Pre-built difficulty badge
const difficultyColors: Record<string, BadgeVariant> = {
  Easy: 'success',
  Medium: 'warning',
  Hard: 'danger',
};

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  return <Badge variant={difficultyColors[difficulty] || 'default'}>{difficulty}</Badge>;
}
