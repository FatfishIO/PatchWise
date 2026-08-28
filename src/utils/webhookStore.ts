import { WebhookConfig, WebhookLog } from "../types";

export async function fetchWebhooksList(): Promise<WebhookConfig[]> {
  try {
    const res = await fetch("/api/webhook/list");
    if (!res.ok) throw new Error("Không thể tải danh sách webhooks.");
    const data = await res.json();
    return data.webhooks || [];
  } catch (err) {
    console.error("fetchWebhooksList error:", err);
    return [];
  }
}

export async function registerNewWebhook(
  repoUrl: string,
  autoComment: boolean = true
): Promise<{ success: boolean; webhook?: WebhookConfig; message?: string; instructions?: string }> {
  try {
    const res = await fetch("/api/webhook/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repoUrl, autoComment }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, message: data.error || "Lỗi đăng ký webhook." };
    }
    return {
      success: true,
      webhook: data.webhook,
      instructions: data.instructions,
    };
  } catch (err: any) {
    return { success: false, message: err?.message || "Lỗi mạng khi đăng ký webhook." };
  }
}

export async function deleteWebhook(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/webhook/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return res.ok;
  } catch (err) {
    console.error("deleteWebhook error:", err);
    return false;
  }
}

export async function toggleWebhookSetting(
  id: string,
  options: { isActive?: boolean; autoComment?: boolean }
): Promise<boolean> {
  try {
    const res = await fetch(`/api/webhook/${encodeURIComponent(id)}/toggle`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options),
    });
    return res.ok;
  } catch (err) {
    console.error("toggleWebhookSetting error:", err);
    return false;
  }
}

export async function triggerTestWebhook(
  webhookId: string,
  prNumber: number = 105,
  prTitle?: string
): Promise<{ success: boolean; message?: string; log?: WebhookLog }> {
  try {
    const res = await fetch("/api/webhook/test-trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webhookId, prNumber, prTitle }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, message: data.error };
    return { success: true, message: data.message, log: data.log };
  } catch (err: any) {
    return { success: false, message: err?.message || "Lỗi trigger thử nghiệm." };
  }
}

export async function fetchWebhookLogs(): Promise<WebhookLog[]> {
  try {
    const res = await fetch("/api/webhook/logs");
    if (!res.ok) return [];
    const data = await res.json();
    return data.logs || [];
  } catch (err) {
    console.error("fetchWebhookLogs error:", err);
    return [];
  }
}
