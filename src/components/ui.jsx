/**
 * Shared UI primitives — Button, Card, Modal, Toast, Field, Stat, Sheet…
 * Every visual value comes from tokens.css via CSS variables.
 */
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../lib/store.jsx';
import './ui.css';

/* ------------------------------- Button ------------------------------- */
export function Button({
  children, variant = 'primary', size = 'md', full, loading, icon, className = '', ...rest
}) {
  return (
    <button
      className={`btn btn--${variant} btn--${size} ${full ? 'btn--full' : ''} ${className}`}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading ? <span className="btn__spinner" aria-hidden /> : icon}
      {children}
    </button>
  );
}

/* -------------------------------- Card -------------------------------- */
export function Card({ children, className = '', glow, as: Tag = 'div', ...rest }) {
  return (
    <Tag className={`card ${glow ? 'card--glow' : ''} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

/* ------------------------------- Field -------------------------------- */
export function Field({ label, hint, children, id }) {
  return (
    <label className="field" htmlFor={id}>
      {label && <span className="field__label">{label}</span>}
      {children}
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  );
}

export function Input({ className = '', ...props }) {
  return <input className={`input ${className}`} {...props} />;
}

export function Select({ children, ...props }) {
  return (
    <div className="select-wrap">
      <select className="input select" {...props}>{children}</select>
      <span className="select__chev" aria-hidden>▾</span>
    </div>
  );
}

/* -------------------------------- Modal ------------------------------- */
/**
 * Rendered through a portal to <body> on purpose: `.page` carries a fill-mode
 * animation whose identity transform makes it the containing block for
 * `position: fixed` children, which would clip the backdrop to the page box.
 */
/**
 * Reference-counted page scroll lock.
 *
 * Modals nest (picker -> detail, picker -> create form) and do not always close
 * in the order they opened: creating a custom exercise closes the picker first,
 * then the form. If each modal saved and restored the previous overflow value,
 * that inner modal would restore the outer one's "hidden" and leave the page
 * permanently unscrollable. Counting holders instead makes the order
 * irrelevant — the page unlocks when the last modal closes.
 */
let scrollLocks = 0;
let overflowBeforeLock = '';

function lockPageScroll() {
  const root = document.documentElement;
  if (scrollLocks === 0) {
    overflowBeforeLock = root.style.overflow;
    root.style.overflow = 'hidden';
  }
  scrollLocks += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    scrollLocks = Math.max(0, scrollLocks - 1);
    if (scrollLocks === 0) root.style.overflow = overflowBeforeLock;
  };
}

export function Modal({ open, onClose, title, children, footer, size = 'md', bodyClass = '' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const unlock = lockPageScroll();
    return () => {
      document.removeEventListener('keydown', onKey);
      unlock();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal modal--${size}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal__head">
          <h3 className="modal__title">{title}</h3>
          <button className="modal__close" onClick={onClose} aria-label="Close">✕</button>
        </header>
        <div className={`modal__body ${bodyClass}`}>{children}</div>
        {footer && <footer className="modal__foot">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

/* -------------------------------- Stat -------------------------------- */
export function Stat({ label, value, unit, tone = 'default', hint }) {
  return (
    <div className={`stat stat--${tone}`}>
      <span className="stat__label">{label}</span>
      <span className="stat__value tnum">
        {value}
        {unit && <span className="stat__unit">{unit}</span>}
      </span>
      {hint && <span className="stat__hint">{hint}</span>}
    </div>
  );
}

/* -------------------------------- Chip -------------------------------- */
export function Chip({ children, active, ...rest }) {
  return (
    <button className={`chip ${active ? 'chip--active' : ''}`} {...rest}>
      {children}
    </button>
  );
}

export function Badge({ children, tone = 'accent' }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

/* ------------------------------- Toasts ------------------------------- */
export function ToastHost() {
  const { toasts, dismissToast } = useApp();
  return createPortal(
    <div className="toast-host" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.tone}`} onClick={() => dismissToast(t.id)}>
          {t.message}
        </div>
      ))}
    </div>,
    document.body,
  );
}

/* ------------------------------- Spinner ------------------------------ */
export function Spinner({ label }) {
  return (
    <div className="loader">
      <span className="loader__ring" aria-hidden />
      {label && <span className="muted">{label}</span>}
    </div>
  );
}

/* ------------------------------ EmptyState ---------------------------- */
export function EmptyState({ icon, title, children, action }) {
  return (
    <div className="empty">
      {icon && <div className="empty__icon" aria-hidden>{icon}</div>}
      <p className="empty__title">{title}</p>
      {children && <p className="empty__text">{children}</p>}
      {action}
    </div>
  );
}
