import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const USER_ID = "00000000-0000-4000-8000-000000000001";

function psql(sql) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["exec", "-i", "supabase_db_akiha", "psql", "-U", "postgres", "-d", "postgres", "-Atq", "-v", "ON_ERROR_STOP=1"], { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = ""; let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("exit", (code) => resolve({ code: code ?? 1, stdout, stderr }));
    child.stdin.end(sql);
  });
}

function asUser(requestId) {
  return `
    set role authenticated;
    set "request.jwt.claim.sub" = '${USER_ID}';
    set "request.jwt.claim.role" = 'authenticated';
    select public.create_couple_moment(
      public.local_today(), 'concurrency',
      jsonb_build_object(
        'full_path', '${USER_ID}/' || public.local_today() || '/${requestId}/full.webp',
        'thumb_path', '${USER_ID}/' || public.local_today() || '/${requestId}/thumb.webp',
        'mime_type', 'image/webp', 'width', 10, 'height', 10, 'size_bytes', 10
      ), '${requestId}'
    );
  `;
}

const ids = ["00000000-0000-4000-8000-000000000091", "00000000-0000-4000-8000-000000000092", "00000000-0000-4000-8000-000000000093"];
await psql(`delete from public.protected_days where user_id='${USER_ID}' and local_date=public.local_today(); delete from public.checkins where user_id='${USER_ID}' and local_date=public.local_today();`);

try {
  const duplicate = await Promise.all([psql(asUser(ids[0])), psql(asUser(ids[0]))]);
  duplicate.forEach((entry) => assert.equal(entry.code, 0, entry.stderr));
  const countAfterRetry = await psql(`select count(*) from public.checkins where user_id='${USER_ID}' and local_date=public.local_today();`);
  assert.equal(Number(countAfterRetry.stdout.trim()), 1);

  const distinct = await Promise.all([psql(asUser(ids[1])), psql(asUser(ids[2]))]);
  distinct.forEach((entry) => assert.equal(entry.code, 0, entry.stderr));
  const countAfterDistinct = await psql(`select count(*) from public.checkins where user_id='${USER_ID}' and local_date=public.local_today();`);
  assert.equal(Number(countAfterDistinct.stdout.trim()), 3);
  console.log("PASS moment concurrency: retries deduplicate while distinct captures are preserved");
} finally {
  await psql(`delete from public.checkins where user_id='${USER_ID}' and local_date=public.local_today();`);
}
