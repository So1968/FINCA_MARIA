const DEFAULT_TIMEOUT_MS = 12000;

export class FincaGatewayError extends Error {
  constructor(message, { status = 0, body = null, code = "GATEWAY_ERROR" } = {}) {
    super(message);
    this.name = "FincaGatewayError";
    this.status = status;
    this.body = body;
    this.code = code;
  }
}

export function getFincaApiBaseUrl() {
  return String(import.meta.env.VITE_FINCA_API_URL || "").trim().replace(/\/+$/, "");
}

export function isFincaRemoteConfigured() {
  return Boolean(getFincaApiBaseUrl());
}

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

export function createFincaDataGateway({
  baseUrl = getFincaApiBaseUrl(),
  getToken = () => "",
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS
} = {}) {
  const root = normalizeBaseUrl(baseUrl);

  if (typeof fetchImpl !== "function") {
    throw new FincaGatewayError("Aucun client HTTP disponible.", { code: "NO_FETCH" });
  }

  async function request(path, { method = "GET", body, token, headers = {} } = {}) {
    if (!root) {
      throw new FincaGatewayError("API FINCA MARIA non configurée.", { code: "API_NOT_CONFIGURED" });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const activeToken = token === undefined ? getToken() : token;
    const requestHeaders = { Accept: "application/json", ...headers };

    if (body !== undefined) requestHeaders["Content-Type"] = "application/json";
    if (activeToken) requestHeaders.Authorization = `Bearer ${activeToken}`;

    let response;
    try {
      response = await fetchImpl(`${root}${path}`, {
        method,
        headers: requestHeaders,
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: "no-store",
        signal: controller.signal
      });
    } catch (error) {
      const timedOut = error?.name === "AbortError";
      throw new FincaGatewayError(
        timedOut ? "Le serveur FINCA MARIA ne répond pas." : "Connexion au serveur FINCA MARIA impossible.",
        { code: timedOut ? "TIMEOUT" : "NETWORK_ERROR" }
      );
    } finally {
      clearTimeout(timer);
    }

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      throw new FincaGatewayError(
        payload?.error || `Erreur serveur ${response.status}`,
        { status: response.status, body: payload, code: payload?.code || "HTTP_ERROR" }
      );
    }

    return payload;
  }

  return {
    baseUrl: root,
    configured: Boolean(root),

    health() {
      return request("/health", { token: "" });
    },

    login({ name, code }) {
      return request("/api/auth/login", {
        method: "POST",
        token: "",
        body: { name: String(name || "").trim(), code: String(code || "") }
      });
    },

    bootstrap() {
      return request("/api/bootstrap");
    },

    saveReservation(reservation) {
      return request("/api/reservations", { method: "POST", body: reservation });
    },

    deleteReservation(id) {
      return request(`/api/reservations/${encodeURIComponent(id)}`, { method: "DELETE" });
    },

    setRoomReady(room, ready) {
      return request(`/api/room-ready/${encodeURIComponent(room)}`, {
        method: "PUT",
        body: { ready: Boolean(ready) }
      });
    },

    setSharedState(key, value, revision) {
      return request(`/api/state/${encodeURIComponent(key)}`, {
        method: "PUT",
        body: revision === undefined ? { value } : { value, revision }
      });
    }
  };
}
