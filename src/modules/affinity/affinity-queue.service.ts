import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { AFFINITY_QUEUE } from './affinity.processor';

@Injectable()
export class AffinityQueueService {
  constructor(@InjectQueue(AFFINITY_QUEUE) private readonly queue: Queue) {}

  async enqueueForUser(userId: string): Promise<void> {
    await this.queue.add('compute-for-user', { userId });
  }

  async enqueueForProject(projectId: string): Promise<void> {
    await this.queue.add('compute-for-project', { projectId });
  }
}
