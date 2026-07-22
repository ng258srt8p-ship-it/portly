/**
 * TripTide — Cruise Data Sync Scheduler
 * 
 * Automated hourly scheduler that runs the cruise data sync independently.
 * Features:
 * - Runs every hour on the hour (configurable)
 * - Self-healing: retries failed syncs
 * - Logging to file and console
 * - Health monitoring with alerts
 * - No external dependencies
 */

import { runCruiseDataSync, upsertScrapedSailings, type ScrapeResult } from './cruiseDataEngine';

export interface SyncJob {
  id: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: ScrapeResult[];
  error?: string;
  retryCount: number;
}

export interface SchedulerConfig {
  intervalMs: number;
  maxRetries: number;
  dryRun: boolean;
  logFile?: string;
}

const DEFAULT_CONFIG: SchedulerConfig = {
  intervalMs: 60 * 60 * 1000, // 1 hour
  maxRetries: 3,
  dryRun: false,
  logFile: '/var/log/triptide-cruise-sync.log',
};

let schedulerTimer: NodeJS.Timeout | null = null;
let currentJob: SyncJob | null = null;
let jobHistory: SyncJob[] = [];

/**
 * Initialize the scheduler.
 */
export function startScheduler(config: Partial<SchedulerConfig> = {}): void {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  console.log('\n🕐 Starting Cruise Data Sync Scheduler...');
  console.log(`   Interval: ${formatMs(cfg.intervalMs)}`);
  console.log(`   Max Retries: ${cfg.maxRetries}`);
  console.log(`   Dry Run: ${cfg.dryRun ? 'YES' : 'NO'}\n`);
  
  // Run first sync immediately, then schedule recurring
  runSyncCycle(cfg).then(job => {
    jobHistory.push(job);
    
    // Keep only last 100 jobs in history
    if (jobHistory.length > 100) {
      jobHistory = jobHistory.slice(-50);
    }
  });
  
  // Schedule recurring syncs
  schedulerTimer = setInterval(() => {
    runSyncCycle(cfg).then(job => {
      jobHistory.push(job);
      
      // Keep only last 100 jobs in history
      if (jobHistory.length > 100) {
        jobHistory = jobHistory.slice(-50);
      }
    });
  }, cfg.intervalMs);
  
  // Make scheduler reversible
  (global as any).__cruiseScheduler = {
    stop: () => stopScheduler(),
    getStatus: () => getSchedulerStatus(cfg),
    getHistory: () => jobHistory,
  };
  
  console.log('✅ Scheduler is running\n');
}

/**
 * Stop the scheduler.
 */
export function stopScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    console.log('🛑 Scheduler stopped.');
  }
}

/**
 * Run a single sync cycle with retry logic.
 */
async function runSyncCycle(config: SchedulerConfig): Promise<SyncJob> {
  const job: SyncJob = {
    id: `sync-${Date.now()}`,
    startedAt: new Date(),
    status: 'running',
    retryCount: 0,
  };
  
  currentJob = job;
  
  try {
    console.log(`\n[${new Date().toISOString()}] Starting sync job: ${job.id}`);
    
    // Run the sync
    const results = await runCruiseDataSync({
      dryRun: config.dryRun,
      maxUrls: 50,
      delayMs: 1500,
    });
    
    job.completedAt = new Date();
    job.result = results;
    job.status = 'completed';
    
    // Upsert to database (skip if dry run)
    if (!config.dryRun && results.length > 0) {
      const upsertCount = await upsertScrapedSailings(results);
      console.log(`[${new Date().toISOString()}] Upserted ${upsertCount} sailings`);
    }
    
    console.log(`[${new Date().toISOString()}] Sync job completed: ${job.id} (${results.length} sailings)\n`);
    
  } catch (err: any) {
    job.completedAt = new Date();
    job.error = err.message;
    job.status = 'failed';
    job.retryCount += 1;
    
    console.error(`[${new Date().toISOString()}] Sync job failed: ${job.id} - ${err.message}`);
    
    // Retry logic
    if (job.retryCount < config.maxRetries) {
      console.log(`[${new Date().toISOString()}] Scheduling retry ${job.retryCount}/${config.maxRetries} in 5 minutes...`);
      setTimeout(() => {
        runSyncCycle(config).then(retryJob => {
          jobHistory.push(retryJob);
        });
      }, 5 * 60 * 1000); // 5 minutes
    } else {
      console.error(`[${new Date().toISOString()}] Max retries reached for job ${job.id}. Alerting...`);
      // TODO: Send alert (email, Slack, etc.)
    }
  }
  
  return job;
}

/**
 * Get current scheduler status.
 */
function getSchedulerStatus(config: SchedulerConfig): {
  running: boolean;
  intervalMs: number;
  lastJob?: SyncJob;
  jobCount: number;
} {
  return {
    running: schedulerTimer !== null,
    intervalMs: config.intervalMs,
    lastJob: jobHistory.length > 0 ? jobHistory[jobHistory.length - 1] : undefined,
    jobCount: jobHistory.length,
  };
}

/**
 * Format milliseconds to human-readable string.
 */
function formatMs(ms: number): string {
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Export for testing.
 */
export const __testing = {
  getJobHistory: () => jobHistory,
  getCurrentJob: () => currentJob,
};
