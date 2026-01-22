import crypto from "crypto";
import prisma from "@/lib/prisma";
import { logAudit } from "@/lib/audit/logger";

export interface CreateInvitationOptions {
  email: string;
  name?: string;
  businessId?: string;
  teamId?: string;
  roleIds?: string[];
  invitedById: string;
  invitedByName?: string;
  expiresInHours?: number;
}

export interface AcceptInvitationData {
  name: string;
  // In OAuth flow, user is created via provider
  // This is used for additional profile setup
}

/**
 * Generate a cryptographically secure invitation token
 */
export function generateInviteToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Create and send a user invitation
 */
export async function createInvitation(options: CreateInvitationOptions) {
  const {
    email,
    name,
    businessId,
    teamId,
    roleIds = [],
    invitedById,
    invitedByName,
    expiresInHours = 72, // 3 days default
  } = options;

  // Check if email already exists as a user
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser && existingUser.status !== "INACTIVE") {
    throw new Error("A user with this email already exists");
  }

  // Check if there's already a pending invitation
  const existingInvitation = await prisma.userInvitation.findFirst({
    where: {
      email,
      status: "pending",
      expiresAt: { gt: new Date() },
    },
  });

  if (existingInvitation) {
    throw new Error("A pending invitation already exists for this email");
  }

  // Generate token and expiry
  const token = generateInviteToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiresInHours);

  // Create invitation
  const invitation = await prisma.userInvitation.create({
    data: {
      email,
      name,
      token,
      expiresAt,
      businessId,
      teamId,
      roleIds,
      invitedById,
      invitedByName,
      status: "pending",
    },
  });

  // Log the invitation
  await logAudit(
    {
      action: "CREATE",
      entity: "user_invitation",
      entityId: invitation.id,
      newValues: { email, businessId, teamId },
      metadata: { type: "invitation_sent" },
    },
    { userId: invitedById }
  );

  // TODO: Send invitation email via job queue
  // await createJob("user_invite", { invitationId: invitation.id });

  return invitation;
}

/**
 * Validate an invitation token
 */
export async function validateInviteToken(token: string) {
  const invitation = await prisma.userInvitation.findUnique({
    where: { token },
    include: {
      business: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!invitation) {
    return { valid: false, error: "Invalid invitation token" };
  }

  if (invitation.status !== "pending") {
    return { valid: false, error: `Invitation has been ${invitation.status}` };
  }

  if (invitation.expiresAt < new Date()) {
    // Mark as expired
    await prisma.userInvitation.update({
      where: { id: invitation.id },
      data: { status: "expired" },
    });
    return { valid: false, error: "Invitation has expired" };
  }

  return { valid: true, invitation };
}

/**
 * Accept an invitation and create/activate user account
 */
export async function acceptInvitation(
  token: string,
  userData: AcceptInvitationData,
  acceptingUserId?: string // If user already exists via OAuth
) {
  const validation = await validateInviteToken(token);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const invitation = validation.invitation!;

  // Start transaction
  const result = await prisma.$transaction(async (tx) => {
    let user;

    if (acceptingUserId) {
      // User already exists (created via OAuth), update their profile
      user = await tx.user.update({
        where: { id: acceptingUserId },
        data: {
          name: userData.name || invitation.name,
          status: "ACTIVE",
          inviteToken: null,
          inviteTokenExpiry: null,
        },
      });
    } else {
      // Check if user exists by email but is inactive
      const existingUser = await tx.user.findUnique({
        where: { email: invitation.email },
      });

      if (existingUser) {
        // Reactivate existing user
        user = await tx.user.update({
          where: { id: existingUser.id },
          data: {
            name: userData.name || invitation.name || existingUser.name,
            status: "ACTIVE",
            deletedAt: null,
          },
        });
      } else {
        // Create new user (they will complete auth via OAuth)
        user = await tx.user.create({
          data: {
            email: invitation.email,
            name: userData.name || invitation.name,
            status: "PENDING_INVITE", // Will be activated after OAuth
          },
        });
      }
    }

    // Add to business if specified
    if (invitation.businessId) {
      await tx.userBusiness.upsert({
        where: {
          userId_businessId: {
            userId: user.id,
            businessId: invitation.businessId,
          },
        },
        create: {
          userId: user.id,
          businessId: invitation.businessId,
          isDefault: true,
        },
        update: {},
      });

      // Set current business
      await tx.user.update({
        where: { id: user.id },
        data: { currentBusinessId: invitation.businessId },
      });
    }

    // Add to team if specified
    if (invitation.teamId) {
      await tx.teamMember.upsert({
        where: {
          teamId_userId: {
            teamId: invitation.teamId,
            userId: user.id,
          },
        },
        create: {
          teamId: invitation.teamId,
          userId: user.id,
          role: "member",
          addedById: invitation.invitedById,
        },
        update: {},
      });
    }

    // Assign roles
    if (invitation.roleIds.length > 0) {
      for (const roleId of invitation.roleIds) {
        await tx.userRoleAssignment.upsert({
          where: {
            userId_roleId_teamId: {
              userId: user.id,
              roleId,
              teamId: invitation.teamId || "",
            },
          },
          create: {
            userId: user.id,
            roleId,
            teamId: invitation.teamId,
            assignedById: invitation.invitedById,
          },
          update: {},
        });
      }
    }

    // Mark invitation as accepted
    await tx.userInvitation.update({
      where: { id: invitation.id },
      data: {
        status: "accepted",
        acceptedAt: new Date(),
        acceptedUserId: user.id,
      },
    });

    return user;
  });

  // Log acceptance
  await logAudit(
    {
      action: "UPDATE",
      entity: "user_invitation",
      entityId: invitation.id,
      metadata: { type: "invitation_accepted" },
    },
    { userId: result.id }
  );

  return result;
}

/**
 * Resend an invitation with a new token
 */
export async function resendInvitation(invitationId: string, resendById: string) {
  const invitation = await prisma.userInvitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation) {
    throw new Error("Invitation not found");
  }

  if (invitation.status !== "pending" && invitation.status !== "expired") {
    throw new Error("Cannot resend this invitation");
  }

  // Generate new token and expiry
  const newToken = generateInviteToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 72);

  const updated = await prisma.userInvitation.update({
    where: { id: invitationId },
    data: {
      token: newToken,
      expiresAt,
      status: "pending",
    },
  });

  // Log resend
  await logAudit(
    {
      action: "UPDATE",
      entity: "user_invitation",
      entityId: invitationId,
      metadata: { type: "invitation_resent" },
    },
    { userId: resendById }
  );

  // TODO: Send invitation email
  // await createJob("user_invite", { invitationId: updated.id });

  return updated;
}

/**
 * Revoke an invitation
 */
export async function revokeInvitation(invitationId: string, revokedById: string) {
  const invitation = await prisma.userInvitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation) {
    throw new Error("Invitation not found");
  }

  if (invitation.status !== "pending") {
    throw new Error("Can only revoke pending invitations");
  }

  const updated = await prisma.userInvitation.update({
    where: { id: invitationId },
    data: { status: "revoked" },
  });

  // Log revocation
  await logAudit(
    {
      action: "DELETE",
      entity: "user_invitation",
      entityId: invitationId,
      metadata: { type: "invitation_revoked" },
    },
    { userId: revokedById }
  );

  return updated;
}

/**
 * List pending invitations
 */
export async function listInvitations(businessId?: string) {
  return prisma.userInvitation.findMany({
    where: {
      ...(businessId && { businessId }),
      status: "pending",
    },
    orderBy: { createdAt: "desc" },
    include: {
      business: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export default {
  generateInviteToken,
  createInvitation,
  validateInviteToken,
  acceptInvitation,
  resendInvitation,
  revokeInvitation,
  listInvitations,
};
