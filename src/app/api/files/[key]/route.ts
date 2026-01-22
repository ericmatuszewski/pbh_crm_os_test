import { NextRequest, NextResponse } from "next/server";
import { getStorageProvider } from "@/lib/storage";

// GET /api/files/[key] - Serve a file
export async function GET(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    const storage = getStorageProvider();
    const buffer = await storage.download(params.key);

    // Determine content type from key extension
    const ext = params.key.split(".").pop()?.toLowerCase() || "";
    const contentTypes: Record<string, string> = {
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ppt: "application/vnd.ms-powerpoint",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
      mp4: "video/mp4",
      webm: "video/webm",
      mp3: "audio/mpeg",
      wav: "audio/wav",
      txt: "text/plain",
      csv: "text/csv",
      rtf: "application/rtf",
    };

    const contentType = contentTypes[ext] || "application/octet-stream";

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Failed to serve file:", error);
    return NextResponse.json(
      { success: false, error: { code: "FILE_NOT_FOUND", message: "File not found" } },
      { status: 404 }
    );
  }
}
