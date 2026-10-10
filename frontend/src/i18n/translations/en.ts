/**
 * MANVIA English (Default) Translation Resource
 */

export const en = {
  common: {
    appName: "MANVIA",
    tagline: "Care that feels human.",
    loading: "Loading...",
    retry: "Try again",
    cancel: "Cancel",
    save: "Save",
    close: "Close",
    back: "Back",
    submit: "Submit",
    actions: "Actions",
  },
  nav: {
    home: "Home",
    patientPortal: "Patient Portal",
    doctorPortal: "Doctor Portal",
    adminPortal: "Admin Console",
    platformHealth: "Platform Health",
    devHealth: "Platform Health",
    login: "Sign In",
    register: "Create Account",
    logout: "Sign Out",
  },
  auth: {
    loginTitle: "Sign in to MANVIA",
    loginSubtitle: "Sign in with your verified credentials to access your care workspace.",
    registerTitle: "Join MANVIA",
    registerSubtitle: "Create your secure healthcare account.",
    emailLabel: "Email address",
    passwordLabel: "Password",
    protectedPrompt: "Authentication required. This area is protected.",
  },
  feedback: {
    emptyTitle: "No records found",
    emptyDescription: "There is nothing to display here yet.",
    errorTitle: "Something went wrong",
    errorDescription:
      "An unexpected issue occurred while processing your request.",
    unauthorizedTitle: "Access Required",
    unauthorizedDescription:
      "Please sign in to access this healthcare workspace.",
    forbiddenTitle: "Access Restricted",
    forbiddenDescription: "You do not have permission to view this section.",
    networkErrorTitle: "Connection Interrupted",
    networkErrorDescription:
      "Unable to connect to MANVIA servers. Please verify your network.",
    successTitle: "Success",
    successDescription: "Operation completed successfully.",
  },
  shells: {
    patientTitle: "Patient Care Workspace",
    patientSubtitle:
      "Your unified care journey, wellness tracking, and medical history.",
    doctorTitle: "Doctor Clinical Workspace",
    doctorSubtitle:
      "Clinical practice schedule, patient consultations, and credential management.",
    adminTitle: "System Administration Console",
    adminSubtitle:
      "Platform governance, practitioner vetting, audit logs, and system oversight.",
  },
  platformHealth: {
    title: "Platform Health Diagnostics",
    description: "Verify frontend status and backend gateway connectivity.",
    frontendTitle: "Frontend Client",
    backendTitle: "Backend Gateway",
    apiTitle: "Backend API Gateway",
    swaggerTitle: "OpenAPI Documentation",
    pingBackend: "Check Backend Status",
    checking: "Checking...",
    online: "ONLINE",
    offline: "OFFLINE / UNREACHABLE",
    unknown: "NOT CHECKED",
  },
  devHealth: {
    title: "Platform Health Diagnostics",
    description: "Verify frontend status and backend gateway connectivity.",
    frontendTitle: "Frontend Client",
    backendTitle: "Backend Gateway",
    apiTitle: "Backend API Gateway",
    swaggerTitle: "OpenAPI Documentation",
    pingBackend: "Check Backend Status",
    checking: "Checking...",
    online: "ONLINE",
    offline: "OFFLINE / UNREACHABLE",
    unknown: "NOT CHECKED",
  },
} as const;

export type TranslationDictionary = typeof en;
export type TranslationKey = string;
