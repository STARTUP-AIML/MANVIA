import { HealthcareNodeData } from "./HealthcareNode";

export interface JourneyStep {
  id: string;
  index: number;
  title: string;
  subtitle: string;
  icon: string;
  details: string;
  position: [number, number, number];
}

export const ECOSYSTEM_NODES: HealthcareNodeData[] = [
  {
    id: "ai-companion",
    label: "AI Companion",
    category: "Conversational Care",
    icon: "✦",
    description: "24/7 empathetic conversational companion, symptom triage & voice guidance",
    position: [2.3, 1.4, 0.3],
    color: "#0E7C73",
    glowColor: "#2DD4BF",
    route: "/app/ai",
    stats: "24/7 Active • Voice & 3D",
  },
  {
    id: "wellness",
    label: "Wellness Hub",
    category: "Proactive Health",
    icon: "🌱",
    description: "Daily mood, sleep, stress & longitudinal lifestyle biomarker tracking",
    position: [-2.2, 1.5, -0.3],
    color: "#059669",
    glowColor: "#34D399",
    route: "/app/wellness",
    stats: "Daily Check-ins • Lifestyle Trends",
  },
  {
    id: "doctors",
    label: "Doctor Discovery",
    category: "Clinical Care",
    icon: "🩺",
    description: "Verified Indian specialists across psychiatry, neurology & general practice",
    position: [2.8, -0.3, -0.2],
    color: "#0284C7",
    glowColor: "#38BDF8",
    route: "/app/doctors",
    stats: "10 Demo Clinicians • INR Pricing",
  },
  {
    id: "appointments",
    label: "Appointments",
    category: "Consultations",
    icon: "📅",
    description: "Real-time slot reservation, Asia/Kolkata schedules & visit management",
    position: [1.8, -1.9, 0.4],
    color: "#6366F1",
    glowColor: "#818CF8",
    route: "/app/appointments",
    stats: "Instant Slot Booking • Asia/Kolkata",
  },
  {
    id: "health-records",
    label: "Health Records",
    category: "Clinical Documents",
    icon: "📁",
    description: "Secure, consent-governed clinical documents, prescriptions & lab reports",
    position: [-1.4, -2.1, -0.3],
    color: "#0F766E",
    glowColor: "#5EEAD4",
    route: "/app/health-records",
    stats: "Consent-Governed • Encrypted",
  },
  {
    id: "health-timeline",
    label: "Health Timeline",
    category: "Longitudinal History",
    icon: "⏱",
    description: "Unified chronological care milestone tracking and longitudinal insights",
    position: [-2.8, -0.4, 0.2],
    color: "#D97706",
    glowColor: "#F59E0B",
    route: "/app/health-timeline",
    stats: "Longitudinal Milestones • Care History",
  },
  {
    id: "connected-care",
    label: "Connected Care",
    category: "Care Continuity",
    icon: "🤝",
    description: "Coordinated multidisciplinary care connecting patients, clinicians & loved ones",
    position: [0.0, 2.4, 0.5],
    color: "#E11D48",
    glowColor: "#FB7185",
    route: "/app",
    stats: "Multidisciplinary • Patient-First",
  },
];

export const JOURNEY_STEPS: JourneyStep[] = [
  {
    id: "discover",
    index: 1,
    title: "Discover",
    subtitle: "Identify Needs",
    icon: "🔍",
    details:
      "Recognize symptom changes, lifestyle signals, and find the right care track effortlessly.",
    position: [-4.0, -0.6, 0],
  },
  {
    id: "understand",
    index: 2,
    title: "Understand",
    subtitle: "AI Guidance",
    icon: "✦",
    details:
      "24/7 conversational triage clarifies symptoms and organizes your questions before appointments.",
    position: [-2.0, 0.6, 0],
  },
  {
    id: "consult",
    index: 3,
    title: "Consult",
    subtitle: "Expert Clinicians",
    icon: "🩺",
    details:
      "Seamlessly book verified specialists with pre-consultation questionnaires completed in advance.",
    position: [0.0, -0.6, 0],
  },
  {
    id: "track",
    index: 4,
    title: "Track",
    subtitle: "Unified Timeline",
    icon: "▥",
    details:
      "All visits, lab results, prescriptions, and wellness check-ins captured in one auditable record.",
    position: [2.0, 0.6, 0],
  },
  {
    id: "improve",
    index: 5,
    title: "Improve",
    subtitle: "Proactive Health",
    icon: "🌱",
    details:
      "Longitudinal trends and personalized wellness habits turn episodic care into lasting vitality.",
    position: [4.0, -0.6, 0],
  },
];
