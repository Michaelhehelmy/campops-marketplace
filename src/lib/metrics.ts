const counters = new Map<string, number>();
const histograms = new Map<string, number[]>();

export function incrementCounter(name: string, by = 1) {
  counters.set(name, (counters.get(name) ?? 0) + by);
}

export function recordHistogram(name: string, value: number) {
  if (!histograms.has(name)) {
    histograms.set(name, []);
  }
  histograms.get(name)!.push(value);
}

export function getMetrics() {
  const result: Record<string, unknown> = {};
  for (const [name, count] of counters) {
    result[`counter_${name}`] = count;
  }
  for (const [name, values] of histograms) {
    if (values.length > 0) {
      const sorted = [...values].sort((a, b) => a - b);
      result[`histogram_${name}`] = {
        count: values.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)],
      };
    }
  }
  return result;
}

export function resetMetrics() {
  counters.clear();
  histograms.clear();
}
