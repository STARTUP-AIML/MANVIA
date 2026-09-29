import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module.js';
import { HealthModule } from './health/health.module.js';
import { DatabaseModule } from './database/database.module.js';
import { IdentityModule } from './modules/identity/identity.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { AuthorizationModule } from './modules/authorization/authorization.module.js';
import { PatientModule } from './modules/patient/patient.module.js';
import { AppController } from './app.controller.js';

@Module({
  imports: [
    ConfigModule,
    HealthModule,
    DatabaseModule,
    IdentityModule,
    AuthModule,
    AuthorizationModule,
    PatientModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
