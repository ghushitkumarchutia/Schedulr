import { useState, useEffect } from "react";
import { Sparkles, AlertTriangle, Lightbulb, BarChart2 } from "lucide-react";

const AIPerformanceAnalyzer = ({ results, algorithm, processes }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    if (results && results.timeline && results.timeline.length > 0) {
      calculateMetrics();
    }
  }, [results]);

  useEffect(() => {
    if (metrics) {
      fetchAIAnalysis();
    }
  }, [metrics]);

  const calculateMetrics = () => {
    try {
      const avgWait = results.averageWaitingTime || 0;
      const avgTurnaround = results.averageTurnaroundTime || 0;
      const avgResponse = results.averageResponseTime || 0;

      const lastTimelineItem = results.timeline[results.timeline.length - 1];
      const totalTime = lastTimelineItem ? lastTimelineItem.endTime : 1;
      const throughput = processes.length / totalTime;

      setMetrics({
        avgWait,
        avgTurnaround,
        avgResponse,
        throughput,
        cpuUtilization: calculateCPUUtilization(totalTime),
      });
    } catch (err) {
      setError("Failed to calculate metrics");
      console.error("Metrics calculation error:", err);
    }
  };

  const calculateCPUUtilization = (totalTime) => {
    try {
      const busyTime = results.timeline.reduce((sum, segment) => {
        return sum + (segment.endTime - segment.startTime);
      }, 0);

      return totalTime > 0 ? (busyTime / totalTime) * 100 : 0;
    } catch (err) {
      console.error("CPU utilization calculation error:", err);
      return 0;
    }
  };

  const validateAnalysis = (data) => {
    if (!data) return false;
    const requiredKeys = [
      "evaluation",
      "bottlenecks",
      "alternatives",
      "recommendations",
    ];
    return requiredKeys.every(
      (key) =>
        key in data &&
        (key === "evaluation"
          ? typeof data[key] === "string"
          : Array.isArray(data[key]))
    );
  };

  const fetchAIAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!metrics) {
        throw new Error("No metrics available for analysis");
      }

      const prompt = `Analyze these CPU scheduling results and provide insights:
      
      Algorithm: ${algorithm}
      Processes: ${JSON.stringify(processes)}
      Metrics: 
      - Average Waiting Time: ${metrics.avgWait}
      - Average Turnaround Time: ${metrics.avgTurnaround}
      - Average Response Time: ${metrics.avgResponse}
      - Throughput: ${metrics.throughput}
      - CPU Utilization: ${metrics.cpuUtilization}%
      
      Provide:
      1. Performance evaluation (1-2 sentences)
      2. Potential bottlenecks (bullet points)
      3. Alternative algorithm suggestions if applicable
      4. Optimization recommendations (bullet points)
      
      Format response as JSON with these keys: evaluation, bottlenecks, alternatives, recommendations`;

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
            model: "meta-llama/llama-3-8b-instruct",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            response_format: { type: "json_object" },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`AI analysis failed with status ${response.status}`);
      }

      const data = await response.json();

      if (!data.choices?.[0]?.message?.content) {
        throw new Error("Invalid response format from AI");
      }

      let content;
      try {
        content = JSON.parse(data.choices[0].message.content);
      } catch (error) {
        throw new Error("AI returned invalid JSON format");
      }

      if (!validateAnalysis(content)) {
        throw new Error("AI response missing required fields");
      }

      setAnalysis(content);
    } catch (err) {
      setError(err.message || "AI analysis failed");
      console.error("AI Analysis Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 shadow-xl border border-gray-700'>
      <div className='flex items-center justify-between mb-6'>
        <h2 className='text-2xl font-bold flex items-center gap-2'>
          <Sparkles className='text-yellow-400' />
          AI Performance Analysis
        </h2>
        <button
          onClick={fetchAIAnalysis}
          disabled={loading}
          className='px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 disabled:opacity-50'
        >
          {loading ? "Analyzing..." : "Refresh Analysis"}
        </button>
      </div>

      {error && (
        <div className='mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg flex items-start gap-3'>
          <AlertTriangle className='text-red-400 mt-0.5 flex-shrink-0' />
          <div>
            <h3 className='font-bold text-red-300'>Analysis Error</h3>
            <p className='text-red-200'>{error}</p>
          </div>
        </div>
      )}

      {loading && !analysis && (
        <div className='flex justify-center items-center h-64'>
          <div className='animate-pulse flex flex-col items-center gap-3'>
            <div className='w-10 h-10 bg-blue-600 rounded-full'></div>
            <p className='text-gray-400'>AI is analyzing your results...</p>
          </div>
        </div>
      )}

      {analysis && (
        <div className='space-y-6'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div className='bg-gray-800/50 p-5 rounded-lg border border-gray-700'>
              <h3 className='font-bold text-lg mb-3 flex items-center gap-2'>
                <BarChart2 className='text-blue-400' size={20} />
                Performance Evaluation
              </h3>
              <p className='text-gray-300'>{analysis.evaluation}</p>
            </div>

            <div className='bg-gray-800/50 p-5 rounded-lg border border-gray-700'>
              <h3 className='font-bold text-lg mb-3 flex items-center gap-2'>
                <AlertTriangle className='text-yellow-400' size={20} />
                Potential Bottlenecks
              </h3>
              <ul className='space-y-2 text-gray-300'>
                {analysis.bottlenecks.map((item, i) => (
                  <li key={i} className='flex items-start gap-2'>
                    <span className='text-yellow-400'>•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div className='bg-gray-800/50 p-5 rounded-lg border border-gray-700'>
              <h3 className='font-bold text-lg mb-3 flex items-center gap-2'>
                <Lightbulb className='text-green-400' size={20} />
                Optimization Recommendations
              </h3>
              <ul className='space-y-2 text-gray-300'>
                {analysis.recommendations.map((item, i) => (
                  <li key={i} className='flex items-start gap-2'>
                    <span className='text-green-400'>•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className='bg-gray-800/50 p-5 rounded-lg border border-gray-700'>
              <h3 className='font-bold text-lg mb-3 flex items-center gap-2'>
                <Sparkles className='text-purple-400' size={20} />
                Alternative Algorithms
              </h3>
              {analysis.alternatives.length > 0 ? (
                <ul className='space-y-2 text-gray-300'>
                  {analysis.alternatives.map((item, i) => (
                    <li key={i} className='flex items-start gap-2'>
                      <span className='text-purple-400'>•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className='text-gray-400'>
                  Current algorithm is optimal for this workload
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {metrics && (
        <div className='mt-8 grid grid-cols-2 md:grid-cols-5 gap-4'>
          <MetricCard
            title='Avg Wait'
            value={metrics.avgWait.toFixed(2)}
            unit='ms'
            ideal='lower'
          />
          <MetricCard
            title='Avg Turnaround'
            value={metrics.avgTurnaround.toFixed(2)}
            unit='ms'
            ideal='lower'
          />
          <MetricCard
            title='Avg Response'
            value={metrics.avgResponse.toFixed(2)}
            unit='ms'
            ideal='lower'
          />
          <MetricCard
            title='Throughput'
            value={metrics.throughput.toFixed(2)}
            unit='proc/ms'
            ideal='higher'
          />
          <MetricCard
            title='CPU Util'
            value={metrics.cpuUtilization.toFixed(2)}
            unit='%'
            ideal='higher'
          />
        </div>
      )}
    </div>
  );
};

const MetricCard = ({ title, value, unit, ideal }) => {
  const getQualityColor = () => {
    const numValue = parseFloat(value);
    if (unit === "%") {
      if (numValue > 80) return "text-green-400";
      if (numValue > 60) return "text-yellow-400";
      return "text-red-400";
    }

    if (ideal === "lower") {
      if (numValue < 10) return "text-green-400";
      if (numValue < 30) return "text-yellow-400";
      return "text-red-400";
    } else {
      if (numValue > 0.8) return "text-green-400";
      if (numValue > 0.5) return "text-yellow-400";
      return "text-red-400";
    }
  };

  return (
    <div className='bg-gray-800 p-3 rounded-lg border border-gray-700'>
      <div className='text-sm text-gray-400'>{title}</div>
      <div className={`text-xl font-mono font-bold ${getQualityColor()}`}>
        {value} <span className='text-sm text-gray-500'>{unit}</span>
      </div>
    </div>
  );
};

export default AIPerformanceAnalyzer;
