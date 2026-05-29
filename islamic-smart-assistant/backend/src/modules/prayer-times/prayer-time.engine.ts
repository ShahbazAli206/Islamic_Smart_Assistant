import { Injectable } from '@nestjs/common';
import { Coordinates, PrayerTimes, CalculationMethod, Madhab, Qibla } from 'adhan';
import { DateTime } from 'luxon';

export type FiqhMethod = 'hanafi' | 'shafi' | 'maliki' | 'hanbali' | 'jafari';

export interface PrayerSet {
  date: string;          // YYYY-MM-DD (local)
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
}

/**
 * Pure prayer-time calculator. No DB, no cache, no IO. Deterministic for a given input.
 *
 * Fiqh mapping:
 *   - hanafi → CalculationMethod.Karachi      + Madhab.Hanafi  (Asr at shadow-length 2x)
 *   - shafi/maliki/hanbali → MuslimWorldLeague + Madhab.Shafi  (Asr at 1x)
 *   - jafari → CalculationMethod.Tehran       + Madhab.Shafi  (with Shia adjustments below)
 *
 * Region-specific overrides (e.g. ISNA for North America) can be applied via a region map.
 */
@Injectable()
export class PrayerTimeEngine {
  computeDay(lat: number, lng: number, timezone: string, date: DateTime, fiqh: FiqhMethod | null): PrayerSet {
    const local = date.setZone(timezone).startOf('day');
    const coords = new Coordinates(lat, lng);
    const params = this.paramsFor(fiqh);

    const times = new PrayerTimes(coords, local.toJSDate(), params);

    // Jafari (Shia): Maghrib is calculated at sun depression 4°, not at sunset.
    // adhan-js's Tehran method already applies this offset internally.

    return {
      date: local.toFormat('yyyy-LL-dd'),
      fajr: times.fajr,
      sunrise: times.sunrise,
      dhuhr: times.dhuhr,
      asr: times.asr,
      maghrib: times.maghrib,
      isha: times.isha,
    };
  }

  computeRange(lat: number, lng: number, timezone: string, fromISO: string, days: number, fiqh: FiqhMethod | null): PrayerSet[] {
    const start = DateTime.fromISO(fromISO, { zone: timezone });
    const out: PrayerSet[] = [];
    for (let i = 0; i < days; i++) out.push(this.computeDay(lat, lng, timezone, start.plus({ days: i }), fiqh));
    return out;
  }

  qiblaBearing(lat: number, lng: number): number {
    return Qibla(new Coordinates(lat, lng));
  }

  private paramsFor(fiqh: FiqhMethod | null) {
    let params;
    switch (fiqh) {
      case 'hanafi':
        params = CalculationMethod.Karachi();
        params.madhab = Madhab.Hanafi;
        break;
      case 'jafari':
        params = CalculationMethod.Tehran();
        params.madhab = Madhab.Shafi;
        break;
      case 'shafi':
      case 'maliki':
      case 'hanbali':
      default:
        params = CalculationMethod.MuslimWorldLeague();
        params.madhab = Madhab.Shafi;
    }
    return params;
  }
}
