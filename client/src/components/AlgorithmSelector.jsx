
const AlgorithmSelector = ({ 
  algorithm, 
  onAlgorithmChange, 
  isPreemptive, 
  onPreemptiveChange,
  timeQuantum,
  onTimeQuantumChange
}) => {
  const algorithms = [
    { id: 'FCFS', name: 'FCFS' },
    { id: 'SJF', name: 'SJF' },
    { id: 'RR', name: 'ROUND ROBIN' },
    { id: 'Priority', name: 'PRIORITY SCHEDULING' }
  ];

  return (
    <div className="relative flex flex-col space-y-6">
      <h2 className="text-2xl font-mono font-bold mb-6 uppercase">Select Scheduling Algorithm:</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {algorithms.map(algo => (
          <button
            key={algo.id}
            className={`py-4 px-3 cursor-pointer rounded-2x transition-all ${
              algorithm === algo.id 
                ? 'bg-blue-600 shadow-lg' 
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
            onClick={() => onAlgorithmChange(algo.id)}
          >
            <div className="font-mono text-lg font-bold">{algo.name}</div>
          </button>
        ))}
      </div>
      
      {(algorithm === 'SJF' || algorithm === 'Priority') && (
        <div className="my-5 flex items-center gap-4">
          <h3 className="text-xl font-semibold font-mono uppercase">Execution Mode:</h3>
          <div className="flex space-x-4 text-md font-mono">
            <button
              className={`px-4 py-2 rounde cursor-pointer ${
                !isPreemptive ? 'bg-green-500' : 'bg-gray-700'
              }`}
              onClick={() => onPreemptiveChange(false)}
            >
              Non-Preemptive
            </button>
            <button
              className={`px-4 py-2 cursor-pointer ${
                isPreemptive ? 'bg-green-500' : 'bg-gray-700'
              }`}
              onClick={() => onPreemptiveChange(true)}
            >
              Preemptive
            </button>
          </div>
        </div>
      )}
      
      {algorithm === 'RR' && (
        <div className="my-5 flex items-center gap-3">
          <h3 className="text-xl font-semibold font-mono uppercase">Time Quantum:</h3>
          <div className="flex items-center">
            <input
              type="number"
              min="1"
              value={timeQuantum}
              onChange={(e) => onTimeQuantumChange(e.target.value)}
              className="bg-gray-700 text-white px-4 py-2 w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AlgorithmSelector;