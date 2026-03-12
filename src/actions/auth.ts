"use server";

import { login as libLogin, logout as libLogout } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
    const password = formData.get("password") as string;
    const success = await libLogin(password || "");
    if (success) {
        redirect("/admin");
    }
    return { error: "Incorrect password" };
}

export async function logoutAction() {
    await libLogout();
    redirect("/login");
}
