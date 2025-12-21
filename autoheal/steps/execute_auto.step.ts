export const config = {
  name: 'AutoExecuteFix',
  type: 'event',
  subscribes: ['fix.proposed'],
  emits: ['incident.resolved'],
  flows: ['self-healing'],
  description: 'Automatically executes proposed fixes when AI analysis completes'
};

export const handler = async (event: any, { state, emit, logger }: any) => {
  const { id: incidentId, fix, error, confidence } = event as any;
  
  logger.info(`🔧 Auto-executing fix for incident ${incidentId}`);
  
  // Fetch the incident from state
  const incident = await state.get('incidents', incidentId) as any;
  
  if (!incident) {
    logger.error(`❌ Incident ${incidentId} not found in state`);
    return { status: 'error', message: 'Incident not found' };
  }

  logger.info(`🛠️ EXECUTING PROTOCOL: ${fix}...`);
  
  // Simulate fix execution (in production, this would call actual fix scripts)
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Update the incident status in state
  const updatedIncident = { 
    ...incident, 
    status: 'resolved',
    resolvedAt: Date.now()
  };
  await state.set('incidents', incidentId, updatedIncident);
  
  // Also update in incidents list for dashboard
  const incidentsList = await state.get('metrics', 'incidents_list') as any[] || [];
  const incidentIndex = incidentsList.findIndex((i: any) => i.id === incidentId);
  
  if (incidentIndex !== -1) {
    incidentsList[incidentIndex] = updatedIncident;
    await state.set('metrics', 'incidents_list', incidentsList);
  }
  
  // Emit incident resolved event
  await emit({
    topic: 'incident.resolved',
    data: {
      incidentId,
      fix,
      error,
      confidence,
      resolvedAt: Date.now()
    }
  });
  
  logger.info(`✅ Incident ${incidentId} resolved with ${fix}`);
  
  return {
    status: 'success',
    incidentId,
    fix,
    message: 'Fix executed successfully'
  };
};
