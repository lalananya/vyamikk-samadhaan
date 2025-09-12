import DevHelper from './DevHelper';

/**
 * Console commands for development
 * These are available in the console for quick development actions
 */
class ConsoleCommands {
  static init() {
    if (!__DEV__) {
      return;
    }

    // Make DevHelper available globally for console access
    (global as any).DevHelper = DevHelper;
    (global as any).fastDev = DevHelper.toggleFastDevMode;
    (global as any).devStatus = DevHelper.printStatus;

    console.log('🚀 Console Commands Available:');
    console.log('  DevHelper.enableFastDevMode() - Enable fast dev mode');
    console.log('  DevHelper.disableFastDevMode() - Disable fast dev mode');
    console.log('  DevHelper.toggleFastDevMode() - Toggle fast dev mode');
    console.log('  DevHelper.printStatus() - Print dev mode status');
    console.log('  fastDev() - Quick toggle fast dev mode');
    console.log('  devStatus() - Quick print status');
    console.log('');
    console.log('💡 Fast Dev Mode skips /me validation for faster app startup');
  }
}

export default ConsoleCommands;
