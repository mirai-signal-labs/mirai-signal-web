"use server";

import { revalidatePath } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";

async function updateArticleStatus(
  id: string,
  status: "approved" | "rejected",
): Promise<void> {
  if (!id) {
    throw new Error("記事IDが指定されていません。");
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("articles")
    .update({ status })
    .eq("id", id);

  if (error) {
    throw error;
  }

  revalidatePath("/");
}

export async function approveArticle(formData: FormData): Promise<void> {
  const id = formData.get("id");
  if (typeof id !== "string") {
    throw new Error("記事IDが指定されていません。");
  }

  await updateArticleStatus(id, "approved");
}

export async function rejectArticle(formData: FormData): Promise<void> {
  const id = formData.get("id");
  if (typeof id !== "string") {
    throw new Error("記事IDが指定されていません。");
  }

  await updateArticleStatus(id, "rejected");
}
