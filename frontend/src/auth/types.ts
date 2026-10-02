/**
 * MANVIA Authoritative Auth Types & DTOs
 * Mirrored directly from MANVIA Backend (NestJS + Fastify + Prisma).
 */

export type Role = "PATIENT" | "DOCTOR" | "ADMIN";

export type UserStatus =
  "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING_VERIFICATION";

export interface UserResponseDto {
  id: string;
  email: string;
  phone: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  status: UserStatus;
  roles: Role[];
  createdAt: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  phone?: string;
  role?: Role;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface AuthResponseDto {
  user: UserResponseDto;
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface TokenRefreshResponseDto {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export type AuthStatus =
  | "INITIALIZING"
  | "AUTHENTICATING"
  | "AUTHENTICATED"
  | "UNAUTHENTICATED"
  | "SESSION_EXPIRED";

export interface AuthSessionTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface AuthState {
  status: AuthStatus;
  user: UserResponseDto | null;
  tokens: AuthSessionTokens | null;
  error: string | null;
}

export interface AuthContextValue extends AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  activeRole: Role | null;
  login: (dto: LoginDto) => Promise<AuthResponseDto>;
  register: (dto: RegisterDto) => Promise<AuthResponseDto>;
  logout: () => Promise<void>;
  hasRole: (roles: Role | Role[]) => boolean;
  refreshSession: () => Promise<boolean>;
  clearError: () => void;
}
