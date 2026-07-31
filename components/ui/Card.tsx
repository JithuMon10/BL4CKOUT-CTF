import { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
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

export default function Card({ children, className = '', interactive = false, padding = 'md', ...rest }: CardProps) {
  return (
    <div
      className={`card ${interactive ? 'card-interactive cursor-pointer' : ''} ${paddingStyles[padding]} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
