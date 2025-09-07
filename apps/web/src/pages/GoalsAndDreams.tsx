// apps/web/src/pages/GoalsAndDreams.tsx

import { useState, useEffect } from 'react';
import { API_BASE } from '../api';

type Goal = {
  id: string;
  title: string;
  description?: string;
  category: 'career' | 'health' | 'relationships' | 'personal' | 'financial' | 'spiritual';
  timeframe: '1_year' | '5_years' | '10_years' | 'lifetime';
  status: 'dreaming' | 'planning' | 'pursuing' | 'achieved' | 'paused';
  milestones: Milestone[];
  createdAt: string;
  updatedAt: string;
};

type Milestone = {
  id: string;
  title: string;
  targetDate?: string;
  completed: boolean;
  completedAt?: string;
};

export function GoalsAndDreams() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Goal['timeframe'] | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<Goal['category'] | 'all'>('all');
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [newGoal, setNewGoal] = useState<Partial<Goal>>({
    timeframe: '1_year',
    category: 'personal',
    status: 'dreaming'
  });

  const categories: Goal['category'][] = ['career', 'health', 'relationships', 'personal', 'financial', 'spiritual'];
  const timeframes: Goal['timeframe'][] = ['1_year', '5_years', '10_years', 'lifetime'];
  const statuses: Goal['status'][] = ['dreaming', 'planning', 'pursuing', 'achieved', 'paused'];

  const categoryColors = {
    career: 'bg-blue-600',
    health: 'bg-green-600',
    relationships: 'bg-pink-600',
    personal: 'bg-purple-600',
    financial: 'bg-yellow-600',
    spiritual: 'bg-indigo-600'
  };

  const timeframeLabels = {
    '1_year': '1 Year',
    '5_years': '5 Years',
    '10_years': '10 Years',
    'lifetime': 'Lifetime'
  };

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      // For MVP, we can store goals as special tagged tasks or notes
      const response = await fetch(`${API_BASE}/notes/quick?limit=100`);
      const data = await response.json();
      
      // Filter notes that are goals (have #goal tag)
      const goalNotes = data.notes.filter((n: any) => n.tags.includes('goal'));
      
      // Transform to goal format
      const transformedGoals: Goal[] = goalNotes.map((note: any) => {
        try {
          const parsed = JSON.parse(note.body);
          return { ...parsed, id: note.id };
        } catch {
          // Fallback for non-JSON goals
          return {
            id: note.id,
            title: note.body,
            category: 'personal',
            timeframe: '1_year',
            status: 'dreaming',
            milestones: [],
            createdAt: note.createdAt,
            updatedAt: note.createdAt
          };
        }
      });
      
      setGoals(transformedGoals);
    } catch (error) {
      console.error('Failed to load goals:', error);
    }
  };

  const saveGoal = async () => {
    if (!newGoal.title) return;

    try {
      const goalData = {
        ...newGoal,
        milestones: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await fetch(`${API_BASE}/notes/quick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: JSON.stringify(goalData),
          source: 'web',
          tags: ['goal', newGoal.category, newGoal.timeframe]
        })
      });

      setShowNewGoal(false);
      setNewGoal({ timeframe: '1_year', category: 'personal', status: 'dreaming' });
      loadGoals();
    } catch (error) {
      console.error('Failed to save goal:', error);
    }
  };

  const filteredGoals = goals.filter(goal => {
    if (selectedTimeframe !== 'all' && goal.timeframe !== selectedTimeframe) return false;
    if (selectedCategory !== 'all' && goal.category !== selectedCategory) return false;
    return true;
  });

  return (
    <div className="h-full flex flex-col bg-black text-zinc-100 font-mono">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-zinc-700 bg-zinc-900">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">Goals & Dreams</h1>
          <button
            onClick={() => window.location.hash = '#/'}
            className="text-sm text-zinc-400 hover:text-white"
          >
            ← Back to Calendar
          </button>
        </div>
        
        <button
          onClick={() => setShowNewGoal(true)}
          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-sm"
        >
          + New Goal
        </button>
      </header>

      {/* Filters */}
      <div className="p-4 border-b border-zinc-700 bg-zinc-900 flex gap-4">
        <select
          value={selectedTimeframe}
          onChange={(e) => setSelectedTimeframe(e.target.value as any)}
          className="bg-zinc-800 border border-zinc-600 rounded px-3 py-1 text-sm"
        >
          <option value="all">All Timeframes</option>
          {timeframes.map(tf => (
            <option key={tf} value={tf}>{timeframeLabels[tf]}</option>
          ))}
        </select>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value as any)}
          className="bg-zinc-800 border border-zinc-600 rounded px-3 py-1 text-sm"
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Goals Grid */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGoals.map(goal => (
            <div 
              key={goal.id}
              className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 hover:border-zinc-600 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className={`px-2 py-1 rounded text-xs text-white ${categoryColors[goal.category]}`}>
                  {goal.category}
                </div>
                <div className="text-xs text-zinc-400">
                  {timeframeLabels[goal.timeframe]}
                </div>
              </div>

              <h3 className="text-lg font-semibold mb-2">{goal.title}</h3>
              
              {goal.description && (
                <p className="text-sm text-zinc-400 mb-3">{goal.description}</p>
              )}

              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs px-2 py-1 rounded ${
                  goal.status === 'achieved' ? 'bg-green-900 text-green-200' :
                  goal.status === 'pursuing' ? 'bg-blue-900 text-blue-200' :
                  goal.status === 'planning' ? 'bg-yellow-900 text-yellow-200' :
                  goal.status === 'paused' ? 'bg-gray-900 text-gray-200' :
                  'bg-zinc-800 text-zinc-300'
                }`}>
                  {goal.status}
                </span>
                <span className="text-xs text-zinc-500">
                  {new Date(goal.createdAt).toLocaleDateString()}
                </span>
              </div>

              {goal.milestones && goal.milestones.length > 0 && (
                <div className="space-y-1 mt-3 pt-3 border-t border-zinc-800">
                  <div className="text-xs text-zinc-400 mb-1">Milestones:</div>
                  {goal.milestones.map(milestone => (
                    <div key={milestone.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={milestone.completed}
                        className="rounded"
                        readOnly
                      />
                      <span className={`text-xs ${milestone.completed ? 'line-through text-zinc-500' : ''}`}>
                        {milestone.title}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* New Goal Modal */}
      {showNewGoal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">New Goal or Dream</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Title</label>
                <input
                  type="text"
                  value={newGoal.title || ''}
                  onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white"
                  placeholder="What do you want to achieve?"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Description (optional)</label>
                <textarea
                  value={newGoal.description || ''}
                  onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white"
                  rows={3}
                  placeholder="Why is this important to you?"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Category</label>
                  <select
                    value={newGoal.category}
                    onChange={(e) => setNewGoal({ ...newGoal, category: e.target.value as Goal['category'] })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Timeframe</label>
                  <select
                    value={newGoal.timeframe}
                    onChange={(e) => setNewGoal({ ...newGoal, timeframe: e.target.value as Goal['timeframe'] })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white"
                  >
                    {timeframes.map(tf => (
                      <option key={tf} value={tf}>{timeframeLabels[tf]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Status</label>
                <select
                  value={newGoal.status}
                  onChange={(e) => setNewGoal({ ...newGoal, status: e.target.value as Goal['status'] })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white"
                >
                  {statuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowNewGoal(false)}
                className="flex-1 px-4 py-2 text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={saveGoal}
                disabled={!newGoal.title}
                className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 text-white rounded"
              >
                Save Goal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}