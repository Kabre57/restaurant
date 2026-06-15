export interface IEventBus {
  subscribe<T = any>(event: string, callback: (data: T) => void | Promise<void>): void;
  publish<T = any>(event: string, data: T): Promise<void>;
}
