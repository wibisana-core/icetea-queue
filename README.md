# icetea-queue

A simple, lightweight TypeScript queue implementation for processing items concurrently across multiple slots. Supports both synchronous and asynchronous executors with completion tracking.

## Installation

```bash
npm install icetea-queue
```

## Quick Start

```typescript
import { Queue } from "icetea-queue";

// Create a queue with 3 parallel slots
const queue = new Queue<number>(3);

// Set an executor function (called for each item)
queue.setExecutor(async (item, allData) => {
  console.log(`Processing: ${item}`);
  return true; // return truthy to continue to next item
});

// Provide data to process
queue.setData([1, 2, 3, 4, 5, 6]);

// Handle completion
queue.onCompleted((result) => {
  console.log("All done!", result);
  // { status: true, completed: 6 }
});

// Start processing
queue.execute();
```

## API

### `Queue<T>(roomSize: number)`

Creates a new queue with the specified number of parallel slots.

| Parameter  | Type     | Description                               |
| ---------- | -------- | ----------------------------------------- |
| `roomSize` | `number` | Number of parallel processing slots/rooms |

### Methods

#### `setData(data: T[]): this`

Sets the data to be processed and distributes it across the available slots in a round-robin fashion. Returns `this` for chaining.

```typescript
queue.setData([0, 1, 2, 3, 4, 5]);
// Slot distribution with roomSize=3:
//   Slot 0: [0, 3]
//   Slot 1: [1, 4]
//   Slot 2: [2, 5]
```

#### `setExecutor(executor: Function): void`

Sets the callback function that processes each item. The executor receives the current item and the full dataset.

```typescript
// Sync executor
queue.setExecutor((item, allData) => {
  // process item
  return true; // truthy → proceed to next item, falsy → stop
});

// Async executor
queue.setExecutor(async (item, allData) => {
  await someAsyncWork(item);
  return true;
});
```

- **Throws** `Error` if executor is not a function.

#### `execute(): void`

Starts processing all items across the queue slots. The executor must be set before calling this method.

- **Throws** `Error` if no executor has been set.
- Does nothing if data is empty.

#### `onCompleted(callback: Function): void`

Registers a callback that fires when all items have been processed.

```typescript
queue.onCompleted((result) => {
  console.log(result.status); // true
  console.log(result.completed); // total items processed
});
```

- **Throws** `Error` if callback is not a function.

#### `isPromise(callback: Function): boolean`

Checks whether a given callback is an async function.

```typescript
queue.isPromise(async () => {}); // true
queue.isPromise(() => {}); // false
queue.isPromise(null); // false
```

### Behavior

- **Round-robin distribution**: Data is evenly distributed across the available slots.
- **Sequential within slots**: Each slot processes its items one after another.
- **Parallel across slots**: All slots process concurrently.
- **Completion callback**: Fires once every item across all slots has been processed.
- **Auto-reset**: After all items are processed, internal state resets automatically.
- **Falsy return stops progression**: If the executor returns a falsy value, that slot stops processing further items.

## Example

### Processing with completion tracking

```typescript
import { Queue } from "icetea-queue";

const queue = new Queue<string>(2);

queue.onCompleted(({ status, completed }) => {
  console.log(`Completed ${completed} items: ${status}`);
});

queue.setExecutor(async (item) => {
  const result = await fetch(`https://api.example.com/${item}`);
  return result.ok;
});

queue.setData(["a", "b", "c", "d"]);
queue.execute();
```

## License

MIT
