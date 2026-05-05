import { NetRewardTracker } from '../packages/tracker/src/index';

async function main() {
  console.log('Initializing NetReward Tracker SDK...');
  
  const tracker = new NetRewardTracker({
    apiKey: 'mock-api-key',
    apiSecret: 'mock-api-secret',
    // Pointing to local edge function or mock endpoint
    endpoint: 'http://localhost:54321/functions/v1/tracking',
    flushIntervalMs: 5000, // Flush every 5 seconds for testing
    maxBatchSize: 10,
  });

  const DEVICE_ID = '00000000-0000-0000-0000-000000000001';
  const CAMPAIGN_ID = '00000000-0000-0000-0000-000000000002';

  console.log('Starting session...');
  tracker.startSession(DEVICE_ID, CAMPAIGN_ID);

  console.log('Simulating data usage...');
  tracker.reportUsage(1024 * 1024 * 5, 1024 * 1024 * 20); // 5MB up, 20MB down

  console.log('Ending session and waiting for flush...');
  tracker.endSession();
  
  // The flush should happen asynchronously within the queue
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('Test complete. Check edge function logs for the payload.');
}

main().catch(console.error);
