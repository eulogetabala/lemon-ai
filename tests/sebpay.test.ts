import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { verifySebpayWebhookSignature } from "../lib/sebpay.ts";

test("verifySebpayWebhookSignature validates valid HMAC SHA-256 signature", () => {
  const secretKey = "test_secret_key_12345";
  const payload = JSON.stringify({
    event: "payment.approved",
    transaction_id: "tx_999",
    status: "approved",
  });

  const validSignature = crypto
    .createHmac("sha256", secretKey)
    .update(payload)
    .digest("hex");

  const isValid = verifySebpayWebhookSignature(payload, validSignature, secretKey);
  assert.equal(isValid, true);
});

test("verifySebpayWebhookSignature rejects altered payload or wrong signature", () => {
  const secretKey = "test_secret_key_12345";
  const payload = JSON.stringify({ status: "approved" });
  const fakeSignature = "deadbeef1234567890abcdef";

  const isValid = verifySebpayWebhookSignature(payload, fakeSignature, secretKey);
  assert.equal(isValid, false);
});

