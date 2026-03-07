import { describe, it, expect } from 'bun:test';

const TIME_RE = /^\d{2}:\d{2}$/;
const PRAYER_NAMES = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;

const TEST_CITIES = [
  { name: 'Makkah', lat: 21.4225, lng: 39.8262, method: 4, school: 0 },
  { name: 'Toronto', lat: 43.6532, lng: -79.3832, method: 2, school: 1 },
  { name: 'London', lat: 51.5074, lng: -0.1278, method: 3, school: 1 },
  { name: 'Karachi', lat: 24.8607, lng: 67.0011, method: 1, school: 1 },
  { name: 'Istanbul', lat: 41.0082, lng: 28.9784, method: 13, school: 1 },
];

function toMins(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

describe('aladhan API', () => {
  for (const city of TEST_CITIES) {
    describe(city.name, () => {
      let timings: Record<string, string>;

      it('returns HTTP 200 with valid timings', async () => {
        const today = new Date();
        const dateStr = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
        const url = `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${city.lat}&longitude=${city.lng}&method=${city.method}&school=${city.school}`;
        const resp = await fetch(url);
        expect(resp.ok).toBe(true);

        const json = await resp.json();
        expect(json.code).toBe(200);
        expect(json.data).toBeDefined();
        expect(json.data.timings).toBeDefined();
        timings = json.data.timings;
      }, 10_000);

      it('has all prayer times in HH:MM format', () => {
        for (const name of PRAYER_NAMES) {
          expect(timings[name]).toBeDefined();
          expect(timings[name]).toMatch(TIME_RE);
        }
      });

      it('has additional time fields (Sunset, Midnight, etc.)', () => {
        for (const field of ['Sunset', 'Midnight', 'Imsak', 'Firstthird', 'Lastthird']) {
          expect(timings[field]).toBeDefined();
          expect(timings[field]).toMatch(TIME_RE);
        }
      });

      it('prayer times are chronologically ordered', () => {
        const fajr = toMins(timings.Fajr);
        const dhuhr = toMins(timings.Dhuhr);
        const asr = toMins(timings.Asr);
        const maghrib = toMins(timings.Maghrib);
        const isha = toMins(timings.Isha);

        expect(fajr).toBeLessThan(dhuhr);
        expect(dhuhr).toBeLessThan(asr);
        expect(asr).toBeLessThan(maghrib);
        expect(maghrib).toBeLessThan(isha);
      });

      it('Fajr is before sunrise and Maghrib is after Asr', () => {
        const fajr = toMins(timings.Fajr);
        const sunrise = toMins(timings.Sunrise);
        const asr = toMins(timings.Asr);
        const maghrib = toMins(timings.Maghrib);

        expect(fajr).toBeLessThan(sunrise);
        expect(asr).toBeLessThan(maghrib);
      });

      it('all prayer times fall within 00:00-23:59', () => {
        for (const name of PRAYER_NAMES) {
          const mins = toMins(timings[name]);
          expect(mins).toBeGreaterThanOrEqual(0);
          expect(mins).toBeLessThan(1440);
        }
      });
    });
  }

  it('Hanafi Asr is later than Shafi\'i Asr for the same city', async () => {
    const today = new Date();
    const dateStr = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
    const base = `https://api.aladhan.com/v1/timings/${dateStr}?latitude=43.6532&longitude=-79.3832&method=2`;

    const [shafiResp, hanafiResp] = await Promise.all([
      fetch(`${base}&school=0`).then(r => r.json()),
      fetch(`${base}&school=1`).then(r => r.json()),
    ]);

    const shafiAsr = toMins(shafiResp.data.timings.Asr);
    const hanafiAsr = toMins(hanafiResp.data.timings.Asr);

    expect(hanafiAsr).toBeGreaterThan(shafiAsr);
  }, 10_000);
});
