import { ScoringEventType } from "@prisma/client";
import { processScoreEvent } from "./engine";

/**
 * Scoring Trigger Helper
 * Provides a simple interface for API routes to trigger scoring events
 */

export interface TriggerScoringInput {
  contactId: string;
  eventType: ScoringEventType;
  description?: string;
  relatedType?: string;
  relatedId?: string;
}

/**
 * Trigger a scoring event for a contact
 * This is a fire-and-forget function that won't throw errors to the caller
 */
export async function triggerScoring(input: TriggerScoringInput): Promise<void> {
  try {
    await processScoreEvent({
      contactId: input.contactId,
      eventType: input.eventType,
      eventDescription: input.description,
      relatedType: input.relatedType,
      relatedId: input.relatedId,
    });
  } catch (error) {
    // Log but don't throw - scoring failures shouldn't break the main operation
    console.error("Failed to trigger scoring event:", error);
  }
}

/**
 * Trigger DEAL_CREATED scoring event
 */
export async function triggerDealCreated(
  contactId: string,
  dealId: string,
  dealTitle: string
): Promise<void> {
  await triggerScoring({
    contactId,
    eventType: ScoringEventType.DEAL_CREATED,
    description: `Deal created: ${dealTitle}`,
    relatedType: "deal",
    relatedId: dealId,
  });
}

/**
 * Trigger CALL_ANSWERED scoring event
 */
export async function triggerCallAnswered(
  contactId: string,
  callId: string,
  contactName: string
): Promise<void> {
  await triggerScoring({
    contactId,
    eventType: ScoringEventType.CALL_ANSWERED,
    description: `Call answered with ${contactName}`,
    relatedType: "call",
    relatedId: callId,
  });
}

/**
 * Trigger CALL_POSITIVE_OUTCOME scoring event
 */
export async function triggerCallPositiveOutcome(
  contactId: string,
  callId: string,
  contactName: string
): Promise<void> {
  await triggerScoring({
    contactId,
    eventType: ScoringEventType.CALL_POSITIVE_OUTCOME,
    description: `Positive call outcome with ${contactName}`,
    relatedType: "call",
    relatedId: callId,
  });
}

/**
 * Trigger MEETING_BOOKED scoring event
 */
export async function triggerMeetingBooked(
  contactId: string,
  meetingId: string,
  meetingTitle: string
): Promise<void> {
  await triggerScoring({
    contactId,
    eventType: ScoringEventType.MEETING_BOOKED,
    description: `Meeting booked: ${meetingTitle}`,
    relatedType: "meeting",
    relatedId: meetingId,
  });
}

/**
 * Trigger EMAIL_OPENED scoring event
 */
export async function triggerEmailOpened(
  contactId: string,
  emailId: string,
  subject: string
): Promise<void> {
  await triggerScoring({
    contactId,
    eventType: ScoringEventType.EMAIL_OPENED,
    description: `Email opened: ${subject}`,
    relatedType: "email",
    relatedId: emailId,
  });
}

/**
 * Trigger EMAIL_CLICKED scoring event
 */
export async function triggerEmailClicked(
  contactId: string,
  emailId: string,
  subject: string
): Promise<void> {
  await triggerScoring({
    contactId,
    eventType: ScoringEventType.EMAIL_CLICKED,
    description: `Email link clicked: ${subject}`,
    relatedType: "email",
    relatedId: emailId,
  });
}

/**
 * Trigger QUOTE_REQUESTED scoring event
 */
export async function triggerQuoteRequested(
  contactId: string,
  quoteId: string,
  quoteTitle: string
): Promise<void> {
  await triggerScoring({
    contactId,
    eventType: ScoringEventType.QUOTE_REQUESTED,
    description: `Quote requested: ${quoteTitle}`,
    relatedType: "quote",
    relatedId: quoteId,
  });
}

/**
 * Trigger FORM_SUBMITTED scoring event
 */
export async function triggerFormSubmitted(
  contactId: string,
  formId: string,
  formName: string
): Promise<void> {
  await triggerScoring({
    contactId,
    eventType: ScoringEventType.FORM_SUBMITTED,
    description: `Form submitted: ${formName}`,
    relatedType: "form",
    relatedId: formId,
  });
}

/**
 * Trigger STAGE_ADVANCED scoring event (when deal moves to a higher stage)
 */
export async function triggerStageAdvanced(
  contactId: string,
  dealId: string,
  fromStage: string,
  toStage: string
): Promise<void> {
  await triggerScoring({
    contactId,
    eventType: ScoringEventType.STAGE_ADVANCED,
    description: `Deal stage advanced: ${fromStage} → ${toStage}`,
    relatedType: "deal",
    relatedId: dealId,
  });
}
