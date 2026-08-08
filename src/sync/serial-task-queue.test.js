import { describe, expect, it } from 'vitest';
import { createSerialTaskQueue } from './serial-task-queue.js';

describe('createSerialTaskQueue', () => {
  it('严格按加入顺序执行异步任务', async () => {
    const queue = createSerialTaskQueue();
    const order = [];
    let releaseFirst;
    const firstGate = new Promise((resolve) => { releaseFirst = resolve; });

    const first = queue.enqueue(async () => {
      order.push('first-start');
      await firstGate;
      order.push('first-end');
    });
    const second = queue.enqueue(async () => { order.push('second'); });

    await Promise.resolve();
    expect(order).toEqual(['first-start']);
    releaseFirst();
    await Promise.all([first, second]);
    expect(order).toEqual(['first-start', 'first-end', 'second']);
  });

  it('单次任务失败后仍继续执行后续任务', async () => {
    const queue = createSerialTaskQueue();
    const failed = queue.enqueue(async () => { throw new Error('write failed'); });
    const next = queue.enqueue(async () => 'saved');

    await expect(failed).rejects.toThrow('write failed');
    await expect(next).resolves.toBe('saved');
  });
});
