const requests = new Map<string, { count: number; time: number }>();

const WINDOW = 60 * 1000;
const LIMIT = 100;

export function rateLimit(key: string): boolean {
  const now = Date.now();

  const current = requests.get(key);

  if (!current) {
    requests.set(key, { count: 1, time: now });
    return true;
  }

  if (now - current.time > WINDOW) {
    requests.set(key, { count: 1, time: now });
    return true;
  }

  if (current.count >= LIMIT) {
    return false;
  }

  current.count++;

  return true;
}