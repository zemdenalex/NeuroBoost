import express from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '../logger.mjs';

const router = express.Router();
const prisma = new PrismaClient();
const logger = createLogger('api-v04x');

// === CONTEXTS API ===

// Get all contexts
router.get('/api/contexts', async (req, res) => {
  const timer = logger.startTimer('get_contexts');
  
  try {
    const contexts = await prisma.context.findMany({
      where: { userId: 'default' },
      orderBy: { name: 'asc' }
    });
    
    logger.info('Contexts retrieved', { count: contexts.length });
    timer.end();
    
    res.json({ contexts });
  } catch (error) {
    logger.error('Failed to get contexts', { error: error.message }, error);
    timer.end();
    res.status(500).json({ error: 'Failed to retrieve contexts' });
  }
});

// Filter tasks by context
router.get('/api/tasks/by-context', async (req, res) => {
  const timer = logger.startTimer('tasks_by_context');
  
  try {
    const context = req.query.context;
    if (!context) {
      return res.status(400).json({ error: 'context parameter required' });
    }
    
    logger.debug('Filtering tasks by context', { context });
    
    const tasks = await prisma.task.findMany({
      where: {
        contexts: { has: context },
        status: { not: 'DONE' }
      },
      include: {
        parent: true,
        subtasks: true
      },
      orderBy: [
        { priority: 'asc' },
        { energy: 'desc' }
      ]
    });
    
    logger.info('Tasks filtered by context', { 
      context, 
      count: tasks.length 
    });
    timer.end();
    
    res.json({ tasks, context });
  } catch (error) {
    logger.error('Failed to filter tasks by context', { 
      context: req.query.context,
      error: error.message 
    }, error);
    timer.end();
    res.status(500).json({ error: 'Failed to filter tasks' });
  }
});

// === LAYERS API ===

// Get calendar layers
router.get('/api/layers', async (req, res) => {
  const timer = logger.startTimer('get_layers');
  
  try {
    const layers = await prisma.calendarLayer.findMany({
      where: { userId: 'default' },
      orderBy: { name: 'asc' }
    });
    
    logger.info('Calendar layers retrieved', { count: layers.length });
    timer.end();
    
    res.json({ layers });
  } catch (error) {
    logger.error('Failed to get layers', { error: error.message }, error);
    timer.end();
    res.status(500).json({ error: 'Failed to retrieve layers' });
  }
});

// Toggle layer visibility
router.patch('/api/layers/:id/visibility', async (req, res) => {
  const timer = logger.startTimer('toggle_layer_visibility');
  
  try {
    const { id } = req.params;
    const { isVisible } = req.body;
    
    if (typeof isVisible !== 'boolean') {
      return res.status(400).json({ error: 'isVisible must be boolean' });
    }
    
    const layer = await prisma.calendarLayer.update({
      where: { id },
      data: { isVisible }
    });
    
    logger.info('Layer visibility toggled', { 
      layerId: id, 
      isVisible 
    });
    timer.end();
    
    res.json({ layer });
  } catch (error) {
    logger.error('Failed to toggle layer visibility', { 
      layerId: req.params.id,
      error: error.message 
    }, error);
    timer.end();
    res.status(500).json({ error: 'Failed to update layer' });
  }
});

// === TASK ENHANCEMENTS ===

// Update task contexts
router.patch('/api/tasks/:id/contexts', async (req, res) => {
  const timer = logger.startTimer('update_task_contexts');
  
  try {
    const { id } = req.params;
    const { contexts } = req.body;
    
    if (!Array.isArray(contexts)) {
      return res.status(400).json({ error: 'contexts must be array' });
    }
    
    const task = await prisma.task.update({
      where: { id },
      data: { 
        contexts,
        updatedAt: new Date()
      }
    });
    
    logger.info('Task contexts updated', { 
      taskId: id, 
      contexts 
    });
    timer.end();
    
    res.json({ task });
  } catch (error) {
    logger.error('Failed to update task contexts', { 
      taskId: req.params.id,
      error: error.message 
    }, error);
    timer.end();
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Update task energy level
router.patch('/api/tasks/:id/energy', async (req, res) => {
  const timer = logger.startTimer('update_task_energy');
  
  try {
    const { id } = req.params;
    const { energy } = req.body;
    
    if (typeof energy !== 'number' || energy < 1 || energy > 5) {
      return res.status(400).json({ error: 'energy must be 1-5' });
    }
    
    const task = await prisma.task.update({
      where: { id },
      data: { 
        energy,
        updatedAt: new Date()
      }
    });
    
    logger.info('Task energy updated', { 
      taskId: id, 
      energy 
    });
    timer.end();
    
    res.json({ task });
  } catch (error) {
    logger.error('Failed to update task energy', { 
      taskId: req.params.id,
      error: error.message 
    }, error);
    timer.end();
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Get task tree (parent + all descendants)
router.get('/api/tasks/:id/tree', async (req, res) => {
  const timer = logger.startTimer('get_task_tree');
  
  try {
    const { id } = req.params;
    
    // Recursive CTE to get all descendants
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        subtasks: {
          include: {
            subtasks: true // Go 2 levels deep for now
          }
        },
        parent: true
      }
    });
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    logger.info('Task tree retrieved', { 
      taskId: id, 
      subtaskCount: task.subtasks?.length || 0
    });
    timer.end();
    
    res.json({ task });
  } catch (error) {
    logger.error('Failed to get task tree', { 
      taskId: req.params.id,
      error: error.message 
    }, error);
    timer.end();
    res.status(500).json({ error: 'Failed to retrieve task tree' });
  }
});

// === ROUTINES API (basic) ===

// Get all routines
router.get('/api/routines', async (req, res) => {
  const timer = logger.startTimer('get_routines');
  
  try {
    const routines = await prisma.routine.findMany({
      where: { 
        userId: 'default',
        isActive: true 
      },
      orderBy: { name: 'asc' }
    });
    
    logger.info('Routines retrieved', { count: routines.length });
    timer.end();
    
    res.json({ routines });
  } catch (error) {
    logger.error('Failed to get routines', { error: error.message }, error);
    timer.end();
    res.status(500).json({ error: 'Failed to retrieve routines' });
  }
});

// Activate routine (create tasks from template)
router.post('/api/routines/:id/activate', async (req, res) => {
  const timer = logger.startTimer('activate_routine');
  
  try {
    const { id } = req.params;
    
    const routine = await prisma.routine.findUnique({
      where: { id }
    });
    
    if (!routine) {
      return res.status(404).json({ error: 'Routine not found' });
    }
    
    // Create routine instance
    const instance = await prisma.routineInstance.create({
      data: {
        routineId: id,
        activatedAt: new Date()
      }
    });
    
    // Create tasks from template
    const createdTasks = [];
    const taskTemplates = routine.tasks?.tasks || [];
    
    for (const template of taskTemplates) {
      const task = await prisma.task.create({
        data: {
          title: template.title,
          estimatedMinutes: template.duration,
          priority: 3,
          status: 'TODO',
          contexts: ['@home'],
          tags: ['routine', routine.name]
        }
      });
      createdTasks.push(task);
    }
    
    logger.info('Routine activated', { 
      routineId: id,
      instanceId: instance.id,
      tasksCreated: createdTasks.length 
    });
    timer.end();
    
    res.json({ 
      instance,
      tasks: createdTasks,
      message: `Routine "${routine.name}" activated with ${createdTasks.length} tasks` 
    });
  } catch (error) {
    logger.error('Failed to activate routine', { 
      routineId: req.params.id,
      error: error.message 
    }, error);
    timer.end();
    res.status(500).json({ error: 'Failed to activate routine' });
  }
});

export default router;