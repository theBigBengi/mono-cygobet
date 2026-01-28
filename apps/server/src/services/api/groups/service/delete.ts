// groups/service/delete.ts
// Delete group service.

import { assertGroupCreator } from "../permissions";
import { repository as repo } from "../repository";

/**
 * Delete a group.
 * - Verifies that the user is the creator.
 * - Deletes the group and all related records (CASCADE).
 * - Returns success message.
 */
export async function deleteGroup(
  id: number,
  creatorId: number
): Promise<{ status: "success"; message: string }> {
  // Verify group exists and user is creator
  await assertGroupCreator(id, creatorId);

  // Delete the group (CASCADE will delete all related records)
  await repo.deleteGroup(id);

  return {
    status: "success",
    message: "Group deleted successfully",
  };
}
