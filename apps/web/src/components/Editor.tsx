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

// Time parsing function to handle multiple formats
const parseTimeInput = (input: string): string | null => {
  if (!input) return null;
  
  // Remove any spaces and convert to lowercase
  const clean = input.replace(/\s+/g, '').toLowerCase();
  
  // Handle various formats
  let hours: number, minutes: number;
  
  // Format: HHMM (e.g., "1050", "0930")
  if (/^\d{3,4}$/.test(clean)) {
    if (clean.length === 3) {
      hours = parseInt(clean.slice(0, 1), 10);
      minutes = parseInt(clean.slice(1), 10);
    } else {
      hours = parseInt(clean.slice(0, 2), 10);
      minutes = parseInt(clean.slice(2), 10);
    }
  }
  // Format: HH:MM (e.g., "10:50", "9:30")
  else if (/^\d{1,2}:\d{2}$/.test(clean)) {
    const [h, m] = clean.split(':');
    hours = parseInt(h, 10);
    minutes = parseInt(m, 10);
  }
  // Format: H:MM or HH:M (e.g., "9:5", "10:5")
  else if (/^\d{1,2}:\d{1,2}$/.test(clean)) {
    const [h, m] = clean.split(':');
    hours = parseInt(h, 10);
    minutes = parseInt(m, 10);
  }
  else {
    return null; // Invalid format
  }
  
  // Validate ranges
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  
  // Return in HH:MM format without any snapping
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
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
  const [startTimeInput, setStartTimeInput] = useState('');
  const [endTimeInput, setEndTimeInput] = useState('');
  const [startDateLocal, setStartDateLocal] = useState('');
  const [endDateLocal, setEndDateLocal] = useState('');
  const [timeValidation, setTimeValidation] = useState({ start: true, end: true, startParsed: '', endParsed: '' });

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
          const newStart = createMskDateTimeAsUtc(startDateLocal, timeValidation.startParsed);
          let newEnd = createMskDateTimeAsUtc(endDateLocal, timeValidation.endParsed);
          
          // Handle cross-midnight events - if end time is earlier than start time on same day
          if (startDateLocal === endDateLocal && timeValidation.endParsed < timeValidation.startParsed) {
            // Add one day to end date for cross-midnight
            const nextDay = new Date(endDateLocal + 'T00:00:00');
            nextDay.setDate(nextDay.getDate() + 1);
            newEnd = createMskDateTimeAsUtc(nextDay.toISOString().slice(0, 10), timeValidation.endParsed);
            
            // Update the end date display to show the next day
            setEndDateLocal(nextDay.toISOString().slice(0, 10));
          }
          
          // Validate that end is after start
          if (newEnd <= newStart) {
            alert('End time must be after start time');
            return;
          }
          
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
        let eventStart = range.start;
        let eventEnd = range.end;
        
        // For new events with custom times, use the parsed times
        if (!isAllDay && timeValidation.start && timeValidation.end) {
          eventStart = createMskDateTimeAsUtc(startDateLocal, timeValidation.startParsed);
          eventEnd = createMskDateTimeAsUtc(endDateLocal, timeValidation.endParsed);
          
          // Handle cross-midnight events for new events
          if (startDateLocal === endDateLocal && timeValidation.endParsed < timeValidation.startParsed) {
            const nextDay = new Date(endDateLocal + 'T00:00:00');
            nextDay.setDate(nextDay.getDate() + 1);
            eventEnd = createMskDateTimeAsUtc(nextDay.toISOString().slice(0, 10), timeValidation.endParsed);
          }
        }

        const eventData: CreateEventBody = {
          title: title.trim(),
          startsAt: eventStart.toISOString(),
          endsAt: eventEnd.toISOString(),
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

  // Replace the handleKeyDown function:
  const handleKeyDown = (e: React.KeyboardEvent, fieldType?: 'title' | 'time' | 'description') => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    
    if (e.key === 'Enter') {
      if (fieldType === 'title' || !fieldType) {
        // Save on Enter in title field
        e.preventDefault();
        handleSave();
      } else if (fieldType === 'time') {
        // Tab to next field on Enter in time field
        e.preventDefault();
        const target = e.target as HTMLInputElement;
        const form = target.form;
        if (form) {
          const inputs = Array.from(form.querySelectorAll('input'));
          const currentIndex = inputs.indexOf(target);
          const nextInput = inputs[currentIndex + 1];
          if (nextInput) {
            nextInput.focus();
          }
        }
      } else if (fieldType === 'description' && e.ctrlKey) {
        // Ctrl+Enter saves in description
        e.preventDefault();
        handleSave();
      }
      // Regular Enter in description field just adds new line (default behavior)
    }
  };
  
  // Initialize local time values when draft/range changes
  useEffect(() => {
    if (draft) {
      const startMsk = utcToMskDateTime(new Date(draft.startUtc));
      const endMsk = utcToMskDateTime(new Date(draft.endUtc));
      
      setStartTimeInput(startMsk.time);
      setEndTimeInput(endMsk.time);
      setStartDateLocal(startMsk.date);
      setEndDateLocal(endMsk.date);
      setTimeValidation({ 
        start: true, 
        end: true, 
        startParsed: startMsk.time, 
        endParsed: endMsk.time 
      });
    } else if (range) {
      const startMsk = utcToMskDateTime(range.start);
      const endMsk = utcToMskDateTime(range.end);
      
      setStartTimeInput(startMsk.time);
      setEndTimeInput(endMsk.time);
      setStartDateLocal(startMsk.date);
      setEndDateLocal(endMsk.date);
      setTimeValidation({ 
        start: true, 
        end: true, 
        startParsed: startMsk.time, 
        endParsed: endMsk.time 
      });
    }
  }, [draft, range]);

  const utcToMskDateTime = (utcDate: Date) => {
    const mskDate = new Date(utcDate.getTime() + 3 * 60 * 60 * 1000);
    return {
      date: mskDate.toISOString().slice(0, 10),
      time: mskDate.toISOString().slice(11, 16)
    };
  };

  // Fixed timezone conversion - create UTC from MSK inputs
  const createMskDateTimeAsUtc = (dateStr: string, timeStr: string) => {
    // Create date as if it were UTC, then subtract 3 hours to get the UTC equivalent of MSK time
    const utcEquivalent = new Date(`${dateStr}T${timeStr}:00.000Z`);
    return new Date(utcEquivalent.getTime() - 3 * 60 * 60 * 1000);
  };

  // Handle time input changes - only validate, don't update ranges
  const handleTimeInputChange = (value: string, isStart: boolean) => {
    if (isStart) {
      setStartTimeInput(value);
    } else {
      setEndTimeInput(value);
    }
    
    const parsed = parseTimeInput(value);
    const isValid = parsed !== null;
    
    setTimeValidation(prev => ({
      ...prev,
      [isStart ? 'start' : 'end']: isValid,
      [isStart ? 'startParsed' : 'endParsed']: parsed || ''
    }));
  };

  // Update time input onBlur for auto-formatting:
  const handleTimeInputBlur = (value: string, isStart: boolean) => {
    const parsed = parseTimeInput(value);
    if (parsed && parsed !== value) {
      // Auto-format: "1050" becomes "10:50"
      if (isStart) {
        setStartTimeInput(parsed);
      } else {
        setEndTimeInput(parsed);
      }
      
      setTimeValidation(prev => ({
        ...prev,
        [isStart ? 'startParsed' : 'endParsed']: parsed
      }));
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
                    onChange={(e) => setStartDateLocal(e.target.value)}
                    className="w-full px-2 py-1 bg-zinc-800 border border-zinc-600 rounded text-white text-sm focus:outline-none focus:border-zinc-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDateLocal}
                    onChange={(e) => setEndDateLocal(e.target.value)}
                    className="w-full px-2 py-1 bg-zinc-800 border border-zinc-600 rounded text-white text-sm focus:outline-none focus:border-zinc-400"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Start Time (MSK)</label>
                  <input
                    type="text"
                    placeholder="e.g. 1050, 10:50"
                    value={startTimeInput}
                    onChange={(e) => handleTimeInputChange(e.target.value, true)}
                    onBlur={() => handleTimeInputBlur(startTimeInput, true)}
                    onKeyDown={(e) => handleKeyDown(e, 'time')}
                    className={`w-full px-2 py-1 bg-zinc-800 border rounded text-white text-sm focus:outline-none focus:border-zinc-400 ${
                      timeValidation.start ? 'border-zinc-600' : 'border-red-500'
                    }`}
                  />
                  {!timeValidation.start && startTimeInput && (
                    <div className="text-xs text-red-400 mt-1">Invalid format (try: 1050, 10:50)</div>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">End Time (MSK)</label>
                  <input
                    type="text"
                    placeholder="e.g. 1150, 11:50"
                    value={endTimeInput}
                    onChange={(e) => handleTimeInputChange(e.target.value, false)}
                    onBlur={() => handleTimeInputBlur(endTimeInput, false)}
                    onKeyDown={(e) => handleKeyDown(e, 'time')}
                    className={`w-full px-2 py-1 bg-zinc-800 border rounded text-white text-sm focus:outline-none focus:border-zinc-400 ${
                      timeValidation.end ? 'border-zinc-600' : 'border-red-500'
                    }`}
                  />
                  {!timeValidation.end && endTimeInput && (
                    <div className="text-xs text-red-400 mt-1">Invalid format (try: 1150, 11:50)</div>
                  )}
                </div>
              </div>
              
              {/* Cross-midnight indicator */}
              {timeValidation.start && timeValidation.end && timeValidation.startParsed && timeValidation.endParsed && 
               startDateLocal === endDateLocal && timeValidation.endParsed < timeValidation.startParsed && (
                <div className="text-xs text-purple-400 bg-purple-900/20 px-2 py-1 rounded">
                  Cross-midnight: {timeValidation.startParsed} → {timeValidation.endParsed} (+1 day)
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
            disabled={!title.trim() || (!isAllDay && (!timeValidation.start || !timeValidation.end))}
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded text-sm"
          >
            {isEditing ? (showReflection ? 'Save & Reflect' : 'Save') : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}