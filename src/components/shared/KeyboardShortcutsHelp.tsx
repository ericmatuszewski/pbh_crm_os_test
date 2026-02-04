"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Keyboard } from "lucide-react";
import { KeyboardShortcut, formatShortcut } from "@/hooks/useKeyboardShortcuts";

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortcuts: KeyboardShortcut[];
  title?: string;
}

export function KeyboardShortcutsHelp({
  open,
  onOpenChange,
  shortcuts,
  title = "Keyboard Shortcuts",
}: KeyboardShortcutsHelpProps) {
  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category || "General";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  const categoryOrder = ["Outcomes", "Actions", "Navigation", "Help", "General"];
  const sortedCategories = Object.keys(groupedShortcuts).sort(
    (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {sortedCategories.map((category) => (
            <div key={category}>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                {category}
              </h4>
              <div className="space-y-1">
                {groupedShortcuts[category].map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <Badge variant="outline" className="font-mono text-xs">
                      {formatShortcut(shortcut)}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center pt-2 border-t">
          Press <Badge variant="outline" className="font-mono text-xs mx-1">?</Badge> anytime to show this help
        </p>
      </DialogContent>
    </Dialog>
  );
}

export default KeyboardShortcutsHelp;
