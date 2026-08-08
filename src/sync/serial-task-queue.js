export function createSerialTaskQueue() {
  let tail = Promise.resolve();

  return {
    enqueue(task) {
      const result = tail.then(task);
      tail = result.catch(() => undefined);
      return result;
    },
  };
}
