import { KeyboardShortcut } from "@/hooks/useKeyboardShortcuts";

// Dialer shortcut definitions (actions will be bound at runtime)
export const DIALER_SHORTCUT_KEYS = {
  ANSWERED: "1",
  NO_ANSWER: "2",
  VOICEMAIL: "3",
  BUSY: "4",
  CALLBACK: "5",
  DIAL: "d",
  NEXT: "n",
  HELP: "?",
  ESCAPE: "Escape",
} as const;

export interface DialerShortcutActions {
  onAnswered: () => void;
  onNoAnswer: () => void;
  onVoicemail: () => void;
  onBusy: () => void;
  onCallback: () => void;
  onDial: () => void;
  onNext: () => void;
  onHelp: () => void;
  onEscape: () => void;
}

export function createDialerShortcuts(actions: Partial<DialerShortcutActions>): KeyboardShortcut[] {
  const shortcuts: KeyboardShortcut[] = [];

  if (actions.onAnswered) {
    shortcuts.push({
      key: DIALER_SHORTCUT_KEYS.ANSWERED,
      action: actions.onAnswered,
      description: "Mark as Answered",
      category: "Outcomes",
    });
  }

  if (actions.onNoAnswer) {
    shortcuts.push({
      key: DIALER_SHORTCUT_KEYS.NO_ANSWER,
      action: actions.onNoAnswer,
      description: "Mark as No Answer",
      category: "Outcomes",
    });
  }

  if (actions.onVoicemail) {
    shortcuts.push({
      key: DIALER_SHORTCUT_KEYS.VOICEMAIL,
      action: actions.onVoicemail,
      description: "Mark as Voicemail",
      category: "Outcomes",
    });
  }

  if (actions.onBusy) {
    shortcuts.push({
      key: DIALER_SHORTCUT_KEYS.BUSY,
      action: actions.onBusy,
      description: "Mark as Busy",
      category: "Outcomes",
    });
  }

  if (actions.onCallback) {
    shortcuts.push({
      key: DIALER_SHORTCUT_KEYS.CALLBACK,
      action: actions.onCallback,
      description: "Schedule Callback",
      category: "Outcomes",
    });
  }

  if (actions.onDial) {
    shortcuts.push({
      key: DIALER_SHORTCUT_KEYS.DIAL,
      action: actions.onDial,
      description: "Dial Phone Number",
      category: "Actions",
    });
  }

  if (actions.onNext) {
    shortcuts.push({
      key: DIALER_SHORTCUT_KEYS.NEXT,
      action: actions.onNext,
      description: "Next Contact",
      category: "Navigation",
    });
  }

  if (actions.onHelp) {
    shortcuts.push({
      key: DIALER_SHORTCUT_KEYS.HELP,
      shift: true,
      action: actions.onHelp,
      description: "Show Keyboard Shortcuts",
      category: "Help",
    });
  }

  if (actions.onEscape) {
    shortcuts.push({
      key: DIALER_SHORTCUT_KEYS.ESCAPE,
      action: actions.onEscape,
      description: "Close Dialog / Cancel",
      category: "Navigation",
    });
  }

  return shortcuts;
}
