/**
 * Service worker. Every network call (license, AI, adapter auto-update) must
 * originate here, never in the content script (CORS + credentials).
 */
import { defineBackground } from "wxt/utils/define-background";

export default defineBackground(() => {
  // Intentionally empty in Phase 0.
});
