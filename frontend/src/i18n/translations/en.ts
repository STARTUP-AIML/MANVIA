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
    devHealth: "Dev Health",
    login: "Sign In",
    register: "Create Account",
    logout: "Sign Out",
  },
  auth: {
    loginTitle: "Sign in to MANVIA",
    loginSubtitle: "Phase 1 authentication will connect here.",
    registerTitle: "Join MANVIA",
    registerSubtitle: "Phase 1 account creation will connect here.",
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
      "Foundation ready for wellness, appointments, and medical history in Phase 2+.",
    doctorTitle: "Doctor Clinical Workspace",
    doctorSubtitle:
      "Foundation ready for schedule, consultations, and patients in Phase 7+.",
    adminTitle: "System Administration Console",
    adminSubtitle:
      "Foundation ready for platform governance, logs, and billing in Phase 12+.",
  },
  devHealth: {
    title: "Developer System Diagnostics",
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
