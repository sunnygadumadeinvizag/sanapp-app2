import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Seeding sanapp_app2_db …");

  const users = [
    { ssoUserId: "seed:sanyasi", username: "sanyasi", name: "Sanyasi Naidu", email: "sanyasi.naidu@iipe.ac.in", role: "ACCOUNTS_OFFICER" as const },
    { ssoUserId: "seed:lakshmi", username: "lakshmi", name: "Lakshmi Devi", email: "lakshmi@iipe.ac.in", role: "VIEWER" as const },
    { ssoUserId: "seed:admin", username: "admin", name: "System Administrator", email: "admin@iipe.ac.in", role: "ADMIN" as const },
    { ssoUserId: "seed:ramesh", username: "ramesh", name: "Ramesh Kumar", email: "ramesh.kumar@iipe.ac.in", role: "OPERATOR" as const },
    { ssoUserId: "seed:kiran", username: "kiran", name: "Kiran Rao", email: "kiran.rao@iipe.ac.in", role: "VIEWER" as const },
  ];

  for (const u of users) {
    await prisma.appUser.upsert({
      where: { username: u.username },
      update: { ...u },
      create: { ...u },
    });
  }

  const existing = await prisma.leaveRequest.count();
  if (existing === 0) {
    const sanyasi = await prisma.appUser.findUnique({ where: { username: "sanyasi" } });
    const lakshmi = await prisma.appUser.findUnique({ where: { username: "lakshmi" } });
    if (sanyasi && lakshmi) {
      await prisma.leaveRequest.createMany({
        data: [
          { applicant: sanyasi.name, applicantId: sanyasi.id, reason: "Annual leave — family function", days: 3, status: "PENDING" },
          { applicant: lakshmi.name, applicantId: lakshmi.id, reason: "Medical leave", days: 2, status: "APPROVED" },
        ],
      });
    }
  }

  console.log("sanapp_app2_db seeded: 5 local users with roles, demo leave requests");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
