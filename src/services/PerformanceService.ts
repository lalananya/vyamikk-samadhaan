interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

interface PerformanceReport {
  metrics: PerformanceMetric[];
  summary: {
    totalMetrics: number;
    averageDuration: number;
    slowestMetric: PerformanceMetric | null;
    fastestMetric: PerformanceMetric | null;
  };
}

class PerformanceService {
  private static instance: PerformanceService;
  private metrics: PerformanceMetric[] = [];
  private activeMetrics = new Map<string, PerformanceMetric>();
  private maxMetrics = 1000; // Keep only last 1000 metrics

  private constructor() {}

  static getInstance(): PerformanceService {
    if (!PerformanceService.instance) {
      PerformanceService.instance = new PerformanceService();
    }
    return PerformanceService.instance;
  }

  startTiming(name: string, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      startTime: performance.now(),
      metadata,
    };

    this.activeMetrics.set(name, metric);
    console.log(`⏱️ Started timing: ${name}`);
  }

  endTiming(name: string): number | null {
    const metric = this.activeMetrics.get(name);
    if (!metric) {
      console.warn(`⚠️ No active timing found for: ${name}`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    metric.endTime = endTime;
    metric.duration = duration;

    this.activeMetrics.delete(name);
    this.addMetric(metric);

    console.log(`⏱️ Ended timing: ${name} (${duration.toFixed(2)}ms)`);
    return duration;
  }

  private addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Keep only the last maxMetrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.filter(m => m.name === name);
    }
    return [...this.metrics];
  }

  getReport(): PerformanceReport {
    const completedMetrics = this.metrics.filter(m => m.duration !== undefined);
    
    if (completedMetrics.length === 0) {
      return {
        metrics: [],
        summary: {
          totalMetrics: 0,
          averageDuration: 0,
          slowestMetric: null,
          fastestMetric: null,
        },
      };
    }

    const durations = completedMetrics.map(m => m.duration!);
    const averageDuration = durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
    
    const slowestMetric = completedMetrics.reduce((slowest, current) => 
      current.duration! > slowest.duration! ? current : slowest
    );
    
    const fastestMetric = completedMetrics.reduce((fastest, current) => 
      current.duration! < fastest.duration! ? current : fastest
    );

    return {
      metrics: completedMetrics,
      summary: {
        totalMetrics: completedMetrics.length,
        averageDuration,
        slowestMetric,
        fastestMetric,
      },
    };
  }

  clearMetrics(): void {
    this.metrics = [];
    this.activeMetrics.clear();
    console.log('🗑️ Performance metrics cleared');
  }

  // Convenience method for measuring async operations
  async measureAsync<T>(
    name: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.startTiming(name, metadata);
    try {
      const result = await operation();
      this.endTiming(name);
      return result;
    } catch (error) {
      this.endTiming(name);
      throw error;
    }
  }

  // Convenience method for measuring sync operations
  measure<T>(
    name: string,
    operation: () => T,
    metadata?: Record<string, any>
  ): T {
    this.startTiming(name, metadata);
    try {
      const result = operation();
      this.endTiming(name);
      return result;
    } catch (error) {
      this.endTiming(name);
      throw error;
    }
  }

  // Get performance summary for specific operations
  getOperationSummary(operationName: string): {
    count: number;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
    totalDuration: number;
  } {
    const operationMetrics = this.getMetrics(operationName);
    const durations = operationMetrics.map(m => m.duration!).filter(d => d !== undefined);

    if (durations.length === 0) {
      return {
        count: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        totalDuration: 0,
      };
    }

    const totalDuration = durations.reduce((sum, duration) => sum + duration, 0);
    const averageDuration = totalDuration / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);

    return {
      count: durations.length,
      averageDuration,
      minDuration,
      maxDuration,
      totalDuration,
    };
  }

  // Log performance report
  logReport(): void {
    const report = this.getReport();
    console.log('📊 Performance Report:', report.summary);
    
    if (report.summary.slowestMetric) {
      console.log('🐌 Slowest operation:', report.summary.slowestMetric);
    }
    
    if (report.summary.fastestMetric) {
      console.log('🚀 Fastest operation:', report.summary.fastestMetric);
    }
  }
}

export const performanceService = PerformanceService.getInstance();
export default performanceService;
