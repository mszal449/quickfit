export class ApiError extends Error {
  status: number;
  statusText: string;
  detail: string;

  constructor(status: number, statusText: string, detail: string) {
    super(`${status} ${statusText}`);
    this.name = "ApiError";
    this.status = status;
    this.statusText = statusText;
    this.detail = detail;
  }
}

interface ValidationItem {
  loc?: (string | number)[];
  msg?: string;
}

async function parseErrorDetail(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") return body.detail;
    if (Array.isArray(body?.detail)) {
      return (body.detail as ValidationItem[])
        .map((d) => {
          const field = d.loc?.[d.loc.length - 1] ?? "field";
          return `${field}: ${d.msg ?? "invalid"}`;
        })
        .join("; ");
    }
  } catch {
    // body nie był JSON-em — ignoruj
  }
  return res.statusText || "Something went wrong";
}

export function getErrorMessage(e: unknown): string {
  return e instanceof ApiError ? e.detail : "Something went wrong";
}

type RequestConfig = {
  url: string;
  method: string;
  params?: Record<string, unknown>;
  data?: unknown;
  headers?: HeadersInit;
  signal?: AbortSignal;
};

const REFRESH_URL = "/api/auth/refresh";
let refreshPromise: Promise<void> | null = null;

async function runRefresh(): Promise<void> {
  const res = await fetch(REFRESH_URL, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok)
    throw new ApiError(res.status, res.statusText, await parseErrorDetail(res));
}

function refreshOnce(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = runRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function doFetch(
  config: RequestConfig,
  options?: RequestInit,
): Promise<Response> {
  const { url, method, params, data, signal, headers } = config;
  const query = params
    ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
    : "";
  return fetch(`${url}${query}`, {
    ...options,
    method,
    signal,
    credentials: "include",
    headers: { ...headers },
    body:
      data == null
        ? undefined
        : typeof data === "string"
          ? data
          : JSON.stringify(data),
  });
}

export const customFetch = async <T>(
  config: RequestConfig,
  options?: RequestInit,
): Promise<T> => {
  let res = await doFetch(config, options);

  if (res.status === 401 && config.url !== REFRESH_URL) {
    try {
      await refreshOnce();
      res = await doFetch(config, options);
    } catch {
      // propagate 401
    }
  }
  if (res.status === 204) return undefined as T;
  if (!res.ok)
    throw new ApiError(res.status, res.statusText, await parseErrorDetail(res));
  return res.json() as Promise<T>;
};
