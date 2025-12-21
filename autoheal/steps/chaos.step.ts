import { ApiRouteConfig, Handlers } from 'motia';

export const config: ApiRouteConfig = {
  name: 'ChaosService',
  type: 'api',
  path: '/service/health',
  method: 'GET',
  emits: ['incident.detected'],
  flows: ['self-healing'],
  description: 'Simulates production failures (30% error rate) and emits incidents into workflow'
};

export const handler: Handlers['ChaosService'] = async (req, { emit, logger }) => {
  
  // 30% chance of failure
  if (Math.random() < 0.3) {
    const errors = [
      { code: "ERR_DB_TIMEOUT", msg: "Database Connection Pool Exhausted - DB_TIMEOUT" },
      { code: "ERR_MEM_LEAK", msg: "Heap Out of Memory - MEM_LEAK (Process 912)" },
      { code: "ERR_NET_SPIKE", msg: "Rate Limit Exceeded - NET_SPIKE (429 errors)" }
    ];
    // Pick a random disaster
    const disaster = errors[Math.floor(Math.random() * errors.length)];
    
    const errorMessage = `${disaster.code}: ${disaster.msg}`;
    logger.error(`🔥 [CHAOS] ${disaster.msg}`);
    
    // **NEW**: Emit incident into the self-healing workflow
    await (emit as any)({
      topic: 'incident.detected',
      data: {
        raw_log: errorMessage,
        source: 'chaos-injection',
        timestamp: Date.now()
      }
    });
    
    logger.info(`📤 Incident emitted to workflow: ${errorMessage}`);
    
    // Return error response for API clients
    return { 
      status: 500, 
      body: { 
        status: "error", 
        error: errorMessage,
        code: disaster.code,
        message: disaster.msg
      } 
    };
  }

  return { status: 200, body: { status: "healthy", uptime: process.uptime() } };
};