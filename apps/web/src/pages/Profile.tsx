// apps/web/src/pages/Profile.tsx
import { useState, useEffect } from 'react';
import { getWeekStats, getTaskPriorities, getBotTodayFocus } from '../api';
import PersonIcon from '@mui/icons-material/Person';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PsychologyIcon from '@mui/icons-material/Psychology';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

export function Profile() {
  const [weekStats, setWeekStats] = useState<any>(null);
  const [taskPriorities, setTaskPriorities] = useState<any>(null);
  const [todayFocus, setTodayFocus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllStats();
  }, []);

  const loadAllStats = async () => {
    try {
      const [week, priorities, today] = await Promise.all([
        getWeekStats(new Date().toISOString()),
        getTaskPriorities(),
        getBotTodayFocus()
      ]);
      
      setWeekStats(week);
      setTaskPriorities(priorities);
      setTodayFocus(today);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-black text-zinc-100">
        <div className="text-center">
          <div className="text-xl font-mono">Loading profile...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-black text-zinc-100 font-mono">
      {/* Header */}
      <div className="border-b border-zinc-700 bg-zinc-900 p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
            <PersonIcon fontSize="large" className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Your Profile</h1>
            <p className="text-zinc-400 text-sm">Track your progress and patterns</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 max-w-7xl mx-auto">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Weekly Adherence */}
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400">Weekly Adherence</span>
              <TrendingUpIcon fontSize="small" className="text-blue-400" />
            </div>
            <div className="text-3xl font-bold mb-1">
              {weekStats?.adherencePct || 0}%
            </div>
            <div className="text-xs text-zinc-500">
              {Math.round((weekStats?.completedMinutes || 0) / 60)} of {Math.round((weekStats?.plannedMinutes || 0) / 60)} hours
            </div>
          </div>

          {/* Events This Week */}
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400">Events This Week</span>
              <CalendarMonthIcon fontSize="small" className="text-green-400" />
            </div>
            <div className="text-3xl font-bold mb-1">
              {weekStats?.eventCount || 0}
            </div>
            <div className="text-xs text-zinc-500">
              {weekStats?.reflectionCount || 0} with reflections
            </div>
          </div>

          {/* Active Tasks */}
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400">Active Tasks</span>
              <CheckCircleIcon fontSize="small" className="text-purple-400" />
            </div>
            <div className="text-3xl font-bold mb-1">
              {todayFocus?.priorityTasks?.total || 0}
            </div>
            <div className="text-xs text-zinc-500">
              Top 5 priorities tracked
            </div>
          </div>

          {/* Reflection Rate */}
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400">Reflection Rate</span>
              <PsychologyIcon fontSize="small" className="text-orange-400" />
            </div>
            <div className="text-3xl font-bold mb-1">
              {weekStats?.eventCount > 0 
                ? Math.round((weekStats.reflectionCount / weekStats.eventCount) * 100)
                : 0}%
            </div>
            <div className="text-xs text-zinc-500">
              {weekStats?.reflectionCount || 0} reflections logged
            </div>
          </div>
        </div>

        {/* Task Priorities Breakdown */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Task Priorities Overview</h2>
          
          {taskPriorities?.prioritySummary ? (
            <div className="space-y-3">
              {Object.entries(taskPriorities.prioritySummary).map(([priority, data]: [string, any]) => {
                const totalWidth = data.total > 0 ? 100 : 0;
                const todoWidth = data.total > 0 ? (data.todo / data.total) * 100 : 0;
                const scheduledWidth = data.total > 0 ? (data.scheduled / data.total) * 100 : 0;
                const inProgressWidth = data.total > 0 ? (data.inProgress / data.total) * 100 : 0;
                
                const priorityColors = [
                  'bg-blue-600',    // 0: Buffer
                  'bg-red-600',     // 1: Emergency
                  'bg-orange-600',  // 2: ASAP
                  'bg-yellow-600',  // 3: Must Today
                  'bg-green-600',   // 4: Deadline Soon
                  'bg-gray-600'     // 5: If Possible
                ];
                
                return (
                  <div key={priority}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        {priority}: {data.name}
                      </span>
                      <span className="text-sm text-zinc-400">
                        {data.total} tasks
                      </span>
                    </div>
                    
                    <div className="h-8 bg-zinc-800 rounded-full overflow-hidden flex">
                      {data.todo > 0 && (
                        <div 
                          className={`${priorityColors[parseInt(priority)]} flex items-center justify-center text-xs text-white`}
                          style={{ width: `${todoWidth}%` }}
                          title={`${data.todo} Todo`}
                        >
                          {data.todo > 0 && <span className="px-1">{data.todo}</span>}
                        </div>
                      )}
                      {data.inProgress > 0 && (
                        <div 
                          className="bg-blue-500 flex items-center justify-center text-xs text-white"
                          style={{ width: `${inProgressWidth}%` }}
                          title={`${data.inProgress} In Progress`}
                        >
                          {data.inProgress > 0 && <span className="px-1">{data.inProgress}</span>}
                        </div>
                      )}
                      {data.scheduled > 0 && (
                        <div 
                          className="bg-purple-500 flex items-center justify-center text-xs text-white"
                          style={{ width: `${scheduledWidth}%` }}
                          title={`${data.scheduled} Scheduled`}
                        >
                          {data.scheduled > 0 && <span className="px-1">{data.scheduled}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-zinc-400 text-sm">No task data available</p>
          )}
          
          <div className="flex gap-4 mt-4 text-xs text-zinc-500">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-zinc-600 rounded"></div>
              <span>Todo</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded"></div>
              <span>Scheduled</span>
            </div>
          </div>
        </div>

        {/* Today's Focus */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Today's Focus</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Upcoming Events */}
            <div>
              <h3 className="text-sm font-medium text-zinc-400 mb-3">Upcoming Events</h3>
              
              {todayFocus?.todayEvents?.next ? (
                <div className="space-y-2">
                  <div className="p-3 bg-zinc-800 rounded border-l-4 border-blue-500">
                    <div className="font-medium">{todayFocus.todayEvents.next.title}</div>
                    <div className="text-sm text-zinc-400 mt-1">
                      In {todayFocus.todayEvents.next.timeUntil} minutes
                    </div>
                  </div>
                  
                  {todayFocus.todayEvents.total > 1 && (
                    <div className="text-xs text-zinc-500">
                      +{todayFocus.todayEvents.total - 1} more events today
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">No upcoming events</p>
              )}
            </div>

            {/* Priority Tasks */}
            <div>
              <h3 className="text-sm font-medium text-zinc-400 mb-3">Top Priority Tasks</h3>
              
              {todayFocus?.priorityTasks?.top?.length > 0 ? (
                <div className="space-y-2">
                  {todayFocus.priorityTasks.top.slice(0, 3).map((task: any) => (
                    <div key={task.id} className="p-3 bg-zinc-800 rounded">
                      <div className="flex items-center gap-2">
                        <span className={`
                          px-2 py-0.5 rounded text-xs font-medium
                          ${task.priority === 1 ? 'bg-red-900 text-red-200' :
                            task.priority === 2 ? 'bg-orange-900 text-orange-200' :
                            task.priority === 3 ? 'bg-yellow-900 text-yellow-200' :
                            'bg-zinc-700 text-zinc-300'}
                        `}>
                          P{task.priority}
                        </span>
                        <span className="text-sm font-medium">{task.title}</span>
                      </div>
                      {task.estimatedMinutes && (
                        <div className="text-xs text-zinc-500 mt-1">
                          ~{task.estimatedMinutes} min
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">No priority tasks</p>
              )}
            </div>
          </div>
        </div>

        {/* Work Hours Status */}
        {todayFocus?.workHours && (
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Work Hours Status</h2>
            
            <div className="flex items-center gap-4">
              <div className={`
                w-3 h-3 rounded-full
                ${todayFocus.isWorkHours ? 'bg-green-500' : 'bg-zinc-600'}
              `}></div>
              <div>
                <div className="font-medium">
                  {todayFocus.isWorkHours ? 'Currently in work hours' : 'Outside work hours'}
                </div>
                <div className="text-sm text-zinc-400">
                  Work time: {todayFocus.workHours.start}:00 - {todayFocus.workHours.end}:00
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}