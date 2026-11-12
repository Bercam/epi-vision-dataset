export function createMutex() {
  let tail = Promise.resolve();

  return function runExclusive(task) {
    const result = tail.then(task, task);
    tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };
}
