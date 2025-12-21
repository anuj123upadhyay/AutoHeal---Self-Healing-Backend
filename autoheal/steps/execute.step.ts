import { ApiRouteConfig, Handlers } from 'motia';

export const config: ApiRouteConfig = {
  name: 'ExecuteFix',
  type: 'api',
  path: '/admin/fix',
  method: 'POST',
  emits: ['incident.resolved'],
  flows: ['self-healing'],
  virtualSubscribes: ['fix.proposed'],
  description: 'Executes proposed fixes and resolves incidents'
};

export const handler: Handlers['ExecuteFix'] = async (req, { state, emit, logger }) => {
  const { incidentId } = req.body as { incidentId: string };
  
  // Fetch the incident from state
  const incident = await state.get('incidents', incidentId) as any;
  
  if (!incident) return { status: 404, body: { error: "Incident not found" } };

  logger.info(`🛠️ EXECUTING PROTOCOL: ${incident.fix}...`);
  
  // Update the incident status in state
  const updatedIncident = { ...incident, status: 'resolved' };
  await state.set('incidents', incidentId, updatedIncident);
  
  // Also update in incidents list for dashboard
  const incidentsList = await state.get('metrics', 'incidents_list') as any[] || [];
  const incidentIndex = incidentsList.findIndex((i: any) => i.id === incidentId);
  if (incidentIndex !== -1) {
    incidentsList[incidentIndex] = updatedIncident;
    await state.set('metrics', 'incidents_list', incidentsList);
  }
  
  // Emit resolved event
  await (emit as any)({
    topic: 'incident.resolved',
    data: { id: incidentId, fix: incident.fix }
  });
  
  logger.info(`✅ Incident ${incidentId} resolved!`);
  
  return { status: 200, body: { success: true, incident: incident } };
};