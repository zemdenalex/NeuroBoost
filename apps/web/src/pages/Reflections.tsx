// apps/web/src/pages/Reflections.tsx

import { useState, useEffect } from 'react';
import { getEvents, saveReflection } from '../api';
import type { NbEvent, Reflection } from '../types';

export function Reflections() {
  const [events, setEvents] = useState<NbEvent[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('week');
  const [selectedEvent, setSelectedEvent] = useState<NbEvent | null>(null);
  const [reflectionForm, setReflectionForm] = useState({
    focusPct: 75,
    goalPct: 75,
    mood: 7,
    note: ''
  });

  useEffect(() => {
    loadEvents();
  }, [selectedPeriod]);

  const loadEvents = async () => {
    const now = new Date();
    let start: Date, end: Date;

    switch (selectedPeriod) {
      case 'today':
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        break;
      case 'week':
        const weekDay = (now.getDay() + 6) % 7;
        start = new Date(now);
        start.setDate(now.getDate() - weekDay);
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        break;
    }

    try {
      const eventsData = await getEvents(start.toISOString(), end.toISOString());
      setEvents(eventsData);
    } catch (error) {
      console.error('Failed to load events:', error);
    }
  };

  const handleSaveReflection = async () => {
    if (!selectedEvent) return;

    try {
      await saveReflection(selectedEvent.id, reflectionForm);
      setSelectedEvent(null);
      setReflectionForm({ focusPct: 75, goalPct: 75, mood: 7, note: '' });
      loadEvents();
    } catch (error) {
      console.error('Failed to save reflection:', error);
    }
  };

  const getReflectionStatus = (event: NbEvent) => {
    if (!event.reflections || event.reflections.length === 0) return 'pending';
    const reflection = event.reflections[0];
    const avg = (reflection.focusPct + reflection.goalPct + (reflection.mood * 10)) / 3;
    if (avg >= 80) return 'excellent';
    if (avg >= 60) return 'good';
    return 'needs-work';
  };

  const unreflectedEvents = events.filter(e => 
    new Date(e.endUtc) < new Date() && (!e.reflections || e.reflections.length === 0)
  );

  const reflectedEvents = events.filter(e => 
    e.reflections && e.reflections.length > 0
  );

  return (
    <div className="h-full flex flex-col bg-black text-zinc-100 font-mono">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-zinc-700 bg-zinc-900">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">Reflections</h1>
          <button
            onClick={() => window.location.hash = '#/'}
            className="text-sm text-zinc-400 hover:text-white"
          >
            ← Back to Calendar
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedPeriod('today')}
            className={`px-3 py-1 text-sm rounded ${
              selectedPeriod === 'today' 
                ? 'bg-zinc-600 text-white' 
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setSelectedPeriod('week')}
            className={`px-3 py-1 text-sm rounded ${
              selectedPeriod === 'week' 
                ? 'bg-zinc-600 text-white' 
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setSelectedPeriod('month')}
            className={`px-3 py-1 text-sm rounded ${
              selectedPeriod === 'month' 
                ? 'bg-zinc-600 text-white' 
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            This Month
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Events List */}
        <div className="w-1/2 border-r border-zinc-700 overflow-y-auto">
          {/* Pending Reflections */}
          {unreflectedEvents.length > 0 && (
            <div className="p-4">
              <h2 className="text-sm font-semibold text-zinc-400 mb-3">
                Pending Reflections ({unreflectedEvents.length})
              </h2>
              <div className="space-y-2">
                {unreflectedEvents.map(event => (
                  <div
                    key={event.id}
                    className={`p-3 bg-zinc-900 border border-zinc-700 rounded cursor-pointer hover:border-zinc-500 transition-colors ${
                      selectedEvent?.id === event.id ? 'ring-1 ring-blue-400' : ''
                    }`}
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{event.title}</h3>
                      <span className="text-xs text-amber-400 bg-amber-900/20 px-2 py-1 rounded">
                        Needs Reflection
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">
                      {new Date(event.startsAt).toLocaleString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Reflections */}
          {reflectedEvents.length > 0 && (
            <div className="p-4 border-t border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-400 mb-3">
                Completed Reflections ({reflectedEvents.length})
              </h2>
              <div className="space-y-2">
                {reflectedEvents.map(event => {
                  const reflection = event.reflections![0];
                  const status = getReflectionStatus(event);
                  
                  return (
                    <div
                      key={event.id}
                      className={`p-3 bg-zinc-900 border border-zinc-700 rounded cursor-pointer hover:border-zinc-500 transition-colors ${
                        selectedEvent?.id === event.id ? 'ring-1 ring-blue-400' : ''
                      }`}
                      onClick={() => {
                        setSelectedEvent(event);
                        setReflectionForm({
                          focusPct: reflection.focusPct,
                          goalPct: reflection.goalPct,
                          mood: reflection.mood,
                          note: reflection.note || ''
                        });
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{event.title}</h3>
                        <span className={`text-xs px-2 py-1 rounded ${
                          status === 'excellent' 
                            ? 'text-green-300 bg-green-900/20'
                            : status === 'good' 
                            ? 'text-blue-300 bg-blue-900/20'
                            : 'text-orange-300 bg-orange-900/20'
                        }`}>
                          {status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs">
                        <span>Focus: {reflection.focusPct}%</span>
                        <span>Goal: {reflection.goalPct}%</span>
                        <span>Mood: {reflection.mood}/10</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Reflection Form */}
        <div className="w-1/2 p-6 overflow-y-auto">
          {selectedEvent ? (
            <>
              <h2 className="text-lg font-semibold mb-4">
                Reflect on: {selectedEvent.title}
              </h2>
              
              <div className="space-y-6">
                {/* Focus */}
                <div>
                  <label className="flex items-center justify-between text-sm text-zinc-300 mb-2">
                    <span>Focus Level</span>
                    <span className="font-semibold text-white">{reflectionForm.focusPct}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={reflectionForm.focusPct}
                    onChange={(e) => setReflectionForm({ 
                      ...reflectionForm, 
                      focusPct: Number(e.target.value) 
                    })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-zinc-500 mt-1">
                    <span>Distracted</span>
                    <span>Deep Focus</span>
                  </div>
                </div>

                {/* Goal Achievement */}
                <div>
                  <label className="flex items-center justify-between text-sm text-zinc-300 mb-2">
                    <span>Goal Achievement</span>
                    <span className="font-semibold text-white">{reflectionForm.goalPct}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={reflectionForm.goalPct}
                    onChange={(e) => setReflectionForm({ 
                      ...reflectionForm, 
                      goalPct: Number(e.target.value) 
                    })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-zinc-500 mt-1">
                    <span>Missed Goals</span>
                    <span>Exceeded Goals</span>
                  </div>
                </div>

                {/* Mood */}
                <div>
                  <label className="flex items-center justify-between text-sm text-zinc-300 mb-2">
                    <span>Overall Mood</span>
                    <span className="font-semibold text-white">{reflectionForm.mood}/10</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={reflectionForm.mood}
                    onChange={(e) => setReflectionForm({ 
                      ...reflectionForm, 
                      mood: Number(e.target.value) 
                    })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-zinc-500 mt-1">
                    <span>😔</span>
                    <span>😐</span>
                    <span>😊</span>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm text-zinc-300 mb-2">
                    Reflection Notes
                  </label>
                  <textarea
                    value={reflectionForm.note}
                    onChange={(e) => setReflectionForm({ 
                      ...reflectionForm, 
                      note: e.target.value 
                    })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white"
                    rows={4}
                    placeholder="What went well? What could improve? Key learnings..."
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedEvent(null);
                      setReflectionForm({ focusPct: 75, goalPct: 75, mood: 7, note: '' });
                    }}
                    className="flex-1 px-4 py-2 text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveReflection}
                    className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded"
                  >
                    Save Reflection
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-500">
              <p className="text-center">
                Select an event to reflect on<br />
                <span className="text-sm">Focus on past events that need reflection</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="border-t border-zinc-700 bg-zinc-900 p-4">
        <div className="flex items-center justify-around text-sm">
          <div className="text-center">
            <div className="text-zinc-400">Avg Focus</div>
            <div className="text-xl font-semibold">
              {reflectedEvents.length > 0
                ? Math.round(
                    reflectedEvents.reduce((sum, e) => sum + (e.reflections?.[0]?.focusPct || 0), 0) / 
                    reflectedEvents.length
                  )
                : 0}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-zinc-400">Avg Goal</div>
            <div className="text-xl font-semibold">
              {reflectedEvents.length > 0
                ? Math.round(
                    reflectedEvents.reduce((sum, e) => sum + (e.reflections?.[0]?.goalPct || 0), 0) / 
                    reflectedEvents.length
                  )
                : 0}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-zinc-400">Avg Mood</div>
            <div className="text-xl font-semibold">
              {reflectedEvents.length > 0
                ? (
                    reflectedEvents.reduce((sum, e) => sum + (e.reflections?.[0]?.mood || 0), 0) / 
                    reflectedEvents.length
                  ).toFixed(1)
                : 0}/10
            </div>
          </div>
          <div className="text-center">
            <div className="text-zinc-400">Reflected</div>
            <div className="text-xl font-semibold">
              {reflectedEvents.length}/{events.filter(e => new Date(e.endUtc) < new Date()).length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}