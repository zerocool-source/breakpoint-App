// Empty placeholder for real HOA data
export const hoaList: string[] = [
  // Waiting for user data...
];

// Function to deduplicate list if needed later
export function getUniqueHOAs(list: string[]): string[] {
  return Array.from(new Set(list)).sort();
}
