import { User, UserRole } from "@/types";

export type GuardDecisionReason =
  | "unauthenticated"
  | "unauthorized"
  | "inactive";

export type GuardDecision =
  | { status: "allow" }
  | { status: "defer" }
  | {
      status: "redirect";
      redirectTo: string;
      reason: GuardDecisionReason;
    };

export interface RouteGuardPolicy {
  allowedRoles: UserRole[];
  unauthorizedRedirectTo: string;
  inactiveRedirectTo: string;
  requireActive?: boolean;
}

export const ADMIN_ROUTE_POLICY: RouteGuardPolicy = {
  allowedRoles: [UserRole.ADMIN],
  unauthorizedRedirectTo: "/403",
  inactiveRedirectTo: "/",
  requireActive: true,
};

export const RESEARCHER_ROUTE_POLICY: RouteGuardPolicy = {
  allowedRoles: [UserRole.RESEARCHER, UserRole.ADMIN],
  unauthorizedRedirectTo: "/403",
  inactiveRedirectTo: "/",
  requireActive: true,
};

export function buildLoginRedirectPath(pathname: string): string {
  return `/login?redirect=${encodeURIComponent(pathname)}`;
}

export function isSafeInternalPath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}

export function resolveSafeRedirectTarget(
  currentPathname: string,
  candidateTarget: string
): string {
  if (!isSafeInternalPath(candidateTarget)) return "/";
  if (candidateTarget === currentPathname) return "/";
  return candidateTarget;
}

export function evaluateGuardAccess(
  user: User | null,
  pathname: string,
  policy: RouteGuardPolicy,
  options?: { isAuthLoading?: boolean }
): GuardDecision {
  if (options?.isAuthLoading) {
    return { status: "defer" };
  }

  if (!user) {
    return {
      status: "redirect",
      redirectTo: buildLoginRedirectPath(pathname),
      reason: "unauthenticated",
    };
  }

  if (policy.requireActive !== false && !user.isActive) {
    return {
      status: "redirect",
      redirectTo: resolveSafeRedirectTarget(pathname, policy.inactiveRedirectTo),
      reason: "inactive",
    };
  }

  if (!policy.allowedRoles.includes(user.role)) {
    return {
      status: "redirect",
      redirectTo: resolveSafeRedirectTarget(
        pathname,
        policy.unauthorizedRedirectTo
      ),
      reason: "unauthorized",
    };
  }

  return { status: "allow" };
}

export function isResearcherPendingApproval(user: User | null): boolean {
  return Boolean(user?.role === UserRole.RESEARCHER && !user?.isActive);
}

export function getDefaultPostLoginPath(user: User): string {
  switch (user.role) {
    case UserRole.ADMIN:
      return "/admin";
    case UserRole.RESEARCHER:
      return "/researcher";
    case UserRole.EXPERT:
      return "/moderation";
    default:
      return "/";
  }
}

export function resolvePostLoginPath(
  user: User,
  requestedRedirect: string | null
): string {
  if (requestedRedirect && isSafeInternalPath(requestedRedirect)) {
    return requestedRedirect;
  }
  return getDefaultPostLoginPath(user);
}

export function logGuardDecision(
  guardName: "AdminGuard" | "ResearcherGuard",
  pathname: string,
  decision: GuardDecision
): void {
  if (!import.meta.env.DEV) return;
  const detail =
    decision.status === "redirect"
      ? { reason: decision.reason, redirectTo: decision.redirectTo }
      : {};
  console.debug(`[route-guard] ${guardName}`, {
    pathname,
    status: decision.status,
    ...detail,
  });
}
