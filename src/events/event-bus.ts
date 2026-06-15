import { IEventBus } from '@/shared/contracts/event-bus.interface';

type EventCallback<T = any> = (data: T) => void | Promise<void>;

export class EventBusImpl implements IEventBus {
  private listeners: Map<string, EventCallback[]> = new Map();

  subscribe<T = any>(event: string, callback: EventCallback<T>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  async publish<T = any>(event: string, data: T): Promise<void> {
    const eventCallbacks = this.listeners.get(event) || [];
    const promises = eventCallbacks.map(callback => {
      try {
        const result = callback(data);
        if (result instanceof Promise) {
          return result.catch(err => {
            console.error(`[EventBus] Error in async handler for ${event}:`, err);
          });
        }
      } catch (err) {
        console.error(`[EventBus] Error in handler for ${event}:`, err);
      }
    });
    await Promise.all(promises);
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const EventBus = new EventBusImpl();
export default EventBus;
