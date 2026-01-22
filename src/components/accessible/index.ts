/**
 * Accessible UI Components
 *
 * WCAG AA compliant components designed for ease of use,
 * particularly for older users or those with visual impairments.
 *
 * Features:
 * - Large touch targets (48px minimum)
 * - High contrast text and backgrounds
 * - Clear focus indicators
 * - Screen reader friendly
 * - Keyboard navigable
 */

// Buttons
export { AccessibleButton, accessibleButtonVariants } from "./AccessibleButton";
export type { AccessibleButtonProps } from "./AccessibleButton";

// Typography
export {
  AccessibleText,
  AccessibleHeading,
  AccessibleLabel,
  accessibleTextVariants,
  accessibleHeadingVariants,
  accessibleLabelVariants,
} from "./AccessibleText";
export type {
  AccessibleTextProps,
  AccessibleHeadingProps,
  AccessibleLabelProps,
} from "./AccessibleText";

// Tooltips
export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  HelpTooltip,
  InfoTooltip,
} from "./Tooltip";

// Help Cards
export { HelpCard, HelpCardGroup, QuickTip } from "./HelpCard";
export type { HelpCardProps } from "./HelpCard";

// Call Outcome Help
export {
  CallOutcomeHelp,
  OutcomeIcon,
  OutcomeLabel,
  OutcomeHelpTooltip,
  OutcomeSelector,
  CALL_OUTCOME_DEFINITIONS,
} from "./CallOutcomeHelp";
export type { CallOutcome } from "./CallOutcomeHelp";
