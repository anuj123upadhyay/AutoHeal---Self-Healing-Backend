import { ApiRouteConfig, Handlers } from 'motia';

export const config: ApiRouteConfig = {
  name: 'IncidentsAPI',
  type: 'api',
  path: '/incidents',
  method: 'GET',
  emits: [],
  flows: ['self-healing'],
  description: 'Returns all incidents with their status and AI analysis'
};

export const handler: Handlers['IncidentsAPI'] = async (req, context) => {
  const { state, logger } = context;
  
  try {
    // Get incidents array from state (stored as a single object)
    const incidentsData = await state.get('metrics', 'incidents_list') || [];
    const incidents = Array.isArray(incidentsData) ? incidentsData : [];
    
    // Sort by timestamp (newest first)
    incidents.sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));
    
    // Calculate stats
    const total = incidents.length;
    const resolved = incidents.filter((i: any) => i.status === 'resolved').length;
    const pending = incidents.filter((i: any) => i.status === 'pending').length;
    
    // Count by type
    const dbCount = incidents.filter((i: any) => 
      i.error?.includes('ERR_DB') || i.error?.includes('DB_TIMEOUT')
    ).length;
    const memCount = incidents.filter((i: any) => 
      i.error?.includes('ERR_MEM') || i.error?.includes('MEM_LEAK')
    ).length;
    const netCount = incidents.filter((i: any) => 
      i.error?.includes('ERR_NET') || i.error?.includes('NET_SPIKE')
    ).length;
    
    // Calculate average confidence
    const totalConfidence = incidents.reduce((sum: number, i: any) => 
      sum + (i.confidence || 0), 0
    );
    const avgConfidence = total > 0 ? totalConfidence / total : 0;
    
    // Get recent fixes (last 5)
    const recentFixes = incidents
      .slice(0, 5)
      .map((i: any) => ({
        fix: i.fix,
        confidence: i.confidence,
        timestamp: i.timestamp
      }));
    
    const response = {
      incidents: incidents.slice(0, 50), // Return last 50 incidents
      stats: {
        total,
        resolved,
        pending,
        dbCount,
        memCount,
        netCount,
        avgConfidence: Math.round(avgConfidence * 100)
      },
      recentFixes
    };
    
    return {
      status: 200,
      body: response,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    };
  } catch (error) {
    logger.error(`Error fetching incidents: ${error}`);
    return {
      status: 500,
      body: { error: 'Failed to fetch incidents' }
    };
  }
};
