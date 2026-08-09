import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyAppSession } from "@/lib/session";

const SUBMIT_ROLES = ["ADMIN", "ACCOUNTS_OFFICER", "OPERATOR"];
const APPROVE_ROLES = ["ADMIN", "ACCOUNTS_OFFICER"];

async function currentUser() {
  const store = await cookies();
  const session = store.get("app2_session")?.value;
  const user = session ? await verifyAppSession(session) : null;
  if (!user) return null;
  return prisma.appUser.findUnique({ where: { username: user.username } });
}

export async function GET() {
  const leaves = await prisma.leaveRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: { applicantUser: { select: { name: true } } },
  });
  return NextResponse.json({ leaves });
}

export async function POST(request: NextRequest) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!SUBMIT_ROLES.includes(user.role)) {
    return NextResponse.json(
      { error: `Role ${user.role} cannot submit leave requests` },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const reason = String(body.reason ?? "").trim();
  const days = Number(body.days);
  if (!reason || !Number.isFinite(days) || days < 1 || days > 365) {
    return NextResponse.json(
      { error: "reason and days (1-365) are required" },
      { status: 400 }
    );
  }

  const leave = await prisma.leaveRequest.create({
    data: {
      applicant: user.name,
      applicantId: user.id,
      reason,
      days,
      status: "PENDING",
    },
    include: { applicantUser: { select: { name: true } } },
  });
  return NextResponse.json({ leave }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!APPROVE_ROLES.includes(user.role)) {
    return NextResponse.json(
      { error: `Role ${user.role} cannot approve leave requests` },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const { id, status } = body as { id?: string; status?: "APPROVED" | "REJECTED" };
  if (!id || (status !== "APPROVED" && status !== "REJECTED")) {
    return NextResponse.json({ error: "id and status (APPROVED|REJECTED) required" }, { status: 400 });
  }

  const leave = await prisma.leaveRequest.update({
    where: { id },
    data: { status },
    include: { applicantUser: { select: { name: true } } },
  });
  return NextResponse.json({ leave });
}

export async function DELETE(request: NextRequest) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only the ADMIN role can delete leave requests" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await prisma.leaveRequest.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
