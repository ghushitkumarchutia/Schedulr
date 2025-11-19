import { useEffect, useRef } from "react";

const SimulationResults = ({ results }) => {
  const ganttChartRef = useRef(null);

  useEffect(() => {
    if (
      ganttChartRef.current &&
      results.timeline &&
      results.timeline.length > 0
    ) {
      const canvas = ganttChartRef.current;
      const ctx = canvas.getContext("2d");
      const totalTime = results.timeline[results.timeline.length - 1].endTime;

      const displayWidth = canvas.clientWidth;
      canvas.width = displayWidth;
      canvas.height = 120;

      const timeScale = displayWidth / totalTime;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barHeight = 60;
      const barY = 20;
      const colors = [
        "#4C51BF",
        "#4299E1",
        "#38B2AC",
        "#48BB78",
        "#F6AD55",
        "#ED8936",
        "#EF4444",
        "#9F7AEA",
      ];

      ctx.fillStyle = "#1A202C";
      ctx.fillRect(0, barY, canvas.width, barHeight);

      results.timeline.forEach((segment) => {
        const x = segment.startTime * timeScale;
        const width = (segment.endTime - segment.startTime) * timeScale;

        if (width < 1) return;

        const processIndex =
          parseInt(segment.processId.replace("P", "")) % colors.length;
        ctx.fillStyle = colors[processIndex];
        ctx.fillRect(x, barY, width, barHeight);

        ctx.fillStyle = "white";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        if (width > 30) {
          ctx.fillText(segment.processId, x + width / 2, barY + barHeight / 2);
        }
      });

      ctx.strokeStyle = "#4A5568";
      ctx.fillStyle = "#A0AEC0";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";

      const timeStep = Math.ceil(totalTime / 10);
      for (let t = 0; t <= totalTime; t += timeStep) {
        const x = t * timeScale;
        ctx.beginPath();
        ctx.moveTo(x, barY + barHeight);
        ctx.lineTo(x, barY + barHeight + 5);
        ctx.stroke();
        ctx.fillText(t, x, barY + barHeight + 15);
      }
    }
  }, [results]);

  if (!results) return null;

  return (
    <div className='relative bg-gray-800 min-h-screen p-6 animate-fadeIn'>
      <div className='mb-8'>
        <h3 className='text-xl font-semibold mb-4'>Gantt Chart</h3>
        <div className='bg-gray-900 p-4 rounded-lg'>
          <canvas ref={ganttChartRef} className='w-full h-32'></canvas>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
        <div className='bg-gray-900 p-6 rounded-lg'>
          <div className='text-4xl font-bold text-blue-400 mb-2'>
            {results.averageWaitingTime.toFixed(2)}
          </div>
          <div className='text-gray-400'>Average Waiting Time</div>
        </div>
        <div className='bg-gray-900 p-6 rounded-lg'>
          <div className='text-4xl font-bold text-green-400 mb-2'>
            {results.averageTurnaroundTime.toFixed(2)}
          </div>
          <div className='text-gray-400'>Average Turnaround Time</div>
        </div>
        <div className='bg-gray-900 p-6 rounded-lg'>
          <div className='text-4xl font-bold text-purple-400 mb-2'>
            {results.averageResponseTime.toFixed(2)}
          </div>
          <div className='text-gray-400'>Average Response Time</div>
        </div>
      </div>

      <div className='mb-6'>
        <h3 className='text-xl font-semibold mb-4'>Process Details</h3>
        <div className='bg-gray-900 rounded-lg p-4 overflow-x-auto'>
          <table className='w-full'>
            <thead>
              <tr className='text-left border-b border-gray-700'>
                <th className='p-3'>Process ID</th>
                <th className='p-3'>Arrival Time</th>
                <th className='p-3'>Burst Time</th>
                {results.processes[0].priority !== undefined && (
                  <th className='p-3'>Priority</th>
                )}
                <th className='p-3'>Completion Time</th>
                <th className='p-3'>Turnaround Time</th>
                <th className='p-3'>Waiting Time</th>
                <th className='p-3'>Response Time</th>
              </tr>
            </thead>
            <tbody>
              {results.processes.map((process, index) => (
                <tr
                  key={index}
                  className='border-b border-gray-800 hover:bg-gray-800'
                >
                  <td className='p-3'>{process.id}</td>
                  <td className='p-3'>{process.arrivalTime}</td>
                  <td className='p-3'>{process.burstTime}</td>
                  {process.priority !== undefined && (
                    <td className='p-3'>{process.priority}</td>
                  )}
                  <td className='p-3'>{process.completionTime}</td>
                  <td className='p-3'>{process.turnaroundTime}</td>
                  <td className='p-3'>{process.waitingTime}</td>
                  <td className='p-3'>{process.responseTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SimulationResults;
