"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

/**
 * The 3D view.
 *
 * In the gallery it is a still: the piece's poster with a "View in 3D" button
 * over it. Turning a model wants horizontal drags and so does swiping to the
 * next slide, and on a phone those two fight — the model twitches, the
 * carousel sticks, and neither gesture feels like it worked. So the slide
 * opens a full-screen viewer instead, where a drag can only mean one thing.
 *
 * It pays for itself twice: model-viewer is about half a megabyte, and this
 * way it is fetched when somebody asks to see the model rather than on every
 * product page that happens to have one.
 */

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          "ios-src"?: string;
          poster?: string;
          alt?: string;
          ar?: boolean;
          "ar-modes"?: string;
          "camera-controls"?: boolean;
          "touch-action"?: string;
          "shadow-intensity"?: string;
          "environment-image"?: string;
          exposure?: string;
          loading?: string;
          "camera-orbit"?: string;
          "field-of-view"?: string;
          "camera-target"?: string;
          "min-field-of-view"?: string;
          "interaction-prompt"?: string;
          reveal?: string;
        },
        HTMLElement
      >;
    }
  }
}

export type ProductModel = {
  /** The .glb every browser renders. */
  src: string;
  /** The .usdz iOS needs for AR. */
  iosSrc: string | null;
  poster: string | null;
  alt: string;
};

function CubeIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2.8 21 7.6v8.8L12 21.2 3 16.4V7.6Z" />
      <path d="M3 7.6 12 12.4l9-4.8M12 12.4v8.8" />
    </svg>
  );
}

/** The slide in the gallery: a still, and a way in. */
export function ProductModelViewer({ model }: { model: ProductModel }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="bg-surface-secondary relative aspect-[4/5] overflow-hidden rounded-lg">
        {model.poster ? (
          <img
            src={model.poster}
            alt={model.alt}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : null}

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="bg-surface text-on-surface focus-visible:outline-accent absolute bottom-5 left-1/2 inline-flex min-h-touch-target -translate-x-1/2 cursor-pointer items-center gap-2.5 rounded-full px-6 text-[14px] shadow-[0_4px_18px_rgb(32_30_29/0.22)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-transform motion-safe:active:scale-[0.97]"
        >
          <CubeIcon size={18} />
          View in 3D
        </button>
      </div>

      {open ? <ModelDialog model={model} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

/**
 * The model, full screen. Mounted only once asked for, so the web component is
 * imported at that point too.
 */
function ModelDialog({ model, onClose }: { model: ProductModel; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import("@google/model-viewer")
      .then(() => !cancelled && setReady(true))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
  }, []);

  // Esc and the backdrop both close it; `close` is the one event both routes
  // end at, so the React state is reconciled there rather than in each handler.
  const handleClose = useCallback(() => onClose(), [onClose]);

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current?.close();
      }}
      className="model-dialog"
      aria-label={model.alt}
    >
      <div className="model-dialog-inner">
        {ready && !failed ? (
          <model-viewer
            src={model.src}
            ios-src={model.iosSrc ?? undefined}
            poster={model.poster ?? undefined}
            alt={model.alt}
            ar
            ar-modes="webxr scene-viewer quick-look"
            camera-controls
            touch-action="none"
            shadow-intensity="1"
            exposure="1.05"
            loading="eager"
            camera-orbit="22deg 76deg 118%"
            camera-target="auto auto auto"
            interaction-prompt="none"
            className="model-dialog-viewer"
            style={
              {
                "--poster-color": "transparent",
                "--progress-bar-color": "var(--color-border)",
                "--progress-bar-height": "2px",
              } as CSSProperties
            }
          >
            <button slot="ar-button" className="ar-button" type="button">
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 8V5.5A2.5 2.5 0 0 1 5.5 3H8M16 3h2.5A2.5 2.5 0 0 1 21 5.5V8M21 16v2.5a2.5 2.5 0 0 1-2.5 2.5H16M8 21H5.5A2.5 2.5 0 0 1 3 18.5V16" />
                <path d="m12 8.8 3.4 1.85v3.7L12 16.2l-3.4-1.85v-3.7Z" />
              </svg>
              View in your room
            </button>
          </model-viewer>
        ) : (
          <div className="model-dialog-loading">
            {failed ? "The 3D view could not be loaded." : "Loading 3D view…"}
          </div>
        )}

        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close 3D view"
          className="model-dialog-close"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>

        <p className="model-dialog-hint">Drag to turn</p>
      </div>
    </dialog>
  );
}

/** The badge that marks the 3D thumbnail, as on the reference storefronts. */
export function ModelBadge() {
  return (
    <span
      className="text-on-surface pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 bg-[color:rgb(253_251_248/0.72)]"
      aria-hidden="true"
    >
      <CubeIcon size={22} />
      <span className="text-[10px] tracking-[0.14em] uppercase">3D</span>
    </span>
  );
}
