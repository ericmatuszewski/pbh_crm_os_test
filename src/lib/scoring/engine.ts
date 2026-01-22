import { prisma } from "@/lib/prisma";
import { ScoringEventType, ContactStatus } from "@prisma/client";

interface ScoreEventData {
  contactId: string;
  eventType: ScoringEventType;
  eventDescription?: string;
  relatedType?: string;
  relatedId?: string;
}

// Process a scoring event for a contact
export async function processScoreEvent(data: ScoreEventData): Promise<{
  previousScore: number;
  newScore: number;
  pointsChange: number;
  statusChanged: boolean;
  newStatus?: ContactStatus;
}> {
  const { contactId, eventType, eventDescription, relatedType, relatedId } = data;

  // Get the contact's current score
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { leadScore: true, status: true },
  });

  if (!contact) {
    throw new Error("Contact not found");
  }

  // Get the default active scoring model
  const scoringModel = await prisma.leadScoringModel.findFirst({
    where: { isActive: true, isDefault: true },
    include: {
      rules: {
        where: { isActive: true, eventType },
      },
    },
  });

  if (!scoringModel || scoringModel.rules.length === 0) {
    // No active scoring model or no rules for this event type
    return {
      previousScore: contact.leadScore,
      newScore: contact.leadScore,
      pointsChange: 0,
      statusChanged: false,
    };
  }

  let totalPointsChange = 0;

  for (const rule of scoringModel.rules) {
    // Check max occurrences
    if (rule.maxOccurrences) {
      const occurrenceCount = await prisma.leadScoreHistory.count({
        where: {
          contactId,
          ruleId: rule.id,
        },
      });
      if (occurrenceCount >= rule.maxOccurrences) continue;
    }

    // Check cooldown
    if (rule.cooldownHours) {
      const cooldownTime = new Date(Date.now() - rule.cooldownHours * 60 * 60 * 1000);
      const recentApplication = await prisma.leadScoreHistory.findFirst({
        where: {
          contactId,
          ruleId: rule.id,
          createdAt: { gte: cooldownTime },
        },
      });
      if (recentApplication) continue;
    }

    // Apply the rule
    totalPointsChange += rule.points;
  }

  if (totalPointsChange === 0) {
    return {
      previousScore: contact.leadScore,
      newScore: contact.leadScore,
      pointsChange: 0,
      statusChanged: false,
    };
  }

  const previousScore = contact.leadScore;
  const newScore = Math.max(0, previousScore + totalPointsChange);

  // Create score history record
  await prisma.leadScoreHistory.create({
    data: {
      contactId,
      previousScore,
      newScore,
      pointsChange: totalPointsChange,
      eventType,
      eventDescription,
      ruleId: scoringModel.rules[0]?.id,
      relatedType,
      relatedId,
    },
  });

  // Check for status progression
  let newStatus: ContactStatus | undefined;
  let statusChanged = false;

  if (contact.status === ContactStatus.LEAD && newScore >= scoringModel.qualifiedThreshold) {
    newStatus = ContactStatus.QUALIFIED;
    statusChanged = true;
  } else if (
    (contact.status === ContactStatus.LEAD || contact.status === ContactStatus.QUALIFIED) &&
    newScore >= scoringModel.customerThreshold
  ) {
    newStatus = ContactStatus.CUSTOMER;
    statusChanged = true;
  }

  // Update contact score and status
  await prisma.contact.update({
    where: { id: contactId },
    data: {
      leadScore: newScore,
      lastScoredAt: new Date(),
      ...(newStatus && { status: newStatus }),
    },
  });

  return {
    previousScore,
    newScore,
    pointsChange: totalPointsChange,
    statusChanged,
    newStatus,
  };
}

// Manually adjust a contact's score
export async function adjustScore(
  contactId: string,
  points: number,
  description: string
): Promise<{ previousScore: number; newScore: number }> {
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { leadScore: true },
  });

  if (!contact) {
    throw new Error("Contact not found");
  }

  const previousScore = contact.leadScore;
  const newScore = Math.max(0, previousScore + points);

  // Create history record
  await prisma.leadScoreHistory.create({
    data: {
      contactId,
      previousScore,
      newScore,
      pointsChange: points,
      eventType: ScoringEventType.CUSTOM,
      eventDescription: description,
    },
  });

  // Update contact
  await prisma.contact.update({
    where: { id: contactId },
    data: {
      leadScore: newScore,
      lastScoredAt: new Date(),
    },
  });

  return { previousScore, newScore };
}

// Get score history for a contact
export async function getScoreHistory(contactId: string, limit = 50) {
  return prisma.leadScoreHistory.findMany({
    where: { contactId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

// Recalculate a contact's score from scratch
export async function recalculateScore(contactId: string): Promise<number> {
  // Get all score history
  const history = await prisma.leadScoreHistory.findMany({
    where: { contactId },
    orderBy: { createdAt: "asc" },
  });

  const totalScore = history.reduce((sum, h) => sum + h.pointsChange, 0);
  const newScore = Math.max(0, totalScore);

  await prisma.contact.update({
    where: { id: contactId },
    data: {
      leadScore: newScore,
      lastScoredAt: new Date(),
    },
  });

  return newScore;
}

// Process score decay for contacts
export async function processScoreDecay(): Promise<number> {
  const scoringModel = await prisma.leadScoringModel.findFirst({
    where: { isActive: true, isDefault: true },
    include: {
      rules: {
        where: {
          isActive: true,
          decayDays: { not: null },
          decayPoints: { not: null },
        },
      },
    },
  });

  if (!scoringModel || scoringModel.rules.length === 0) {
    return 0;
  }

  let decayedCount = 0;

  for (const rule of scoringModel.rules) {
    if (!rule.decayDays || !rule.decayPoints) continue;

    const decayDate = new Date(Date.now() - rule.decayDays * 24 * 60 * 60 * 1000);

    // Find contacts with score history for this rule that's old enough
    const eligibleHistory = await prisma.leadScoreHistory.findMany({
      where: {
        ruleId: rule.id,
        createdAt: { lt: decayDate },
      },
      distinct: ["contactId"],
    });

    for (const history of eligibleHistory) {
      // Check if decay was already applied
      const existingDecay = await prisma.leadScoreHistory.findFirst({
        where: {
          contactId: history.contactId,
          eventType: ScoringEventType.CUSTOM,
          eventDescription: { contains: `Decay for rule: ${rule.id}` },
          createdAt: { gte: decayDate },
        },
      });

      if (existingDecay) continue;

      // Apply decay
      await adjustScore(
        history.contactId,
        -rule.decayPoints,
        `Score decay - Decay for rule: ${rule.id}`
      );
      decayedCount++;
    }
  }

  return decayedCount;
}
