import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export default function Card({ children, className = '', interactive = false, padding = 'md' }: CardProps) {
  return (
    <div className={`card ${interactive ? 'card-interactive cursor-pointer' : ''} ${paddingStyles[padding]} ${className}`}>
      {children}
    </div>
  );
}
