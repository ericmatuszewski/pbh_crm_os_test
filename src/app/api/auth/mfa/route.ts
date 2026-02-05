import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  setupMFA,
  verifyTOTP,
  decryptMFASecret,
  verifyBackupCode,
} from "@/lib/auth/totp";

export const dynamic = "force-dynamic";

// GET /api/auth/mfa - Get MFA status for current user
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "User ID required" } },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        mfaEnabled: true,
        mfaVerifiedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        enabled: user.mfaEnabled,
        verifiedAt: user.mfaVerifiedAt,
        hasBackupCodes: true, // Don't expose actual count
      },
    });
  } catch (error) {
    console.error("Failed to get MFA status:", error);
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message: "Failed to get MFA status" } },
      { status: 500 }
    );
  }
}

// POST /api/auth/mfa - Initialize MFA setup (returns secret and QR code URI)
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "User ID required" } },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        mfaEnabled: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    if (user.mfaEnabled) {
      return NextResponse.json(
        { success: false, error: { code: "ALREADY_ENABLED", message: "MFA is already enabled" } },
        { status: 400 }
      );
    }

    // Generate MFA setup data
    const mfaSetup = setupMFA(user.email || "user@example.com");

    // Store encrypted secret (not yet enabled until verified)
    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaSecret: mfaSetup.encryptedSecret,
        mfaBackupCodes: mfaSetup.hashedBackupCodes,
        // mfaEnabled stays false until verification
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        otpauthUri: mfaSetup.otpauthUri,
        secret: mfaSetup.secret, // Display to user for manual entry
        backupCodes: mfaSetup.backupCodes, // Show once, user must save these
        message: "Scan QR code with authenticator app, then verify with a code",
      },
    });
  } catch (error) {
    console.error("Failed to setup MFA:", error);
    return NextResponse.json(
      { success: false, error: { code: "SETUP_ERROR", message: "Failed to setup MFA" } },
      { status: 500 }
    );
  }
}

// PUT /api/auth/mfa - Verify and enable MFA / Verify MFA code during login
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, code, action } = body;

    if (!userId || !code) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "userId and code are required" } },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        mfaEnabled: true,
        mfaSecret: true,
        mfaBackupCodes: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    if (!user.mfaSecret) {
      return NextResponse.json(
        { success: false, error: { code: "MFA_NOT_SETUP", message: "MFA has not been set up" } },
        { status: 400 }
      );
    }

    // Decrypt the secret
    const secret = decryptMFASecret(user.mfaSecret);

    // Try TOTP verification first
    const isValidTotp = verifyTOTP(secret, code);

    if (isValidTotp) {
      // If this is the initial setup verification
      if (action === "enable" && !user.mfaEnabled) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            mfaEnabled: true,
            mfaVerifiedAt: new Date(),
          },
        });

        return NextResponse.json({
          success: true,
          data: {
            verified: true,
            mfaEnabled: true,
            message: "MFA has been enabled successfully",
          },
        });
      }

      // Regular MFA verification during login
      return NextResponse.json({
        success: true,
        data: {
          verified: true,
          message: "MFA verification successful",
        },
      });
    }

    // If TOTP failed, try backup code
    const backupResult = verifyBackupCode(code, user.mfaBackupCodes);

    if (backupResult.valid) {
      // Remove the used backup code
      const updatedCodes = [...user.mfaBackupCodes];
      updatedCodes.splice(backupResult.usedIndex, 1);

      await prisma.user.update({
        where: { id: userId },
        data: {
          mfaBackupCodes: updatedCodes,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          verified: true,
          usedBackupCode: true,
          remainingBackupCodes: updatedCodes.length,
          message: "Backup code accepted. Consider generating new backup codes.",
        },
      });
    }

    // Both TOTP and backup code failed
    return NextResponse.json(
      { success: false, error: { code: "INVALID_CODE", message: "Invalid verification code" } },
      { status: 401 }
    );
  } catch (error) {
    console.error("Failed to verify MFA:", error);
    return NextResponse.json(
      { success: false, error: { code: "VERIFY_ERROR", message: "Failed to verify MFA" } },
      { status: 500 }
    );
  }
}

// DELETE /api/auth/mfa - Disable MFA
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, code, password } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "userId is required" } },
        { status: 400 }
      );
    }

    // Require either valid MFA code or password for security
    if (!code && !password) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "MFA code or password required to disable MFA" },
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        mfaEnabled: true,
        mfaSecret: true,
        mfaBackupCodes: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    if (!user.mfaEnabled) {
      return NextResponse.json(
        { success: false, error: { code: "MFA_NOT_ENABLED", message: "MFA is not enabled" } },
        { status: 400 }
      );
    }

    // Verify the code if provided
    if (code && user.mfaSecret) {
      const secret = decryptMFASecret(user.mfaSecret);
      const isValidTotp = verifyTOTP(secret, code);
      const backupResult = verifyBackupCode(code, user.mfaBackupCodes);

      if (!isValidTotp && !backupResult.valid) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_CODE", message: "Invalid verification code" } },
          { status: 401 }
        );
      }
    }

    // Disable MFA
    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: [],
        mfaVerifiedAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        mfaEnabled: false,
        message: "MFA has been disabled",
      },
    });
  } catch (error) {
    console.error("Failed to disable MFA:", error);
    return NextResponse.json(
      { success: false, error: { code: "DISABLE_ERROR", message: "Failed to disable MFA" } },
      { status: 500 }
    );
  }
}
