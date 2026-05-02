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
  missing = false,
  title,
}) {
  const hasIcon = Boolean(icon);
  const dataState = missing ? "missing" : undefined;
  const valueTitle = missing && typeof title === "string" ? title : undefined;

  if (!hasIcon) {
    return (
      <div className={className} data-state={dataState}>
        <span className={labelClassName}>{label}</span>
        <span
          className={valueClassName}
          style={valueStyle}
          data-state={dataState}
          title={valueTitle}
        >
          {value}
        </span>
      </div>
    );
  }

  return (
    <div className={className} data-state={dataState}>
      <div className={iconClassName}>{icon}</div>
      <div className={bodyClassName}>
        <div className={labelClassName}>{label}</div>
        <div
          className={valueClassName}
          style={valueStyle}
          data-state={dataState}
          title={valueTitle}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

export default memo(Stat);
