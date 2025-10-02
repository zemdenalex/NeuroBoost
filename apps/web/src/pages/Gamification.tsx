// apps/web/src/pages/Gamification.tsx
import { useState, useEffect } from 'react';
import { getWeekStats, getTaskPriorities } from '../api';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import StarIcon from '@mui/icons-material/Star';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';

type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
};

export function Gamification() {
  const [weekStats, setWeekStats] = useState<any>(null);
  const [taskStats, setTaskStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Mock XP and Level (will be real in future versions)
  const [xp] = useState(2450);
  const [level] = useState(7);
  const [streak] = useState(5);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [week, priorities] = await Promise.all([
        getWeekStats(new Date().toISOString()),
        getTaskPriorities()
      ]);
      
      setWeekStats(week);
      setTaskStats(priorities);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mock achievements (will be real in future versions)
  const achievements: Achievement[] = [
    {
      id: 'first_event',
      title: 'Getting Started',
      description: 'Created your first event',
      icon: <StarIcon className="text-yellow-400" />,
      unlocked: true
    },
    {
      id: 'week_planned',
      title: 'Week Planner',
      description: 'Planned a full week ahead',
      icon: <EmojiEventsIcon className="text-blue-400" />,
      unlocked: true
    },
    {
      id: 'reflection_master',
      title: 'Reflection Master',
      description: 'Complete 50 reflections',
      icon: <MilitaryTechIcon className="text-purple-400" />,
      unlocked: false,
      progress: weekStats?.reflectionCount || 0,
      maxProgress: 50
    },
    {
      id: 'streak_7',
      title: 'Week Warrior',
      description: 'Maintain a 7-day streak',
      icon: <LocalFireDepartmentIcon className="text-orange-400" />,
      unlocked: false,
      progress: streak,
      maxProgress: 7
    },
    {
      id: 'perfect_week',
      title: 'Perfect Week',
      description: 'Achieve 100% adherence for a week',
      icon: <TrendingUpIcon className="text-green-400" />,
      unlocked: false,
      progress: weekStats?.adherencePct || 0,
      maxProgress: 100
    }
  ];

  const xpForNextLevel = (level + 1) * 500;
  const xpProgress = (xp / xpForNextLevel) * 100;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-black text-zinc-100">
        <div className="text-center">
          <div className="text-xl font-mono">Loading progress...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-black text-zinc-100 font-mono">
      {/* Header */}
      <div className="border-b border-zinc-700 bg-zinc-900 p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center">
            <EmojiEventsIcon fontSize="large" className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Your Progress</h1>
            <p className="text-zinc-400 text-sm">Track achievements and level up</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 max-w-6xl mx-auto">
        {/* Mock Notice */}
        <div className="mb-6 p-4 bg-blue-900/20 border border-blue-700/50 rounded text-sm text-blue-200">
          ℹ️ Gamification features are mocked in v0.3.5. Real XP, levels, and achievements coming in v0.4+
        </div>

        {/* Level & XP Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Level Card */}
          <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 border border-purple-700/50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm text-purple-300 mb-1">Current Level</div>
                <div className="text-5xl font-bold">{level}</div>
              </div>
              <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center">
                <StarIcon fontSize="large" className="text-white" />
              </div>
            </div>
            
            <div className="mb-2">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-purple-300">XP Progress</span>
                <span className="text-purple-200">{xp} / {xpForNextLevel}</span>
              </div>
              <div className="h-3 bg-purple-950 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
            </div>
            
            <p className="text-xs text-purple-300">
              {xpForNextLevel - xp} XP until level {level + 1}
            </p>
          </div>

          {/* Streak Card */}
          <div className="bg-gradient-to-br from-orange-900/50 to-red-900/50 border border-orange-700/50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm text-orange-300 mb-1">Current Streak</div>
                <div className="text-5xl font-bold">{streak}</div>
              </div>
              <div className="w-16 h-16 rounded-full bg-orange-600 flex items-center justify-center">
                <LocalFireDepartmentIcon fontSize="large" className="text-white" />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-xs text-orange-300">Days active this week</div>
              <div className="flex gap-1">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                  <div
                    key={day}
                    className={`
                      flex-1 h-2 rounded-full
                      ${i < streak ? 'bg-orange-500' : 'bg-orange-950'}
                    `}
                    title={day}
                  />
                ))}
              </div>
            </div>
            
            <p className="text-xs text-orange-300 mt-3">
              Keep going! {7 - streak} more days for Week Warrior achievement
            </p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold mb-1">
              {weekStats?.eventCount || 0}
            </div>
            <div className="text-xs text-zinc-400">Events This Week</div>
          </div>

          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold mb-1">
              {weekStats?.reflectionCount || 0}
            </div>
            <div className="text-xs text-zinc-400">Reflections Logged</div>
          </div>

          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold mb-1">
              {weekStats?.adherencePct || 0}%
            </div>
            <div className="text-xs text-zinc-400">Weekly Adherence</div>
          </div>

          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold mb-1">
              {Math.round((weekStats?.completedMinutes || 0) / 60)}
            </div>
            <div className="text-xs text-zinc-400">Hours Tracked</div>
          </div>
        </div>

        {/* Achievements */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <MilitaryTechIcon />
            Achievements
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`
                  p-4 rounded-lg border-2 transition-all
                  ${achievement.unlocked
                    ? 'bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border-yellow-700/50'
                    : 'bg-zinc-800 border-zinc-700 opacity-60'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0
                    ${achievement.unlocked ? 'bg-yellow-600' : 'bg-zinc-700'}
                  `}>
                    {achievement.icon}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold mb-1 flex items-center gap-2">
                      {achievement.title}
                      {achievement.unlocked && (
                        <span className="text-xs text-yellow-400">✓</span>
                      )}
                    </h3>
                    <p className="text-sm text-zinc-400 mb-2">
                      {achievement.description}
                    </p>
                    
                    {!achievement.unlocked && achievement.maxProgress && (
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-zinc-500">Progress</span>
                          <span className="text-zinc-400">
                            {achievement.progress} / {achievement.maxProgress}
                          </span>
                        </div>
                        <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 transition-all"
                            style={{
                              width: `${((achievement.progress || 0) / achievement.maxProgress) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How to Earn XP */}
        <div className="mt-8 bg-zinc-900 border border-zinc-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">How to Earn XP</h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-zinc-800 rounded">
              <span className="text-sm">Create and complete an event</span>
              <span className="text-sm font-medium text-blue-400">+50 XP</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-zinc-800 rounded">
              <span className="text-sm">Write a reflection</span>
              <span className="text-sm font-medium text-purple-400">+25 XP</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-zinc-800 rounded">
              <span className="text-sm">Maintain daily streak</span>
              <span className="text-sm font-medium text-orange-400">+10 XP/day</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-zinc-800 rounded">
              <span className="text-sm">Complete priority task</span>
              <span className="text-sm font-medium text-green-400">+30 XP</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-zinc-800 rounded">
              <span className="text-sm">Achieve 80%+ weekly adherence</span>
              <span className="text-sm font-medium text-yellow-400">+100 XP</span>
            </div>
          </div>

          <p className="text-xs text-zinc-500 mt-4 text-center">
            Note: XP system will be fully implemented in v0.4.x+
          </p>
        </div>
      </div>
    </div>
  );
}