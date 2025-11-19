import { useState, useEffect } from "react";
import { BrainCircuit, RefreshCw, AlertOctagon } from "lucide-react";

const AdaptiveSchedulerRecommender = ({
  processes,
  currentAlgorithm,
  historicalData,
}) => {
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [workloadType, setWorkloadType] = useState(null);

  useEffect(() => {
    if (processes && processes.length > 0) {
      analyzeWorkloadAndRecommend();
    }
  }, [processes]);

  const analyzeWorkloadAndRecommend = async () => {
    setLoading(true);
    setError(null);

    try {
      // First analyze workload characteristics
      const workloadPrompt = `Analyze these CPU processes and classify the workload:
      
      Processes: ${JSON.stringify(processes)}
      
      Classify as one of these types:
      1. CPU-bound (long bursts, few processes)
      2. IO-bound (short bursts, many processes)
      3. Mixed (varied burst times)
      4. Priority-driven (varied priorities)
      
      Return JSON with: { type: string, characteristics: array }`;

      const workloadResponse = await fetch(
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
            messages: [{ role: "user", content: workloadPrompt }],
            temperature: 0.3,
            response_format: { type: "json_object" },
          }),
        }
      );

      if (!workloadResponse.ok) {
        throw new Error("Workload analysis failed");
      }

      const workloadData = await workloadResponse.json();
      const workloadAnalysis = JSON.parse(
        workloadData.choices[0].message.content
      );
      setWorkloadType(workloadAnalysis.type);

      // Then get scheduling recommendation
      const recommendationPrompt = `Recommend the best CPU scheduling algorithm based on:
      
      Workload Type: ${workloadAnalysis.type}
      Workload Characteristics: ${workloadAnalysis.characteristics.join(", ")}
      Current Algorithm: ${currentAlgorithm}
      Historical Data: ${
        historicalData ? JSON.stringify(historicalData) : "None"
      }
      
      Consider:
      - Throughput requirements
      - Response time sensitivity
      - Fairness needs
      - Implementation complexity
      
      Return JSON with: {
        recommendedAlgorithm: string,
        confidence: number (0-1),
        rationale: string,
        alternativeOptions: array
      }`;

      const recommendationResponse = await fetch(
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
            messages: [{ role: "user", content: recommendationPrompt }],
            temperature: 0.2,
            response_format: { type: "json_object" },
          }),
        }
      );

      if (!recommendationResponse.ok) {
        throw new Error("Recommendation failed");
      }

      const recommendationData = await recommendationResponse.json();
      const recommendationResult = JSON.parse(
        recommendationData.choices[0].message.content
      );
      setRecommendation(recommendationResult);
    } catch (err) {
      setError(err.message);
      console.error("Adaptive Recommendation Error:", err);
    } finally {
      setLoading(false);
    }
  };
  const getWorkloadColor = () => {
    switch (workloadType) {
      case "CPU-bound":
        return "bg-blue-900/50 border-blue-700";
      case "IO-bound":
        return "bg-green-900/50 border-green-700";
      case "Mixed":
        return "bg-purple-900/50 border-purple-700";
      case "Priority-driven":
        return "bg-yellow-900/50 border-yellow-700";
      default:
        return "bg-gray-800/50 border-gray-700";
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence > 0.8) return "text-green-400";
    if (confidence > 0.5) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div className='bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 shadow-xl border border-gray-700'>
      <div className='flex items-center justify-between mb-6'>
        <h2 className='text-2xl font-bold flex items-center gap-2'>
          <BrainCircuit className='text-pink-500' />
          Adaptive Scheduler Recommendation
        </h2>
        <button
          onClick={analyzeWorkloadAndRecommend}
          disabled={loading}
          className='px-4 py-2 bg-pink-600 hover:bg-pink-700 rounded-lg flex items-center gap-2 disabled:opacity-50'
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          Re-analyze
        </button>
      </div>

      {error && (
        <div className='mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg flex items-start gap-3'>
          <AlertOctagon className='text-red-400 mt-0.5 flex-shrink-0' />
          <div>
            <h3 className='font-bold text-red-300'>Analysis Error</h3>
            <p className='text-red-200'>{error}</p>
          </div>
        </div>
      )}

      {loading && !recommendation && (
        <div className='flex justify-center items-center h-64'>
          <div className='animate-pulse flex flex-col items-center gap-3'>
            <div className='w-10 h-10 bg-pink-600 rounded-full'></div>
            <p className='text-gray-400'>AI is analyzing your workload...</p>
          </div>
        </div>
      )}

      {workloadType && (
        <div className={`mb-6 p-4 rounded-lg border ${getWorkloadColor()}`}>
          <h3 className='font-bold text-lg mb-2'>Workload Analysis</h3>
          <div className='flex items-center justify-between'>
            <div>
              <div className='text-2xl font-bold'>{workloadType}</div>
              <p className='text-gray-300 text-sm mt-1'>
                {recommendation?.rationale ||
                  "Analyzing workload characteristics..."}
              </p>
            </div>
            <div className='bg-black/40 px-3 py-1 rounded-full text-sm font-mono'>
              {processes.length} processes
            </div>
          </div>
        </div>
      )}

      {recommendation && (
        <div className='space-y-6'>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            <div className='bg-gray-800/50 p-5 rounded-lg border border-gray-700'>
              <h3 className='font-bold text-lg mb-3'>Recommended Algorithm</h3>
              <div className='flex items-end gap-3'>
                <div className='text-3xl font-bold'>
                  {recommendation.recommendedAlgorithm}
                </div>
                <div
                  className={`text-lg font-mono ${getConfidenceColor(
                    recommendation.confidence
                  )}`}
                >
                  {(recommendation.confidence * 100).toFixed(0)}% confidence
                </div>
              </div>
              {recommendation.recommendedAlgorithm !== currentAlgorithm && (
                <div className='mt-3 p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-lg text-yellow-300'>
                  Consider switching from {currentAlgorithm}
                </div>
              )}
            </div>

            <div className='bg-gray-800/50 p-5 rounded-lg border border-gray-700 md:col-span-2'>
              <h3 className='font-bold text-lg mb-3'>
                Recommendation Rationale
              </h3>
              <p className='text-gray-300'>{recommendation.rationale}</p>
            </div>
          </div>

          <div className='bg-gray-800/50 p-5 rounded-lg border border-gray-700'>
            <h3 className='font-bold text-lg mb-3'>Alternative Options</h3>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
              {recommendation.alternativeOptions.map((option, i) => (
                <div
                  key={i}
                  className='p-3 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors'
                >
                  <div className='font-bold'>{option.algorithm}</div>
                  <div className='text-sm text-gray-400 mt-1'>
                    {option.reason}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className='bg-gray-800/50 p-5 rounded-lg border border-gray-700'>
            <h3 className='font-bold text-lg mb-3'>Implementation Guidance</h3>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div>
                <h4 className='font-semibold text-gray-300 mb-2'>
                  Key Parameters
                </h4>
                <ul className='space-y-2 text-sm'>
                  <li className='flex items-start gap-2'>
                    <span className='text-blue-400'>•</span>
                    <span>
                      Time Quantum:{" "}
                      {recommendation.recommendedAlgorithm === "RR"
                        ? "2-10ms"
                        : "N/A"}
                    </span>
                  </li>
                  <li className='flex items-start gap-2'>
                    <span className='text-blue-400'>•</span>
                    <span>
                      Preemption:{" "}
                      {["SJF", "Priority"].includes(
                        recommendation.recommendedAlgorithm
                      )
                        ? "Recommended"
                        : "Not needed"}
                    </span>
                  </li>
                  <li className='flex items-start gap-2'>
                    <span className='text-blue-400'>•</span>
                    <span>
                      Priority Handling:{" "}
                      {recommendation.recommendedAlgorithm === "Priority"
                        ? "Dynamic"
                        : "Static"}
                    </span>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className='font-semibold text-gray-300 mb-2'>
                  Expected Benefits
                </h4>
                <ul className='space-y-2 text-sm'>
                  <li className='flex items-start gap-2'>
                    <span className='text-green-400'>•</span>
                    <span>
                      Improved{" "}
                      {recommendation.recommendedAlgorithm === "FCFS"
                        ? "fairness"
                        : recommendation.recommendedAlgorithm === "SJF"
                        ? "throughput"
                        : recommendation.recommendedAlgorithm === "RR"
                        ? "response time"
                        : "priority handling"}
                    </span>
                  </li>
                  <li className='flex items-start gap-2'>
                    <span className='text-green-400'>•</span>
                    <span>
                      Reduced{" "}
                      {recommendation.recommendedAlgorithm === "FCFS"
                        ? "starvation"
                        : recommendation.recommendedAlgorithm === "SJF"
                        ? "waiting time"
                        : recommendation.recommendedAlgorithm === "RR"
                        ? "turnaround variance"
                        : "priority inversion"}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdaptiveSchedulerRecommender;
