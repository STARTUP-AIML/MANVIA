/**
 * MANVIA Protected Route Architecture
 * Serves as the security navigation guard interface.
 * Connects authoritative session state, verifies roles, and redirects to login.
 */

import React, { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { Role } from "@/auth/types";
import { useAuth } from "@/auth/AuthContext";
import { ForbiddenState } from "@/components/feedback/ForbiddenState";
import { LoadingState } from "@/components/feedback/LoadingState";

export interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: Role[];
  redirectPath?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  redirectPath = "/login",
}) => {
  const location = useLocation();
  const { status, isAuthenticated, user, hasRole } = useAuth();

  // If session is still bootstrapping, render accessible loading indicator
  if (status === "INITIALIZING" || status === "AUTHENTICATING") {
    return <LoadingState message="Verifying authentication session..." />;
  }

  // Not authenticated -> redirect to login preserving intended target route
  if (!isAuthenticated || !user) {
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  // Role verification check
  if (allowedRoles && allowedRoles.length > 0) {
    const isAuthorized = allowedRoles.some((role) => hasRole(role));
    if (!isAuthorized) {
      return (
        <ForbiddenState
          title="Access Restricted"
          description="Your current role does not have authorization to view this section."
        />
      );
    }
  }

  return <>{children}</>;
};
