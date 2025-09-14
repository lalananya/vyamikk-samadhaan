import { apiClient } from '../api/ApiClient';

interface HealthCheckConfig {
  interval: number; // milliseconds
  timeout: number; // milliseconds
  retries: number;
  backoffMultiplier: number;
  maxBackoff: number;
}

interface HealthStatus {
  isHealthy: boolean;
  lastCheck: Date;
  consecutiveFailures: number;
  lastError?: string;
}

class HealthCheckService {
  private static instance: HealthCheckService;
  private intervalId: ReturnType<typeof setInterval> | ReturnType<typeof setTimeout> | null = null;
  private config: HealthCheckConfig;
  private status: HealthStatus;
  private listeners: ((status: HealthStatus) => void)[] = [];

  private constructor() {
    this.config = {
      interval: 30000, // 30 seconds
      timeout: 5000,   // 5 seconds
      retries: 2,      // 2 retries
      backoffMultiplier: 1.5,
      maxBackoff: 30000, // 30 seconds max
    };

    this.status = {
      isHealthy: false,
      lastCheck: new Date(),
      consecutiveFailures: 0,
    };
  }

  static getInstance(): HealthCheckService {
    if (!HealthCheckService.instance) {
      HealthCheckService.instance = new HealthCheckService();
    }
    return HealthCheckService.instance;
  }

  subscribe(listener: (status: HealthStatus) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.status));
  }

  private calculateBackoffDelay(): number {
    const delay = Math.min(
      this.config.interval * Math.pow(this.config.backoffMultiplier, this.status.consecutiveFailures),
      this.config.maxBackoff
    );
    return delay;
  }

  private async performHealthCheck(): Promise<boolean> {
    try {
      console.log('🏥 Performing health check...');
      const isHealthy = await apiClient.healthCheck();

      if (isHealthy) {
        this.status.isHealthy = true;
        this.status.consecutiveFailures = 0;
        this.status.lastError = undefined;
        console.log('✅ Health check passed');
      } else {
        this.status.isHealthy = false;
        this.status.consecutiveFailures++;
        this.status.lastError = 'Health check returned false';
        console.warn('❌ Health check failed');
      }
    } catch (error) {
      this.status.isHealthy = false;
      this.status.consecutiveFailures++;
      this.status.lastError = error instanceof Error ? error.message : 'Unknown error';
      console.warn('❌ Health check error:', error);
    }

    this.status.lastCheck = new Date();
    this.notifyListeners();
    return this.status.isHealthy;
  }

  async start(): Promise<void> {
    if (this.intervalId) {
      console.log('🏥 Health checks already running');
      return;
    }

    console.log('🏥 Starting health check service');

    // Perform initial health check
    await this.performHealthCheck();

    // Schedule periodic health checks
    this.intervalId = setInterval(async () => {
      const isHealthy = await this.performHealthCheck();

      // If unhealthy, use exponential backoff for next check
      if (!isHealthy) {
        const backoffDelay = this.calculateBackoffDelay();
        console.log(`⏰ Health check failed, using backoff delay: ${backoffDelay}ms`);

        // Clear current interval and set new one with backoff
        if (this.intervalId) {
          clearInterval(this.intervalId);
        }

        this.intervalId = setTimeout(() => {
          this.start(); // Restart with normal interval
        }, backoffDelay);
      }
    }, this.config.interval);
  }

  stop(): void {
    if (this.intervalId) {
      console.log('🏥 Stopping health check service');
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  getStatus(): HealthStatus {
    return { ...this.status };
  }

  updateConfig(newConfig: Partial<HealthCheckConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🏥 Health check config updated:', this.config);
  }

  // Force immediate health check
  async checkNow(): Promise<boolean> {
    return this.performHealthCheck();
  }

  // Reset consecutive failures (useful after successful operations)
  resetFailures(): void {
    this.status.consecutiveFailures = 0;
    this.status.lastError = undefined;
    this.notifyListeners();
  }
}

export const healthCheckService = HealthCheckService.getInstance();
export default healthCheckService;
