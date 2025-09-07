import { useState, useEffect } from 'react';
import { createEventUTC, patchEventUTC, saveReflection } from '../api';
import type { NbEvent, CreateEventBody, ReflectionBody } from '../types';

type EditorProps = {
  range: { start: Date; end: Date } | null;
  draft: NbEvent | null;
  onClose: () => void;
  onCreated: () => void;
  onPatched: () => void;
  onDelete: (id: string) => Promise<void>;
  onRangeChange?: (range: { start: Date; end: Date }) => void;
};

export function Editor({ range, draft, onClose, onCreated, onPatched, onDelete, onRangeChange }: EditorProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [tags, setTags] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [color, setColor] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState(5);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showReflection, setShowReflection] = useState(false);
  const [focusPct, setFocusPct] = useState(75);
  const [goalPct, setGoalPct] = useState(75);
  const [mood, setMood] = useState(7);
  const [reflectionNote, setReflectionNote] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [startTimeLocal, setStartTimeLocal] = useState('');
  const [endTimeLocal, setEndTimeLocal] = useState('');
  const [startDateLocal, setStartDateLocal] = useState('');
  const [endDateLocal, setEndDateLocal] = useState('');
  const [timeValidation, setTimeValidation] = useState({ start: true, end: true });

  const isEditing = !!draft;
  const hasReflection = draft?.reflections && draft.reflections.length > 0;

  useEffect(() => {
    if (draft) {
      setTitle(draft.title);
      setDescription(draft.description || '');
      setLocation(draft.location || '');
      setTags(draft.tags?.join(', ') || '');
      setIsAllDay(!!draft.allDay);
      setColor(draft.color || '');
      
      if (hasReflection) {
        const reflection = draft.reflections![0];
        setFocusPct(reflection.focusPct);
        setGoalPct(reflection.goalPct);
        setMood(reflection.mood);
        setReflectionNote(reflection.note || '');
      }
    } else {
      setTitle('');
      setDescription('');
      setLocation('');
      setTags('');
      setIsAllDay(range ? range.end.getTime() - range.start.getTime() >= 24 * 60 * 60 * 1000 : false);
      setColor('');
      setFocusPct(75);
      setGoalPct(75);
      setMood(7);
      setReflectionNote('');
      setShowReflection(false);
    }
  }, [draft, range, hasReflection]);

  const handleSave = async () => {
    if (!title.trim()) return;

    // Validate times for non-all-day events
    if (!isAllDay && (!timeValidation.start || !timeValidation.end)) {
      alert('Please enter valid start and end times');
      return;
    }

    try {
      const tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean);
      const reminderData = reminderMinutes > 0 ? [{
        minutesBefore: reminderMinutes,
        channel: 'TELEGRAM' as const
      }] : [];

      if (isEditing && draft) {
        const updates: Partial<CreateEventBody> = {
          title: title.trim(),
          description: description.trim() || undefined,
          location: location.trim() || undefined,
          tags: tagsArray,
          color: color.trim() || undefined
        };

        // Update times if they've changed and are valid
        if (!isAllDay && timeValidation.start && timeValidation.end) {
          const newStart = toUtc(startDateLocal, startTimeLocal);
          const newEnd = toUtc(endDateLocal, endTimeLocal);
          
          if (newEnd > newStart) {
            updates.startsAt = newStart.toISOString();
            updates.endsAt = newEnd.toISOString();
          }
        }

        await patchEventUTC(draft.id, updates);
        
        if (showReflection) {
          const reflectionData: ReflectionBody = {
            focusPct,
            goalPct,
            mood,
            note: reflectionNote.trim() || undefined,
            wasCompleted: true,
            wasOnTime: true
          };
          
          await saveReflection(draft.id, reflectionData);
        }
        
        onPatched();
      } else if (range) {
        // For new events, use the range (which should be updated by time inputs)
        const eventData: CreateEventBody = {
          title: title.trim(),
          startsAt: range.start.toISOString(),
          endsAt: range.end.toISOString(),
          allDay: isAllDay,
          description: description.trim() || undefined,
          location: location.trim() || undefined,
          tags: tagsArray,
          color: color.trim() || undefined,
          reminders: reminderData
        };

        await createEventUTC(eventData);
        onCreated();
      }
    } catch (error) {
      console.error('Failed to save event:', error);
      alert('Failed to save event: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleDelete = async () => {
    if (!draft || !isEditing) return;
    
    if (confirm(`Delete "${draft.title}"?`)) {
      setIsDeleting(true);
      try {
        await onDelete(draft.id);
      } catch (error) {
        console.error('Failed to delete event:', error);
        alert('Failed to delete event');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };
  
  // Initialize local time values when draft/range changes
  useEffect(() => {
    if (draft) {
      const startMsk = utcToMskDateTime(new Date(draft.startUtc));
      const endMsk = utcToMskDateTime(new Date(draft.endUtc));
      
      setStartTimeLocal(startMsk.time);
      setEndTimeLocal(endMsk.time);
      setStartDateLocal(startMsk.date);
      setEndDateLocal(endMsk.date);
      setTimeValidation({ start: true, end: true });
    } else if (range) {
      const startMsk = utcToMskDateTime(range.start);
      const endMsk = utcToMskDateTime(range.end);
      
      setStartTimeLocal(startMsk.time);
      setEndTimeLocal(endMsk.time);
      setStartDateLocal(startMsk.date);
      setEndDateLocal(endMsk.date);
      setTimeValidation({ start: true, end: true });
    }
  }, [draft, range]);

  // Time edit helpers
  const validateTime = (timeStr: string) => {
    if (!timeStr || !timeStr.match(/^\d{2}:\d{2}$/)) return false;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
  };

  const utcToMskDateTime = (utcDate: Date) => {
  const mskDate = new Date(utcDate.getTime() + 3 * 60 * 60 * 1000);
  return {
      date: mskDate.toISOString().slice(0, 10),
      time: mskDate.toISOString().slice(11, 16)
    };
  };

  const toUtc = (dateStr: string, timeStr: string) => {
    const mskDateTime = new Date(`${dateStr}T${timeStr}:00`);
    return new Date(mskDateTime.getTime() - 3 * 60 * 60 * 1000);
  };


  // Update range helper
  const updateTimes = () => {
    if (!onRangeChange || !range) return;
    
    const startValid = validateTime(startTimeLocal);
    const endValid = validateTime(endTimeLocal);
    
    setTimeValidation({ start: startValid, end: endValid });
    
    if (startValid && endValid) {
      const newStart = toUtc(startDateLocal, startTimeLocal);
      const newEnd = toUtc(endDateLocal, endTimeLocal);
      
      if (newEnd > newStart) {
        onRangeChange({ start: newStart, end: newEnd });
      }
    }
  };

  

  return (
    <div 
      className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">
          {isEditing ? 'Edit Event' : 'New Event'}
        </h3>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-200 text-xl leading-none"
        >
          ×
        </button>
      </div>
      
      <div className="space-y-4">
        {!isAllDay && (
          <>
            {/* Date and Time inputs */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDateLocal}
                    onChange={(e) => {
                      setStartDateLocal(e.target.value);
                      // Auto-update range if editing existing event
                      if (onRangeChange && range && validateTime(startTimeLocal) && validateTime(endTimeLocal)) {
                        const newStart = toUtc(startDateLocal, startTimeLocal);
                        let newEnd = toUtc(endDateLocal, endTimeLocal);
                        if (newEnd <= newStart) {
                            // user likely meant next day
                            const nextDay = new Date(endDateLocal);
                            nextDay.setDate(nextDay.getDate() + 1);
                            newEnd = toUtc(nextDay.toISOString().slice(0, 10), endTimeLocal);
                        }
                        if (newEnd > newStart) onRangeChange({ start: newStart, end: newEnd });
                      }
                    }}
                    className="w-full px-2 py-1 bg-zinc-800 border border-zinc-600 rounded text-white text-sm focus:outline-none focus:border-zinc-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDateLocal}
                    onChange={(e) => {
                      setEndDateLocal(e.target.value);
                      // Auto-update range if editing existing event
                      if (onRangeChange && range && validateTime(startTimeLocal) && validateTime(endTimeLocal)) {
                        const newStart = toUtc(startDateLocal, startTimeLocal);
                        const newEnd = toUtc(e.target.value, endTimeLocal);
                        if (newEnd > newStart) {
                          onRangeChange({ start: newStart, end: newEnd });
                        }
                      }
                    }}
                    className="w-full px-2 py-1 bg-zinc-800 border border-zinc-600 rounded text-white text-sm focus:outline-none focus:border-zinc-400"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Start Time (MSK)</label>
                  <input
                    type="time"
                    value={startTimeLocal}
                    onChange={(e) => {
                      setStartTimeLocal(e.target.value);
                      setTimeValidation(prev => ({ ...prev, start: validateTime(e.target.value) }));
                      
                      // Auto-update range if editing existing event
                      if (onRangeChange && range && validateTime(e.target.value) && validateTime(endTimeLocal)) {
                        const newStart = toUtc(startDateLocal, e.target.value);
                        const newEnd = toUtc(endDateLocal, endTimeLocal);
                        if (newEnd > newStart) {
                          onRangeChange({ start: newStart, end: newEnd });
                        }
                      }
                    }}
                    className={`w-full px-2 py-1 bg-zinc-800 border rounded text-white text-sm focus:outline-none focus:border-zinc-400 ${
                      timeValidation.start ? 'border-zinc-600' : 'border-red-500'
                    }`}
                  />
                  {!timeValidation.start && startTimeLocal && (
                    <div className="text-xs text-red-400 mt-1">Invalid time format</div>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">End Time (MSK)</label>
                  <input
                    type="time"
                    value={endTimeLocal}
                    onChange={(e) => {
                      setEndTimeLocal(e.target.value);
                      setTimeValidation(prev => ({ ...prev, end: validateTime(e.target.value) }));
                      
                      // Auto-update range if editing existing event
                      if (onRangeChange && range && validateTime(startTimeLocal) && validateTime(e.target.value)) {
                        const newStart = toUtc(startDateLocal, startTimeLocal);
                        const newEnd = toUtc(endDateLocal, e.target.value);
                        if (newEnd > newStart) {
                          onRangeChange({ start: newStart, end: newEnd });
                        }
                      }
                    }}
                    className={`w-full px-2 py-1 bg-zinc-800 border rounded text-white text-sm focus:outline-none focus:border-zinc-400 ${
                      timeValidation.end ? 'border-zinc-600' : 'border-red-500'
                    }`}
                  />
                  {!timeValidation.end && endTimeLocal && (
                    <div className="text-xs text-red-400 mt-1">Invalid time format</div>
                  )}
                </div>
              </div>
              
              {/* Multi-day indicator */}
              {startDateLocal !== endDateLocal && (
                <div className="text-xs text-purple-400 bg-purple-900/20 px-2 py-1 rounded">
                  ✨ Multi-day event: {startDateLocal} {startTimeLocal} → {endDateLocal} {endTimeLocal}
                </div>
              )}
            </div>
          </>
        )}

        <div>
          <input
            type="text"
            placeholder="Event title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-400 font-mono"
            autoFocus
          />
        </div>

        {showAdvanced && (
          <>
            <div>
              <textarea
                placeholder="Description (optional)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-400 resize-none font-mono"
              />
            </div>

            <div>
              <input
                type="text"
                placeholder="Location (optional)..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-400 font-mono"
              />
            </div>

            <div>
              <input
                type="text"
                placeholder="Tags (comma separated)..."
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-400 font-mono"
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isAllDay}
                  onChange={(e) => setIsAllDay(e.target.checked)}
                  className="rounded"
                />
                All Day
              </label>

              <div className="flex items-center gap-2 text-sm">
                <label>Reminder:</label>
                <select
                  value={reminderMinutes}
                  onChange={(e) => setReminderMinutes(Number(e.target.value))}
                  className="bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-white font-mono"
                >
                  <option value={0}>None</option>
                  <option value={1}>1 min</option>
                  <option value={3}>3 min</option>
                  <option value={5}>5 min</option>
                  <option value={10}>10 min</option>
                  <option value={30}>30 min</option>
                  <option value={60}>1 hour</option>
                </select>
              </div>
            </div>

            <div>
              <input
                type="text"
                placeholder="Color (hex, optional)..."
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-400 font-mono"
              />
            </div>
          </>
        )}

        {/* Reflection Section */}
        {isEditing && (
          <div>
            <button
              type="button"
              onClick={() => setShowReflection(!showReflection)}
              className="text-sm text-zinc-400 hover:text-zinc-200 mb-2"
            >
              {hasReflection ? '✓ ' : ''}Reflection {showReflection ? '−' : '+'}
            </button>
            
            {showReflection && (
              <div className="space-y-3 p-3 bg-zinc-800 rounded border border-zinc-600">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Focus %</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={focusPct}
                      onChange={(e) => setFocusPct(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-xs text-center mt-1">{focusPct}%</div>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Goal %</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={goalPct}
                      onChange={(e) => setGoalPct(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-xs text-center mt-1">{goalPct}%</div>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Mood</label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={mood}
                      onChange={(e) => setMood(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-xs text-center mt-1">{mood}/10</div>
                  </div>
                </div>
                <textarea
                  placeholder="Reflection notes (optional)..."
                  value={reflectionNote}
                  onChange={(e) => setReflectionNote(e.target.value)}
                  rows={2}
                  className="w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-400 resize-none text-sm font-mono"
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-6 pt-4 border-t border-zinc-700">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-zinc-400 hover:text-zinc-200"
          >
            {showAdvanced ? 'Simple' : 'Advanced'} {showAdvanced ? '−' : '+'}
          </button>
          
          {isEditing && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-sm text-red-400 hover:text-red-300 disabled:text-red-600"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-zinc-400 hover:text-zinc-200 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded text-sm"
          >
            {isEditing ? (showReflection ? 'Save & Reflect' : 'Save') : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}