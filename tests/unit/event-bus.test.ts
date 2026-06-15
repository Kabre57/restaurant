import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBus } from '@/events/event-bus';

describe('EventBus', () => {
  beforeEach(() => {
    EventBus.clear();
  });

  it('should allow subscribing to and publishing events', async () => {
    const callback = vi.fn();
    EventBus.subscribe('test-event', callback);

    await EventBus.publish('test-event', { foo: 'bar' });

    expect(callback).toHaveBeenCalledWith({ foo: 'bar' });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should support multiple subscribers for the same event', async () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    EventBus.subscribe('multi-event', cb1);
    EventBus.subscribe('multi-event', cb2);

    await EventBus.publish('multi-event', 'hello');

    expect(cb1).toHaveBeenCalledWith('hello');
    expect(cb2).toHaveBeenCalledWith('hello');
  });

  it('should handle errors thrown in handlers gracefully without stopping execution', async () => {
    const badCallback = vi.fn().mockImplementation(() => {
      throw new Error('Explosion');
    });
    const goodCallback = vi.fn();

    EventBus.subscribe('error-event', badCallback);
    EventBus.subscribe('error-event', goodCallback);

    // Should not throw
    await expect(EventBus.publish('error-event', 'data')).resolves.not.toThrow();

    expect(badCallback).toHaveBeenCalledTimes(1);
    expect(goodCallback).toHaveBeenCalledTimes(1);
  });

  it('should handle async errors gracefully', async () => {
    const badAsyncCallback = vi.fn().mockImplementation(async () => {
      throw new Error('Async Explosion');
    });
    const goodCallback = vi.fn();

    EventBus.subscribe('async-error-event', badAsyncCallback);
    EventBus.subscribe('async-error-event', goodCallback);

    await expect(EventBus.publish('async-error-event', 'data')).resolves.not.toThrow();

    expect(badAsyncCallback).toHaveBeenCalledTimes(1);
    expect(goodCallback).toHaveBeenCalledTimes(1);
  });
});
