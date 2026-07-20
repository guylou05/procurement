/**
 * Seed a single bilingual construction organization with demo data so the dashboard
 * is immediately useful. Idempotent by slug/email where practical.
 *
 * Run with: npm run db:seed (requires DATABASE_URL and applied migrations).
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 12);

  // ── Platform super admin ──
  // Deliberately has NO organization membership: a pure platform account that lands
  // in the admin panel (/admin), separate from any tenant's workspace.
  const superAdminPasswordHash = await bcrypt.hash("SuperAdmin123!", 12);
  await prisma.user.upsert({
    where: { email: "superadmin@buildflow.africa" },
    update: { isSuperAdmin: true },
    create: {
      email: "superadmin@buildflow.africa",
      name: "Platform Admin",
      passwordHash: superAdminPasswordHash,
      emailVerified: new Date(),
      isSuperAdmin: true,
      locale: "en",
      preference: { create: { locale: "en" } },
    },
  });

  // ── Users (different roles) ──
  const usersData = [
    { email: "owner@demo.africa", name: "Aminata Diallo", role: "OWNER" as const },
    { email: "pm@demo.africa", name: "Jean-Paul Mbarga", role: "PROJECT_MANAGER" as const },
    { email: "foreman@demo.africa", name: "Kwame Mensah", role: "SUPERVISOR" as const },
    { email: "accountant@demo.africa", name: "Fatou Sow", role: "ACCOUNTANT" as const },
  ];

  const users = [];
  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        name: u.name,
        passwordHash,
        emailVerified: new Date(),
        locale: "fr",
        preference: { create: { locale: "fr" } },
      },
    });
    users.push({ ...u, id: user.id });
  }
  const owner = users[0]!;
  const pm = users[1]!;
  const foreman = users[2]!;

  // ── Organization ──
  const org = await prisma.organization.upsert({
    where: { slug: "demo-batiment" },
    update: {},
    create: {
      name: "Démo Bâtiment SARL",
      slug: "demo-batiment",
      country: "CM",
      currency: "XAF",
      timezone: "Africa/Douala",
      defaultLocale: "fr",
      industry: "General construction",
      companySize: "11-50",
      phone: "+237 6 00 00 00 00",
      email: "contact@demo.africa",
      address: "Bonanjo, Douala",
      settings: { create: { requireReportApproval: true } },
    },
  });

  for (const u of users) {
    await prisma.organizationMember.upsert({
      where: { organizationId_userId: { organizationId: org.id, userId: u.id } },
      update: { role: u.role },
      create: { organizationId: org.id, userId: u.id, role: u.role },
    });
  }

  // Wipe prior demo business data for a clean, deterministic seed (scoped to this org).
  await prisma.attendanceRecord.deleteMany({ where: { organizationId: org.id } });
  await prisma.dailyReport.deleteMany({ where: { organizationId: org.id } });
  await prisma.task.deleteMany({ where: { organizationId: org.id } });
  await prisma.issue.deleteMany({ where: { organizationId: org.id } });
  await prisma.expense.deleteMany({ where: { organizationId: org.id } });
  await prisma.worker.deleteMany({ where: { organizationId: org.id } });
  await prisma.equipment.deleteMany({ where: { organizationId: org.id } });
  await prisma.project.deleteMany({ where: { organizationId: org.id } });
  await prisma.client.deleteMany({ where: { organizationId: org.id } });

  // ── Client portal user ──
  const clientUser = await prisma.user.upsert({
    where: { email: "client@demo.africa" },
    update: {},
    create: {
      email: "client@demo.africa",
      name: "Groupe Immobilier Atlantique",
      passwordHash,
      emailVerified: new Date(),
      locale: "fr",
      preference: { create: { locale: "fr" } },
    },
  });
  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: clientUser.id } },
    update: { role: "CLIENT" },
    create: { organizationId: org.id, userId: clientUser.id, role: "CLIENT" },
  });

  // ── Clients ──
  const client1 = await prisma.client.create({
    data: {
      organizationId: org.id,
      userId: clientUser.id,
      name: "Groupe Immobilier Atlantique",
      company: "GIA",
      phone: "+237 6 11 11 11 11",
    },
  });
  const client2 = await prisma.client.create({
    data: { organizationId: org.id, name: "Ministère des Travaux Publics", phone: "+237 6 22 22 22 22" },
  });

  // ── Projects: one active residential, one delayed commercial, one completed renovation ──
  const residential = await prisma.project.create({
    data: {
      organizationId: org.id, name: "Villa Duplex Bonapriso", code: "RES-001", clientId: client1.id,
      description: "Construction d'une villa duplex 4 chambres", city: "Douala",
      status: "ACTIVE", priority: "HIGH", currency: "XAF", budgetMinor: 45000000,
      completionPercentage: 55, projectType: "Residential",
      projectManagerId: pm.id, supervisorId: foreman.id, createdById: owner.id,
      startDate: new Date(Date.now() - 90 * 864e5), expectedEndDate: new Date(Date.now() + 60 * 864e5),
      milestones: {
        create: [
          { name: "Fondations", completion: 100, order: 1, completedAt: new Date() },
          { name: "Gros œuvre", completion: 70, order: 2 },
          { name: "Finitions", completion: 0, order: 3 },
        ],
      },
    },
  });

  const commercial = await prisma.project.create({
    data: {
      organizationId: org.id, name: "Immeuble de bureaux Akwa", code: "COM-002", clientId: client2.id,
      description: "Immeuble R+4 à usage de bureaux", city: "Douala",
      status: "DELAYED", priority: "URGENT", currency: "XAF", budgetMinor: 320000000,
      completionPercentage: 35, projectType: "Commercial",
      projectManagerId: pm.id, supervisorId: foreman.id, createdById: owner.id,
      startDate: new Date(Date.now() - 200 * 864e5), expectedEndDate: new Date(Date.now() - 10 * 864e5),
    },
  });

  await prisma.project.create({
    data: {
      organizationId: org.id, name: "Rénovation Boutique Bonanjo", code: "REN-003", clientId: client1.id,
      description: "Rénovation complète d'un local commercial", city: "Douala",
      status: "COMPLETED", priority: "MEDIUM", currency: "XAF", budgetMinor: 12000000,
      completionPercentage: 100, projectType: "Renovation",
      projectManagerId: pm.id, createdById: owner.id,
      startDate: new Date(Date.now() - 160 * 864e5), expectedEndDate: new Date(Date.now() - 30 * 864e5),
      actualEndDate: new Date(Date.now() - 28 * 864e5),
    },
  });

  // ── Workers ──
  const workerNames = [
    ["OUV-001", "Ibrahim Traoré", "Maçon", "PERMANENT"],
    ["OUV-002", "Serge Nkolo", "Ferrailleur", "TEMPORARY"],
    ["OUV-003", "Marie Eyenga", "Peintre", "CONTRACTOR"],
    ["OUV-004", "Paul Biya Jr", "Manœuvre", "DAILY_LABORER"],
    ["OUV-005", "Alain Fokou", "Électricien", "SUBCONTRACTOR"],
  ] as const;
  const workers = [];
  for (const [wid, name, title, type] of workerNames) {
    const w = await prisma.worker.create({
      data: {
        organizationId: org.id, workerId: wid, fullName: name, jobTitle: title,
        employmentType: type, status: "ACTIVE", currency: "XAF", dailyRateMinor: 8000,
        hireDate: new Date(Date.now() - 120 * 864e5),
      },
    });
    workers.push(w);
  }

  // ── Attendance today (residential) ──
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (const [i, w] of workers.entries()) {
    await prisma.attendanceRecord.create({
      data: {
        organizationId: org.id, projectId: residential.id, workerId: w.id, date: today,
        status: i === 3 ? "ABSENT" : i === 1 ? "LATE" : "PRESENT",
        checkInAt: i === 3 ? null : new Date(), recordedById: foreman.id,
      },
    });
  }

  // ── Daily reports ──
  await prisma.dailyReport.create({
    data: {
      organizationId: org.id, projectId: residential.id, supervisorId: foreman.id, date: today,
      weather: "Ensoleillé", workersPresent: 4, subcontractorsPresent: 1,
      workCompleted: "Coulage de la dalle du 1er étage terminé.",
      workPlanned: "Démarrage de l'élévation des murs.", status: "SUBMITTED", submittedAt: new Date(),
    },
  });
  await prisma.dailyReport.create({
    data: {
      organizationId: org.id, projectId: commercial.id, supervisorId: foreman.id,
      date: new Date(Date.now() - 864e5), weather: "Pluvieux", workersPresent: 8,
      workCompleted: "Travaux ralentis par la pluie.", delays: "Retard livraison ciment.",
      status: "SUBMITTED", submittedAt: new Date(),
    },
  });

  // ── Tasks ──
  await prisma.task.createMany({
    data: [
      { organizationId: org.id, projectId: residential.id, title: "Vérifier armatures poteaux", assigneeId: foreman.id, status: "IN_PROGRESS", priority: "HIGH" },
      { organizationId: org.id, projectId: residential.id, title: "Commander carrelage", assigneeId: pm.id, status: "TODO", priority: "MEDIUM" },
      { organizationId: org.id, projectId: commercial.id, title: "Inspection sécurité échafaudage", status: "AWAITING_REVIEW", priority: "URGENT" },
    ],
  });

  // ── Issues ──
  await prisma.issue.create({
    data: {
      organizationId: org.id, projectId: commercial.id, category: "Delay", severity: "HIGH",
      status: "OPEN", description: "Livraison de ciment en retard de 5 jours.", reportedById: foreman.id,
    },
  });

  // ── Expenses ──
  await prisma.expense.createMany({
    data: [
      { organizationId: org.id, projectId: residential.id, amountMinor: 150000, currency: "XAF", vendor: "Quincaillerie Centrale", date: today, paymentMethod: "MOBILE_MONEY", description: "Sacs de ciment", status: "SUBMITTED", submittedById: foreman.id },
      { organizationId: org.id, projectId: commercial.id, amountMinor: 500000, currency: "XAF", vendor: "Transport Express", date: today, paymentMethod: "CASH", description: "Location camion", status: "APPROVED", submittedById: foreman.id, approvedById: pm.id, approvedAt: new Date() },
    ],
  });

  // ── Equipment ──
  await prisma.equipment.createMany({
    data: [
      { organizationId: org.id, name: "Bétonnière 350L", assetId: "EQ-001", category: "Mixer", status: "IN_USE", currency: "XAF", purchaseCostMinor: 1200000 },
      { organizationId: org.id, name: "Groupe électrogène 10kVA", assetId: "EQ-002", category: "Generator", status: "AVAILABLE", currency: "XAF", purchaseCostMinor: 3500000, nextMaintenanceAt: new Date(Date.now() + 15 * 864e5) },
    ],
  });

  // ── Materials + stock transactions ──
  await prisma.materialTransaction.deleteMany({ where: { organizationId: org.id } });
  await prisma.material.deleteMany({ where: { organizationId: org.id } });
  const materialsSeed = [
    { name: "Ciment CEM II 42.5", sku: "MAT-CIM", unit: "sac", supplier: "Cimencam", unitCostMinor: 5500, quantity: 320, minQuantity: 100 },
    { name: "Fer à béton 12mm", sku: "MAT-FE12", unit: "barre", supplier: "Aciers du Cameroun", unitCostMinor: 4200, quantity: 90, minQuantity: 120 },
    { name: "Sable fin", sku: "MAT-SAB", unit: "m³", supplier: "Carrière Nkolbisson", unitCostMinor: 12000, quantity: 45, minQuantity: 20 },
    { name: "Parpaing 20x20x40", sku: "MAT-PAR", unit: "unité", supplier: "Préfa Douala", unitCostMinor: 350, quantity: 1500, minQuantity: 500 },
  ];
  for (const m of materialsSeed) {
    const material = await prisma.material.create({
      data: { organizationId: org.id, currency: "XAF", ...m },
    });
    // A couple of movements so the ledger and usage-by-project are populated.
    await prisma.materialTransaction.create({
      data: {
        organizationId: org.id, materialId: material.id, type: "RECEIVE",
        quantity: 100, unit: m.unit, reason: "Réapprovisionnement", userId: pm.id,
        counterparty: m.supplier, approvedById: owner.id, approvedAt: new Date(Date.now() - 6 * 864e5),
        createdAt: new Date(Date.now() - 6 * 864e5),
      },
    });
    await prisma.materialTransaction.create({
      data: {
        organizationId: org.id, materialId: material.id, projectId: residential.id, type: "ISSUE",
        quantity: 40, unit: m.unit, reason: "Sortie chantier", userId: foreman.id,
        counterparty: "Kwame Mensah (chef de chantier)", approvedById: pm.id, approvedAt: new Date(Date.now() - 2 * 864e5),
        createdAt: new Date(Date.now() - 2 * 864e5),
      },
    });
  }

  // ── Invoice + payment (visible in the client portal) ──
  await prisma.invoice.deleteMany({ where: { organizationId: org.id } });
  await prisma.invoice.create({
    data: {
      organizationId: org.id, clientId: client1.id, projectId: residential.id,
      number: "INV-2024-001", currency: "XAF", status: "PARTIALLY_PAID",
      dueDate: new Date(Date.now() + 20 * 864e5),
      items: {
        create: [
          { description: "Acompte fondations", quantity: 1, unitPriceMinor: 15000000, order: 1 },
          { description: "Gros œuvre — tranche 1", quantity: 1, unitPriceMinor: 10000000, order: 2 },
        ],
      },
      payments: {
        create: [{ organizationId: org.id, amountMinor: 15000000, currency: "XAF", method: "BANK_TRANSFER" }],
      },
    },
  });

  console.log("Seed complete.");
  console.log("  Super admin:  superadmin@buildflow.africa / SuperAdmin123!  ->  /en/admin");
  console.log("  Staff login:  owner@demo.africa / Password123!");
  console.log("  Client login: client@demo.africa / Password123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
