import { createElement, type CSSProperties, type ReactNode } from 'react';
import { useReveal } from '../lib/useReveal';

type RevealVariant = 'up' | 'fade' | 'scale';

interface RevealProps {
  children: ReactNode;
  /** Motion shape. 'up' for most content, 'fade' for large media, 'scale' for cards. */
  variant?: RevealVariant;
  /** Delay in ms. Use for staggering siblings — see RevealGroup. */
  delay?: number;
  /** Element to render. Keeps section semantics intact where it wraps one. */
  as?: 'div' | 'section' | 'li' | 'article' | 'span' | 'h2' | 'h3' | 'p';
  className?: string;
  id?: string;
  style?: CSSProperties;
}

/**
 * Wraps content in a one-shot scroll reveal.
 *
 * The visual state lives in two classes defined in index.css (`reveal-*`), not
 * in inline styles, so the reduced-motion guard can be written once in CSS and
 * cannot be forgotten at a call site.
 */
export function Reveal({
  children,
  variant = 'up',
  delay = 0,
  as = 'div',
  className = '',
  id,
  style,
}: RevealProps) {
  const { ref, revealed } = useReveal<HTMLElement>();

  return createElement(
    as,
    {
      ref,
      id,
      className: `reveal reveal--${variant} ${revealed ? 'is-revealed' : ''} ${className}`.trim(),
      style: delay ? ({ ...style, '--reveal-delay': `${delay}ms` } as CSSProperties) : style,
    },
    children,
  );
}

interface RevealGroupProps {
  children: ReactNode[];
  /** Per-item delay step in ms. 70ms reads as a deliberate cascade. */
  step?: number;
  /** Cap total delay so long lists don't leave the last item waiting. */
  maxDelay?: number;
  variant?: RevealVariant;
  as?: 'div' | 'section';
  className?: string;
  id?: string;
  itemAs?: 'div' | 'li' | 'article';
  itemClassName?: string;
}

/**
 * Staggers a set of siblings. Each child is wrapped individually so they share
 * one cascade rather than animating as a single block — the difference between
 * a grid that "arrives" and one that just appears.
 */
export function RevealGroup({
  children,
  step = 70,
  maxDelay = 420,
  variant = 'up',
  as = 'div',
  className = '',
  id,
  itemAs = 'div',
  itemClassName = '',
}: RevealGroupProps) {
  const items = Array.isArray(children) ? children : [children];

  return createElement(
    as,
    { id, className },
    items.map((child, i) => (
      <Reveal
        key={i}
        variant={variant}
        delay={Math.min(i * step, maxDelay)}
        as={itemAs}
        className={itemClassName}
      >
        {child}
      </Reveal>
    )),
  );
}
