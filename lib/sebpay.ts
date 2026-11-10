import crypto from "crypto";

export type SebpayCustomer = {
  email?: string | null;
  name?: string | null;
  phone?: string | null;
};

export type CreateSessionParams = {
  amount: number;
  currency?: string;
  externalReference: string;
  callbackUrl: string;
  redirectUrl: string;
  description?: string;
  customer?: SebpayCustomer;
  metadata?: Record<string, any>;
};

export type SebpaySession = {
  id: string;
  checkout_url?: string;
  transaction_status?: "approved" | "pending" | "rejected" | "failed" | string;
  status?: string;
  amount?: number;
  currency?: string;
  external_reference?: string;
  transaction_id?: string;
  customer?: SebpayCustomer;
  metadata?: Record<string, any>;
  created_at?: string;
  paid_at?: string;
};

function getApiConfig() {
  const apiBase =
    process.env.SEBPAY_API_BASE?.replace(/\/+$/, "") || "https://newapi.sebpay.bj/api/v1";
  const publicKey = process.env.SEBPAY_PUBLIC_KEY;
  const secretKey = process.env.SEBPAY_SECRET_KEY;

  return { apiBase, publicKey, secretKey };
}

function getHeaders(includeSecret = false): Record<string, string> {
  const { publicKey, secretKey } = getApiConfig();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (publicKey) {
    headers["X-Public-Key"] = publicKey;
  }
  if (includeSecret && secretKey) {
    headers["X-Secret-Key"] = secretKey;
    headers["Authorization"] = `Bearer ${secretKey}`;
  }

  return headers;
}

/**
 * Create a Sebpay hosted checkout session.
 */
export async function createSebpayCheckoutSession(
  params: CreateSessionParams
): Promise<{ sessionId: string; checkoutUrl: string; raw: any }> {
  const { apiBase, secretKey } = getApiConfig();
  if (!secretKey) {
    throw new Error("SEBPAY_SECRET_KEY non configurée. Impossible d'initier le paiement Sebpay.");
  }

  const payload = {
    amount: params.amount,
    currency: params.currency || "XOF",
    external_reference: params.externalReference,
    callback_url: params.callbackUrl,
    redirect_url: params.redirectUrl,
    description: params.description,
    customer: params.customer,
    metadata: params.metadata,
  };

  const url = `${apiBase}/checkout/sessions`;
  const response = await fetch(url, {
    method: "POST",
    headers: getHeaders(true),
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg =
      body?.message || body?.error || `Sebpay API error (${response.status} ${response.statusText})`;
    throw new Error(`Échec création session Sebpay: ${errorMsg}`);
  }

  const data = body?.data || body;
  const checkoutUrl = data?.checkout_url || data?.payment_url || data?.url;
  const sessionId = data?.checkout_session_id || data?.session_id || data?.id;

  if (!checkoutUrl) {
    throw new Error("Sebpay n'a pas retourné d'URL de paiement valide.");
  }

  return { sessionId, checkoutUrl, raw: data };
}

/**
 * Retrieve a checkout session by ID from Sebpay API.
 */
export async function getSebpayCheckoutSession(sessionId: string): Promise<SebpaySession> {
  const { apiBase, secretKey } = getApiConfig();
  if (!secretKey) {
    throw new Error("SEBPAY_SECRET_KEY non configurée.");
  }

  const url = `${apiBase}/checkout/sessions/${encodeURIComponent(sessionId)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: getHeaders(true),
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg =
      body?.message || body?.error || `Sebpay API error (${response.status} ${response.statusText})`;
    throw new Error(`Échec récupération session Sebpay (${sessionId}): ${errorMsg}`);
  }

  const data = body?.data || body;
  return {
    id: data?.id || data?.checkout_session_id || sessionId,
    checkout_url: data?.checkout_url,
    transaction_status: data?.transaction_status || data?.status,
    status: data?.status || data?.transaction_status,
    amount: data?.amount,
    currency: data?.currency || "XOF",
    external_reference: data?.external_reference,
    transaction_id: data?.transaction_id || data?.reference,
    customer: data?.customer,
    metadata: data?.metadata,
    created_at: data?.created_at,
    paid_at: data?.paid_at,
  };
}

/**
 * Verify webhook HMAC signature from Sebpay.
 * Header name: X-SebPay-Signature (or X-Sebpay-Signature)
 */
export function verifySebpayWebhookSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret?: string
): boolean {
  const secretKey = secret || process.env.SEBPAY_SECRET_KEY;
  if (!secretKey || !signatureHeader) return false;

  try {
    const computed = crypto.createHmac("sha256", secretKey).update(rawBody).digest("hex");
    const cleanHeader = signatureHeader.trim().toLowerCase();
    const cleanComputed = computed.trim().toLowerCase();

    if (cleanHeader.length !== cleanComputed.length) return false;
    return crypto.timingSafeEqual(Buffer.from(cleanHeader), Buffer.from(cleanComputed));
  } catch {
    return false;
  }
}

