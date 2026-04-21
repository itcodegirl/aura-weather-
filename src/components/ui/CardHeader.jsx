import { memo } from "react";

function CardHeader({
  headerClassName = "card-header",
  title,
  titleId,
  titleTag = "h2",
  titleClassName = "card-title",
  icon,
  leftClassName,
  summary,
  summaryClassName = "card-summary",
  subtitle,
  subtitleClassName = "card-subtitle",
}) {
  const TitleTag = titleTag;

  const heading = title ? (
    <TitleTag id={titleId} className={titleClassName}>
      {icon}
      <span>{title}</span>
    </TitleTag>
  ) : null;

  const headingSummary = summary ? (
    <p className={summaryClassName}>{summary}</p>
  ) : null;

  const renderedSubtitle =
    subtitle === undefined || subtitle === null
      ? null
      : typeof subtitle === "string"
        ? <span className={subtitleClassName}>{subtitle}</span>
        : subtitle;

  return (
    <header className={headerClassName}>
      {leftClassName ? (
        <div className={leftClassName}>
          {heading}
          {headingSummary}
        </div>
      ) : (
        <>
          {heading}
          {headingSummary}
        </>
      )}
      {renderedSubtitle}
    </header>
  );
}

export default memo(CardHeader);
