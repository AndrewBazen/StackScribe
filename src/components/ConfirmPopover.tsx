/* ---------- ConfirmPopover.tsx (or inline) ---------- */
import * as Popover from "@radix-ui/react-popover";
import { Cross2Icon } from "@radix-ui/react-icons";
import { ReactNode } from "react";

interface ConfirmPopoverProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  anchorRef: React.RefObject<HTMLDivElement>;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}

export function ConfirmPopover({
  open,
  onOpenChange,
  anchorRef,
  title,
  message,
  confirmLabel = "Confirm",
  destructive,
  onConfirm,
}: ConfirmPopoverProps) {
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Anchor asChild>
        {/* Popover needs an actual element, so we mirror the entry anchor */}
        <div ref={anchorRef} />
      </Popover.Anchor>

      <Popover.Portal>
        <Popover.Content
          side="right"
          sideOffset={8}
          align="start"
          className="popover-content"
        >
          <header className="popover-title">{title}</header>
          <div className="popover-body">{message}</div>
          <div className="popover-buttons">
            <button
              className={`primary-button ${destructive ? "destructive" : ""}`}
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
              autoFocus
            >
              {confirmLabel}
            </button>
            <Popover.Close asChild>
              <button className="close-button" aria-label="Cancel">
                <Cross2Icon />
              </button>
            </Popover.Close>
          </div>
          <Popover.Arrow className="popover-arrow" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
