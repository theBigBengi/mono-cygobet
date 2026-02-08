import { createContext, useContext, type ReactNode } from "react";
import { useAvailability } from "@/hooks/use-availability";

interface ProviderContextValue {
  name: string;
  isLoading: boolean;
}

const ProviderContext = createContext<ProviderContextValue>({
  name: "Provider",
  isLoading: true,
});

export function ProviderProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = useAvailability();

  return (
    <ProviderContext.Provider
      value={{
        name: data?.data?.provider ?? "Provider",
        isLoading,
      }}
    >
      {children}
    </ProviderContext.Provider>
  );
}

export function useProvider() {
  return useContext(ProviderContext);
}
