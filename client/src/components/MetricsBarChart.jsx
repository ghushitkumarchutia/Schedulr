import { useEffect, useRef } from "react";

const MetricsBarChart = ({ results }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    if (chartRef.current && results) {
      const canvas = chartRef.current;
      const ctx = canvas.getContext("2d");

      // Set canvas dimensions
      const displayWidth = canvas.clientWidth;
      canvas.width = displayWidth;
      canvas.height = 160;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Metrics data
      const metrics = [
        {
          name: "Average Waiting Time",
          value: results.averageWaitingTime,
          color: "#4299E1",
        },
        {
          name: "Average Turnaround Time",
          value: results.averageTurnaroundTime,
          color: "#48BB78",
        },
        {
          name: "Average Response Time",
          value: results.averageResponseTime,
          color: "#9F7AEA",
        },
      ];

      // Find max value for scaling
      const maxValue = Math.max(...metrics.map((m) => m.value)) * 1.2;

      // Bar dimensions
      const barHeight = 30;
      const barSpacing = 20;
      const leftPadding = 160;
      const rightPadding = 60;
      const usableWidth = displayWidth - leftPadding - rightPadding;

      // Draw bars
      metrics.forEach((metric, index) => {
        const y = 30 + index * (barHeight + barSpacing);
        const barWidth = (metric.value / maxValue) * usableWidth;

        // Draw label
        ctx.fillStyle = "#A0AEC0";
        ctx.font = "14px sans-serif";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(metric.name, leftPadding - 10, y + barHeight / 2);

        // Draw bar
        ctx.fillStyle = metric.color;
        ctx.fillRect(leftPadding, y, barWidth, barHeight);

        // Draw value
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "14px sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(
          metric.value.toFixed(2),
          leftPadding + barWidth + 10,
          y + barHeight / 2
        );
      });

      // Draw x-axis
      ctx.strokeStyle = "#4A5568";
      ctx.beginPath();
      ctx.moveTo(leftPadding, 120);
      ctx.lineTo(leftPadding + usableWidth, 120);
      ctx.stroke();

      // Draw scale
      const scaleSteps = 5;
      ctx.fillStyle = "#718096";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";

      for (let i = 0; i <= scaleSteps; i++) {
        const x = leftPadding + (i / scaleSteps) * usableWidth;
        const value = (i / scaleSteps) * maxValue;

        ctx.beginPath();
        ctx.moveTo(x, 120);
        ctx.lineTo(x, 125);
        ctx.stroke();

        ctx.fillText(value.toFixed(1), x, 135);
      }
    }
  }, [results]);

  return (
    <div className='bg-gray-900 p-6 rounded-lg mb-8'>
      <h3 className='text-xl font-semibold mb-4'>Performance Metrics</h3>
      <canvas ref={chartRef} className='w-full h-40'></canvas>
    </div>
  );
};

export default function MetricsVisualization({ results }) {
  if (!results) return null;

  return <MetricsBarChart results={results} />;
}
