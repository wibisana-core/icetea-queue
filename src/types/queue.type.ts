export interface QueueInterface<T> {
  data: T[];
  roomSize: number;
  queue: T[];
  queueIndex: number[];
  temp: T[][];
  callback: Function | null;
  callbackIsPromise: boolean;
  completed: number;
  completedCallback: Function | null;

  setData(data: T[]): void;
  setCompleted(): void;
  isPromise(callback: Function): boolean;
  setExecutor(executor: (
    item: T,
    data: T[],
    index: number
  ) => void): void;
  onCompleted(callback: Function): void;
  execute(): void;
}