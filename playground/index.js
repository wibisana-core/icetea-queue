import { Queue } from "icetea-queue";

const executor = async (data, alldata, index) =>
  new Promise((resolve) =>
    setTimeout(() => {
      console.log({ data, index });
      resolve(data);
    }, 1000),
  );

const queue = new Queue(3);

queue.setExecutor(executor);
queue.onCompleted((result) => {
  console.log({ message: "Sudah dijalankan", ...result });
});

queue.setData([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

queue.execute();
