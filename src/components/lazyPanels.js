import { lazy } from "react";

export const loadStormWatchPanel = () => import("./StormWatch");
export const loadHourlyPanel = () => import("./HourlyCard");

export const PRELOAD_HEAVY_PANELS = [loadHourlyPanel, loadStormWatchPanel];

export const StormWatchPanel = lazy(loadStormWatchPanel);
export const HourlyPanel = lazy(loadHourlyPanel);
