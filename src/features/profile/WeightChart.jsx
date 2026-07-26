/** Chart.js line chart of bodyweight over time. Colours read from tokens.css. */
import { useEffect, useRef } from 'react';
import {
  Chart, LineController, LineElement, PointElement, LinearScale,
  CategoryScale, Filler, Tooltip,
} from 'chart.js';
import { useApp } from '../../lib/store.jsx';
import { kgToDisplay, weightUnitLabel, round1, formatDate } from '../../lib/format.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip);

const cssVar = (name) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export default function WeightChart({ logs, goalKg }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const { units, theme } = useApp();

  useEffect(() => {
    if (!canvasRef.current || logs.length === 0) return;

    const accent = cssVar('--color-accent') || '#22c55e';
    const accent2 = cssVar('--color-accent-2') || '#4ade80';
    const muted = cssVar('--color-text-muted') || '#8ba296';
    const border = cssVar('--color-border') || '#24322c';
    const surface = cssVar('--color-surface') || '#0f1614';
    const text = cssVar('--color-text') || '#e6efe9';
    const unit = weightUnitLabel(units);

    const ctx = canvasRef.current.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 220);
    gradient.addColorStop(0, `${accent2}55`);
    gradient.addColorStop(1, `${accent2}00`);

    const sorted = [...logs].sort((a, b) => a.logged_at.localeCompare(b.logged_at));
    const data = sorted.map((l) => round1(kgToDisplay(l.weight_kg, units)));

    const datasets = [{
      data,
      borderColor: accent2,
      backgroundColor: gradient,
      borderWidth: 2.5,
      fill: true,
      tension: 0.34,
      pointRadius: sorted.length > 30 ? 0 : 3,
      pointHoverRadius: 6,
      pointBackgroundColor: accent,
      pointBorderColor: surface,
      pointBorderWidth: 2,
    }];

    if (goalKg) {
      const goal = round1(kgToDisplay(goalKg, units));
      datasets.push({
        data: sorted.map(() => goal),
        borderColor: muted,
        borderWidth: 1.5,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false,
        tension: 0,
      });
    }

    chartRef.current?.destroy();
    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: { labels: sorted.map((l) => formatDate(l.logged_at)), datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: surface,
            borderColor: border,
            borderWidth: 1,
            titleColor: muted,
            bodyColor: text,
            padding: 10,
            displayColors: false,
            callbacks: {
              label: (c) =>
                c.datasetIndex === 0 ? `${c.parsed.y} ${unit}` : `Goal ${c.parsed.y} ${unit}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { color: border },
            ticks: { color: muted, maxTicksLimit: 6, font: { size: 10 } },
          },
          y: {
            grid: { color: border, drawTicks: false },
            border: { display: false },
            ticks: {
              color: muted,
              font: { size: 10 },
              callback: (v) => `${v}`,
              maxTicksLimit: 5,
            },
          },
        },
      },
    });

    return () => { chartRef.current?.destroy(); chartRef.current = null; };
  }, [logs, units, theme, goalKg]);

  if (logs.length === 0) {
    return <div className="center-empty">Log your weight to see the chart.</div>;
  }

  return (
    <div className="weight-chart">
      <canvas ref={canvasRef} aria-label="Bodyweight over time" role="img" />
    </div>
  );
}
