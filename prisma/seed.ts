import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Check if default pipeline exists
  const existingPipeline = await prisma.pipeline.findFirst({
    where: { isDefault: true },
  });

  if (!existingPipeline) {
    console.log("Creating default Sales Pipeline...");

    const salesPipeline = await prisma.pipeline.create({
      data: {
        name: "Sales Pipeline",
        description: "Default sales pipeline for tracking deals",
        isDefault: true,
        isActive: true,
        stages: {
          create: [
            { name: "Qualification", color: "#94a3b8", probability: 10, position: 0 },
            { name: "Discovery", color: "#3b82f6", probability: 25, position: 1 },
            { name: "Proposal", color: "#eab308", probability: 50, position: 2 },
            { name: "Negotiation", color: "#f97316", probability: 75, position: 3 },
            { name: "Closed Won", color: "#22c55e", probability: 100, position: 4, isClosed: true, isWon: true },
            { name: "Closed Lost", color: "#ef4444", probability: 0, position: 5, isClosed: true, isWon: false },
          ],
        },
      },
    });

    console.log(`Created pipeline: ${salesPipeline.name} (${salesPipeline.id})`);
  } else {
    console.log("Default pipeline already exists.");
  }

  // Create Partnership Pipeline if it doesn't exist
  const partnershipPipeline = await prisma.pipeline.findFirst({
    where: { name: "Partnership Pipeline" },
  });

  if (!partnershipPipeline) {
    console.log("Creating Partnership Pipeline...");

    const pipeline = await prisma.pipeline.create({
      data: {
        name: "Partnership Pipeline",
        description: "Pipeline for tracking partnership opportunities",
        isDefault: false,
        isActive: true,
        stages: {
          create: [
            { name: "Initial Contact", color: "#94a3b8", probability: 5, position: 0 },
            { name: "Evaluation", color: "#8b5cf6", probability: 20, position: 1 },
            { name: "Terms Discussion", color: "#3b82f6", probability: 40, position: 2 },
            { name: "Contract Review", color: "#eab308", probability: 70, position: 3 },
            { name: "Partnership Active", color: "#22c55e", probability: 100, position: 4, isClosed: true, isWon: true },
            { name: "Not Proceeding", color: "#ef4444", probability: 0, position: 5, isClosed: true, isWon: false },
          ],
        },
      },
    });

    console.log(`Created pipeline: ${pipeline.name} (${pipeline.id})`);
  } else {
    console.log("Partnership pipeline already exists.");
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
