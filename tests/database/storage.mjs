import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.ok(url, "NEXT_PUBLIC_SUPABASE_URL is required");
assert.ok(key, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required");

const user = createClient(url, key, { auth: { persistSession: false } });
const admin = createClient(url, key, { auth: { persistSession: false } });
const anonymous = createClient(url, key, { auth: { persistSession: false } });

const userId = "00000000-0000-4000-8000-000000000001";
const otherId = "00000000-0000-4000-8000-000000000002";
const ownPath = `${userId}/storage-policy-test/full.png`;
const otherPath = `${otherId}/storage-policy-test/full.png`;
const body = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

const userLogin = await user.auth.signInWithPassword({
  email: process.env.AKIHA_TEST_USER_EMAIL ?? "thu@akiha.local",
  password: process.env.AKIHA_TEST_USER_PASSWORD ?? "akiha-local-user",
});
assert.ifError(userLogin.error);

const adminLogin = await admin.auth.signInWithPassword({
  email: process.env.AKIHA_TEST_ADMIN_EMAIL ?? "vinh@akiha.local",
  password: process.env.AKIHA_TEST_ADMIN_PASSWORD ?? "akiha-local-admin",
});
assert.ifError(adminLogin.error);

await user.storage.from("moments").remove([ownPath]);

const ownUpload = await user.storage.from("moments").upload(ownPath, body, {
  contentType: "image/png",
  upsert: false,
});
assert.ifError(ownUpload.error);

const otherUpload = await user.storage.from("moments").upload(otherPath, body, {
  contentType: "image/png",
  upsert: false,
});
assert.ok(otherUpload.error, "A user must not upload outside their UUID prefix");

const anonymousRead = await anonymous.storage.from("moments").download(ownPath);
assert.ok(anonymousRead.error, "The private moments bucket must reject anonymous reads");

const signed = await user.storage.from("moments").createSignedUrl(ownPath, 60);
assert.ifError(signed.error);
const signedResponse = await fetch(signed.data.signedUrl);
assert.equal(signedResponse.status, 200);

const adminRead = await admin.storage.from("moments").download(ownPath);
assert.ifError(adminRead.error);

const cleanup = await user.storage.from("moments").remove([ownPath]);
assert.ifError(cleanup.error);

console.log("PASS storage policies: owner upload/read, private anonymous access, admin read, and cleanup");

