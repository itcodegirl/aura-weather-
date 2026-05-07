import { memo } from "react";

function CardFallback({ className = "", style, title, isRefreshing }) {
  return (
    <section
      className={`${className} loading-card glass`.trim()}
      style={style}
      data-refreshing={isRefreshing ? "true" : undefined}
      aria-busy={isRefreshing || undefined}
      role="status"
      aria-live="polite"
      aria-label={title}
    >
      <p className="loading-card-title">{title}</p>
    </section>
  );
}

export default memo(CardFallback);
