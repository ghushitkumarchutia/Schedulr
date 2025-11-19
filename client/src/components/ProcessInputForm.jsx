import { useState } from 'react';
import { PlusCircle, Trash2 } from 'lucide-react';

const ProcessInputForm = ({ algorithm, isPreemptive, processes, onProcessesChange }) => {
  const addProcess = () => {
    const newId = `P${processes.length + 1}`;
    onProcessesChange([...processes, { id: newId, arrivalTime: 0, burstTime: 1, priority: 1 }]);
  };

  const removeProcess = (index) => {
    if (processes.length > 1) {
      const newProcesses = [...processes];
      newProcesses.splice(index, 1);
      // Update process IDs to be sequential
      const updatedProcesses = newProcesses.map((p, idx) => ({
        ...p,
        id: `P${idx + 1}`
      }));
      onProcessesChange(updatedProcesses);
    }
  };

  const updateProcess = (index, field, value) => {
    const newProcesses = [...processes];
    newProcesses[index] = { ...newProcesses[index], [field]: value };
    onProcessesChange(newProcesses);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold font-mono my-2 uppercase">Process Details:</h2>
        <button
          onClick={addProcess}
          className="flex items-center space-x-1 cursor-pointer text-xl  text-blue-500 hover:text-blue-400"
        >
          <PlusCircle size={20} />
          <span>Add Process</span>
        </button>
      </div>

      <div className="border border-neutral-500 rounded-md overflow-x-auto">
        <table className="w-full">
          <thead className='border-b border-neutral-500'>
            <tr className="text-left font-mono text-lg">
              <th className="py-4 px-4 border-r text-xl border-neutral-500">Process ID</th>
              <th className="py-4 px-4 border-r text-xl border-neutral-500">Arrival Time</th>
              <th className="py-4 px-4 text-xl ">Burst Time</th>
              {algorithm === 'Priority' && <th className="py-4 px-4 text-xl border-l border-neutral-500">Priority</th>}
              <th className="py-4 px-4 w-16 text-xl border-l border-neutral-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {processes.map((process, index) => (
              <tr key={index} className=" hover:bg-gray-800">
                <td className="py-4 px-4 border-r border-neutral-500">
                  <input
                    type="text"
                    value={process.id}
                    onChange={(e) => updateProcess(index, 'id', e.target.value)}
                    className="bg-gray-700 px-3 py-2 rounded w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="py-4 px-4 border-r border-neutral-500">
                  <input
                    type="number"
                    min="0"
                    value={process.arrivalTime}
                    onChange={(e) => updateProcess(index, 'arrivalTime', e.target.value)}
                    className="bg-gray-700 px-3 py-2 rounded w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="py-4 px-4 border-r border-neutral-500">
                  <input
                    type="number"
                    min="1"
                    value={process.burstTime}
                    onChange={(e) => updateProcess(index, 'burstTime', e.target.value)}
                    className="bg-gray-700 px-3 py-2 rounded w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                {algorithm === 'Priority' && (
                  <td className="py-4 px-4 border-r border-neutral-500">
                    <input
                      type="number"
                      min="1"
                      value={process.priority}
                      onChange={(e) => updateProcess(index, 'priority', e.target.value)}
                      className="bg-gray-700 px-3 py-2 rounded w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                )}
                <td className="flex justify-center">
                  <button
                    onClick={() => removeProcess(index)}
                    disabled={processes.length <= 1}
                    className="text-red-400 cursor-pointer mt-6 hover:text-red-300 disabled:opacity-30"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProcessInputForm;