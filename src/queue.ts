import { QueueInterface } from "./types/queue.type";

export class Queue <T> implements QueueInterface<T> {
  data: T[];
  result: T[];
  roomSize: number;
  queue: T[];
  queueIndex: number[];
  temp: T[][];
  callback: Function | null;
  callbackIsPromise: boolean;
  completed: boolean[];
  completedCallback: Function | null;

  constructor(size: number) {
    this.data = [];
    this.result = []
    this.roomSize = size;

    this.temp = Array(this.roomSize).fill([]);
    this.queue = Array(this.roomSize).fill(null);
    this.queueIndex = this.queue.map((_) => 0); // for current index (init)
    this.callback = null;
    this.callbackIsPromise = false;
    this.completed = [];
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
    this.result = Array(this.data.length).fill(null)
    this.completed = Array(this.data.length).fill(false);

    return this;
  }

  #resetData() {
    this.data = [];
    this.temp = Array(this.roomSize).fill([]);
    this.queue = Array(this.roomSize).fill(null);
    this.queueIndex = this.queue.map((_) => 0); // for current index (init)
    this.completed = [];
  }

  // set temp, btw temp is multidimensional array
  #setTemp(index: number, data: T): void {
    this.temp = this.temp.map((item, i) =>
      i === index ? [...item, data] : item,
    );
  }

  setCompleted(index:number) {
    this.completed[index] = true;

    if (this.completedCallback && this.completed.every((item) => item))
      this.completedCallback({ result: this.result });
    
    if (this.completed.every((item) => item)) this.#resetData();
  }

  isPromise(callback: Function): boolean {
    if (!callback) return false;
    return callback.constructor.name === "AsyncFunction";
  }

  // execute callback for process item of temp every queue is finished
  #executeOn(queueIndex: number, itemIndex: number) {
    const data = this.temp?.[queueIndex]?.[itemIndex];
    if (!data) return;
    
    let result;
    const currentIndex = queueIndex + this.roomSize * itemIndex;

    if(this.queueIndex[queueIndex] ) this.queueIndex[queueIndex] += 1;
    const nextData = this.temp[queueIndex]?.[this.queueIndex?.[queueIndex]!];

    if (this.callbackIsPromise) {
      return this.callback!(data, this.data, currentIndex).then((response: T) => {
        if (response) {
          this.#executeOn(queueIndex, this.queueIndex[queueIndex]!);
          this.result[currentIndex] = response

          this.setCompleted(currentIndex);
        }
      });
    } else result = this.callback!(data, this.data, currentIndex);

    if (nextData) 
      this.#executeOn(queueIndex, this.queueIndex[queueIndex]!);
    this.result[currentIndex] = result
    
    this.setCompleted(currentIndex);
  }

  setExecutor(executor: Function): QueueInterface<T> {
    if (!executor || typeof executor !== "function")
      throw new Error("executor is not a function");

    this.callback = executor;
    this.callbackIsPromise = this.isPromise(this.callback);

    return this
  }

  onCompleted(callback: Function): QueueInterface<T> {
    if (!callback || typeof callback !== "function")
      throw new Error("On Compeleted is not a function");

    this.completedCallback = callback;

    return this
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
            this.#executeOn(index, nextIndex);
            this.result[index] = response
            
            this.setCompleted(index);
          }
        })
      else result = this.callback!(data, this.data, index);

      if (result) this.#executeOn(index, nextIndex);
      this.result[index] = result

      this.setCompleted(index);
    });
  }
}
