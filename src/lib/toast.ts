import { toast } from "sonner";

/**
 * Single shared entry point for the app's toast feedback (success/error
 * confirmations), per the UI redesign's bottom-center pill spec — see
 * src/components/ui/sonner.tsx for the actual styling/position/duration.
 *
 * Call this instead of importing `sonner` directly, so every screen's
 * feedback stays visually and behaviorally consistent from one place.
 */
export function showToast(message: string): void {
  toast(message);
}
