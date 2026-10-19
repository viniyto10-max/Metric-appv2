import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { FollowersDeltaState } from '../hooks/useFollowersDelta';
import { cn } from '../lib/utils';

export interface FollowersDeltaProps {
  delta: number;
  since: string | null;
  state: FollowersDeltaState;
  followers?: number | string;
  darkMode?: boolean;
  className?: string;
}

export const FollowersDelta: React.FC<FollowersDeltaProps> = ({
  delta,
  since,
  state,
  followers,
  darkMode = true,
  className
}) => {
  // Determine pill styling according to specification
  const getBadgeStyle = () => {
    switch (state) {
      case 'gain':
        return {
          backgroundColor: 'rgba(34, 197, 94, 0.16)',
          color: '#4ade80'
        };
      case 'loss':
        return {
          backgroundColor: 'rgba(239, 68, 68, 0.16)',
          color: '#f87171'
        };
      case 'same':
      case 'first':
      default:
        return {
          backgroundColor: 'rgba(156, 163, 175, 0.14)',
          color: '#9ca3af'
        };
    }
  };

  // Determine pill icon
  const renderIcon = () => {
    switch (state) {
      case 'gain':
        return <ArrowUpRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0 stroke-[2.5]" aria-hidden="true" />;
      case 'loss':
        return <ArrowDownRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0 stroke-[2.5]" aria-hidden="true" />;
      case 'same':
      case 'first':
      default:
        return <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0 stroke-[2.5]" aria-hidden="true" />;
    }
  };

  // Determine pill text with explicit sign (+ / - / 0)
  const renderText = () => {
    switch (state) {
      case 'gain':
        return `+${delta.toLocaleString('pt-BR')}`;
      case 'loss':
        return `-${Math.abs(delta).toLocaleString('pt-BR')}`;
      case 'same':
      case 'first':
      default:
        return '0';
    }
  };

  // Determine descriptive support line text
  const getSupportLineText = () => {
    if (state === 'first') {
      return 'monitorando a partir de agora';
    }
    if (state === 'same') {
      if (!since) return 'sem variação';
      return since.startsWith('sem variação') ? since : `sem variação ${since}`;
    }
    if (!since) return '';
    return since.startsWith('desde') ? since : `desde ${since}`;
  };

  // Determine accessible aria-label for screen readers
  const getAriaLabel = () => {
    const supportText = getSupportLineText();
    switch (state) {
      case 'gain':
        return `Ganhou ${delta.toLocaleString('pt-BR')} seguidores ${since || ''}`.trim();
      case 'loss':
        return `Perdeu ${Math.abs(delta).toLocaleString('pt-BR')} seguidores ${since || ''}`.trim();
      case 'same':
        return `Sem variação de seguidores ${since ? (since.startsWith('sem variação ') ? since.replace('sem variação ', '') : since) : ''}`.trim();
      case 'first':
      default:
        return 'Primeira leitura: monitorando seguidores a partir de agora';
    }
  };

  const supportText = getSupportLineText();

  return (
    <div className={cn("flex flex-col text-left", className)}>
      {/* Number and Badge Row */}
      <div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap">
        {followers !== undefined && (
          <span className={cn("font-bold text-xs sm:text-base leading-none", darkMode ? "text-white" : "text-gray-900")}>
            {typeof followers === 'number' ? followers.toLocaleString('pt-BR') : followers}
          </span>
        )}

        {/* Rounded Pill Badge */}
        <span
          role="status"
          aria-label={getAriaLabel()}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 sm:px-2 rounded-full text-[10px] sm:text-xs font-semibold leading-none shrink-0 transition-colors"
          style={getBadgeStyle()}
        >
          {renderIcon()}
          <span>{renderText()}</span>
        </span>
      </div>

      {/* Support Line below the number */}
      <span className="text-[10px] sm:text-xs text-[#6b7280] font-normal leading-tight mt-0.5 block truncate max-w-[110px] sm:max-w-none">
        {supportText}
      </span>
    </div>
  );
};
