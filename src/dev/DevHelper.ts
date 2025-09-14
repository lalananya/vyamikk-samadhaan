import { featureFlags } from '../features/FeatureFlags';

/**
 * Development helper functions for faster development
 * These functions are only available in development mode
 */
class DevHelper {
  /**
   * Enable fast development mode by skipping /me validation
   * This will make the app start much faster during development
   */
  static async enableFastDevMode(): Promise<void> {
    if (!__DEV__) {
      console.warn('DevHelper: Fast dev mode is only available in development');
      return;
    }

    try {
      // Enable the skip /me validation flag
      await featureFlags.setFlag('DEV_SKIP_ME_VALIDATION' as any, true);
      console.log('🚀 DevHelper: Fast dev mode enabled - /me validation will be skipped');
      console.log('🚀 DevHelper: App will now start much faster!');
    } catch (error) {
      console.error('DevHelper: Failed to enable fast dev mode:', error);
    }
  }

  /**
   * Disable fast development mode
   */
  static async disableFastDevMode(): Promise<void> {
    if (!__DEV__) {
      console.warn('DevHelper: Fast dev mode is only available in development');
      return;
    }

    try {
      // Disable the skip /me validation flag
      await featureFlags.setFlag('DEV_SKIP_ME_VALIDATION' as any, false);
      console.log('🚀 DevHelper: Fast dev mode disabled - /me validation will run normally');
    } catch (error) {
      console.error('DevHelper: Failed to disable fast dev mode:', error);
    }
  }

  /**
   * Check if fast dev mode is enabled
   */
  static isFastDevModeEnabled(): boolean {
    if (!__DEV__) {
      return false;
    }
    return featureFlags.canSkipMeValidation();
  }

  /**
   * Toggle fast dev mode
   */
  static async toggleFastDevMode(): Promise<boolean> {
    if (!__DEV__) {
      console.warn('DevHelper: Fast dev mode is only available in development');
      return false;
    }

    const isEnabled = this.isFastDevModeEnabled();
    if (isEnabled) {
      await this.disableFastDevMode();
      return false;
    } else {
      await this.enableFastDevMode();
      return true;
    }
  }

  /**
   * Get all available dev shortcuts
   */
  static getAvailableShortcuts(): string[] {
    if (!__DEV__) {
      return [];
    }

    return [
      'DEV_SKIP_ME_VALIDATION - Skip /me validation for faster startup',
      'DEV_SKIP_ONBOARDING - Skip onboarding process',
      'DEV_AUTH_ANY - Allow any authentication',
      'DEV_MOCK_USER - Use mock user data',
      'DEV_DEFAULT_ORG - Assign default organization',
    ];
  }

  /**
   * Print current dev mode status
   */
  static printStatus(): void {
    if (!__DEV__) {
      console.log('DevHelper: Not in development mode');
      return;
    }

    console.log('🚀 DevHelper: Development Mode Status');
    console.log('=====================================');
    console.log(`Fast Dev Mode: ${this.isFastDevModeEnabled() ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`Skip Onboarding: ${featureFlags.canSkipOnboarding() ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`Auth Bypass: ${featureFlags.canBypassAuth() ? '✅ Enabled' : '❌ Disabled'}`);
    console.log('');
    console.log('Available shortcuts:');
    this.getAvailableShortcuts().forEach(shortcut => {
      console.log(`  - ${shortcut}`);
    });
  }
}

export default DevHelper;
