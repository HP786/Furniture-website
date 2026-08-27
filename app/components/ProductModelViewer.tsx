"use client";

import { useEffect, useState, type CSSProperties } from "react";

/**
 * The 3D slide in the gallery.
 *
 * `model-viewer` is a web component of about half a megabyte, so it is
 * imported on mount rather than bundled into the page: a product without a
 * model never pays for it, and a product with one loads it while the
 * photographs are already on screen.
 *
 * The .glb comes from Shopify; so does the .usdz it derives for iOS, which is
 * what lets the AR button place the piece in a real room.
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
  /** The .usdz iOS needs for AR, when Shopify has derived one. */
  iosSrc: string | null;
  poster: string | null;
  alt: string;
};

export function ProductModelViewer({ model }: { model: ProductModel }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import("@google/model-viewer")
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Until the component is defined the poster stands in, so the slide is never
  // an empty box — and if the module fails to load, the poster simply stays.
  if (!ready || failed) {
    return (
      <div className="bg-surface-secondary relative aspect-[4/5] overflow-hidden rounded-lg">
        {model.poster ? (
          <img
            src={model.poster}
            alt={model.alt}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : null}
        {!failed ? (
          <span className="text-sand-700 absolute inset-x-0 bottom-4 text-center text-[13px]">
            Loading 3D view…
          </span>
        ) : null}
      </div>
    );
  }

  // The wrapper owns the aspect ratio and the viewer fills it: model-viewer
  // sizes its canvas from a definite height, and an aspect-ratio alone does
  // not give it one — the model ends up adrift at the top of the pane.
  return (
    <div className="aspect-[4/5] w-full">
    <model-viewer
      src={model.src}
      ios-src={model.iosSrc ?? undefined}
      poster={model.poster ?? undefined}
      alt={model.alt}
      ar
      ar-modes="webxr scene-viewer quick-look"
      camera-controls
      touch-action="pan-y"
      shadow-intensity="1"
      exposure="1.05"
      loading="eager"



      camera-orbit="22deg 76deg 118%"
      camera-target="auto auto auto"
      interaction-prompt="none"
      className="bg-surface-secondary block h-full w-full overflow-hidden rounded-lg"
      style={
        {
          "--poster-color": "transparent",
          "--progress-bar-color": "var(--color-border)",
          "--progress-bar-height": "2px",
        } as CSSProperties
      }
    />
    </div>
  );
}

/** The badge that marks the 3D thumbnail, as on the reference storefronts. */
export function ModelBadge() {
  return (
    <span
      className="text-on-surface pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 bg-[color:rgb(253_251_248/0.72)]"
      aria-hidden="true"
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2.8 21 7.6v8.8L12 21.2 3 16.4V7.6Z" />
        <path d="M3 7.6 12 12.4l9-4.8M12 12.4v8.8" />
      </svg>
      <span className="text-[10px] tracking-[0.14em] uppercase">3D</span>
    </span>
  );
}
