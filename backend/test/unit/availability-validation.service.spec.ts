import { describe, it, expect, beforeEach } from 'vitest';
import { AvailabilityValidationService } from '../../src/modules/doctor-availability/services/availability-validation.service.js';
import { DayOfWeek } from '../../src/modules/doctor-availability/enums/day-of-week.enum.js';
import type { DoctorAvailabilityEntity } from '../../src/modules/doctor-availability/entities/doctor-availability.entity.js';
import { ConflictError, ValidationError } from '../../src/common/errors/app-error.js';

describe('AvailabilityValidationService (Unit Tests)', () => {
  let service: AvailabilityValidationService;

  beforeEach(() => {
    service = new AvailabilityValidationService();
  });

  describe('Timezone validation across multiple global regions', () => {
    it('should accept valid IANA timezone identifiers', () => {
      const validZones = [
        'America/New_York',
        'Asia/Kolkata',
        'Europe/London',
        'UTC',
        'Asia/Tokyo',
        'Australia/Sydney',
        'Europe/Paris',
      ];

      for (const zone of validZones) {
        expect(() => service.validateTimezone(zone)).not.toThrow();
      }
    });

    it('should reject invalid or non-IANA timezone strings', () => {
      const invalidZones = ['Invalid/Zone', 'EST', 'IST', 'PST', '', '   '];

      for (const zone of invalidZones) {
        expect(() => service.validateTimezone(zone)).toThrow(ValidationError);
      }
    });
  });

  describe('Time range and format validation', () => {
    it('should accept valid 24-hour clock time range where start < end', () => {
      expect(() => service.validateTimeRange('09:00', '13:00')).not.toThrow();
      expect(() => service.validateTimeRange('14:30', '18:45')).not.toThrow();
      expect(() => service.validateTimeRange('00:00', '23:59')).not.toThrow();
    });

    it('should reject invalid time format strings', () => {
      expect(() => service.validateTimeRange('9:00', '13:00')).toThrow(ValidationError);
      expect(() => service.validateTimeRange('09:00', '25:00')).toThrow(ValidationError);
      expect(() => service.validateTimeRange('09:65', '13:00')).toThrow(ValidationError);
      expect(() => service.validateTimeRange('morning', 'evening')).toThrow(ValidationError);
    });

    it('should reject identical start and end times', () => {
      expect(() => service.validateTimeRange('09:00', '09:00')).toThrow(ValidationError);
    });

    it('should enforce platform policy rejecting cross-midnight windows with clear guidance', () => {
      expect(() => service.validateTimeRange('22:00', '02:00')).toThrow(
        /Cross-midnight availability windows.*are not permitted in a single rule/,
      );
      expect(() => service.validateTimeRange('23:00', '01:00')).toThrow(ValidationError);
    });
  });

  describe('Effective date range validation', () => {
    it('should accept valid effectiveFrom <= effectiveUntil', () => {
      const from = new Date('2026-10-01');
      const until = new Date('2026-12-31');
      expect(() => service.validateEffectiveDateRange(from, until)).not.toThrow();
    });

    it('should reject effectiveFrom > effectiveUntil', () => {
      const from = new Date('2026-12-31');
      const until = new Date('2026-10-01');
      expect(() => service.validateEffectiveDateRange(from, until)).toThrow(ValidationError);
    });
  });

  describe('Overlapping availability windows detection', () => {
    const existingRule: DoctorAvailabilityEntity = {
      id: 'rule-01',
      doctorId: 'doc-123',
      timezone: 'America/New_York',
      dayOfWeek: DayOfWeek.MONDAY,
      startTime: '09:00',
      endTime: '13:00',
      effectiveFrom: null,
      effectiveUntil: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should reject overlapping window on the same weekday', () => {
      // Overlaps 11:00 - 15:00 with 09:00 - 13:00
      expect(() =>
        service.checkOverlappingWindows([existingRule], {
          dayOfWeek: DayOfWeek.MONDAY,
          startTime: '11:00',
          endTime: '15:00',
        }),
      ).toThrow(ConflictError);

      // Overlaps 08:00 - 10:00 with 09:00 - 13:00
      expect(() =>
        service.checkOverlappingWindows([existingRule], {
          dayOfWeek: DayOfWeek.MONDAY,
          startTime: '08:00',
          endTime: '10:00',
        }),
      ).toThrow(ConflictError);

      // Entirely inside 10:00 - 12:00
      expect(() =>
        service.checkOverlappingWindows([existingRule], {
          dayOfWeek: DayOfWeek.MONDAY,
          startTime: '10:00',
          endTime: '12:00',
        }),
      ).toThrow(ConflictError);
    });

    it('should allow disjoint windows (representing clinical breaks) on the same weekday', () => {
      // 14:00 - 18:00 on Monday (leaves 13:00 - 14:00 as break)
      expect(() =>
        service.checkOverlappingWindows([existingRule], {
          dayOfWeek: DayOfWeek.MONDAY,
          startTime: '14:00',
          endTime: '18:00',
        }),
      ).not.toThrow();

      // Directly adjacent 13:00 - 17:00
      expect(() =>
        service.checkOverlappingWindows([existingRule], {
          dayOfWeek: DayOfWeek.MONDAY,
          startTime: '13:00',
          endTime: '17:00',
        }),
      ).not.toThrow();
    });

    it('should allow identical hours on different weekdays', () => {
      expect(() =>
        service.checkOverlappingWindows([existingRule], {
          dayOfWeek: DayOfWeek.TUESDAY,
          startTime: '09:00',
          endTime: '13:00',
        }),
      ).not.toThrow();
    });

    it('should ignore inactive rules during overlap checks', () => {
      const inactiveRule: DoctorAvailabilityEntity = {
        ...existingRule,
        isActive: false,
      };

      expect(() =>
        service.checkOverlappingWindows([inactiveRule], {
          dayOfWeek: DayOfWeek.MONDAY,
          startTime: '09:00',
          endTime: '13:00',
        }),
      ).not.toThrow();
    });
  });
});
