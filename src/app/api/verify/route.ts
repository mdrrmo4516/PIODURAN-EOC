import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// PUBLIC — QR document verification (no auth)
export async function GET(request: NextRequest) {
  const docId = (new URL(request.url).searchParams.get("docId") || "").trim().toUpperCase();
  if (!docId) {
    return NextResponse.json({ valid: false, error: "Document ID is required." }, { status: 400 });
  }
  const doc = await db.generatedDocument.findUnique({
    where: { docId },
    include: {
      submission: { include: { barangay: true } },
      downloads: true,
    },
  });
  if (!doc) {
    return NextResponse.json({
      valid: false,
      error: "No document found with this ID. Please check the Document ID and try again.",
    });
  }
  const { submission } = doc;
  return NextResponse.json({
    valid: true,
    docId: doc.docId,
    document: "Barangay DRRM Plan (BDRRMP)",
    barangay: submission.barangay.name,
    barangayCode: submission.barangay.code,
    year: submission.year,
    version: doc.version,
    status: "VALID — APPROVED",
    signed: doc.signed,
    signedBy: doc.signedBy,
    signedAt: doc.signedAt?.toISOString() ?? null,
    approvedAt: submission.approvedAt?.toISOString() ?? null,
    generatedAt: doc.generatedAt.toISOString(),
    downloadCount: doc.downloads.length,
  });
}
