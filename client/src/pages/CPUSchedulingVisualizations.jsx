import { useState } from "react";
import QueueVisualization from "../components/QueueVisualization";
import SimulationResults from "../components/SimulationResults";
import MetricsVisualization from "../components/MetricsBarChart";
import AIPerformanceAnalyzer from "../components/AIPerformanceAnalyzer";
import PredictiveScheduler from "../components/PredictiveScheduler";
import AdaptiveSchedulerRecommender from "../components/AdaptiveSchedulerRecommender";

const Visualizations = ({ results, currentTime, onTimeChange }) => {
  const [activeTab, setActiveTab] = useState("overview");

  if (!results || !results.processes || results.processes.length === 0) {
    return (
      <div className='text-center p-8'>No simulation results available</div>
    );
  }

  return (
    <div className='bg-gray-800 text-gray-100 min-h-screen p-6 animate-fadeIn'>
      <div className='flex flex-wrap border-b border-gray-700 mb-6'>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === "overview"
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:text-white"
          }`}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>

        <button
          className={`px-4 py-2 font-medium ${
            activeTab === "ai-performance"
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:text-white"
          }`}
          onClick={() => setActiveTab("ai-performance")}
        >
          AI Performance
        </button>

        <button
          className={`px-4 py-2 font-medium ${
            activeTab === "predictive"
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:text-white"
          }`}
          onClick={() => setActiveTab("predictive")}
        >
          Predictive
        </button>

        <button
          className={`px-4 py-2 font-medium ${
            activeTab === "adaptive"
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:text-white"
          }`}
          onClick={() => setActiveTab("adaptive")}
        >
          Adaptive
        </button>

        <button
          className={`px-4 py-2 font-medium ${
            activeTab === "queue"
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:text-white"
          }`}
          onClick={() => setActiveTab("queue")}
        >
          Queue Visualization
        </button>
      </div>

      {activeTab === "overview" && (
        <div className='space-y-8'>
          <SimulationResults results={results} />
          <MetricsVisualization results={results} />
        </div>
      )}

      {activeTab === "ai-performance" && (
        <AIPerformanceAnalyzer
          results={results}
          algorithm={results.algorithm}
          processes={results.processes}
        />
      )}

      {activeTab === "predictive" && (
        <PredictiveScheduler
          processes={results.processes}
          currentAlgorithm={results.algorithm}
          currentResults={results}
        />
      )}

      {activeTab === "adaptive" && (
        <AdaptiveSchedulerRecommender
          processes={results.processes}
          currentAlgorithm={results.algorithm}
          historicalData={results.historicalData || []}
        />
      )}

      {activeTab === "queue" && (
        <QueueVisualization
          results={results}
          currentTime={currentTime}
          onTimeChange={onTimeChange}
        />
      )}
    </div>
  );
};

export default Visualizations;
