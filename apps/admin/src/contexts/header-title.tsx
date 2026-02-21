import { createContext, useContext, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

export type HeaderTitleConfig = {
  title: string;
  onBack?: () => void;
} | null;

const HeaderTitleContext = createContext<
  (config: HeaderTitleConfig) => void
>(() => {});

export const HeaderTitleProvider = HeaderTitleContext.Provider;

/**
 * Override the AppBar title from a child page.
 * Automatically cleans up on unmount.
 */
export function useHeaderTitle(title: string, backTo?: string | -1) {
  const set = useContext(HeaderTitleContext);
  const navigate = useNavigate();

  const onBack = useCallback(() => {
    if (backTo === -1) {
      navigate(-1);
    } else if (typeof backTo === "string") {
      navigate(backTo);
    }
  }, [backTo, navigate]);

  useEffect(() => {
    set({ title, onBack: backTo != null ? onBack : undefined });
    return () => set(null);
  }, [title, backTo, onBack, set]);
}
