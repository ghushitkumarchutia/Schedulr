import { useState, useEffect, useRef } from "react";
import { TrendingUp, GitCompare, Zap } from "lucide-react";
import * as d3 from "d3";

const PredictiveScheduler = ({ processes, currentAlgorithm }) => {
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState("waitingTime");
  const chartRef = useRef(null);

  const algorithms = ["FCFS", "SJF", "RR", "Priority", "MLFQ"];

  useEffect(() => {
    if (processes && processes.length > 0) {
      fetchPredictions();
    }
  }, [processes]);

  const validatePredictions = (data) => {
    if (!data || typeof data !== "object") return false;

    return algorithms.every((algo) => {
      const metrics = data[algo];
      return (
        metrics &&
        typeof metrics.averageWaitingTime === "number" &&
        typeof metrics.averageTurnaroundTime === "number" &&
        typeof metrics.averageResponseTime === "number" &&
        typeof metrics.throughput === "number" &&
        typeof metrics.cpuUtilization === "number"
      );
    });
  };

  const fetchPredictions = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!processes || processes.length === 0) {
        throw new Error("No processes available for prediction");
      }

      const prompt = `Predict performance metrics for these CPU scheduling algorithms based on the following processes:
      
      Processes: ${JSON.stringify(processes)}
      
      Algorithms to analyze: FCFS, SJF, RR (time quantum=2), Priority, MLFQ
      
      For each algorithm, predict:
      - averageWaitingTime
      - averageTurnaroundTime
      - averageResponseTime
      - throughput
      - cpuUtilization
      
      Return as JSON with algorithm names as keys and predicted metrics as values.`;

      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "YOUR_SITE_URL",
            "X-Title": "CPU Scheduling Simulator",
          },
          body: JSON.stringify({
            model: "anthropic/claude-3-sonnet",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.5,
            response_format: { type: "json_object" },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Prediction failed with status ${response.status}`);
      }

      const data = await response.json();

      if (!data.choices?.[0]?.message?.content) {
        throw new Error("Invalid response format from AI");
      }

      let content;
      try {
        content = JSON.parse(data.choices[0].message.content);
      } catch (e) {
        throw new Error("AI returned invalid JSON format");
      }

      if (!validatePredictions(content)) {
        throw new Error("AI response missing required prediction data");
      }

      setPredictions(content);
    } catch (err) {
      setError(err.message || "Prediction failed");
      console.error("Prediction Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (predictions && chartRef.current) {
      renderChart();
    }
  }, [predictions, selectedMetric]);

  const renderChart = () => {
    try {
      const margin = { top: 30, right: 30, bottom: 70, left: 60 };
      const width = 600 - margin.left - margin.right;
      const height = 400 - margin.top - margin.bottom;

      d3.select(chartRef.current).selectAll("*").remove();

      const svg = d3
        .select(chartRef.current)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      // Prepare data with fallbacks
      const data = algorithms.map((algo) => ({
        algorithm: algo,
        value: predictions[algo]
          ? predictions[algo][
              `average${
                selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)
              }`
            ] || 0
          : 0,
        isCurrent: algo === currentAlgorithm,
      }));

      // X axis
      const x = d3
        .scaleBand()
        .range([0, width])
        .domain(algorithms)
        .padding(0.2);

      svg
        .append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "translate(-10,0)rotate(-45)")
        .style("text-anchor", "end")
        .style("fill", "#9CA3AF");

      // Y axis
      const maxValue = Math.max(d3.max(data, (d) => d.value) * 1.2, 1);
      const y = d3.scaleLinear().domain([0, maxValue]).range([height, 0]);

      svg
        .append("g")
        .call(d3.axisLeft(y))
        .selectAll("text")
        .style("fill", "#9CA3AF");

      // Bars
      svg
        .selectAll("mybar")
        .data(data)
        .enter()
        .append("rect")
        .attr("x", (d) => x(d.algorithm))
        .attr("y", (d) => y(d.value))
        .attr("width", x.bandwidth())
        .attr("height", (d) => height - y(d.value))
        .attr("fill", (d) => (d.isCurrent ? "#4F46E5" : "#6B7280"))
        .attr("rx", 4)
        .attr("ry", 4);

      // Value labels
      svg
        .selectAll("text.value")
        .data(data)
        .enter()
        .append("text")
        .attr("class", "value")
        .attr("x", (d) => x(d.algorithm) + x.bandwidth() / 2)
        .attr("y", (d) => y(d.value) - 5)
        .attr("text-anchor", "middle")
        .text((d) => d.value.toFixed(2))
        .style("fill", "#E5E7EB")
        .style("font-size", "12px");
    } catch (err) {
      console.error("Chart rendering error:", err);
      setError("Failed to render comparison chart");
    }
  };

  const metricOptions = [
    { value: "waitingTime", label: "Waiting Time" },
    { value: "turnaroundTime", label: "Turnaround Time" },
    { value: "responseTime", label: "Response Time" },
  ];

  const getOptimalAlgorithm = () => {
    if (!predictions) return null;

    const algoMetrics = Object.entries(predictions).map(([algo, metrics]) => ({
      algorithm: algo,
      score: metrics.averageWaitingTime + metrics.averageResponseTime,
      waitingTime: metrics.averageWaitingTime,
      responseTime: metrics.averageResponseTime,
    }));

    return algoMetrics.reduce((min, algo) =>
      algo.score < min.score ? algo : min
    );
  };

  return (
    <div className='bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 shadow-xl border border-gray-700'>
      <div className='flex items-center justify-between mb-6'>
        <h2 className='text-2xl font-bold flex items-center gap-2'>
          <TrendingUp className='text-purple-400' />
          Algorithm Comparison
        </h2>
        <div className='flex items-center gap-4'>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className='bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500'
          >
            {metricOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            onClick={fetchPredictions}
            disabled={loading}
            className='px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center gap-2 disabled:opacity-50'
          >
            <Zap size={18} />
            {loading ? "Predicting..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className='mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg'>
          <p className='text-red-200'>{error}</p>
        </div>
      )}

      {loading && !predictions && (
        <div className='flex justify-center items-center h-64'>
          <div className='animate-pulse flex flex-col items-center gap-3'>
            <div className='w-10 h-10 bg-purple-600 rounded-full'></div>
            <p className='text-gray-400'>AI is predicting performance...</p>
          </div>
        </div>
      )}

      {predictions && (
        <div>
          <div className='mb-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700'>
            <div className='flex items-center gap-3 mb-3'>
              <GitCompare className='text-blue-400' size={20} />
              <h3 className='font-semibold'>Comparison Visualization</h3>
            </div>
            <div ref={chartRef} className='w-full overflow-x-auto'></div>
            <div className='mt-3 flex justify-center gap-4 text-sm text-gray-400'>
              <div className='flex items-center gap-2'>
                <div className='w-3 h-3 bg-indigo-500 rounded-sm'></div>
                <span>Current Algorithm</span>
              </div>
              <div className='flex items-center gap-2'>
                <div className='w-3 h-3 bg-gray-500 rounded-sm'></div>
                <span>Other Algorithms</span>
              </div>
            </div>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div className='bg-gray-800/50 p-5 rounded-lg border border-gray-700'>
              <h3 className='font-bold text-lg mb-3'>Optimal Algorithm</h3>
              {(() => {
                const optimal = getOptimalAlgorithm();
                if (!optimal) return null;

                return (
                  <div className='space-y-2'>
                    <div className='text-2xl font-bold text-green-400'>
                      {optimal.algorithm}
                    </div>
                    <p className='text-gray-300'>
                      Predicted to have the lowest combined waiting and response
                      times.
                    </p>
                    {optimal.algorithm !== currentAlgorithm && (
                      <p className='text-yellow-400 mt-2'>
                        Switching could improve performance by ~
                        {Math.abs(
                          ((predictions[currentAlgorithm]?.averageWaitingTime -
                            optimal.waitingTime) /
                            predictions[currentAlgorithm]?.averageWaitingTime) *
                            100
                        ).toFixed(0)}
                        %
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className='bg-gray-800/50 p-5 rounded-lg border border-gray-700'>
              <h3 className='font-bold text-lg mb-3'>Predicted Metrics</h3>
              <div className='overflow-x-auto'>
                <table className='w-full text-sm text-gray-300'>
                  <thead className='border-b border-gray-700'>
                    <tr>
                      <th className='p-2 text-left'>Algorithm</th>
                      <th className='p-2 text-right'>Wait Time</th>
                      <th className='p-2 text-right'>Turnaround</th>
                      <th className='p-2 text-right'>Response</th>
                      <th className='p-2 text-right'>Throughput</th>
                      <th className='p-2 text-right'>CPU Util</th>
                    </tr>
                  </thead>
                  <tbody>
                    {algorithms.map((algo) => (
                      <tr
                        key={algo}
                        className={`border-b border-gray-800 ${
                          algo === currentAlgorithm ? "bg-gray-800/30" : ""
                        }`}
                      >
                        <td className='p-2 font-medium'>{algo}</td>
                        <td className='p-2 text-right'>
                          {predictions[algo]?.averageWaitingTime?.toFixed(2) ||
                            "N/A"}
                        </td>
                        <td className='p-2 text-right'>
                          {predictions[algo]?.averageTurnaroundTime?.toFixed(
                            2
                          ) || "N/A"}
                        </td>
                        <td className='p-2 text-right'>
                          {predictions[algo]?.averageResponseTime?.toFixed(2) ||
                            "N/A"}
                        </td>
                        <td className='p-2 text-right'>
                          {predictions[algo]?.throughput?.toFixed(2) || "N/A"}
                        </td>
                        <td className='p-2 text-right'>
                          {predictions[algo]?.cpuUtilization?.toFixed(2) ||
                            "N/A"}
                          %
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictiveScheduler;
