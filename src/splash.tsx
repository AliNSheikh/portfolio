import { useEffect, useRef } from "react";
import type { SiteDocument } from "./model";

/** Closed in server HTML, so the full page remains readable without JavaScript. */
export function SplashScreen({
  settings,
  src,
  scope,
}: {
  settings: SiteDocument["splash"];
  src: string;
  scope: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const finish = useRef<() => void>(() => {});

  useEffect(() => {
    const modal = dialog.current,
      player = video.current;
    if (
      !settings.enabled ||
      !src ||
      !modal ||
      !player ||
      typeof modal.showModal !== "function" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;

    const key = `portfolio-splash:${scope}:${src}`;
    try {
      if (settings.frequency === "session" && sessionStorage.getItem(key))
        return;
    } catch {
      /* The intro still works with browser storage disabled. */
    }

    const previousOverflow = document.body.style.overflow;
    let exiting = false;
    let closed = false;
    let fadeTimer: ReturnType<typeof setTimeout> | undefined;
    const close = () => {
      closed = true;
      player.pause();
      modal.close();
      document.body.style.overflow = previousOverflow;
    };
    const dismiss = () => {
      if (exiting || closed) return;
      exiting = true;
      player.pause();
      modal.classList.add("splash-leaving");
      fadeTimer = setTimeout(close, 240);
    };
    finish.current = dismiss;
    modal.classList.remove("splash-leaving");
    modal.showModal();
    document.body.style.overflow = "hidden";
    try {
      sessionStorage.setItem(key, "seen");
    } catch {
      /* Optional storage. */
    }

    // Never strand a visitor behind an unavailable, stalled, or overlong video.
    const limitTimer = setTimeout(dismiss, settings.maxSeconds * 1000);
    player.muted = true;
    player.currentTime = 0;
    void player.play().catch(dismiss);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotionChange = () => {
      if (motion.matches) dismiss();
    };
    motion.addEventListener("change", onMotionChange);
    return () => {
      clearTimeout(limitTimer);
      clearTimeout(fadeTimer);
      motion.removeEventListener("change", onMotionChange);
      finish.current = () => {};
      close();
    };
  }, [settings.enabled, settings.frequency, settings.maxSeconds, src, scope]);

  if (!settings.enabled || !src) return null;
  return (
    <dialog
      ref={dialog}
      className="splash-screen"
      style={{ backgroundColor: settings.background }}
      aria-label="Welcome introduction"
      onCancel={(event) => {
        event.preventDefault();
        finish.current();
      }}
    >
      <video
        ref={video}
        src={src}
        muted
        playsInline
        preload="none"
        disablePictureInPicture
        aria-hidden="true"
        onEnded={() => finish.current()}
        onError={() => finish.current()}
      />
      <button
        className="splash-skip"
        type="button"
        onClick={() => finish.current()}
      >
        {settings.skipLabel || "Skip intro"} <span aria-hidden="true">↗</span>
      </button>
    </dialog>
  );
}
