import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/manvia_dev?schema=public';
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const doctors = await prisma.doctorProfile.findMany({
    include: {
      specialties: { include: { specialty: true } },
      consultationOffers: true,
      availabilities: true,
      user: { select: { email: true, status: true, roles: true } },
    },
  });

  console.log(`=== Found ${doctors.length} doctors in database ===`);
  for (const doc of doctors) {
    console.log(
      JSON.stringify(
        {
          id: doc.id,
          publicDoctorId: doc.publicDoctorId,
          name: doc.displayName,
          verificationStatus: doc.verificationStatus,
          currency: doc.currency,
          userEmail: doc.user.email,
          offersCount: doc.consultationOffers.length,
          offers: doc.consultationOffers.map((o) => ({
            id: o.id,
            title: o.title,
            status: o.status,
            fee: o.fee.toString(),
            duration: o.durationMinutes,
            currency: o.currency,
          })),
          availCount: doc.availabilities.length,
          availabilities: doc.availabilities.map((a) => ({
            id: a.id,
            day: a.dayOfWeek,
            start: a.startTime,
            end: a.endTime,
            active: a.isActive,
            tz: a.timezone,
          })),
          specialties: doc.specialties.map((s) => s.specialty.name),
        },
        null,
        2,
      ),
    );
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
