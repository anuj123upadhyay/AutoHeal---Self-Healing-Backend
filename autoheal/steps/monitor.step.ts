import { CronConfig, Handlers } from 'motia';

// Get the port from environment or use default
const PORT = process.env.PORT || 3000;

export const config: CronConfig = {
  name: 'SystemMonitor',
  type: 'cron',
  cron: '*/5 * * * * *', // Monitor every 5 seconds
  emits: ['incident.detected'],
  flows: ['self-healing'], // Show in Workbench flow diagram
  description: 'Monitors service health and emits incidents when errors detected'
};

export const handler: Handlers['SystemMonitor'] = async (context) => {
  const { emit, logger } = context;

  logger.info(`🔍 Checking service health at http://localhost:${PORT}/service/health`);

  try {
    // Use native fetch to call our chaos service
    const response = await fetch(`http://localhost:${PORT}/service/health`);
    
    if (!response.ok) {
      // Try to get the error message from the response body
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const body = await response.json();
        // Check for error in chaos service response format
        if (body.error && typeof body.error === 'string') {
          errorMessage = body.error;
        } else if (body.message) {
          errorMessage = body.message;
        } else if (body.error?.message) {
          errorMessage = body.error.message;
        }
      } catch {
        // If we can't parse JSON, fall back to status text
      }
      throw new Error(errorMessage);
    }
    
    // Service is healthy - nothing to do
    logger.info(`✅ Service healthy`);
  } catch (error: any) {
    const rawError = error.message || "Unknown error";
    logger.warn(`🚨 MONITOR ALERT: ${rawError}`);
    
    // Store incident for metrics tracking
    const incidentCount = await context.state.get<number>('metrics', 'incident_count') || 0;
    await context.state.set('metrics', 'incident_count', incidentCount + 1);
    await context.state.set('metrics', 'last_incident', {
      error: rawError,
      timestamp: Date.now()
    });
    
    // Emit event for Python AI to process
    await (emit as any)({
      topic: 'incident.detected',
      data: {
        raw_log: rawError,
        timestamp: Date.now()
      }
    });
    
    logger.info(`📤 Event emitted: incident.detected with error: "${rawError}"`);
  }
};