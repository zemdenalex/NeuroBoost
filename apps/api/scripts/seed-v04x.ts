import { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding v0.4.x data...');
  
  try {
    // Get calendar layers
    const layers = await prisma.calendarLayer.findMany({
      where: { userId: 'default' }
    });
    
    const workLayer = layers.find(l => l.name === 'Work');
    const personalLayer = layers.find(l => l.name === 'Personal');
    const homeLayer = layers.find(l => l.name === 'Home Care');
    
    // Create a parent task with subtasks (project structure)
    const videoProject = await prisma.task.create({
      data: {
        title: 'Alumni Video Project',
        description: 'Complete the alumni association video',
        priority: 3,
        status: 'TODO',
        estimatedMinutes: 240,
        energy: 4, // High energy required
        emotionalDifficulty: 3, // Moderate emotional difficulty
        contexts: ['@computer', '@energy-high'],
        layerId: workLayer?.id,
        tags: ['video', 'project', 'alumni'],
        isMilestone: true
      }
    });
    
    console.log(`✅ Created milestone project: ${videoProject.title}`);
    
    // Create subtasks
    const subtasks = [
      {
        title: 'Watch raw footage',
        parentTaskId: videoProject.id,
        estimatedMinutes: 30,
        priority: 3,
        energy: 2,
        contexts: ['@computer'],
        progressPercentage: 100, // Already done
        status: 'DONE' as const
      },
      {
        title: 'Create rough cut',
        parentTaskId: videoProject.id,
        estimatedMinutes: 60,
        priority: 2,
        energy: 4,
        contexts: ['@computer', '@energy-high'],
        dependencies: [videoProject.id], // Depends on watching footage
        progressPercentage: 0,
        status: 'TODO' as const
      },
      {
        title: 'Add music and transitions',
        parentTaskId: videoProject.id,
        estimatedMinutes: 30,
        priority: 3,
        energy: 3,
        contexts: ['@computer'],
        progressPercentage: 0,
        status: 'TODO' as const
      },
      {
        title: 'Color grading',
        parentTaskId: videoProject.id,
        estimatedMinutes: 60,
        priority: 4,
        energy: 3,
        contexts: ['@computer'],
        progressPercentage: 0,
        status: 'TODO' as const
      },
      {
        title: 'Export and upload',
        parentTaskId: videoProject.id,
        estimatedMinutes: 30,
        priority: 4,
        energy: 1,
        contexts: ['@computer'],
        progressPercentage: 0,
        status: 'TODO' as const
      }
    ];
    
    for (const subtask of subtasks) {
      const created = await prisma.task.create({ data: subtask });
      console.log(`  - Subtask: ${created.title} (${created.status})`);
    }
    
    // Create home care routine tasks
    const homeTasks = [
      {
        title: 'Walk dogs',
        priority: 2,
        estimatedMinutes: 15,
        energy: 2,
        contexts: ['@home'],
        layerId: homeLayer?.id,
        tags: ['pets', 'routine', 'daily'],
        timeWindowType: 'daily',
        earliestTime: '07:00:00',
        latestTime: '09:00:00',
        status: 'TODO' as const
      },
      {
        title: 'Feed pets',
        priority: 1,
        estimatedMinutes: 10,
        energy: 1,
        contexts: ['@home'],
        layerId: homeLayer?.id,
        tags: ['pets', 'routine', 'daily'],
        timeWindowType: 'daily',
        earliestTime: '07:00:00',
        latestTime: '08:00:00',
        status: 'TODO' as const
      },
      {
        title: 'Water plants',
        priority: 4,
        estimatedMinutes: 15,
        energy: 1,
        contexts: ['@home'],
        layerId: homeLayer?.id,
        tags: ['plants', 'routine'],
        timeWindowType: 'flexible',
        windowFrequency: 3, // Every 3 days
        status: 'TODO' as const
      },
      {
        title: 'Call about locks',
        priority: 3,
        estimatedMinutes: 5,
        energy: 2,
        contexts: ['@phone', '@anywhere'],
        layerId: personalLayer?.id,
        tags: ['errand', 'phone'],
        postponeCount: 2, // Has been postponed twice
        guiltScore: 3,
        status: 'TODO' as const
      }
    ];
    
    console.log('\n📋 Creating home care tasks...');
    for (const task of homeTasks) {
      const created = await prisma.task.create({ data: task });
      console.log(`  - ${created.title} (${created.contexts.join(', ')})`);
    }
    
    // Create a routine template
    const homeAloneRoutine = await prisma.routine.create({
      data: {
        userId: 'default',
        name: 'Home Alone Routine',
        description: 'Daily pet care and home maintenance when parents are away',
        triggerType: 'manual',
        estimatedDuration: 120,
        tasks: {
          tasks: [
            { title: 'Walk dogs', duration: 15, order: 1 },
            { title: 'Feed dogs', duration: 5, order: 2 },
            { title: 'Feed cats', duration: 10, order: 3 },
            { title: 'Check birds', duration: 10, order: 4 },
            { title: 'Water plants', duration: 15, order: 5, condition: 'if_needed' },
            { title: 'Clean litter', duration: 10, order: 6 },
            { title: 'Security check', duration: 5, order: 7 }
          ]
        },
        isActive: true
      }
    });
    
    console.log(`\n🔄 Created routine: ${homeAloneRoutine.name}`);
    
    // Create sample events with layers
    const now = DateTime.now().setZone('Europe/Moscow');
    
    const events = [
      {
        title: 'Deep Work: Video Editing',
        startsAt: now.plus({ days: 1 }).set({ hour: 10, minute: 0 }).toUTC().toJSDate(),
        endsAt: now.plus({ days: 1 }).set({ hour: 12, minute: 0 }).toUTC().toJSDate(),
        layerId: workLayer?.id,
        sourceTaskId: videoProject.id,
        allDay: false,
        tags: ['work', 'focus'],
        isMultiDay: false,
        isWorkEvent: true
      },
      {
        title: 'Morning Routine',
        startsAt: now.plus({ days: 1 }).set({ hour: 7, minute: 0 }).toUTC().toJSDate(),
        endsAt: now.plus({ days: 1 }).set({ hour: 8, minute: 30 }).toUTC().toJSDate(),
        layerId: homeLayer?.id,
        allDay: false,
        tags: ['routine', 'home'],
        isMultiDay: false,
        isWorkEvent: false
      }
    ];
    
    console.log('\n📅 Creating sample events...');
    for (const event of events) {
      const created = await prisma.event.create({ data: event });
      console.log(`  - ${created.title} at ${DateTime.fromJSDate(created.startsAt).setZone('Europe/Moscow').toFormat('HH:mm')}`);
    }
    
    // Create a task pattern example
    const pattern = await prisma.taskPattern.create({
      data: {
        userId: 'default',
        taskType: 'video_editing',
        context: '@computer',
        bestTime: '10:00:00',
        averageDuration: 90,
        completionRate: 75.5,
        energyBefore: 4,
        energyAfter: 2,
        moodImpact: 1
      }
    });
    
    console.log(`\n📊 Created task pattern for: ${pattern.taskType}`);
    
    // Summary
    console.log('\n✅ v0.4.x seed data created successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - 1 milestone project with ${subtasks.length} subtasks`);
    console.log(`   - ${homeTasks.length} home care tasks`);
    console.log(`   - 1 routine template with 7 tasks`);
    console.log(`   - ${events.length} sample events with layers`);
    console.log(`   - 1 task pattern`);
    
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });