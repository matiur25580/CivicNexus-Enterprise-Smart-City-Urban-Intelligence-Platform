import type { AuthenticatedPrincipal } from "@civicnexus/contracts";

declare global {
  namespace Express {
    interface Request {
      /**
       * Populated only by a future credential-verification middleware.
       * Never derive this value from caller-controlled headers or request bodies.
       */
      auth?: AuthenticatedPrincipal;
    }
  }
}

export {};
