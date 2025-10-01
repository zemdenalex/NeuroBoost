import { registerCommands } from './commands.mjs';
import { registerTextHandlers } from './text-handlers.mjs';
import { registerCallbacks } from './callbacks.mjs';

export function registerAllRoutes(bot, handlers, sessions, logger) {
  registerCommands(bot, handlers, logger);
  registerTextHandlers(bot, handlers, sessions, logger);
  registerCallbacks(bot, handlers, logger);
}