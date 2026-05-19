import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminWithMfa } from "@/lib/auth";
import { renderReferencePdf } from "@/lib/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAdminWithMfa();
  const { id } = await params;

  const request = await prisma.referenceRequest.findUnique({
    where: { id },
    include: { candidate: true, response: true },
  });
  if (!request || !request.response) {
    return new NextResponse("Reference not found or not yet completed.", { status: 404 });
  }

  const pdf = await renderReferencePdf({
    request,
    response: request.response,
    candidate: request.candidate,
  });

  const safeName = request.candidate.fullName.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
  const filename = `Reference_${safeName}_${request.id.slice(-6)}.pdf`;

  return new NextResponse(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
