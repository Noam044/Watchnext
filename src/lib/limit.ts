/** Limiteur de concurrence minimal (équivalent de p-limit). */
export function createLimiter(concurrency: number) {
  let active = 0;
  const queue: (() => void)[] = [];

  const next = () => {
    if (active >= concurrency) return;
    const run = queue.shift();
    if (run) run();
  };

  return function limit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queue.push(() => {
        active++;
        fn()
          .then(resolve, reject)
          .finally(() => {
            active--;
            next();
          });
      });
      next();
    });
  };
}

/** Exécute fn sur chaque élément avec une concurrence bornée, en conservant l'ordre. */
export async function mapLimit<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>) {
  const limit = createLimiter(concurrency);
  return Promise.all(items.map((item) => limit(() => fn(item))));
}
