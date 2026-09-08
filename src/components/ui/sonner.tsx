"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

// Styled per the UI redesign handoff: dark bg, white text, pill radius,
// bottom-center, short auto-dismiss — not sonner's default corner-toast
// look. position/duration are set here (not left to the caller) so every
// showToast() call in the app is visually consistent; `richColors`/variant
// icons are intentionally unused since the redesign's toast is a single
// plain message pill, not a colored severity indicator.
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-center"
      duration={1800}
      style={
        {
          "--normal-bg": "var(--ink-mid)",
          "--normal-text": "white",
          "--normal-border": "transparent",
          "--border-radius": "var(--radius-pill)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast !shadow-lg !px-5 !py-2.5 !text-[13px] !justify-center !w-fit !mx-auto",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
