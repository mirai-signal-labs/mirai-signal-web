import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "mirai2026signaladmin";
const AUTH_COOKIE = "admin_auth";

// 管理画面にログイン済みかどうかを判定する
export async function isAdminAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return store.get(AUTH_COOKIE)?.value === "1";
}

// ログインフォームから呼ばれるServer Action
export async function login(formData: FormData) {
  "use server";
  const password = formData.get("password");
  if (password === ADMIN_PASSWORD) {
    const store = await cookies();
    store.set(AUTH_COOKIE, "1", { httpOnly: true, path: "/" });
  }
  redirect("/admin");
}

// ログアウトボタンから呼ばれるServer Action
export async function logout() {
  "use server";
  const store = await cookies();
  store.delete(AUTH_COOKIE);
  redirect("/admin");
}