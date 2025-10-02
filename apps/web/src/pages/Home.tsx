// apps/web/src/pages/Home.tsx
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PsychologyIcon from '@mui/icons-material/Psychology';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

export function Home() {
  return (
    <div className="h-full overflow-y-auto bg-black text-zinc-100 font-mono">
      {/* Hero Section */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 py-20">
        <div className="max-w-4xl text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            NeuroBoost
          </h1>
          
          <h2 className="text-2xl md:text-4xl font-semibold text-zinc-300 mb-8">
            The Organizer for Non-Organizers
          </h2>
          
          <p className="text-lg md:text-xl text-zinc-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            Built for neurodivergent minds, chronic procrastinators, and anyone who struggles with traditional planning tools. 
            Finally, a system that works with your brain, not against it.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#/calendar"
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-lg font-medium transition-all flex items-center justify-center gap-2"
            >
              Get Started
              <ArrowForwardIcon />
            </a>
            <a
              href="#/login"
              className="px-8 py-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white rounded-lg text-lg font-medium transition-all"
            >
              Sign In
            </a>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 px-6 bg-zinc-900/50">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Traditional planners don't work for everyone
          </h3>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-6 bg-zinc-800 border border-zinc-700 rounded-lg">
              <div className="text-red-400 text-xl mb-4">❌ The Problem</div>
              <ul className="space-y-3 text-zinc-400">
                <li>• Too many tools, too much context switching</li>
                <li>• Complex systems that require daily maintenance</li>
                <li>• No understanding of ADHD, autism, or executive dysfunction</li>
                <li>• Focus on guilt and shame when you fall behind</li>
                <li>• One-size-fits-all approach that fits nobody</li>
              </ul>
            </div>

            <div className="p-6 bg-zinc-800 border border-zinc-700 rounded-lg">
              <div className="text-green-400 text-xl mb-4">✓ Our Approach</div>
              <ul className="space-y-3 text-zinc-400">
                <li>• Calendar-first: see your whole day at a glance</li>
                <li>• Pushy reminders that actually help you start</li>
                <li>• Plan vs actual tracking with zero judgment</li>
                <li>• Built-in reflection to learn what works for YOU</li>
                <li>• Smart assistance that adapts to your patterns</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl md:text-4xl font-bold text-center mb-16">
            How NeuroBoost Works
          </h3>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-900/30 rounded-full flex items-center justify-center">
                <CalendarMonthIcon fontSize="large" className="text-blue-400" />
              </div>
              <h4 className="text-xl font-semibold mb-3">Time-Blocking First</h4>
              <p className="text-zinc-400 text-sm">
                See your entire day laid out. Drag tasks directly onto your calendar. No more guessing when you'll do things.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-purple-900/30 rounded-full flex items-center justify-center">
                <CheckCircleIcon fontSize="large" className="text-purple-400" />
              </div>
              <h4 className="text-xl font-semibold mb-3">Pushy Reminders</h4>
              <p className="text-zinc-400 text-sm">
                Pre-event nudges to help you start. End-of-block prompts to capture what actually happened. No more "where did my day go?"
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-900/30 rounded-full flex items-center justify-center">
                <PsychologyIcon fontSize="large" className="text-green-400" />
              </div>
              <h4 className="text-xl font-semibold mb-3">Plan vs Actual</h4>
              <p className="text-zinc-400 text-sm">
                Track what you planned versus what you did. No shame, just data. Learn your real capacity and plan better.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-orange-900/30 rounded-full flex items-center justify-center">
                <TrendingUpIcon fontSize="large" className="text-orange-400" />
              </div>
              <h4 className="text-xl font-semibold mb-3">Smart Learning</h4>
              <p className="text-zinc-400 text-sm">
                Over time, NeuroBoost learns your patterns. When do you work best? How long do things really take? Let data guide you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-20 px-6 bg-zinc-900/50">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-3xl md:text-4xl font-bold text-center mb-8">
            Our Philosophy
          </h3>
          
          <div className="prose prose-invert prose-lg max-w-none">
            <p className="text-zinc-300 text-lg leading-relaxed mb-6">
              Most productivity tools are designed by organized people, for organized people. 
              They assume you already have systems in place. They assume you can maintain complex workflows. 
              They assume you'll just "be disciplined."
            </p>
            
            <p className="text-zinc-300 text-lg leading-relaxed mb-6">
              <strong>NeuroBoost is different.</strong> We start with the reality that your brain works differently. 
              Maybe you have ADHD. Maybe you're autistic. Maybe you're just really bad at remembering things. 
              Maybe you're overwhelmed by life and need help keeping track.
            </p>
            
            <p className="text-zinc-300 text-lg leading-relaxed mb-6">
              We don't ask you to change who you are. Instead, we build a system that:
            </p>
            
            <ul className="text-zinc-300 text-lg space-y-3 mb-6">
              <li><strong>Pushes you gently</strong> - reminders that help you start, not guilt you</li>
              <li><strong>Captures reality</strong> - what actually happened, not what you wish happened</li>
              <li><strong>Learns with you</strong> - adapts to your patterns and energy levels</li>
              <li><strong>Stays simple</strong> - calendar-first, everything else supports that</li>
              <li><strong>Respects your brain</strong> - designed for how you actually think and work</li>
            </ul>

            <p className="text-zinc-300 text-lg leading-relaxed">
              <strong>This is the organizer for non-organizers.</strong> 
              The planning tool for people who hate planning. 
              The system for people whose brains don't fit traditional systems.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to try a different approach?
          </h3>
          
          <p className="text-xl text-zinc-400 mb-10">
            Join the beta and help us build something that actually works for your brain.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#/calendar"
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-lg font-medium transition-all flex items-center justify-center gap-2"
            >
              Start Planning
              <ArrowForwardIcon />
            </a>
            <a
              href="#/login"
              className="px-8 py-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white rounded-lg text-lg font-medium transition-all"
            >
              Create Account
            </a>
          </div>

          <p className="text-sm text-zinc-500 mt-8">
            Currently in beta v0.3.x • Self-hosted • Open source • Privacy-first
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-zinc-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-zinc-500">
          <div>
            © 2025 NeuroBoost • Built for minds that work differently
          </div>
          <div className="flex gap-6">
            <a href="#/about" className="hover:text-zinc-300 transition-colors">About</a>
            <a href="#/docs" className="hover:text-zinc-300 transition-colors">Docs</a>
            <a href="#/settings" className="hover:text-zinc-300 transition-colors">Settings</a>
          </div>
        </div>
      </footer>
    </div>
  );
}