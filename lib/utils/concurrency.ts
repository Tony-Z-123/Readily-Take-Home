export async function processWithConcurrency<T>(
  items: T[],
  fn: (item: T) => Promise<void>,
  limit: number
): Promise<void> {
  const active = new Set<Promise<void>>();

  for (const item of items) {
    const task = fn(item).then(() => {
      active.delete(task);
    });
    active.add(task);

    if (active.size >= limit) {
      await Promise.race(active);
    }
  }

  await Promise.all(active);
}
