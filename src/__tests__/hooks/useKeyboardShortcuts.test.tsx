import { renderHook, act } from "@testing-library/react";
import { useKeyboardShortcuts, formatShortcut, KeyboardShortcut } from "@/hooks/useKeyboardShortcuts";

describe("useKeyboardShortcuts", () => {
  let testDiv: HTMLDivElement;

  const createKeyboardEvent = (key: string, options: Partial<KeyboardEvent> = {}): KeyboardEvent => {
    const event = new KeyboardEvent("keydown", {
      key,
      bubbles: true,
      cancelable: true,
      ...options,
    });
    // Set target to testDiv for proper element detection
    Object.defineProperty(event, "target", { value: testDiv, writable: false });
    return event;
  };

  beforeEach(() => {
    testDiv = document.createElement("div");
    document.body.appendChild(testDiv);
  });

  afterEach(() => {
    document.body.removeChild(testDiv);
    jest.clearAllMocks();
  });

  describe("basic shortcuts", () => {
    it("should call action when key is pressed", () => {
      const action = jest.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: "n", action, description: "Next item" },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      act(() => {
        document.dispatchEvent(createKeyboardEvent("n"));
      });

      expect(action).toHaveBeenCalledTimes(1);
    });

    it("should be case-insensitive", () => {
      const action = jest.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: "N", action, description: "Next item" },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      act(() => {
        document.dispatchEvent(createKeyboardEvent("n"));
      });

      expect(action).toHaveBeenCalledTimes(1);
    });

    it("should match uppercase key press", () => {
      const action = jest.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: "n", action, description: "Next item" },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      act(() => {
        document.dispatchEvent(createKeyboardEvent("N"));
      });

      expect(action).toHaveBeenCalledTimes(1);
    });

    it("should not call action for non-matching key", () => {
      const action = jest.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: "n", action, description: "Next item" },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      act(() => {
        document.dispatchEvent(createKeyboardEvent("m"));
      });

      expect(action).not.toHaveBeenCalled();
    });

    it("should handle multiple shortcuts", () => {
      const nextAction = jest.fn();
      const prevAction = jest.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: "n", action: nextAction, description: "Next item" },
        { key: "p", action: prevAction, description: "Previous item" },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      act(() => {
        document.dispatchEvent(createKeyboardEvent("n"));
      });
      expect(nextAction).toHaveBeenCalledTimes(1);
      expect(prevAction).not.toHaveBeenCalled();

      act(() => {
        document.dispatchEvent(createKeyboardEvent("p"));
      });
      expect(prevAction).toHaveBeenCalledTimes(1);
    });
  });

  describe("modifier keys", () => {
    it("should require ctrl when specified", () => {
      const action = jest.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: "s", ctrl: true, action, description: "Save" },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      // Without ctrl - should not trigger
      act(() => {
        document.dispatchEvent(createKeyboardEvent("s"));
      });
      expect(action).not.toHaveBeenCalled();

      // With ctrl - should trigger
      act(() => {
        document.dispatchEvent(createKeyboardEvent("s", { ctrlKey: true }));
      });
      expect(action).toHaveBeenCalledTimes(1);
    });

    it("should accept metaKey (Cmd on Mac) as ctrl", () => {
      const action = jest.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: "s", ctrl: true, action, description: "Save" },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      act(() => {
        document.dispatchEvent(createKeyboardEvent("s", { metaKey: true }));
      });

      expect(action).toHaveBeenCalledTimes(1);
    });

    it("should require shift when specified", () => {
      const action = jest.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: "n", shift: true, action, description: "New item" },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      // Without shift - should not trigger
      act(() => {
        document.dispatchEvent(createKeyboardEvent("n"));
      });
      expect(action).not.toHaveBeenCalled();

      // With shift - should trigger
      act(() => {
        document.dispatchEvent(createKeyboardEvent("n", { shiftKey: true }));
      });
      expect(action).toHaveBeenCalledTimes(1);
    });

    it("should require alt when specified", () => {
      const action = jest.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: "d", alt: true, action, description: "Delete" },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      // Without alt - should not trigger
      act(() => {
        document.dispatchEvent(createKeyboardEvent("d"));
      });
      expect(action).not.toHaveBeenCalled();

      // With alt - should trigger
      act(() => {
        document.dispatchEvent(createKeyboardEvent("d", { altKey: true }));
      });
      expect(action).toHaveBeenCalledTimes(1);
    });

    it("should support multiple modifiers", () => {
      const action = jest.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: "s", ctrl: true, shift: true, action, description: "Save as" },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      // Only ctrl - should not trigger
      act(() => {
        document.dispatchEvent(createKeyboardEvent("s", { ctrlKey: true }));
      });
      expect(action).not.toHaveBeenCalled();

      // Only shift - should not trigger
      act(() => {
        document.dispatchEvent(createKeyboardEvent("s", { shiftKey: true }));
      });
      expect(action).not.toHaveBeenCalled();

      // Both ctrl and shift - should trigger
      act(() => {
        document.dispatchEvent(createKeyboardEvent("s", { ctrlKey: true, shiftKey: true }));
      });
      expect(action).toHaveBeenCalledTimes(1);
    });

    it("should not trigger when extra modifiers are pressed", () => {
      const action = jest.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: "n", action, description: "Next" },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      // With extra ctrl - should not trigger
      act(() => {
        document.dispatchEvent(createKeyboardEvent("n", { ctrlKey: true }));
      });
      expect(action).not.toHaveBeenCalled();
    });
  });

  describe("enabled option", () => {
    it("should not trigger when disabled", () => {
      const action = jest.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: "n", action, description: "Next item" },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts, { enabled: false }));

      act(() => {
        document.dispatchEvent(createKeyboardEvent("n"));
      });

      expect(action).not.toHaveBeenCalled();
    });

    it("should respond to enabled changes", () => {
      const action = jest.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: "n", action, description: "Next item" },
      ];

      const { rerender } = renderHook(
        ({ enabled }) => useKeyboardShortcuts(shortcuts, { enabled }),
        { initialProps: { enabled: false } }
      );

      act(() => {
        document.dispatchEvent(createKeyboardEvent("n"));
      });
      expect(action).not.toHaveBeenCalled();

      // Enable shortcuts
      rerender({ enabled: true });

      act(() => {
        document.dispatchEvent(createKeyboardEvent("n"));
      });
      expect(action).toHaveBeenCalledTimes(1);
    });
  });

  describe("ignoreInputs option", () => {
    let input: HTMLInputElement;
    let textarea: HTMLTextAreaElement;
    let div: HTMLDivElement;

    beforeEach(() => {
      input = document.createElement("input");
      textarea = document.createElement("textarea");
      div = document.createElement("div");
      document.body.appendChild(input);
      document.body.appendChild(textarea);
      document.body.appendChild(div);
    });

    afterEach(() => {
      document.body.removeChild(input);
      document.body.removeChild(textarea);
      document.body.removeChild(div);
    });

    it("should ignore shortcuts when focus is on input", () => {
      const action = jest.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: "n", action, description: "Next item" },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      // Simulate keydown from input
      const event = new KeyboardEvent("keydown", { key: "n", bubbles: true });
      Object.defineProperty(event, "target", { value: input });

      act(() => {
        document.dispatchEvent(event);
      });

      expect(action).not.toHaveBeenCalled();
    });

    it("should ignore shortcuts when focus is on textarea", () => {
      const action = jest.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: "n", action, description: "Next item" },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      const event = new KeyboardEvent("keydown", { key: "n", bubbles: true });
      Object.defineProperty(event, "target", { value: textarea });

      act(() => {
        document.dispatchEvent(event);
      });

      expect(action).not.toHaveBeenCalled();
    });

    it("should trigger shortcuts on non-input elements", () => {
      const action = jest.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: "n", action, description: "Next item" },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      const event = new KeyboardEvent("keydown", { key: "n", bubbles: true });
      Object.defineProperty(event, "target", { value: div });

      act(() => {
        document.dispatchEvent(event);
      });

      expect(action).toHaveBeenCalledTimes(1);
    });

    it("should ignore contentEditable elements", () => {
      const action = jest.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: "n", action, description: "Next item" },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      // Create a contentEditable div with the isContentEditable property properly set
      const contentEditableDiv = document.createElement("div");
      contentEditableDiv.contentEditable = "true";
      document.body.appendChild(contentEditableDiv);

      // Explicitly set isContentEditable (jsdom may not set it automatically)
      Object.defineProperty(contentEditableDiv, "isContentEditable", { value: true });

      const event = new KeyboardEvent("keydown", { key: "n", bubbles: true });
      Object.defineProperty(event, "target", { value: contentEditableDiv });

      act(() => {
        document.dispatchEvent(event);
      });

      document.body.removeChild(contentEditableDiv);
      expect(action).not.toHaveBeenCalled();
    });

    it("should trigger on inputs when ignoreInputs is false", () => {
      const action = jest.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: "Escape", action, description: "Close" },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts, { ignoreInputs: false }));

      const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true });
      Object.defineProperty(event, "target", { value: input });

      act(() => {
        document.dispatchEvent(event);
      });

      expect(action).toHaveBeenCalledTimes(1);
    });
  });

  describe("preventDefault", () => {
    it("should prevent default when shortcut matches", () => {
      const action = jest.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: "s", ctrl: true, action, description: "Save" },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      const event = createKeyboardEvent("s", { ctrlKey: true });
      const preventDefaultSpy = jest.spyOn(event, "preventDefault");

      act(() => {
        document.dispatchEvent(event);
      });

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe("cleanup", () => {
    it("should remove event listener on unmount", () => {
      const action = jest.fn();
      const shortcuts: KeyboardShortcut[] = [
        { key: "n", action, description: "Next item" },
      ];

      const { unmount } = renderHook(() => useKeyboardShortcuts(shortcuts));

      unmount();

      act(() => {
        document.dispatchEvent(createKeyboardEvent("n"));
      });

      expect(action).not.toHaveBeenCalled();
    });
  });

  describe("return value", () => {
    it("should return the shortcuts array", () => {
      const shortcuts: KeyboardShortcut[] = [
        { key: "n", action: jest.fn(), description: "Next item", category: "Navigation" },
      ];

      const { result } = renderHook(() => useKeyboardShortcuts(shortcuts));

      expect(result.current).toEqual(shortcuts);
    });
  });
});

describe("formatShortcut", () => {
  it("should format simple key", () => {
    const result = formatShortcut({ key: "n", action: jest.fn(), description: "Next" });
    expect(result).toBe("N");
  });

  it("should format ctrl modifier", () => {
    const result = formatShortcut({ key: "s", ctrl: true, action: jest.fn(), description: "Save" });
    expect(result).toBe("Ctrl + S");
  });

  it("should format shift modifier", () => {
    const result = formatShortcut({ key: "n", shift: true, action: jest.fn(), description: "New" });
    expect(result).toBe("Shift + N");
  });

  it("should format alt modifier", () => {
    const result = formatShortcut({ key: "d", alt: true, action: jest.fn(), description: "Delete" });
    expect(result).toBe("Alt + D");
  });

  it("should format multiple modifiers in order", () => {
    const result = formatShortcut({
      key: "s",
      ctrl: true,
      alt: true,
      shift: true,
      action: jest.fn(),
      description: "Special save",
    });
    expect(result).toBe("Ctrl + Alt + Shift + S");
  });

  it("should format special keys", () => {
    const result = formatShortcut({ key: "Escape", action: jest.fn(), description: "Cancel" });
    expect(result).toBe("ESCAPE");
  });

  it("should format arrow keys", () => {
    const result = formatShortcut({ key: "ArrowDown", action: jest.fn(), description: "Move down" });
    expect(result).toBe("ARROWDOWN");
  });

  it("should handle lowercase keys", () => {
    const result = formatShortcut({ key: "a", action: jest.fn(), description: "Select all" });
    expect(result).toBe("A");
  });
});
