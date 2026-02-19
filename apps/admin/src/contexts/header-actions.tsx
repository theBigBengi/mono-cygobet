import { createContext, useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";

const HeaderPortalContext = createContext<HTMLDivElement | null>(null);

export const HeaderPortalProvider = HeaderPortalContext.Provider;

/**
 * Renders children into the header bar's right-side slot via a React portal.
 * Must be used inside a route rendered within AdminLayout.
 */
export function HeaderActions({ children }: { children: ReactNode }) {
  const target = useContext(HeaderPortalContext);
  if (!target) return null;
  return createPortal(children, target);
}
