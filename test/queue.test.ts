import { describe, it, expect, vi, beforeEach } from "vitest";
import { Queue } from "../queue";

describe("Queue", () => {
  let queue: Queue<number>;

  beforeEach(() => {
    queue = new Queue<number>(3);
  });

  // ─── Constructor ───────────────────────────────────────────────
  describe("constructor", () => {
    it("should initialize with correct room size", () => {
      const q = new Queue<number>(5);
      expect(q).toBeDefined();
    });

    it("should throw if executor is not set before execute", () => {
      queue.setData([1, 2, 3]);
      expect(() => queue.execute()).toThrow("callback is not set");
    });
  });

  // ─── setData ───────────────────────────────────────────────────
  describe("setData", () => {
    it("should distribute data across queues", () => {
      const executor = vi.fn();
      queue.setExecutor(executor);
      queue.setData([1, 2, 3, 4, 5, 6]);
      queue.execute();

      // executor dipanggil sebanyak jumlah queue (roomSize)
      expect(executor).toHaveBeenCalledTimes(3);
    });

    it("should return this for chaining", () => {
      const result = queue.setData([1, 2, 3]);
      expect(result).toBe(queue);
    });

    it("should handle empty data", () => {
      const executor = vi.fn();
      queue.setExecutor(executor);
      queue.setData([]);
      queue.execute();

      expect(executor).not.toHaveBeenCalled();
    });
  });

  // ─── setExecutor ───────────────────────────────────────────────
  describe("setExecutor", () => {
    it("should accept a valid function", () => {
      expect(() => queue.setExecutor(vi.fn())).not.toThrow();
    });

    it("should throw if executor is not a function", () => {
      expect(() => queue.setExecutor(null as any)).toThrow(
        "executor is not a function"
      );
    });

    it("should throw if executor is undefined", () => {
      expect(() => queue.setExecutor(undefined as any)).toThrow(
        "executor is not a function"
      );
    });

    it("should detect async function correctly", () => {
      const asyncFn = async () => {};
      expect(queue.isPromise(asyncFn)).toBe(true);
    });

    it("should detect sync function correctly", () => {
      const syncFn = () => {};
      expect(queue.isPromise(syncFn)).toBe(false);
    });
  });

  // ─── onCompleted ───────────────────────────────────────────────
  describe("onCompleted", () => {
    it("should accept a valid callback", () => {
      expect(() => queue.onCompleted(vi.fn())).not.toThrow();
    });

    it("should throw if callback is not a function", () => {
      expect(() => queue.onCompleted(null as any)).toThrow(
        "On Compeleted is not a function"
      );
    });

    it("should call completedCallback when all items are processed", () => {
      const onCompleted = vi.fn();
      const executor = vi.fn().mockReturnValue(true);

      queue.onCompleted(onCompleted);
      queue.setExecutor(executor);
      queue.setData([1, 2, 3]);
      queue.execute();

      expect(onCompleted).toHaveBeenCalledWith({
        status: true,
        completed: 3,
      });
    });
  });

  // ─── setCompleted ──────────────────────────────────────────────
  describe("setCompleted", () => {
    it("should reset data after all items completed", () => {
      const executor = vi.fn().mockReturnValue(true);
      queue.setExecutor(executor);
      queue.setData([1, 2, 3]);
      queue.execute();

      // setelah semua selesai, execute lagi tanpa setData harus tidak memanggil executor
      const executor2 = vi.fn();
      queue.setExecutor(executor2);
      queue.execute();

      expect(executor2).not.toHaveBeenCalled();
    });
  });

  // ─── execute (sync) ────────────────────────────────────────────
  describe("execute (sync)", () => {
    it("should call executor for each queue slot", () => {
      const executor = vi.fn().mockReturnValue(true);
      queue.setExecutor(executor);
      queue.setData([1, 2, 3, 4, 5, 6]);
      queue.execute();

      // setiap queue slot dipanggil minimal sekali
      expect(executor.mock.calls.length).toBeGreaterThanOrEqual(3);
    });

    it("should pass correct data to executor", () => {
      const received: number[] = [];
      const executor = vi.fn((item: number) => {
        received.push(item);
        return true;
      });

      queue.setExecutor(executor);
      queue.setData([10, 20, 30]);
      queue.execute();

      expect(received).toEqual(expect.arrayContaining([10, 20, 30]));
    });

    it("should not continue to next item if executor returns falsy", () => {
      const executor = vi.fn().mockReturnValue(false);
      queue.setExecutor(executor);
      queue.setData([1, 2, 3, 4, 5, 6]);
      queue.execute();

      // hanya dipanggil untuk item pertama tiap slot
      expect(executor).toHaveBeenCalledTimes(3);
    });
  });

  // ─── execute (async) ───────────────────────────────────────────
  describe("execute (async)", () => {
    it("should call async executor for each queue slot", async () => {
      const executor = vi.fn().mockResolvedValue(true);
      queue.setExecutor(executor);
      queue.setData([1, 2, 3]);

      queue.execute();

      // tunggu semua promise resolve
      await vi.waitFor(() => {
        expect(executor.mock.calls.length).toBeGreaterThanOrEqual(3);
      });
    });

    it("should call onCompleted after all async items finish", async () => {
      const onCompleted = vi.fn();
      const executor = vi.fn().mockResolvedValue(true);

      queue.onCompleted(onCompleted);
      queue.setExecutor(executor);
      queue.setData([1, 2, 3]);
      queue.execute();

      await vi.waitFor(() => {
        expect(onCompleted).toHaveBeenCalledWith({
          status: true,
          completed: 3,
        });
      });
    });

    // it("should not proceed if async executor resolves falsy", async () => {
    //   const executor = vi.fn().mockResolvedValue(null);
    //   queue.setExecutor(executor);
    //   queue.setData([1, 2, 3, 4, 5, 6]);
    //   queue.execute();

    //   await vi.waitFor(() => {
    //     // hanya dipanggil sekali per slot, tidak lanjut ke item berikutnya
    //     expect(executor).toHaveBeenCalledTimes(3);
    //   });
    // });
  });

  // ─── isPromise ─────────────────────────────────────────────────
  describe("isPromise", () => {
    it("should return false if callback is null", () => {
      expect(queue.isPromise(null as any)).toBe(false);
    });

    it("should return false for regular function", () => {
      expect(queue.isPromise(() => {})).toBe(false);
    });

    it("should return true for async function", () => {
      expect(queue.isPromise(async () => {})).toBe(true);
    });
  });
});