import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { AffinityService } from './affinity.service';

export const AFFINITY_QUEUE = 'affinity';

@Processor(AFFINITY_QUEUE)
export class AffinityProcessor extends WorkerHost {
  constructor(private readonly affinityService: AffinityService) {
    super();
  }

  async process(job: Job<{ userId?: string; projectId?: string }>): Promise<void> {
    if (job.name === 'compute-for-project' && job.data.projectId) {
      await this.affinityService.computeForProject(job.data.projectId);
    } else if (job.name === 'compute-for-user' && job.data.userId) {
      await this.affinityService.computeForUser(job.data.userId);
    }
  }
}
