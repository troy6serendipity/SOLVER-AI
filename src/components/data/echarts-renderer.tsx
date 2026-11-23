"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import type { ECharts } from "echarts";

interface EChartsRendererProps {
  option: Record<string, unknown>;
  className?: string;
  style?: React.CSSProperties;
}

export function EChartsRenderer({ option, className, style }: EChartsRendererProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    if (!instanceRef.current) {
      instanceRef.current = echarts.init(chartRef.current);
    }
    const chart = instanceRef.current;
    chart.setOption(option, true);

    const observer = new ResizeObserver(() => {
      chart.resize();
    });
    observer.observe(chartRef.current);

    return () => {
      observer.disconnect();
      chart.dispose();
      instanceRef.current = null;
    };
  }, [option]);

  return <div ref={chartRef} className={className} style={style} />;
}
