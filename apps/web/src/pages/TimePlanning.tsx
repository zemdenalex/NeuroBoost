// apps/web/src/pages/TimePlanning.tsx

import { useState, useEffect } from 'react';

type TimeBlock = {
  id: string;
  category: 'sleep' | 'health' | 'work' | 'social' | 'learning' | 'hobbies' | 'chores' | 'other';
  label: string;
  hours: number;
  color: string;
  description?: string;
};

const HOURS_PER_WEEK = 168;

const DEFAULT_BLOCKS: TimeBlock[] = [
  { id: '1', category: 'sleep', label: 'Sleep', hours: 56, color: 'bg-gray-600', description: '8h/night × 7 days' },
  { id: '2', category: 'work', label: 'Core Work', hours: 40, color: 'bg-blue-600', description: '9-5 job or main focus' },
  { id: '3', category: 'health', label: 'Health & Fitness', hours: 10, color: 'bg-green-600', description: 'Exercise, meal prep, self-care' },
  { id: '4', category: 'social', label: 'Social & Family', hours: 14, color: 'bg-pink-600', description: 'Relationships & connections' },
  { id: '5', category: 'chores', label: 'Life Admin', hours: 10, color: 'bg-orange-600', description: 'Chores, errands, finances' }
];

export function TimePlanning() {
  const [blocks, setBlocks] = useState<TimeBlock[]>(DEFAULT_BLOCKS);
  const [selectedBlock, setSelectedBlock] = useState<TimeBlock | null>(null);
  const [showNewBlock, setShowNewBlock] = useState(false);
  const [viewMode, setViewMode] = useState<'blocks' | 'schedule'>('blocks');

  const allocatedHours = blocks.reduce((sum, block) => sum + block.hours, 0);
  const remainingHours = HOURS_PER_WEEK - allocatedHours;
  const remainingPercent = (remainingHours / HOURS_PER_WEEK) * 100;

  const updateBlockHours = (blockId: string, newHours: number) => {
    setBlocks(blocks.map(block => 
      block.id === blockId 
        ? { ...block, hours: Math.max(0, Math.min(newHours, HOURS_PER_WEEK)) }
        : block
    ));
  };

  const addBlock = (newBlock: Omit<TimeBlock, 'id'>) => {
    const id = Date.now().toString();
    setBlocks([...blocks, { ...newBlock, id }]);
    setShowNewBlock(false);
  };

  const deleteBlock = (blockId: string) => {
    setBlocks(blocks.filter(block => block.id !== blockId));
    setSelectedBlock(null);
  };

  const getWeeklyScheduleVisualization = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const hoursPerDay = 24;
    
    // Simple distribution logic - this could be made much more sophisticated
    const schedule: Record<string, TimeBlock[][]> = {};
    
    days.forEach(day => {
      schedule[day] = Array(hoursPerDay).fill(null).map(() => []);
      
      // Distribute sleep (8 hours per night)
      const sleepBlock = blocks.find(b => b.category === 'sleep');
      if (sleepBlock) {
        for (let h = 23; h < 24; h++) schedule[day][h].push(sleepBlock);
        for (let h = 0; h < 7; h++) schedule[day][h].push(sleepBlock);
      }
      
      // Distribute work hours (Mon-Fri, 9-5)
      if (['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(day)) {
        const workBlock = blocks.find(b => b.category === 'work');
        if (workBlock) {
          for (let h = 9; h < 17; h++) schedule[day][h].push(workBlock);
        }
      }
      
      // Add other blocks in remaining slots
      // This is a simplified version - in reality you'd want a more intelligent algorithm
    });
    
    return schedule;
  };

  return (
    <div className="h-full flex flex-col bg-black text-zinc-100 font-mono">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-zinc-700 bg-zinc-900">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">Time Planning</h1>
          <button
            onClick={() => window.location.hash = '#/'}
            className="text-sm text-zinc-400 hover:text-white"
          >
            ← Back to Calendar
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('blocks')}
            className={`px-3 py-1 text-sm rounded ${
              viewMode === 'blocks' 
                ? 'bg-zinc-600 text-white' 
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            Blocks
          </button>
          <button
            onClick={() => setViewMode('schedule')}
            className={`px-3 py-1 text-sm rounded ${
              viewMode === 'schedule' 
                ? 'bg-zinc-600 text-white' 
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            Schedule
          </button>
        </div>
      </header>

      {/* Weekly Overview */}
      <div className="p-4 bg-zinc-900 border-b border-zinc-700">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">168 Hours in Your Week</h2>
          <button
            onClick={() => setShowNewBlock(true)}
            className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-sm"
          >
            + Add Block
          </button>
        </div>
        
        {/* Progress Bar */}
        <div className="relative h-12 bg-zinc-800 rounded overflow-hidden">
          <div className="absolute inset-0 flex">
            {blocks.map((block, index) => {
              const width = (block.hours / HOURS_PER_WEEK) * 100;
              const left = blocks.slice(0, index).reduce((sum, b) => sum + (b.hours / HOURS_PER_WEEK) * 100, 0);
              
              return (
                <div
                  key={block.id}
                  className={`absolute h-full ${block.color} transition-all cursor-pointer hover:opacity-80`}
                  style={{ 
                    left: `${left}%`, 
                    width: `${width}%` 
                  }}
                  onClick={() => setSelectedBlock(block)}
                  title={`${block.label}: ${block.hours}h`}
                >
                  {width > 5 && (
                    <div className="p-1 text-xs text-white font-semibold truncate">
                      {block.hours}h
                    </div>
                  )}
                </div>
              );
            })}
            
            {remainingHours > 0 && (
              <div
                className="absolute h-full bg-zinc-700 right-0"
                style={{ width: `${remainingPercent}%` }}
              >
                <div className="p-1 text-xs text-zinc-300 text-right">
                  {remainingHours}h free
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-between text-xs text-zinc-500 mt-1">
          <span>0h</span>
          <span>84h (halfway)</span>
          <span>168h</span>
        </div>
      </div>

      {viewMode === 'blocks' ? (
        /* Blocks View */
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {blocks.map(block => (
              <div
                key={block.id}
                className={`border border-zinc-700 rounded-lg p-4 cursor-pointer hover:border-zinc-500 transition-colors ${
                  selectedBlock?.id === block.id ? 'ring-1 ring-blue-400' : ''
                }`}
                onClick={() => setSelectedBlock(block)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-4 h-4 rounded ${block.color}`} />
                  <span className="text-2xl font-bold">{block.hours}h</span>
                </div>
                
                <h3 className="font-semibold mb-1">{block.label}</h3>
                {block.description && (
                  <p className="text-xs text-zinc-400">{block.description}</p>
                )}
                
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-zinc-500">Per day:</span>
                  <span className="text-sm font-semibold">
                    {(block.hours / 7).toFixed(1)}h
                  </span>
                  <span className="text-xs text-zinc-500">
                    ({Math.round((block.hours / HOURS_PER_WEEK) * 100)}%)
                  </span>
                </div>
                
                {/* Quick adjust buttons */}
                <div className="flex items-center gap-1 mt-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateBlockHours(block.id, block.hours - 1);
                    }}
                    className="px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded"
                  >
                    -1h
                  </button>
                  <input
                    type="number"
                    value={block.hours}
                    onChange={(e) => updateBlockHours(block.id, Number(e.target.value))}
                    onClick={(e) => e.stopPropagation()}
                    className="w-16 px-2 py-1 text-xs bg-zinc-800 border border-zinc-600 rounded text-center"
                    min="0"
                    max={HOURS_PER_WEEK}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateBlockHours(block.id, block.hours + 1);
                    }}
                    className="px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded"
                  >
                    +1h
                  </button>
                </div>
              </div>
            ))}
            
            {/* Remaining time card */}
            {remainingHours > 0 && (
              <div className="border-2 border-dashed border-zinc-700 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-zinc-400 mb-2">
                  {remainingHours}h
                </div>
                <p className="text-sm text-zinc-500">Unallocated Time</p>
                <p className="text-xs text-zinc-600 mt-2">
                  {(remainingHours / 7).toFixed(1)}h per day
                </p>
                <button
                  onClick={() => setShowNewBlock(true)}
                  className="mt-3 px-3 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded"
                >
                  Allocate Time
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Schedule View */
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
            <p className="text-zinc-400 text-center">
              Weekly schedule visualization coming soon...
            </p>
            <p className="text-zinc-500 text-sm text-center mt-2">
              This will show how your time blocks could be distributed across a typical week
            </p>
          </div>
        </div>
      )}

      {/* Selected Block Details */}
      {selectedBlock && (
        <div className="border-t border-zinc-700 bg-zinc-900 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{selectedBlock.label}</h3>
              <p className="text-sm text-zinc-400">{selectedBlock.description}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{selectedBlock.hours}h</div>
              <div className="text-xs text-zinc-500">
                {(selectedBlock.hours / 7).toFixed(1)}h/day • {Math.round((selectedBlock.hours / HOURS_PER_WEEK) * 100)}%
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => deleteBlock(selectedBlock.id)}
              className="px-3 py-1 text-sm bg-red-900 hover:bg-red-800 text-red-200 rounded"
            >
              Delete Block
            </button>
            <button
              onClick={() => setSelectedBlock(null)}
              className="px-3 py-1 text-sm text-zinc-400 hover:text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* New Block Modal */}
      {showNewBlock && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Add Time Block</h3>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              addBlock({
                category: formData.get('category') as TimeBlock['category'],
                label: formData.get('label') as string,
                hours: Number(formData.get('hours')),
                color: formData.get('color') as string,
                description: formData.get('description') as string
              });
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Label</label>
                  <input
                    name="label"
                    type="text"
                    required
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white"
                    placeholder="e.g., Side Projects"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Category</label>
                  <select
                    name="category"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white"
                    defaultValue="other"
                  >
                    <option value="work">Work</option>
                    <option value="learning">Learning</option>
                    <option value="health">Health</option>
                    <option value="social">Social</option>
                    <option value="hobbies">Hobbies</option>
                    <option value="chores">Chores</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Hours per week</label>
                  <input
                    name="hours"
                    type="number"
                    required
                    min="1"
                    max={remainingHours}
                    defaultValue={Math.min(10, remainingHours)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white"
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    {remainingHours} hours available
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Color</label>
                  <select
                    name="color"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white"
                    defaultValue="bg-purple-600"
                  >
                    <option value="bg-purple-600">Purple</option>
                    <option value="bg-indigo-600">Indigo</option>
                    <option value="bg-cyan-600">Cyan</option>
                    <option value="bg-teal-600">Teal</option>
                    <option value="bg-amber-600">Amber</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Description (optional)</label>
                  <input
                    name="description"
                    type="text"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white"
                    placeholder="Brief description"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowNewBlock(false)}
                  className="flex-1 px-4 py-2 text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded"
                >
                  Add Block
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}