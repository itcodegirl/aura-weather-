import { memo } from "react";

function IconStat({
  icon,
  label,
  value,
  className = "stat",
  iconClassName = "stat-icon",
  bodyClassName = "stat-body",
  labelClassName = "stat-label",
  valueClassName = "stat-value",
}) {
  return (
    <div className={className}>
      {icon ? <div className={iconClassName}>{icon}</div> : null}
      <div className={bodyClassName}>
        <div className={labelClassName}>{label}</div>
        <div className={valueClassName}>{value}</div>
      </div>
    </div>
  );
}

function DetailStat({
  label,
  value,
  className = "storm-detail",
  labelClassName = "storm-detail-label",
  valueClassName = "storm-detail-value",
  valueStyle,
}) {
  return (
    <div className={className}>
      <span className={labelClassName}>{label}</span>
      <span className={valueClassName} style={valueStyle}>
        {value}
      </span>
    </div>
  );
}

export const IconMetricStat = memo(IconStat);
export const DetailMetricStat = memo(DetailStat);
