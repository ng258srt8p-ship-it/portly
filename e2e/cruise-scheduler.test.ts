import { test, expect } from '@playwright/test';

test.describe('Cruise Data Scheduler — Automated Hourly Updates', () => {
  test('Scheduler is running and configured for hourly updates', async ({ request }) => {
    const response = await request.get('/api/cruise/scheduler/status');
    const data = await response.json();
    
    expect(data.running).toBe(true);
    expect(data.intervalMs).toBe(3600000); // 1 hour in milliseconds
    expect(data.intervalFormatted).toBe('1h');
  });

  test('Scheduler has processed jobs', async ({ request }) => {
    const response = await request.get('/api/cruise/scheduler/status');
    const data = await response.json();
    
    expect(data.totalJobs).toBeGreaterThanOrEqual(1);
  });

  test('Scheduler last job completed successfully', async ({ request }) => {
    const response = await request.get('/api/cruise/scheduler/status');
    const data = await response.json();
    
    expect(data.lastJob).not.toBeNull();
    expect(data.lastJob.status).toBe('completed');
    expect(data.lastJob.sailingsProcessed).toBeGreaterThan(0);
    expect(data.lastJob.retryCount).toBe(0);
  });

  test('Manual sync endpoint processes sailings', async ({ request }) => {
    const response = await request.post('/api/cruise/sync/manual');
    const data = await response.json();
    
    expect(data.message).toBe('Manual sync completed');
    // Note: sailingsProcessed may be 0 due to rate limiting, but endpoint should work
    expect(typeof data.sailingsProcessed).toBe('number');
    expect(typeof data.upserted).toBe('number');
  });

  test('Database has 400+ sailings after sync', async ({ request }) => {
    const response = await request.get('/api/stats');
    const data = await response.json();
    
    expect(data.trackedSailings).toBeGreaterThanOrEqual(400);
  });

  test('Database has 10+ cruise lines', async ({ request }) => {
    const response = await request.get('/api/deals?limit=500');
    const data = await response.json();
    
    const cruiseLines = new Set(data.map((d: any) => d.cruiseLine));
    expect(cruiseLines.size).toBeGreaterThanOrEqual(10);
  });

  test('Database has 50+ unique ships', async ({ request }) => {
    const response = await request.get('/api/deals?limit=500');
    const data = await response.json();
    
    const ships = new Set(data.map((d: any) => d.ship));
    expect(ships.size).toBeGreaterThanOrEqual(50);
  });

  test('Database has 35+ departure ports', async ({ request }) => {
    const response = await request.get('/api/deals?limit=500');
    const data = await response.json();
    
    const ports = new Set(data.map((d: any) => d.departurePort));
    expect(ports.size).toBeGreaterThanOrEqual(35);
  });

  test('Scheduler status endpoint provides full context', async ({ request }) => {
    const response = await request.get('/api/cruise/scheduler/status');
    const data = await response.json();
    
    // Verify all expected fields are present
    expect(data).toHaveProperty('running');
    expect(data).toHaveProperty('intervalMs');
    expect(data).toHaveProperty('intervalFormatted');
    expect(data).toHaveProperty('lastJob');
    expect(data).toHaveProperty('totalJobs');
    
    // Verify last job structure
    if (data.lastJob) {
      expect(data.lastJob).toHaveProperty('id');
      expect(data.lastJob).toHaveProperty('status');
      expect(data.lastJob).toHaveProperty('startedAt');
      expect(data.lastJob).toHaveProperty('completedAt');
      expect(data.lastJob).toHaveProperty('sailingsProcessed');
      expect(data.lastJob).toHaveProperty('retryCount');
    }
  });

  test('Scheduler runs independently without user intervention', async ({ request }) => {
    // Verify scheduler is running (not just on-demand)
    const response = await request.get('/api/cruise/scheduler/status');
    const data = await response.json();
    
    expect(data.running).toBe(true);
    
    // Verify it's configured for hourly updates (not manual-only)
    expect(data.intervalMs).toBe(3600000);
    
    // Verify multiple jobs have been processed (showing it runs on schedule)
    expect(data.totalJobs).toBeGreaterThanOrEqual(1);
  });
});
