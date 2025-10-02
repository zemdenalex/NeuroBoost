// apps/web/src/pages/Settings.tsx
import { useState, useEffect } from 'react';
import { getUserSettings, updateUserSettings, type UserSettings } from '../api';
import ViewComfyIcon from '@mui/icons-material/ViewComfy';
import ViewSidebarIcon from '@mui/icons-material/ViewSidebar';

type HeaderStyle = 'horizontal' | 'vertical';

export function Settings() {
  const [headerStyle, setHeaderStyle] = useState<HeaderStyle>(() => {
    return (localStorage.getItem('headerStyle') as HeaderStyle) || 'horizontal';
  });

  const [userSettings, setUserSettingsState] = useState<UserSettings>({
    defaultTimezone: 'Europe/Moscow',
    workingHoursStart: 9,
    workingHoursEnd: 17,
    workingDays: [1, 2, 3, 4, 5],
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { settings } = await getUserSettings();
      setUserSettingsState(settings);
    } catch (error) {
      console.error('Failed to load settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleHeaderStyleChange = (style: HeaderStyle) => {
    setHeaderStyle(style);
    localStorage.setItem('headerStyle', style);
    
    // Trigger page reload to apply new header
    setMessage({ 
      type: 'success', 
      text: 'Header style updated! Page will reload in 1 second...' 
    });
    
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      await updateUserSettings(userSettings);
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (error) {
      console.error('Failed to save settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const toggleWorkingDay = (day: number) => {
    const newDays = userSettings.workingDays.includes(day)
      ? userSettings.workingDays.filter(d => d !== day)
      : [...userSettings.workingDays, day].sort();
    
    setUserSettingsState({ ...userSettings, workingDays: newDays });
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-zinc-100">
        <div className="text-center">
          <div className="text-xl font-mono">Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-black text-zinc-100 font-mono overflow-y-auto">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-zinc-700 bg-zinc-900">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">Settings</h1>
          <button
            onClick={() => window.location.hash = '#/'}
            className="text-sm text-zinc-400 hover:text-white"
          >
            ← Back
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 p-6 max-w-4xl mx-auto w-full">
        {/* Message Banner */}
        {message && (
          <div className={`
            mb-6 p-4 rounded border
            ${message.type === 'success' 
              ? 'bg-green-900/20 border-green-700 text-green-300' 
              : 'bg-red-900/20 border-red-700 text-red-300'
            }
          `}>
            {message.text}
          </div>
        )}

        {/* Header Style Section */}
        <section className="mb-8 bg-zinc-900 border border-zinc-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ViewComfyIcon fontSize="small" />
            Header Style
          </h2>
          
          <div className="space-y-3">
            <p className="text-sm text-zinc-400 mb-4">
              Choose how you want to navigate through NeuroBoost. Page will reload after changing.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Horizontal Header */}
              <button
                onClick={() => handleHeaderStyleChange('horizontal')}
                className={`
                  p-4 rounded-lg border-2 transition-all text-left
                  ${headerStyle === 'horizontal'
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                  }
                `}
              >
                <div className="flex items-center gap-3 mb-2">
                  <ViewComfyIcon />
                  <span className="font-semibold">Horizontal Top Bar</span>
                </div>
                <p className="text-xs text-zinc-400">
                  Navigation across the top with icons and labels. Good for wide screens.
                </p>
                {headerStyle === 'horizontal' && (
                  <div className="mt-2 text-xs text-blue-400">✓ Currently active</div>
                )}
              </button>

              {/* Vertical Sidebar */}
              <button
                onClick={() => handleHeaderStyleChange('vertical')}
                className={`
                  p-4 rounded-lg border-2 transition-all text-left
                  ${headerStyle === 'vertical'
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                  }
                `}
              >
                <div className="flex items-center gap-3 mb-2">
                  <ViewSidebarIcon />
                  <span className="font-semibold">Vertical Sidebar</span>
                </div>
                <p className="text-xs text-zinc-400">
                  Collapsible sidebar on the left. Saves vertical space, can minimize to icons.
                </p>
                {headerStyle === 'vertical' && (
                  <div className="mt-2 text-xs text-blue-400">✓ Currently active</div>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Work Hours Section */}
        <section className="mb-8 bg-zinc-900 border border-zinc-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Work Hours</h2>
          
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">
              Set your typical work hours. Tasks tagged as personal/home will be filtered during work time.
            </p>

            {/* Working Days */}
            <div>
              <label className="block text-sm text-zinc-300 mb-2">Working Days</label>
              <div className="flex gap-2">
                {dayNames.map((day, index) => (
                  <button
                    key={index}
                    onClick={() => toggleWorkingDay(index)}
                    className={`
                      px-3 py-2 rounded text-sm font-medium transition-all
                      ${userSettings.workingDays.includes(index)
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }
                    `}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            {/* Working Hours */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-300 mb-2">Start Time</label>
                <select
                  value={userSettings.workingHoursStart}
                  onChange={(e) => setUserSettingsState({
                    ...userSettings,
                    workingHoursStart: Number(e.target.value)
                  })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {i.toString().padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-zinc-300 mb-2">End Time</label>
                <select
                  value={userSettings.workingHoursEnd}
                  onChange={(e) => setUserSettingsState({
                    ...userSettings,
                    workingHoursEnd: Number(e.target.value)
                  })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {i.toString().padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* General Settings Section */}
        <section className="mb-8 bg-zinc-900 border border-zinc-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">General</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-300 mb-2">Default Timezone</label>
              <select
                value={userSettings.defaultTimezone}
                onChange={(e) => setUserSettingsState({
                  ...userSettings,
                  defaultTimezone: e.target.value
                })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white"
              >
                <option value="Europe/Moscow">Europe/Moscow (MSK)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                <option value="Australia/Sydney">Australia/Sydney (AEDT)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-zinc-300 mb-2">Obsidian Vault Path (optional)</label>
              <input
                type="text"
                value={userSettings.obsidianVaultPath || ''}
                onChange={(e) => setUserSettingsState({
                  ...userSettings,
                  obsidianVaultPath: e.target.value
                })}
                placeholder="/path/to/your/vault"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white placeholder-zinc-500"
              />
              <p className="text-xs text-zinc-500 mt-1">
                For Obsidian export feature (dry-run only in v0.3.x)
              </p>
            </div>
          </div>
        </section>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded font-medium transition-all"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}