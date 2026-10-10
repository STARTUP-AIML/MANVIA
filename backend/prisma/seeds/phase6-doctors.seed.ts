import {
  PrismaClient,
  VerificationStatus,
  OfferStatus,
  DayOfWeek,
  ConsultationType,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
import argon2 from 'argon2';

dotenv.config();

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/manvia_dev?schema=public';
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface DemoDoctorConfig {
  email: string;
  publicDoctorId: string;
  displayName: string;
  bio: string;
  medicalRegistrationNumber: string;
  licensingCouncil: string;
  yearsOfExperience: number;
  clinicName: string;
  city: string;
  state: string;
  clinicalInterests: string[];
  consultationModes: string[];
  contactDisplay: string;
  profileImageUrl: string;
  primarySpecialtyCode: string;
  secondarySpecialtyCodes: string[];
  languageCodes: string[];
  defaultConsultationFee: number;
  qualifications: Array<{
    qualification: string;
    institution: string;
    fieldOfStudy: string;
    graduationYear: number;
  }>;
  offers: Array<{
    title: string;
    description: string;
    consultationType: ConsultationType;
    durationMinutes: number;
    fee: number;
  }>;
}

const DEMO_DOCTORS: DemoDoctorConfig[] = [
  // 1. Psychiatry 1
  {
    email: 'dr.ananya.rao@demo.manvia.health',
    publicDoctorId: 'DOC-IN-01',
    displayName: 'Dr. Ananya Rao',
    bio: 'Consultant Psychiatrist specializing in mood disorders, anxiety syndromes, and holistic mental wellness. Over 12 years of clinical practice integrating evidence-based psychopharmacology and cognitive-behavioral wellness (Fictional Demo Clinician).',
    medicalRegistrationNumber: 'KMC-2012-08941',
    licensingCouncil: 'Karnataka Medical Council',
    yearsOfExperience: 12,
    clinicName: 'MindWell Neuropsychiatric Clinic',
    city: 'Bengaluru',
    state: 'Karnataka',
    clinicalInterests: [
      'Anxiety Disorders',
      'Adult ADHD',
      'Depression & Burnout',
      'Women Mental Health',
    ],
    consultationModes: ['VIDEO', 'IN_PERSON', 'AUDIO'],
    contactDisplay: 'DEMO-87421903',
    profileImageUrl: '/avatars/doctor-ananya-rao.jpg',
    primarySpecialtyCode: 'PSYCHIATRY',
    secondarySpecialtyCodes: ['COORDINATED_CARE'],
    languageCodes: ['en', 'hi', 'kn'],
    defaultConsultationFee: 1200,
    qualifications: [
      {
        qualification: 'MBBS',
        institution: 'Bangalore Medical College',
        fieldOfStudy: 'General Medicine',
        graduationYear: 2010,
      },
      {
        qualification: 'MD (Psychiatry)',
        institution: 'NIMHANS, Bengaluru',
        fieldOfStudy: 'Clinical Psychiatry',
        graduationYear: 2014,
      },
    ],
    offers: [
      {
        title: 'Initial Comprehensive Psychiatric Evaluation',
        description:
          'Comprehensive diagnostic intake, mental state exam, and personalized treatment roadmap.',
        consultationType: 'INITIAL',
        durationMinutes: 30,
        fee: 1200,
      },
      {
        title: 'Follow-up Psychiatric Consultation',
        description: 'Medication monitoring, progress evaluation, and therapeutic adjustments.',
        consultationType: 'FOLLOW_UP',
        durationMinutes: 20,
        fee: 800,
      },
      {
        title: 'Extended Psychotherapy & Wellness Session',
        description:
          'Deep-dive session covering cognitive restructuring, stress management, and relapse prevention.',
        consultationType: 'SPECIALIST',
        durationMinutes: 50,
        fee: 1800,
      },
    ],
  },
  // 2. Psychiatry 2
  {
    email: 'dr.arjun.mehta@demo.manvia.health',
    publicDoctorId: 'DOC-IN-02',
    displayName: 'Dr. Arjun Mehta',
    bio: 'Senior Neuropsychiatrist with 15 years experience managing complex mood dysregulation, stress resilience, and sleep physiology. Focuses on patient-centered recovery frameworks (Fictional Demo Clinician).',
    medicalRegistrationNumber: 'MMC-2009-04128',
    licensingCouncil: 'Maharashtra Medical Council',
    yearsOfExperience: 15,
    clinicName: 'Mehta Mind & Wellness Center',
    city: 'Mumbai',
    state: 'Maharashtra',
    clinicalInterests: [
      'Sleep Disorders',
      'Bipolar Spectrum',
      'Workplace Stress',
      'Addiction Psychiatry',
    ],
    consultationModes: ['VIDEO', 'IN_PERSON'],
    contactDisplay: 'DEMO-91238475',
    profileImageUrl: '/avatars/doctor-arjun-mehta.jpg',
    primarySpecialtyCode: 'PSYCHIATRY',
    secondarySpecialtyCodes: [],
    languageCodes: ['en', 'hi', 'mr'],
    defaultConsultationFee: 1500,
    qualifications: [
      {
        qualification: 'MBBS',
        institution: 'Grant Medical College, Mumbai',
        fieldOfStudy: 'Medicine and Surgery',
        graduationYear: 2007,
      },
      {
        qualification: 'DNB (Psychiatry)',
        institution: 'KEM Hospital, Mumbai',
        fieldOfStudy: 'Psychological Medicine',
        graduationYear: 2011,
      },
    ],
    offers: [
      {
        title: 'Initial Neuropsychiatric Assessment',
        description: 'Comprehensive mental wellness assessment with sleep and lifestyle screening.',
        consultationType: 'INITIAL',
        durationMinutes: 30,
        fee: 1500,
      },
      {
        title: 'Follow-up Medication Review',
        description:
          'Evaluation of treatment tolerability, dosage optimization, and stabilization checks.',
        consultationType: 'FOLLOW_UP',
        durationMinutes: 20,
        fee: 1000,
      },
      {
        title: 'Extended Crisis & Stress Counseling',
        description:
          'Intensive crisis support, burnout recovery, and customized resilience planning.',
        consultationType: 'SPECIALIST',
        durationMinutes: 45,
        fee: 2200,
      },
    ],
  },
  // 3. Psychiatry 3
  {
    email: 'dr.kavya.reddy@demo.manvia.health',
    publicDoctorId: 'DOC-IN-03',
    displayName: 'Dr. Kavya Reddy',
    bio: 'Integrative Psychiatrist and member of MRCPsych with 9 years of clinical expertise. Champion of trauma-informed care and lifestyle psychiatry for emotional balance (Fictional Demo Clinician).',
    medicalRegistrationNumber: 'TSMC-2015-06721',
    licensingCouncil: 'Telangana State Medical Council',
    yearsOfExperience: 9,
    clinicName: 'Serene Minds Behavioral Health',
    city: 'Hyderabad',
    state: 'Telangana',
    clinicalInterests: [
      'Trauma Recovery',
      'Post-Partum Mood',
      'Mindfulness Therapy',
      'Panic Syndromes',
    ],
    consultationModes: ['VIDEO', 'AUDIO'],
    contactDisplay: 'DEMO-78451296',
    profileImageUrl: '/avatars/doctor-kavya-reddy.jpg',
    primarySpecialtyCode: 'PSYCHIATRY',
    secondarySpecialtyCodes: [],
    languageCodes: ['en', 'hi', 'te'],
    defaultConsultationFee: 1000,
    qualifications: [
      {
        qualification: 'MBBS',
        institution: 'Osmania Medical College, Hyderabad',
        fieldOfStudy: 'General Medicine',
        graduationYear: 2013,
      },
      {
        qualification: 'MD (Psychiatry)',
        institution: 'Gandhi Medical College',
        fieldOfStudy: 'Behavioral Medicine',
        graduationYear: 2017,
      },
      {
        qualification: 'MRCPsych',
        institution: 'Royal College of Psychiatrists',
        fieldOfStudy: 'Psychiatry',
        graduationYear: 2019,
      },
    ],
    offers: [
      {
        title: 'Initial Integrative Wellness Session',
        description:
          'Holistic mind-body evaluation covering emotional health, sleep, and nutrition.',
        consultationType: 'INITIAL',
        durationMinutes: 30,
        fee: 1000,
      },
      {
        title: 'Follow-up Progress Review',
        description:
          'Targeted assessment of therapeutic interventions and ongoing symptom trajectory.',
        consultationType: 'FOLLOW_UP',
        durationMinutes: 20,
        fee: 700,
      },
      {
        title: 'Extended Psychotherapeutic Guidance',
        description: 'Trauma-informed guidance session integrating ACT and mindfulness practices.',
        consultationType: 'SPECIALIST',
        durationMinutes: 45,
        fee: 1500,
      },
    ],
  },
  // 4. General Practice 1
  {
    email: 'dr.vikram.sharma@demo.manvia.health',
    publicDoctorId: 'DOC-IN-04',
    displayName: 'Dr. Vikram Sharma',
    bio: 'Senior Family Physician with 14 years of primary care experience across outpatient internal medicine, metabolic health, and preventive lifestyle management (Fictional Demo Clinician).',
    medicalRegistrationNumber: 'DMC-2010-09382',
    licensingCouncil: 'Delhi Medical Council',
    yearsOfExperience: 14,
    clinicName: 'Capital Health Care Center',
    city: 'New Delhi',
    state: 'Delhi',
    clinicalInterests: [
      'Metabolic Syndrome',
      'Hypertension & Diabetes',
      'Preventive Health',
      'Infectious Diseases',
    ],
    consultationModes: ['VIDEO', 'IN_PERSON', 'AUDIO'],
    contactDisplay: 'DEMO-63219084',
    profileImageUrl: '/avatars/doctor-vikram-sharma.jpg',
    primarySpecialtyCode: 'GENERAL_PRACTICE',
    secondarySpecialtyCodes: ['INTERNAL_MED'],
    languageCodes: ['en', 'hi'],
    defaultConsultationFee: 600,
    qualifications: [
      {
        qualification: 'MBBS',
        institution: 'Maulana Azad Medical College, New Delhi',
        fieldOfStudy: 'Medicine',
        graduationYear: 2008,
      },
      {
        qualification: 'MD (General Medicine)',
        institution: 'Lady Hardinge Medical College',
        fieldOfStudy: 'Internal Medicine',
        graduationYear: 2012,
      },
    ],
    offers: [
      {
        title: 'General Health & Wellness Consultation',
        description:
          'Comprehensive primary care check-in for acute concerns and chronic health monitoring.',
        consultationType: 'GENERAL',
        durationMinutes: 30,
        fee: 600,
      },
      {
        title: 'Quick Prescription & Follow-up',
        description:
          'Quick review of lab reports, medication renewals, and acute symptom resolution.',
        consultationType: 'FOLLOW_UP',
        durationMinutes: 20,
        fee: 400,
      },
      {
        title: 'Comprehensive Annual Medical Review',
        description:
          'Full system preventive audit including cardiovascular, metabolic, and lifestyle risk factors.',
        consultationType: 'SPECIALIST',
        durationMinutes: 45,
        fee: 900,
      },
    ],
  },
  // 5. General Practice 2
  {
    email: 'dr.priya.nair@demo.manvia.health',
    publicDoctorId: 'DOC-IN-05',
    displayName: 'Dr. Priya Nair',
    bio: 'Family Medicine Practitioner with a decade of holistic patient care in community clinics. Passionate about family wellness, nutritional health, and chronic illness monitoring (Fictional Demo Clinician).',
    medicalRegistrationNumber: 'TCMC-2014-05189',
    licensingCouncil: 'Travancore-Cochin Medical Councils',
    yearsOfExperience: 10,
    clinicName: 'Malabar Community Medical Center',
    city: 'Kochi',
    state: 'Kerala',
    clinicalInterests: [
      'Family Health',
      'Pediatric Wellness',
      'Nutritional Medicine',
      'Geriatric Outpatient Care',
    ],
    consultationModes: ['VIDEO', 'IN_PERSON'],
    contactDisplay: 'DEMO-52198473',
    profileImageUrl: '/avatars/doctor-priya-nair.jpg',
    primarySpecialtyCode: 'GENERAL_PRACTICE',
    secondarySpecialtyCodes: [],
    languageCodes: ['en', 'ml', 'hi'],
    defaultConsultationFee: 500,
    qualifications: [
      {
        qualification: 'MBBS',
        institution: 'Government Medical College, Thiruvananthapuram',
        fieldOfStudy: 'Medicine',
        graduationYear: 2012,
      },
      {
        qualification: 'DNB (Family Medicine)',
        institution: 'Amrita Institute of Medical Sciences',
        fieldOfStudy: 'Family Practice',
        graduationYear: 2016,
      },
    ],
    offers: [
      {
        title: 'Routine Health Consultation',
        description:
          'Primary health consultation addressing acute illness, preventative care, and vitals review.',
        consultationType: 'GENERAL',
        durationMinutes: 30,
        fee: 500,
      },
      {
        title: 'Follow-up Wellness Assessment',
        description: 'Review of response to prescribed treatment, diet plan, and symptom changes.',
        consultationType: 'FOLLOW_UP',
        durationMinutes: 20,
        fee: 400,
      },
      {
        title: 'Holistic Family Health Review',
        description:
          'In-depth multi-generational health profiling and preventative wellness planning.',
        consultationType: 'SPECIALIST',
        durationMinutes: 45,
        fee: 800,
      },
    ],
  },
  // 6. General Practice 3
  {
    email: 'dr.karthik.iyer@demo.manvia.health',
    publicDoctorId: 'DOC-IN-06',
    displayName: 'Dr. Karthik Iyer',
    bio: 'Member of Royal College of General Practitioners with 11 years in ambulatory practice. Dedicated to preventative medicine and evidence-based outpatient diagnosis (Fictional Demo Clinician).',
    medicalRegistrationNumber: 'TNMC-2013-08247',
    licensingCouncil: 'Tamil Nadu Medical Council',
    yearsOfExperience: 11,
    clinicName: 'Marina Holistic Family Clinic',
    city: 'Chennai',
    state: 'Tamil Nadu',
    clinicalInterests: [
      'Cardiovascular Risk Profiling',
      'Respiratory Health',
      'Acute Care',
      'Preventive Immunology',
    ],
    consultationModes: ['VIDEO', 'IN_PERSON', 'AUDIO'],
    contactDisplay: 'DEMO-41982736',
    profileImageUrl: '/avatars/doctor-karthik-iyer.jpg',
    primarySpecialtyCode: 'GENERAL_PRACTICE',
    secondarySpecialtyCodes: [],
    languageCodes: ['en', 'ta', 'hi'],
    defaultConsultationFee: 750,
    qualifications: [
      {
        qualification: 'MBBS',
        institution: 'Madras Medical College, Chennai',
        fieldOfStudy: 'Clinical Medicine',
        graduationYear: 2011,
      },
      {
        qualification: 'MRCGP [INT]',
        institution: 'Royal College of General Practitioners',
        fieldOfStudy: 'General Practice',
        graduationYear: 2015,
      },
    ],
    offers: [
      {
        title: 'Primary Outpatient Consultation',
        description:
          'Comprehensive evidence-based assessment for acute and subacute health conditions.',
        consultationType: 'GENERAL',
        durationMinutes: 30,
        fee: 750,
      },
      {
        title: 'Continuity Follow-up',
        description:
          'Fast-track follow-up for chronic disease management and diagnostic interpretation.',
        consultationType: 'FOLLOW_UP',
        durationMinutes: 20,
        fee: 500,
      },
      {
        title: 'Extended Chronic Care Audit',
        description:
          'Detailed review of long-term cardiovascular, metabolic, and respiratory care regimens.',
        consultationType: 'SPECIALIST',
        durationMinutes: 45,
        fee: 1100,
      },
    ],
  },
  // 7. Neurology 1
  {
    email: 'dr.neha.kulkarni@demo.manvia.health',
    publicDoctorId: 'DOC-IN-07',
    displayName: 'Dr. Neha Kulkarni',
    bio: 'Consultant Neurologist with 16 years of expertise in migraine, headache medicine, seizure disorders, and peripheral neuropathies. Committed to patient empowerment and neuro-wellness (Fictional Demo Clinician).',
    medicalRegistrationNumber: 'MMC-2008-03912',
    licensingCouncil: 'Maharashtra Medical Council',
    yearsOfExperience: 16,
    clinicName: 'Sahyadri Neuro & Cognitive Center',
    city: 'Pune',
    state: 'Maharashtra',
    clinicalInterests: [
      'Intractable Headache & Migraine',
      'Epilepsy Management',
      'Neuro-rehabilitation',
      'Vertigo & Balance',
    ],
    consultationModes: ['VIDEO', 'IN_PERSON'],
    contactDisplay: 'DEMO-39847261',
    profileImageUrl: '/avatars/doctor-neha-kulkarni.jpg',
    primarySpecialtyCode: 'NEURO',
    secondarySpecialtyCodes: [],
    languageCodes: ['en', 'hi', 'mr'],
    defaultConsultationFee: 2200,
    qualifications: [
      {
        qualification: 'MBBS',
        institution: 'BJ Medical College, Pune',
        fieldOfStudy: 'Medicine',
        graduationYear: 2006,
      },
      {
        qualification: 'MD (Medicine)',
        institution: 'BJ Medical College, Pune',
        fieldOfStudy: 'Internal Medicine',
        graduationYear: 2010,
      },
      {
        qualification: 'DM (Neurology)',
        institution: 'KEM Hospital & Seth GS Medical College',
        fieldOfStudy: 'Clinical Neurology',
        graduationYear: 2014,
      },
    ],
    offers: [
      {
        title: 'Comprehensive Neurological Consultation',
        description:
          'Complete cranial nerve, reflex, sensorimotor examination, and neuro-diagnostic mapping.',
        consultationType: 'INITIAL',
        durationMinutes: 30,
        fee: 2200,
      },
      {
        title: 'Follow-up Neurological Review',
        description:
          'Assessment of anti-epileptic or migraine prophylaxis tolerability and headache diary review.',
        consultationType: 'FOLLOW_UP',
        durationMinutes: 20,
        fee: 1400,
      },
      {
        title: 'Extended Neuro-Cognitive Evaluation',
        description:
          'Comprehensive evaluation for complex neurological symptoms, neuropathy, and vertigo syndromes.',
        consultationType: 'SPECIALIST',
        durationMinutes: 60,
        fee: 3200,
      },
    ],
  },
  // 8. Neurology 2
  {
    email: 'dr.aditya.menon@demo.manvia.health',
    publicDoctorId: 'DOC-IN-08',
    displayName: 'Dr. Aditya Menon',
    bio: 'Academic and clinical Neurologist with 18 years in movement disorders, Parkinsonian syndromes, and cognitive neurology. Integrates modern diagnostics with restorative neuro-care (Fictional Demo Clinician).',
    medicalRegistrationNumber: 'KMC-2006-02741',
    licensingCouncil: 'Karnataka Medical Council',
    yearsOfExperience: 18,
    clinicName: 'Apex Brain & Spine Institute',
    city: 'Bengaluru',
    state: 'Karnataka',
    clinicalInterests: [
      'Movement Disorders',
      'Parkinsonism',
      'Memory & Dementia Evaluation',
      'Sleep-related Neuro-events',
    ],
    consultationModes: ['VIDEO', 'IN_PERSON'],
    contactDisplay: 'DEMO-28736194',
    profileImageUrl: '/avatars/doctor-aditya-menon.jpg',
    primarySpecialtyCode: 'NEURO',
    secondarySpecialtyCodes: [],
    languageCodes: ['en', 'kn', 'ml', 'hi'],
    defaultConsultationFee: 2500,
    qualifications: [
      {
        qualification: 'MBBS',
        institution: 'St. Johns Medical College, Bengaluru',
        fieldOfStudy: 'Medicine',
        graduationYear: 2004,
      },
      {
        qualification: 'MD (General Medicine)',
        institution: 'Kasturba Medical College, Manipal',
        fieldOfStudy: 'Internal Medicine',
        graduationYear: 2008,
      },
      {
        qualification: 'DM (Neurology)',
        institution: 'NIMHANS, Bengaluru',
        fieldOfStudy: 'Neurology',
        graduationYear: 2012,
      },
    ],
    offers: [
      {
        title: 'Specialist Neuro Consultation',
        description:
          'Detailed diagnostic assessment for tremors, movement disorders, gait instability, and cognitive changes.',
        consultationType: 'INITIAL',
        durationMinutes: 30,
        fee: 2500,
      },
      {
        title: 'Neuro Protocol Follow-up',
        description: 'Fine-tuning dopaminergic therapy and functional mobility tracking.',
        consultationType: 'FOLLOW_UP',
        durationMinutes: 20,
        fee: 1600,
      },
      {
        title: 'Comprehensive Movement & Cognitive Assessment',
        description:
          'Exhaustive functional mobility, motor scale, and neuro-cognitive battery examination.',
        consultationType: 'SPECIALIST',
        durationMinutes: 60,
        fee: 3800,
      },
    ],
  },
  // 9. Neurology 3
  {
    email: 'dr.sahana.deshmukh@demo.manvia.health',
    publicDoctorId: 'DOC-IN-09',
    displayName: 'Dr. Sahana Deshmukh',
    bio: 'Neurologist with 13 years of clinical practice focusing on stroke recovery, neuromuscular conditions, and chronic neurovascular health. Dedicated to compassionate outpatient neurology (Fictional Demo Clinician).',
    medicalRegistrationNumber: 'MMC-2011-07364',
    licensingCouncil: 'Maharashtra Medical Council',
    yearsOfExperience: 13,
    clinicName: 'Central Neurosciences Clinic',
    city: 'Nagpur',
    state: 'Maharashtra',
    clinicalInterests: [
      'Post-Stroke Recovery',
      'Neuropathy & Nerve Conduction',
      'Myasthenia & Muscle Diseases',
      'Neuro-vascular Health',
    ],
    consultationModes: ['VIDEO', 'IN_PERSON', 'AUDIO'],
    contactDisplay: 'DEMO-17625398',
    profileImageUrl: '/avatars/doctor-sahana-deshmukh.jpg',
    primarySpecialtyCode: 'NEURO',
    secondarySpecialtyCodes: [],
    languageCodes: ['en', 'hi', 'mr'],
    defaultConsultationFee: 1800,
    qualifications: [
      {
        qualification: 'MBBS',
        institution: 'Government Medical College, Nagpur',
        fieldOfStudy: 'Clinical Medicine',
        graduationYear: 2009,
      },
      {
        qualification: 'DNB (Neurology)',
        institution: 'Bombay Hospital & Medical Research Centre',
        fieldOfStudy: 'Neurological Sciences',
        graduationYear: 2015,
      },
    ],
    offers: [
      {
        title: 'Detailed Neurological Evaluation',
        description:
          'Evaluation of nerve, muscle, and neurovascular complaints with objective neurological tests.',
        consultationType: 'INITIAL',
        durationMinutes: 30,
        fee: 1800,
      },
      {
        title: 'Follow-up Neuromuscular Assessment',
        description:
          'Progress appraisal for neuropathy, spasticity management, and rehab monitoring.',
        consultationType: 'FOLLOW_UP',
        durationMinutes: 20,
        fee: 1200,
      },
      {
        title: 'Comprehensive Neurovascular Care Plan',
        description: 'Multi-system stroke prevention and long-term neurovascular health blueprint.',
        consultationType: 'SPECIALIST',
        durationMinutes: 45,
        fee: 2600,
      },
    ],
  },
  // 10. Coordinated Care Physician
  {
    email: 'dr.meera.krishnan@demo.manvia.health',
    publicDoctorId: 'DOC-IN-10',
    displayName: 'Dr. Meera Krishnan',
    bio: 'Lead Coordinated Care Physician orchestrating holistic, multidisciplinary patient wellness plans across psychiatry, neurology, and internal medicine. 11 years pioneering integrative patient advocacy (Fictional Demo Clinician).',
    medicalRegistrationNumber: 'KMC-2013-05923',
    licensingCouncil: 'Karnataka Medical Council',
    yearsOfExperience: 11,
    clinicName: 'Harmony Coordinated Health Clinic',
    city: 'Bengaluru',
    state: 'Karnataka',
    clinicalInterests: [
      'Complex Multi-Morbid Care',
      'Psych-Neuro Care Coordination',
      'Holistic Wellness Mapping',
      'Integrative Health Navigation',
    ],
    consultationModes: ['VIDEO', 'IN_PERSON', 'AUDIO'],
    contactDisplay: 'DEMO-96541827',
    profileImageUrl: '/avatars/doctor-meera-krishnan.jpg',
    primarySpecialtyCode: 'COORDINATED_CARE',
    secondarySpecialtyCodes: ['INTERNAL_MED', 'PSYCHIATRY'],
    languageCodes: ['en', 'hi', 'kn', 'ta'],
    defaultConsultationFee: 900,
    qualifications: [
      {
        qualification: 'MBBS',
        institution: 'MS Ramaiah Medical College, Bengaluru',
        fieldOfStudy: 'Medicine',
        graduationYear: 2011,
      },
      {
        qualification: 'MD (Internal Medicine)',
        institution: 'Madras Medical College',
        fieldOfStudy: 'Internal Medicine',
        graduationYear: 2015,
      },
      {
        qualification: 'Fellowship in Integrative Healthcare',
        institution: 'Academy of Integrative Health & Medicine',
        fieldOfStudy: 'Care Coordination',
        graduationYear: 2018,
      },
    ],
    offers: [
      {
        title: 'Coordinated Care Initial Intake',
        description:
          'Cross-specialty holistic medical intake mapping physical, mental, and lifestyle parameters.',
        consultationType: 'INITIAL',
        durationMinutes: 30,
        fee: 900,
      },
      {
        title: 'Interdisciplinary Follow-up & Review',
        description:
          'Review of multispecialty treatment adherence, biomarker improvements, and care alignment.',
        consultationType: 'FOLLOW_UP',
        durationMinutes: 20,
        fee: 600,
      },
      {
        title: 'Comprehensive Multi-Specialty Care Blueprint',
        description:
          'In-depth synchronized wellness masterplan harmonizing mental, neurological, and physical care.',
        consultationType: 'SPECIALIST',
        durationMinutes: 50,
        fee: 1400,
      },
    ],
  },
];

async function seed() {
  console.log('--- Seeding Exactly 10 Fictional Indian Demo Doctors ---');

  const defaultPassword = 'DemoDoc#2026!';
  const passwordHash = await argon2.hash(defaultPassword, { type: argon2.argon2id });

  // 1. Ensure specialties exist
  const specialties = await prisma.specialty.findMany();
  const specialtyMap = new Map<string, string>();
  for (const s of specialties) {
    specialtyMap.set(s.code, s.id);
  }

  // 2. Ensure languages exist
  const languages = await prisma.language.findMany();
  const languageMap = new Map<string, string>();
  for (const l of languages) {
    languageMap.set(l.code, l.id);
  }

  const seededDoctors: Array<{ name: string; publicId: string; specialty: string }> = [];

  for (const docConfig of DEMO_DOCTORS) {
    console.log(`Processing: ${docConfig.displayName} (${docConfig.publicDoctorId})...`);

    // 1. Upsert User
    const user = await prisma.user.upsert({
      where: { email: docConfig.email },
      create: {
        email: docConfig.email,
        status: 'ACTIVE',
        roles: ['DOCTOR'],
        emailVerified: true,
      },
      update: {
        status: 'ACTIVE',
        roles: ['DOCTOR'],
      },
    });

    await prisma.passwordCredential.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        passwordHash,
      },
      update: {
        passwordHash,
      },
    });

    // 2. Upsert DoctorProfile
    const profile = await prisma.doctorProfile.upsert({
      where: { publicDoctorId: docConfig.publicDoctorId },
      create: {
        userId: user.id,
        publicDoctorId: docConfig.publicDoctorId,
        displayName: docConfig.displayName,
        bio: docConfig.bio,
        medicalRegistrationNumber: docConfig.medicalRegistrationNumber,
        licensingCouncil: docConfig.licensingCouncil,
        yearsOfExperience: docConfig.yearsOfExperience,
        verificationStatus: VerificationStatus.VERIFIED,
        defaultConsultationFee: docConfig.defaultConsultationFee,
        currency: 'INR',
        clinicName: docConfig.clinicName,
        city: docConfig.city,
        state: docConfig.state,
        clinicalInterests: docConfig.clinicalInterests,
        consultationModes: docConfig.consultationModes,
        contactDisplay: docConfig.contactDisplay,
        profileImageUrl: docConfig.profileImageUrl,
        isDemo: true,
        verifiedAt: new Date(),
      },
      update: {
        userId: user.id,
        displayName: docConfig.displayName,
        bio: docConfig.bio,
        medicalRegistrationNumber: docConfig.medicalRegistrationNumber,
        licensingCouncil: docConfig.licensingCouncil,
        yearsOfExperience: docConfig.yearsOfExperience,
        verificationStatus: VerificationStatus.VERIFIED,
        defaultConsultationFee: docConfig.defaultConsultationFee,
        currency: 'INR',
        clinicName: docConfig.clinicName,
        city: docConfig.city,
        state: docConfig.state,
        clinicalInterests: docConfig.clinicalInterests,
        consultationModes: docConfig.consultationModes,
        contactDisplay: docConfig.contactDisplay,
        profileImageUrl: docConfig.profileImageUrl,
        isDemo: true,
        verifiedAt: new Date(),
      },
    });

    // 3. Specialties
    // Remove old specialties for this doctor to keep idempotent
    await prisma.doctorSpecialty.deleteMany({ where: { doctorId: profile.id } });

    // Insert primary specialty
    const primarySpecId = specialtyMap.get(docConfig.primarySpecialtyCode);
    if (primarySpecId) {
      await prisma.doctorSpecialty.create({
        data: {
          doctorId: profile.id,
          specialtyId: primarySpecId,
          isPrimary: true,
        },
      });
    }

    // Insert secondary specialties
    for (const secCode of docConfig.secondarySpecialtyCodes) {
      const secId = specialtyMap.get(secCode);
      if (secId && secId !== primarySpecId) {
        await prisma.doctorSpecialty.create({
          data: {
            doctorId: profile.id,
            specialtyId: secId,
            isPrimary: false,
          },
        });
      }
    }

    // 4. Languages
    await prisma.doctorLanguage.deleteMany({ where: { doctorId: profile.id } });
    for (const langCode of docConfig.languageCodes) {
      const langId = languageMap.get(langCode);
      if (langId) {
        await prisma.doctorLanguage.create({
          data: {
            doctorId: profile.id,
            languageId: langId,
          },
        });
      }
    }

    // 5. Qualifications
    await prisma.doctorQualification.deleteMany({ where: { doctorId: profile.id } });
    for (const q of docConfig.qualifications) {
      await prisma.doctorQualification.create({
        data: {
          doctorId: profile.id,
          qualification: q.qualification,
          institution: q.institution,
          fieldOfStudy: q.fieldOfStudy,
          graduationYear: q.graduationYear,
        },
      });
    }

    // 6. Consultation Offers
    await prisma.consultationOffer.deleteMany({ where: { doctorId: profile.id } });
    for (const offer of docConfig.offers) {
      await prisma.consultationOffer.create({
        data: {
          doctorId: profile.id,
          title: offer.title,
          description: offer.description,
          consultationType: offer.consultationType,
          durationMinutes: offer.durationMinutes,
          fee: offer.fee,
          currency: 'INR',
          status: OfferStatus.ACTIVE,
        },
      });
    }

    // 7. Weekly Working Availability (Mon-Sat, 09:00-13:00 and 14:00-18:00, Asia/Kolkata)
    await prisma.doctorAvailability.deleteMany({ where: { doctorId: profile.id } });
    const workingDays: DayOfWeek[] = [
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY,
      DayOfWeek.SATURDAY,
    ];

    for (const day of workingDays) {
      // Morning window
      await prisma.doctorAvailability.create({
        data: {
          doctorId: profile.id,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '13:00',
          timezone: 'Asia/Kolkata',
          isActive: true,
        },
      });
      // Afternoon window
      await prisma.doctorAvailability.create({
        data: {
          doctorId: profile.id,
          dayOfWeek: day,
          startTime: '14:00',
          endTime: '18:00',
          timezone: 'Asia/Kolkata',
          isActive: true,
        },
      });
    }

    seededDoctors.push({
      name: docConfig.displayName,
      publicId: docConfig.publicDoctorId,
      specialty: docConfig.primarySpecialtyCode,
    });
  }

  console.log(`\n=== Successfully seeded ${seededDoctors.length} Indian Demo Doctors ===`);
  const distribution = seededDoctors.reduce(
    (acc, d) => {
      acc[d.specialty] = (acc[d.specialty] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  console.log('Specialty distribution:', JSON.stringify(distribution, null, 2));

  // Verify exactly 10 demo doctors exist in database
  const count = await prisma.doctorProfile.count({ where: { isDemo: true } });
  console.log(`Database count of demo doctors (isDemo=true): ${count}`);
  if (count !== 10) {
    throw new Error(`Expected exactly 10 demo doctors, but found ${count}`);
  }
}

seed()
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
