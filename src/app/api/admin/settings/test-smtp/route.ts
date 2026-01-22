import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST /api/admin/settings/test-smtp - Test SMTP connection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { host, port, user, password, fromEmail, fromName, secure } = body;

    // Validate required fields
    if (!host || !user) {
      return NextResponse.json({
        success: false,
        error: { message: "SMTP host and username are required" },
      }, { status: 400 });
    }

    // In a real implementation, we would:
    // 1. Create a nodemailer transport
    // 2. Verify the connection
    // 3. Optionally send a test email

    // For now, simulate the test
    // In production, use nodemailer:
    // const nodemailer = await import("nodemailer");
    // const transporter = nodemailer.createTransporter({
    //   host,
    //   port: port || 587,
    //   secure: secure ?? port === 465,
    //   auth: { user, pass: password },
    // });
    // await transporter.verify();

    // Simulate a delay for the test
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Basic validation - check if host looks valid
    const hostRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
    if (!hostRegex.test(host) && host !== "localhost") {
      return NextResponse.json({
        success: false,
        error: { message: "Invalid SMTP host format" },
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "SMTP configuration appears valid. To fully verify, a test email would need to be sent.",
      data: {
        host,
        port: port || 587,
        user,
        secure: secure ?? false,
      },
    });
  } catch (error) {
    console.error("SMTP test failed:", error);
    return NextResponse.json({
      success: false,
      error: { message: error instanceof Error ? error.message : "SMTP test failed" },
    }, { status: 500 });
  }
}
