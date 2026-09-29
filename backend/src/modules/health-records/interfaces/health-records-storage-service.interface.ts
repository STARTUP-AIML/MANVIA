import type { IStorageService } from '../../../common/interfaces/storage.interface.js';

export interface IHealthRecordsStorageService extends IStorageService {
  getUploadUrl(key: string, expiresInSeconds?: number): Promise<string>;
}

export const HEALTH_RECORDS_STORAGE_SERVICE = Symbol('HEALTH_RECORDS_STORAGE_SERVICE');
