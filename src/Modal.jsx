import React, { useEffect, useRef } from "react";

export default function Modal({ id, title, subtitle, closeLabel, onClose, children, className = "" }) {
  const dialog = useRef(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current.showModal();
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  function backdrop(event) {
    if (event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
      dialog.current.close();
    }
  }

  return (
    <dialog
      ref={dialog}
      id={id}
      className={"fund-dialog " + className}
      aria-labelledby={id + "-title"}
      onClose={onClose}
      onClick={backdrop}
    >
      <header className="fund-dialog-header">
        <div>
          <h2 id={id + "-title"}>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        <button
          autoFocus
          aria-label={closeLabel || "Close dialog"}
          className="dialog-close-btn"
          onClick={() => dialog.current.close()}
        >
          ✕ Close
        </button>
      </header>
      <div className="fund-dialog-body">{children}</div>
    </dialog>
  );
}
