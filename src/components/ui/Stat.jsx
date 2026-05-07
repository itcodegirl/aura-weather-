import { memo } from "react";
import { isMissingPlaceholder } from "../../utils/numbers";

const isMissingValue = isMissingPlaceholder;

function Stat({
  icon,
  label,
  value,
  className = "stat",
  iconClassName = "stat-icon",
  bodyClassName = "stat-body",
  labelClassName = "stat-label",
  valueClassName = "stat-value",
  valueStyle,
  missing,
}) {
  const hasIcon = Boolean(icon);
  const isMissing = typeof missing === "boolean" ? missing : isMissingValue(value);
  const finalValueClassName = isMissing
    ? `${valueClassName} is-missing`.trim()
    : valueClassName;
  // Treat the dash as a named visual symbol so assistive tech hears
  // the data state instead of the literal em-dash glyph.
  const renderedValue = isMissing ? (
    <span role="img" aria-label="No data available">
      {value}
    </span>
  ) : (
    value
  );

  if (!hasIcon) {
    return (
      <div className={className}>
        <span className={labelClassName}>{label}</span>
        <span className={finalValueClassName} style={valueStyle}>
          {renderedValue}
        </span>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className={iconClassName}>{icon}</div>
      <div className={bodyClassName}>
        <div className={labelClassName}>{label}</div>
        <div className={finalValueClassName} style={valueStyle}>
          {renderedValue}
        </div>
      </div>
    </div>
  );
}

export default memo(Stat);
