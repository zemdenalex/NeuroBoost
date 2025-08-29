import { useEffect, useState } from 'react';
import { getWeekStats } from '../api';
import type { WeekStats } from '../types';

export default function StatsBadge() {
  const [stats, setStats] = useState<WeekStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get start of current week (Monday)
        const now = new Date();
        const dayOfWeek = now.getDay();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        startOfWeek.setHours(0, 0, 0, 0);
        
        const weekStats = await getWeekStats(startOfWeek.toISOString().slice(0, 10));
        setStats(weekStats);
      } catch (err) {
        console.error('Failed to load week stats:', err);
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    };

    loadStats();
    
    // Refresh every 5 minutes
    const interval = setInterval(loadStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-300">
        Stats: Loading...
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="text-xs px-2 py-1 rounded bg-red-900/40 text-red-200 border border-red-700">
        Stats: Error
      </div>
    );
  }

  const plannedHours = Math.round(stats.plannedMinutes / 60 * 10) / 10;
  const completedHours = Math.round(stats.completedMinutes / 60 * 10) / 10;
  const adherence = stats.adherencePct;

  // Color coding based on adherence
  let badgeClass = "text-xs px-2 py-1 rounded border ";
  if (adherence >= 80) {
    badgeClass += "bg-emerald-900/30 text-emerald-200 border-emerald-700";
  } else if (adherence >= 60) {
    badgeClass += "bg-amber-900/30 text-amber-200 border-amber-700";
  } else {
    badgeClass += "bg-red-900/30 text-red-200 border-red-700";
  }

  return (
    <div className={badgeClass} title={`Week: ${stats.eventCount} events, ${stats.reflectionCount} reflections`}>
      <span className="font-semibold">{plannedHours}h</span>
      <span className="opacity-75"> / </span>
      <span>{completedHours}h</span>
      <span className="opacity-75"> · </span>
      <span>{adherence}%</span>
    </div>
  );
}