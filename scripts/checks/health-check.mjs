#!/usr/bin/env node
// health-check.mjs - Comprehensive health check for all NeuroBoost services

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Service endpoints
const services = [
  { name: 'API', url: 'http://localhost:3001/health', critical: true },
  { name: 'Bot', url: 'http://localhost:3002/health', critical: true },
  { name: 'Web UI', url: 'http://localhost:5173', critical: false },
  { name: 'Database', check: 'db', critical: true }
];

// Check service health
async function checkService(service) {
  try {
    if (service.check === 'db') {
      // Check database
      const { stdout } = await execAsync('docker-compose exec -T db pg_isready -U nb_user -d neuroboost');
      return stdout.includes('accepting connections');
    } else {
      // Check HTTP endpoint
      const response = await fetch(service.url, { 
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      return response.ok;
    }
  } catch (error) {
    return false;
  }
}

// Check Docker containers
async function checkContainers() {
  try {
    const { stdout } = await execAsync('docker-compose ps --format json');
    const containers = stdout.split('\n').filter(line => line.trim()).map(line => JSON.parse(line));
    return containers;
  } catch (error) {
    console.error(`${colors.red}❌ Failed to check Docker containers${colors.reset}`);
    return [];
  }
}

// Get container stats
async function getContainerStats() {
  try {
    const { stdout } = await execAsync('docker stats --no-stream --format "{{json .}}"');
    const stats = stdout.split('\n').filter(line => line.trim()).map(line => JSON.parse(line));
    return stats;
  } catch (error) {
    return [];
  }
}

// Main health check
async function runHealthCheck() {
  console.log(`${colors.cyan}🏥 NeuroBoost Health Check${colors.reset}`);
  console.log('=' . repeat(50));
  console.log('');

  let allHealthy = true;
  const results = [];

  // Check each service
  console.log(`${colors.blue}📡 Checking services...${colors.reset}`);
  for (const service of services) {
    const isHealthy = await checkService(service);
    results.push({ ...service, healthy: isHealthy });
    
    const status = isHealthy ? 
      `${colors.green}✅ ${service.name}: Healthy${colors.reset}` :
      `${colors.red}❌ ${service.name}: Unhealthy${colors.reset}`;
    
    console.log(status);
    
    if (!isHealthy && service.critical) {
      allHealthy = false;
    }
  }

  console.log('');
  
  // Check containers
  console.log(`${colors.blue}🐳 Docker containers:${colors.reset}`);
  const containers = await checkContainers();
  
  if (containers.length === 0) {
    console.log(`${colors.red}No containers found. Are services running?${colors.reset}`);
    allHealthy = false;
  } else {
    for (const container of containers) {
      const status = container.State === 'running' ? 
        colors.green : colors.yellow;
      console.log(`  ${status}${container.Service}: ${container.State}${colors.reset}`);
    }
  }

  console.log('');

  // Get resource usage
  console.log(`${colors.blue}📊 Resource usage:${colors.reset}`);
  const stats = await getContainerStats();
  
  for (const stat of stats) {
    if (stat.Name.includes('nb-')) {
      console.log(`  ${stat.Name}:`);
      console.log(`    CPU: ${stat.CPUPerc}`);
      console.log(`    Memory: ${stat.MemUsage}`);
    }
  }

  console.log('');
  console.log('=' . repeat(50));

  // Final verdict
  if (allHealthy) {
    console.log(`${colors.green}✅ All critical services are healthy!${colors.reset}`);
    
    // Provide quick access info
    console.log('');
    console.log(`${colors.cyan}Quick Access:${colors.reset}`);
    console.log('  API Health: http://localhost:3001/health');
    console.log('  Bot Health: http://localhost:3002/health');
    console.log('  Web UI:     http://localhost:5173');
    console.log('');
    console.log(`${colors.cyan}View Logs:${colors.reset}`);
    console.log('  docker-compose logs -f api');
    console.log('  docker-compose logs -f bot');
    console.log('  ./view-logs.ps1 all -Watch');
  } else {
    console.log(`${colors.red}⚠️  Some services are unhealthy!${colors.reset}`);
    console.log('');
    console.log(`${colors.yellow}Troubleshooting tips:${colors.reset}`);
    
    const unhealthyServices = results.filter(r => !r.healthy && r.critical);
    for (const service of unhealthyServices) {
      console.log(`\n${colors.yellow}${service.name}:${colors.reset}`);
      
      switch(service.name) {
        case 'API':
          console.log('  1. Check if API container is running: docker-compose ps api');
          console.log('  2. Check API logs: docker-compose logs api');
          console.log('  3. Verify DATABASE_URL in .env');
          break;
        case 'Bot':
          console.log('  1. Check if Bot container is running: docker-compose ps bot');
          console.log('  2. Check Bot logs: docker-compose logs bot');
          console.log('  3. Verify TELEGRAM_BOT_TOKEN in .env');
          break;
        case 'Database':
          console.log('  1. Check if database container is running: docker-compose ps db');
          console.log('  2. Check database logs: docker-compose logs db');
          console.log('  3. Try restarting: docker-compose restart db');
          break;
      }
    }
    
    process.exit(1);
  }
}

// Run the health check
runHealthCheck().catch(error => {
  console.error(`${colors.red}Health check failed: ${error.message}${colors.reset}`);
  process.exit(1);
});