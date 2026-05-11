import { memo, useCallback, useEffect, useId, useRef, useState } from "react";
import { HelpCircle } from "lucide-react";
import "./InfoDrawer.css";

function InfoDrawer({
  label,
  title,
  children,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const triggerLabel = typeof label === "string" && label.trim() ? label : "More info";

  const handleToggle = useCallback(() => {
    setOpen((previous) => !previous);
  }, []);

  // Escape closes the drawer and returns focus to the trigger so
  // keyboard users don't get stranded in the panel — and click-
  // outside dismisses to match every other popover in the app
  // (city search dropdown, mobile settings sheet). Without these
  // the only way to close was hunting for the same tiny "?" again.
  useEffect(() => {
    if (!open || typeof document === "undefined") {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    function handlePointerDown(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={`info-drawer ${className}`.trim()}>
      <button
        ref={triggerRef}
        type="button"
        className="info-drawer-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={triggerLabel}
        onClick={handleToggle}
      >
        <HelpCircle size={14} aria-hidden="true" />
      </button>
      {open && (
        <div id={panelId} className="info-drawer-panel" role="note">
          {title && <p className="info-drawer-title">{title}</p>}
          <p className="info-drawer-copy">{children}</p>
        </div>
      )}
    </div>
  );
}

export default memo(InfoDrawer);

