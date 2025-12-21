import { ApiRouteConfig, Handlers } from 'motia';
import { readFileSync } from 'fs';
import { join } from 'path';

export const config: ApiRouteConfig = {
  name: 'DashboardUI',
  type: 'api',
  path: '/dashboard',  // Changed from '/' to '/dashboard' so Motia workbench shows at root
  method: 'GET',
  emits: [],
  flows: ['self-healing'],
  description: 'Serves the interactive AutoHeal dashboard UI at /dashboard'
};

export const handler: Handlers['DashboardUI'] = async (req, context) => {
  const { logger } = context;
  
  try {
    // Read the dashboard HTML file
    const dashboardPath = join(process.cwd(), 'public', 'dashboard.html');
    const html = readFileSync(dashboardPath, 'utf-8');
    
    logger.info('📊 Dashboard served successfully');
    
    return {
      status: 200,
      body: html,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache'
      }
    };
  } catch (error) {
    logger.error('❌ Failed to serve dashboard:', error);
    
    return {
      status: 500,
      body: '<html><body><h1>Dashboard Error</h1><p>Failed to load dashboard.html</p></body></html>',
      headers: { 'Content-Type': 'text/html' }
    };
  }
};
