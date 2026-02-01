import { useQuery } from "@tanstack/react-query";
import { sandboxService } from "@/services/sandbox.service";

export function useSandboxList() {
  return useQuery({
    queryKey: ["sandbox", "list"],
    queryFn: () => sandboxService.list(),
    staleTime: 10_000,
  });
}
