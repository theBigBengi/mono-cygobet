// Temporary type declarations for expo-secure-store
// This file can be removed after running: pnpm add expo-secure-store
declare module "expo-secure-store" {
  export function getItemAsync(key: string): Promise<string | null>;
  export function setItemAsync(key: string, value: string): Promise<void>;
  export function deleteItemAsync(key: string): Promise<void>;
}
