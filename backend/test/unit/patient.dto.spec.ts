// ==============================================================================
// MANVIA — Patient DTOs Unit Tests
// ==============================================================================
// Phase 6: Patient DTO Validation Rules
// ==============================================================================

import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreatePatientProfileDto } from '../../src/modules/patient/dto/create-patient-profile.dto.js';
import { UpdatePatientProfileDto } from '../../src/modules/patient/dto/update-patient-profile.dto.js';
import { EmergencyContactDto } from '../../src/modules/patient/dto/emergency-contact.dto.js';
import { BiologicalSex } from '@prisma/client';

describe('Patient DTOs Validation', () => {
  describe('CreatePatientProfileDto', () => {
    it('should validate with valid full demographic information', async () => {
      const dto = plainToInstance(CreatePatientProfileDto, {
        legalFirstName: 'Priya',
        legalLastName: 'Sharma',
        dateOfBirth: '1984-06-15',
        biologicalSex: BiologicalSex.FEMALE,
        bloodGroup: 'B+',
        emergencyContact: {
          name: 'Anil Sharma',
          phone: '+14155552671',
          relationship: 'SPOUSE',
        },
        preferredLanguage: 'en',
        timezone: 'Asia/Kolkata',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate with empty optional payload', async () => {
      const dto = plainToInstance(CreatePatientProfileDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject invalid dateOfBirth format', async () => {
      const dto = plainToInstance(CreatePatientProfileDto, {
        dateOfBirth: 'not-a-date',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]?.property).toBe('dateOfBirth');
    });

    it('should reject invalid biologicalSex enum', async () => {
      const dto = plainToInstance(CreatePatientProfileDto, {
        biologicalSex: 'INVALID_SEX',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]?.property).toBe('biologicalSex');
    });

    it('should reject string exceeding maximum length', async () => {
      const dto = plainToInstance(CreatePatientProfileDto, {
        legalFirstName: 'A'.repeat(101),
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]?.property).toBe('legalFirstName');
    });
  });

  describe('UpdatePatientProfileDto', () => {
    it('should validate partial update payload', async () => {
      const dto = plainToInstance(UpdatePatientProfileDto, {
        preferredLanguage: 'hi',
        timezone: 'UTC',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('EmergencyContactDto', () => {
    it('should reject emergency contact name exceeding 150 chars', async () => {
      const dto = plainToInstance(EmergencyContactDto, {
        name: 'A'.repeat(151),
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]?.property).toBe('name');
    });
  });
});
