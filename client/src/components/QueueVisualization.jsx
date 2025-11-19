import { useState, useEffect, useRef, useMemo } from "react";

import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Clock,
  BarChart,
} from "lucide-react";

const QueueVisualization = ({ results }) => {
  // State management
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showStats, setShowStats] = useState(false);
  const animationRef = useRef(null);
  const containerRef = useRef(null);

  // Calculate total simulation time
  const totalTime = useMemo(() => {
    return results.timeline.length > 0
      ? results.timeline[results.timeline.length - 1].endTime
      : 0;
  }, [results.timeline]);

  // Calculate key events for timeline
  const timelineEvents = useMemo(() => {
    const events = [];
    results.processes.forEach((p) =>
      events.push({
        time: p.arrivalTime,
        type: "arrival",
        processId: p.id,
      })
    );

    results.timeline.forEach((segment) => {
      events.push({
        time: segment.startTime,
        type: "start",
        processId: segment.processId,
      });

      events.push({
        time: segment.endTime,
        type: "end",
        processId: segment.processId,
      });
    });

    return events.sort((a, b) => a.time - b.time);
  }, [results]);

  // Process status calculation (with colors and animations)
  const processStates = useMemo(() => {
    return results.processes.map((process) => {
      // Calculate execution history
      const executionSegments = results.timeline
        .filter((segment) => segment.processId === process.id)
        .map((segment) => ({
          start: segment.startTime,
          end: segment.endTime,
          duration: segment.endTime - segment.startTime,
        }));

      const totalExecuted = executionSegments
        .filter((segment) => segment.end <= currentTime)
        .reduce((sum, segment) => sum + segment.duration, 0);

      const currentSegment = executionSegments.find(
        (segment) => segment.start <= currentTime && segment.end > currentTime
      );

      const partialExecuted = currentSegment
        ? currentTime - currentSegment.start
        : 0;

      const executed = totalExecuted + partialExecuted;
      const progress = Math.min(executed / process.burstTime, 1) * 100;

      // Calculate state
      let state = "waiting";
      let stateColor = "bg-gray-600";

      if (process.arrivalTime > currentTime) {
        state = "not-arrived";
        stateColor = "bg-gray-700";
      } else if (currentSegment) {
        state = "running";
        stateColor = "bg-green-500";
      } else if (executed >= process.burstTime) {
        state = "completed";
        stateColor = "bg-purple-500";
      } else if (process.arrivalTime <= currentTime) {
        state = "ready";
        stateColor = "bg-blue-500";
      }

      return {
        id: process.id,
        arrivalTime: process.arrivalTime,
        burstTime: process.burstTime,
        remainingTime: process.burstTime - executed,
        progress,
        state,
        stateColor,
        isActive: state === "running",
      };
    });
  }, [currentTime, results]);

  // Animation logic
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const startTimestamp = performance.now();
    const startTime = currentTime;
    const duration = (totalTime - startTime) * (1000 / playbackSpeed);

    const animate = (timestamp) => {
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);
      const newTime = startTime + (totalTime - startTime) * progress;

      setCurrentTime(newTime);

      if (newTime < totalTime && isPlaying) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsPlaying(false);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, currentTime, totalTime, playbackSpeed]);

  // Navigation functions
  const jumpToNextEvent = () => {
    const nextEvent = timelineEvents
      .filter((event) => event.time > currentTime)
      .sort((a, b) => a.time - b.time)[0];

    if (nextEvent) {
      setCurrentTime(nextEvent.time);
    }
  };

  const jumpToPrevEvent = () => {
    const prevEvent = timelineEvents
      .filter((event) => event.time < currentTime)
      .sort((a, b) => b.time - a.time)[0];

    if (prevEvent) {
      setCurrentTime(prevEvent.time);
    }
  };

  // Slider control
  const handleTimeChange = (e) => {
    setCurrentTime((e.target.value / 100) * totalTime);
  };

  // Calculate queue states for visualization
  const queueState = useMemo(() => {
    return {
      cpu: processStates.find((p) => p.state === "running"),
      readyQueue: processStates
        .filter((p) => p.state === "ready")
        .sort((a, b) => a.arrivalTime - b.arrivalTime),
      completed: processStates.filter((p) => p.state === "completed"),
      waiting: processStates.filter((p) => p.state === "not-arrived"),
    };
  }, [processStates]);

  // Calculate performance metrics
  const metrics = useMemo(() => {
    const completed = processStates.filter((p) => p.state === "completed");
    const cpuUtilization =
      (results.timeline
        .filter((segment) => segment.startTime < currentTime)
        .reduce((sum, segment) => {
          const end = Math.min(segment.endTime, currentTime);
          const start = segment.startTime;
          return sum + (end - start);
        }, 0) /
        currentTime) *
      100;

    return {
      completedCount: completed.length,
      averageWaitTime:
        completed.length > 0
          ? completed.reduce((sum, p) => {
              const waitTime =
                results.processes.find((proc) => proc.id === p.id)
                  .completionTime -
                results.processes.find((proc) => proc.id === p.id).arrivalTime -
                results.processes.find((proc) => proc.id === p.id).burstTime;
              return sum + waitTime;
            }, 0) / completed.length
          : 0,
      cpuUtilization: currentTime > 0 ? cpuUtilization : 0,
    };
  }, [processStates, currentTime, results]);

  // Format time value with optional precision
  const formatTime = (time, precision = 2) => time.toFixed(precision);

  return (
    <div
      ref={containerRef}
      className='bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-xl shadow-2xl border border-gray-700'
    >
      <h2 className='text-2xl font-bold mb-6 text-white flex items-center justify-between'>
        <span>CPU Scheduling Simulator</span>
        <div className='flex space-x-2'>
          <button
            onClick={() => setShowStats(!showStats)}
            className='bg-gray-700 hover:bg-gray-600 p-2 rounded-lg transition-colors'
            title='Toggle statistics'
          >
            <BarChart size={18} />
          </button>
        </div>
      </h2>

      {/* Main visualization area */}
      <div className='mb-6 grid grid-cols-1 md:grid-cols-3 gap-6'>
        {/* CPU Visualization */}
        <div className='bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-5 shadow-lg border border-gray-700 flex flex-col'>
          <h3 className='text-gray-400 text-xs uppercase tracking-wider mb-3 font-semibold text-center'>
            CPU
          </h3>

          <div className='flex-1 flex items-center justify-center'>
            {queueState.cpu ? (
              <div className='relative'>
                <div
                  className={`w-24 h-24 rounded-full ${queueState.cpu.stateColor} flex items-center justify-center 
                    shadow-lg animate-pulse transition-all duration-300`}
                >
                  <div className='text-2xl font-bold text-white'>
                    P{queueState.cpu.id}
                  </div>
                </div>

                {/* Circular progress indicator */}
                <svg
                  className='absolute top-0 left-0 w-24 h-24'
                  viewBox='0 0 100 100'
                >
                  <circle
                    cx='50'
                    cy='50'
                    r='46'
                    fill='none'
                    stroke='rgba(255,255,255,0.2)'
                    strokeWidth='8'
                  />
                  <circle
                    cx='50'
                    cy='50'
                    r='46'
                    fill='none'
                    stroke='rgba(255,255,255,0.8)'
                    strokeWidth='8'
                    strokeDasharray='289.1'
                    strokeDashoffset={
                      289.1 - (queueState.cpu.progress / 100) * 289.1
                    }
                    transform='rotate(-90 50 50)'
                    strokeLinecap='round'
                  />
                </svg>

                <div className='mt-4 text-center'>
                  <div className='text-sm text-gray-300'>
                    Remaining:{" "}
                    <span className='font-mono'>
                      {formatTime(queueState.cpu.remainingTime)}
                    </span>
                  </div>
                  <div className='text-xs text-gray-400'>
                    Progress: {Math.round(queueState.cpu.progress)}%
                  </div>
                </div>
              </div>
            ) : (
              <div className='text-center'>
                <div className='w-20 h-20 rounded-full bg-gray-700 mx-auto flex items-center justify-center'>
                  <Clock className='text-gray-400' size={32} />
                </div>
                <div className='mt-2 text-gray-400'>CPU Idle</div>
              </div>
            )}
          </div>
        </div>

        {/* Ready Queue Visualization */}
        <div className='bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-5 shadow-lg border border-gray-700 flex flex-col'>
          <h3 className='text-gray-400 text-xs uppercase tracking-wider mb-3 font-semibold text-center'>
            Ready Queue
          </h3>

          <div className='flex-1 flex flex-col justify-center'>
            {queueState.readyQueue.length > 0 ? (
              <div className='space-y-3'>
                {queueState.readyQueue.map((process) => (
                  <div
                    key={process.id}
                    className='flex items-center space-x-3 bg-gray-800 p-2 rounded-lg border border-gray-700'
                  >
                    <div
                      className={`w-10 h-10 rounded-full ${process.stateColor} flex items-center justify-center 
                        shadow-md transition-all duration-300`}
                    >
                      <span className='font-bold'>P{process.id}</span>
                    </div>

                    <div className='flex-1'>
                      <div className='h-2 bg-gray-700 rounded-full overflow-hidden'>
                        <div
                          className='h-full bg-gradient-to-r from-blue-500 to-blue-300'
                          style={{ width: `${process.progress}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className='text-xs font-mono text-gray-400'>
                      {formatTime(process.remainingTime)}s
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='text-center text-gray-400 flex-1 flex items-center justify-center'>
                Queue Empty
              </div>
            )}
          </div>
        </div>

        {/* Completed & Waiting Processes */}
        <div className='grid grid-rows-2 gap-4'>
          {/* Completed Processes */}
          <div className='bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 shadow-lg border border-gray-700'>
            <h3 className='text-gray-400 text-xs uppercase tracking-wider mb-2 font-semibold text-center'>
              Completed ({queueState.completed.length})
            </h3>

            <div className='flex flex-wrap gap-2 justify-center'>
              {queueState.completed.length > 0 ? (
                queueState.completed.map((process) => (
                  <div key={process.id} className='group relative'>
                    <div
                      className={`w-8 h-8 rounded-full ${process.stateColor} flex items-center 
                        justify-center shadow-md transition-transform group-hover:scale-110`}
                    >
                      <span className='text-xs font-bold'>P{process.id}</span>
                    </div>

                    {/* Tooltip with process details */}
                    <div
                      className='opacity-0 group-hover:opacity-100 absolute z-10 bottom-full mb-2 left-1/2 
                        transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded p-2 shadow-lg pointer-events-none
                        transition-opacity duration-200 w-24'
                    >
                      <div>Process P{process.id}</div>
                      <div className='grid grid-cols-2 gap-x-1 text-gray-300'>
                        <span>Arrival:</span>
                        <span className='font-mono'>
                          {formatTime(process.arrivalTime)}
                        </span>
                        <span>Burst:</span>
                        <span className='font-mono'>
                          {formatTime(process.burstTime)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className='text-gray-400 text-sm text-center w-full py-2'>
                  No completed processes
                </div>
              )}
            </div>
          </div>

          {/* Waiting Processes */}
          <div className='bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 shadow-lg border border-gray-700'>
            <h3 className='text-gray-400 text-xs uppercase tracking-wider mb-2 font-semibold text-center'>
              Not Yet Arrived ({queueState.waiting.length})
            </h3>

            <div className='flex flex-wrap gap-2 justify-center'>
              {queueState.waiting.length > 0 ? (
                queueState.waiting.map((process) => (
                  <div key={process.id} className='group relative'>
                    <div
                      className='w-8 h-8 rounded-full bg-gray-700 border border-gray-600 flex items-center 
                        justify-center shadow-md transition-transform group-hover:scale-110'
                    >
                      <span className='text-xs font-bold text-gray-300'>
                        P{process.id}
                      </span>
                    </div>

                    {/* Tooltip with arrival time */}
                    <div
                      className='opacity-0 group-hover:opacity-100 absolute z-10 bottom-full mb-2 left-1/2 
                        transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded p-2 shadow-lg pointer-events-none
                        transition-opacity duration-200'
                    >
                      <div>Arrives at: {formatTime(process.arrivalTime)}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className='text-gray-400 text-sm text-center w-full py-2'>
                  All processes arrived
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline and controls */}
      <div className='bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-inner'>
        {/* Interactive timeline */}
        <div className='mb-4 relative'>
          <div className='h-1 bg-gray-700 rounded-full w-full'>
            <div
              className='h-full bg-blue-500 rounded-full'
              style={{ width: `${(currentTime / totalTime) * 100}%` }}
            ></div>
          </div>

          {/* Event markers */}
          <div className='h-6 relative'>
            {timelineEvents.map((event, idx) => (
              <div
                key={idx}
                className={`absolute w-1 h-3 transform -translate-x-1/2 top-0 cursor-pointer
                    ${
                      event.type === "arrival"
                        ? "bg-blue-400"
                        : event.type === "start"
                        ? "bg-green-400"
                        : "bg-purple-400"
                    }`}
                style={{ left: `${(event.time / totalTime) * 100}%` }}
                onClick={() => setCurrentTime(event.time)}
                title={`${event.type} of P${event.processId} at t=${formatTime(
                  event.time
                )}`}
              />
            ))}
          </div>

          <input
            type='range'
            className='absolute top-1 w-full -mt-2 appearance-none bg-transparent cursor-pointer'
            min='0'
            max='100'
            step='0.1'
            value={(currentTime / totalTime) * 100 || 0}
            onChange={handleTimeChange}
          />
        </div>

        {/* Playback controls */}
        <div className='flex justify-between items-center'>
          <div className='flex items-center space-x-3'>
            <button
              onClick={handleTimeChange}
              className='bg-gray-700 hover:bg-gray-600 p-2 rounded-lg transition-colors'
              title='Reset'
              value='0'
            >
              <RotateCcw size={20} />
            </button>

            <button
              onClick={jumpToPrevEvent}
              className='bg-gray-700 hover:bg-gray-600 p-2 rounded-lg transition-colors'
              title='Previous event'
              disabled={currentTime <= 0}
            >
              <ChevronLeft size={20} />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`p-2 rounded-lg transition-colors ${
                isPlaying
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>

            <button
              onClick={jumpToNextEvent}
              className='bg-gray-700 hover:bg-gray-600 p-2 rounded-lg transition-colors'
              title='Next event'
              disabled={currentTime >= totalTime}
            >
              <ChevronRight size={20} />
            </button>

            {/* Speed control */}
            <div className='flex items-center space-x-1 bg-gray-900 rounded-lg p-1'>
              {[0.5, 1, 2, 5].map((speed) => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`px-2 py-1 text-xs rounded-md transition-colors ${
                    playbackSpeed === speed
                      ? "bg-green-600 text-white"
                      : "bg-gray-800 hover:bg-gray-700 text-gray-300"
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          <div className='font-mono text-sm bg-gray-900 px-3 py-1 rounded text-gray-300'>
            {formatTime(currentTime)} / {formatTime(totalTime)}
          </div>
        </div>
      </div>

      {/* Statistics panel */}
      {showStats && (
        <div className='mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-800 p-4 rounded-lg border border-gray-700 text-gray-300'>
          <div className='bg-gray-900 rounded-lg p-3 border border-gray-700 shadow-inner'>
            <div className='text-xs text-gray-400 uppercase font-semibold mb-1'>
              CPU Utilization
            </div>
            <div className='text-2xl font-mono'>
              {formatTime(metrics.cpuUtilization)}%
            </div>
            <div className='mt-2 h-2 bg-gray-800 rounded-full'>
              <div
                className='h-full bg-green-500 rounded-full'
                style={{ width: `${metrics.cpuUtilization}%` }}
              ></div>
            </div>
          </div>

          <div className='bg-gray-900 rounded-lg p-3 border border-gray-700 shadow-inner'>
            <div className='text-xs text-gray-400 uppercase font-semibold mb-1'>
              Average Wait Time
            </div>
            <div className='text-2xl font-mono'>
              {formatTime(metrics.averageWaitTime)}
            </div>
          </div>

          <div className='bg-gray-900 rounded-lg p-3 border border-gray-700 shadow-inner'>
            <div className='text-xs text-gray-400 uppercase font-semibold mb-1'>
              Progress
            </div>
            <div className='text-2xl font-mono'>
              {metrics.completedCount} / {results.processes.length}
            </div>
            <div className='mt-2 h-2 bg-gray-800 rounded-full'>
              <div
                className='h-full bg-purple-500 rounded-full'
                style={{
                  width: `${
                    (metrics.completedCount / results.processes.length) * 100
                  }%`,
                }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Process timeline visualization */}
      <div className='mt-6 bg-gray-800 p-4 rounded-lg border border-gray-700'>
        <h3 className='text-gray-400 text-xs uppercase tracking-wider mb-3 font-semibold'>
          Process Timeline
        </h3>

        <div className='space-y-3'>
          {results.processes.map((process) => {
            // Find all segments for this process
            const segments = results.timeline.filter(
              (segment) => segment.processId === process.id
            );

            return (
              <div key={process.id} className='flex items-center space-x-3'>
                <div className='w-8 text-center text-sm font-medium text-gray-300'>
                  P{process.id}
                </div>

                <div className='flex-1 relative h-6 bg-gray-900 rounded-md overflow-hidden'>
                  {/* Arrival marker */}
                  <div
                    className='absolute h-full border-l-2 border-blue-500 z-10'
                    style={{
                      left: `${(process.arrivalTime / totalTime) * 100}%`,
                    }}
                  ></div>

                  {/* Time segments */}
                  {segments.map((segment, idx) => (
                    <div
                      key={idx}
                      className={`absolute h-full ${
                        segment.endTime <= currentTime
                          ? "bg-green-600"
                          : segment.startTime <= currentTime
                          ? "bg-green-600 animate-pulse"
                          : "bg-gray-700"
                      }`}
                      style={{
                        left: `${(segment.startTime / totalTime) * 100}%`,
                        width: `${
                          ((segment.endTime - segment.startTime) / totalTime) *
                          100
                        }%`,
                      }}
                    ></div>
                  ))}

                  {/* Current time indicator*/}
                  {currentTime > 0 && (
                    <div
                      className='absolute h-full border-r-2 border-white z-20'
                      style={{ left: `${(currentTime / totalTime) * 100}%` }}
                    ></div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Timeline scale */}
        <div className='mt-2 flex justify-between text-xs text-gray-400'>
          <div>0.00</div>
          <div>{formatTime(totalTime / 4)}</div>
          <div>{formatTime(totalTime / 2)}</div>
          <div>{formatTime((3 * totalTime) / 4)}</div>
          <div>{formatTime(totalTime)}</div>
        </div>
      </div>
    </div>
  );
};

export default QueueVisualization;
