import { memo } from "react";

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
}) {
  const hasIcon = Boolean(icon);

  if (!hasIcon) {
    return (
      <div className={className}>
        <span className={labelClassName}>{label}</span>
        <span className={valueClassName} style={valueStyle}>
          {value}
        </span>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className={iconClassName}>{icon}</div>
      <div className={bodyClassName}>
        <div className={labelClassName}>{label}</div>
        <div className={valueClassName} style={valueStyle}>
          {value}
        </div>
      </div>
    </div>
  );
}

export default memo(Stat);
