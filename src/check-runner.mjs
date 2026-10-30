export async function mapWithConcurrency(items, limit, worker) {
  const safeLimit = Math.max(1, Number.parseInt(limit, 10) || 1);
  const results = new Array(items.length);
  let nextIndex = 0;
  async function run() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(safeLimit, items.length) }, run));
  return results;
}
