import { QueueInterface } from "./types/queue.type";

export class Queue <T> implements QueueInterface<T> {
  data: T[];
  roomSize: number;
  queue: T[];
  queueIndex: number[];
  temp: T[][];
  callback: Function | null;
  callbackIsPromise: boolean;
  completed: number;
  completedCallback: Function | null;

  constructor(size: number) {
    this.data = [];
    this.roomSize = size;

    this.temp = Array(this.roomSize).fill([]);
    this.queue = Array(this.roomSize).fill(null);
    this.queueIndex = this.queue.map((_) => 0); // for current index (init)
    this.callback = null;
    this.callbackIsPromise = false;
    this.completed = 0;
    this.completedCallback = null;
  }

  setData(data: T[] = []) {
    this.data = data;
    const tempData = Array.from(this.data);

    let indexAt = 0;
    while (tempData.length !== 0) {
      if (indexAt === this.temp.length) indexAt = 0;
      if (!tempData.length) break;

      const item = tempData.splice(0, 1)[0];

      if(item) this.#setTemp(indexAt++, item);
    }

    this.queue = this.queue.map((_, index) => this.temp[index]?.[0] ?? null) as T[];
    return this;
  }

  #resetData() {
    this.data = [];
    this.temp = Array(this.roomSize).fill([]);
    this.queue = Array(this.roomSize).fill(null);
    this.queueIndex = this.queue.map((_) => 0); // for current index (init)
    this.completed = 0;
  }

  // set temp, btw temp is multidimensional array
  #setTemp(index: number, data: T): void {
    this.temp = this.temp.map((item, i) =>
      i === index ? [...item, data] : item,
    );
  }

  setCompleted() {
    this.completed += 1;

    if (this.completedCallback && this.completed === this.data.length)
      this.completedCallback({ status: true, completed: this.completed });

    if (this.completed === this.data.length) this.#resetData();
  }

  isPromise(callback: Function): boolean {
    if (!callback) return false;
    return callback.constructor.name === "AsyncFunction";
  }

  // execute callback for process item of temp every queue is finished
  #executeOn(queueIndex: number, itemIndex: number) {
    const data = this.temp?.[queueIndex]?.[itemIndex];
    if (!data) return;
    const currentIndex = this.roomSize * (queueIndex + 1) + itemIndex;

    if(this.queueIndex[queueIndex] ) this.queueIndex[queueIndex] += 1;
    const nextData = this.temp[queueIndex]?.[this.queueIndex?.[queueIndex]!];

    if (this.callbackIsPromise) {
      return this.callback!(data, this.data, currentIndex).then((response: T) => {
        if (response) {
          this.setCompleted();
          this.#executeOn(queueIndex, this.queueIndex[queueIndex]!);
        }
      });
    } else  this.callback!(data, this.data, currentIndex);

    this.setCompleted();
    if (nextData) {
      this.#executeOn(queueIndex, this.queueIndex[queueIndex]!);
    }
  }

  setExecutor(executor: Function): void {
    if (!executor || typeof executor !== "function")
      throw new Error("executor is not a function");

    this.callback = executor;
    this.callbackIsPromise = this.isPromise(this.callback);
  }

  onCompleted(callback: Function) {
    if (!callback || typeof callback !== "function")
      throw new Error("On Compeleted is not a function");

    this.completedCallback = callback;
  }

  execute() {
    if (!this.callback) throw new Error("callback is not set");
    if(this.data.length === 0) return

    this.queue.map((item, index) => {
      const data = item;
      const nextIndex = ++this.queueIndex[index]!;
      let result = undefined;

      if (this.callbackIsPromise)
        return this.callback!(data, this.data, index).then((response: T) => {
          if (response) {
            this.setCompleted();
            this.#executeOn(index, nextIndex);
          }
        });
      else result = this.callback!(data, this.data, index);

      this.setCompleted();
      if (result) this.#executeOn(index, nextIndex);
    });
  }
}
