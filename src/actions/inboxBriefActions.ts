"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/src/lib/auth";
import {
  createTodayInboxBriefForUser,
  getLatestTodayInboxBriefForUser,
  type InboxBrief,
} from "@/src/ai/features/todayInboxBrief";

export type InboxBriefActionResult =
  | {
      success: true;
      brief: InboxBrief;
    }
  | {
      success: false;
      error: string;
    };

export async function getLatestTodayInboxBrief() {
  const userId = await requireUserId();
  return getLatestTodayInboxBriefForUser(userId);
}

export async function createTodayInboxBrief(): Promise<InboxBriefActionResult> {
  try {
    const userId = await requireUserId();
    const brief = await createTodayInboxBriefForUser(userId);

    revalidatePath("/");

    return {
      success: true,
      brief,
    };
  } catch (error) {
    console.error("Error creating inbox brief:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not create the inbox brief.",
    };
  }
}
