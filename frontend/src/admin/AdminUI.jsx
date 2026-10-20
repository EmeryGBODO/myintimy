import { formatApiErrorMessage } from "../api/errors.js";

const STATUS_TONES = {
  success: "bg-success-soft text-success border-success/20",
  warning: "bg-warning-soft text-warning border-warning/20",
  danger: "bg-danger-soft text-danger border-danger/20",
  neutral: "bg-surface text-muted border-line",
};

export function AdminTitle({ title, subtitle, action }) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="eyebrow mb-2">Administration</p>
        <h1 className="font-display text-[clamp(2rem,5vw,3.1rem)] font-light leading-[.95] tracking-[-.02em] text-fg">
          {title}
        </h1>
        {subtitle && <p className="mt-2 max-w-2xl text-sm text-muted">{subtitle}</p>}
      </div>
      {action && (
        <div className="w-full shrink-0 sm:w-auto [&>*]:w-full sm:[&>*]:w-auto">
          {action}
        </div>
      )}
    </div>
  );
}

export function AdminCard({ children, className = "" }) {
  return (
    <section className={`border border-line bg-surface/45 p-4 transition-colors duration-300 sm:p-5 lg:p-6 ${className}`}>
      {children}
    </section>
  );
}

export function AdminError({ error, onRetry }) {
  if (!error) return null;
  const message = formatApiErrorMessage(error);
  return (
    <div
      className="mb-5 flex flex-col gap-3 border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger sm:flex-row sm:items-center sm:justify-between"
      role="alert"
    >
      <span>{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex shrink-0 items-center justify-center border border-danger/40 bg-transparent px-3 py-1.5 font-sans text-[10px] font-normal uppercase tracking-[.14em] text-danger transition-colors hover:bg-danger hover:text-bg"
        >
          Réessayer
        </button>
      )}
    </div>
  );
}

export function AdminLoading({ message = "Chargement…" }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-sm text-muted">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-line-strong border-t-accent" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

export function AdminEmpty({ children = "Aucune donnée à afficher.", action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center text-sm text-muted">
      <p>{children}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function AdminStatus({ children, tone = "neutral" }) {
  return (
    <span className={`inline-flex items-center border px-2.5 py-1 text-[10px] font-normal uppercase tracking-[.14em] ${STATUS_TONES[tone] || STATUS_TONES.neutral}`}>
      {children}
    </span>
  );
}

export const inputClass =
  "w-full rounded-none border-0 border-b border-line-strong bg-transparent px-0.5 py-2.5 font-sans text-sm text-fg outline-none transition-colors placeholder:text-muted/65 focus:border-accent focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50";

export const buttonClass =
  "inline-flex min-h-10 items-center justify-center border border-fg bg-fg px-4 py-2.5 font-sans text-[10.5px] font-normal uppercase leading-none tracking-[.16em] text-bg transition-colors duration-300 hover:border-accent hover:bg-accent hover:text-accent-fg disabled:cursor-not-allowed disabled:opacity-50";

export const ghostButtonClass =
  "inline-flex min-h-10 items-center justify-center border border-line-strong bg-transparent px-4 py-2.5 font-sans text-[10.5px] font-normal uppercase leading-none tracking-[.16em] text-fg transition-colors duration-300 hover:border-fg hover:bg-fg hover:text-bg disabled:cursor-not-allowed disabled:opacity-50";

export const dangerButtonClass =
  "inline-flex min-h-10 items-center justify-center border border-danger/40 bg-transparent px-4 py-2.5 font-sans text-[10.5px] font-normal uppercase leading-none tracking-[.16em] text-danger transition-colors duration-300 hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-50";

export const compactButtonClass =
  "inline-flex min-h-8 items-center justify-center border border-line-strong bg-transparent px-2.5 py-1.5 text-xs text-fg transition-colors hover:border-fg hover:bg-fg hover:text-bg disabled:cursor-not-allowed disabled:opacity-40";

export const fileInputClass =
  "block w-full text-sm text-muted file:mr-4 file:border-0 file:border-r file:border-line-strong file:bg-transparent file:px-0 file:pr-4 file:py-2 file:font-sans file:text-[10.5px] file:font-normal file:uppercase file:tracking-[.14em] file:text-fg";
