// Small client-side helpers for calling the JSON API.
export type ApiResult<T> = { data?: T; error?: string; status: number };

async function call<T>(method: string, url: string, body?: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { error: (json as { error?: string }).error || "Something went wrong", status: res.status };
    return { data: json as T, status: res.status };
  } catch {
    return { error: "Network error. Check your connection and try again.", status: 0 };
  }
}

export const getJSON = <T,>(url: string) => call<T>("GET", url);
export const postJSON = <T = unknown,>(url: string, body?: unknown) => call<T>("POST", url, body ?? {});
export const patchJSON = <T = unknown,>(url: string, body?: unknown) => call<T>("PATCH", url, body ?? {});
export const putJSON = <T = unknown,>(url: string, body?: unknown) => call<T>("PUT", url, body ?? {});
export const deleteJSON = <T = unknown,>(url: string) => call<T>("DELETE", url);
