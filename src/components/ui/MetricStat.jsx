import { memo } from "react";
import Stat from "./Stat";

export const IconMetricStat = memo(Stat);
export const DetailMetricStat = memo((props) => (
  <Stat {...props} className="storm-detail" labelClassName="storm-detail-label" valueClassName="storm-detail-value" />
));
