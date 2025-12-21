export const config = {
  name: 'CompletionLogger',
  type: 'event',
  subscribes: ['incident.resolved'],
  emits: [],
  flows: ['self-healing'],
  description: 'Logs completion of self-healing workflow'
};

export const handler = async (event: any, { state, logger }: any) => {
  const { incidentId, fix, error, confidence, resolvedAt } = event;
  
  logger.info(`🎉 ========================================`);
  logger.info(`🎉 SELF-HEALING WORKFLOW COMPLETED!`);
  logger.info(`🎉 ========================================`);
  logger.info(`📋 Incident ID: ${incidentId}`);
  logger.info(`❌ Original Error: ${error}`);
  logger.info(`💡 Applied Fix: ${fix}`);
  logger.info(`🎯 Confidence: ${(confidence * 100).toFixed(0)}%`);
  logger.info(`⏱️  Resolution Time: ${new Date(resolvedAt).toLocaleTimeString()}`);
  logger.info(`🎉 ========================================`);
  
  // Update metrics
  const metrics = await state.get('metrics', 'summary') || {
    totalIncidents: 0,
    resolvedIncidents: 0,
    successRate: 0
  };
  
  metrics.totalIncidents = (metrics.totalIncidents || 0) + 1;
  metrics.resolvedIncidents = (metrics.resolvedIncidents || 0) + 1;
  metrics.successRate = (metrics.resolvedIncidents / metrics.totalIncidents) * 100;
  
  await state.set('metrics', 'summary', metrics);
  
  logger.info(`📊 Success Rate: ${metrics.successRate.toFixed(1)}% (${metrics.resolvedIncidents}/${metrics.totalIncidents})`);
  
  return {
    status: 'completed',
    incidentId,
    metrics
  };
};
