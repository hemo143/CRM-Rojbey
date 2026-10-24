// Browser-only derivation: passwords never leave the page or enter storage.
export const ACCOUNT_ITERATIONS = 600_000;
export async function deriveAccount(
  id: string,
  name: string,
  password: string,
) {
  if (!/^[A-Za-z0-9_.@-]{1,100}$/.test(id) || !name.trim() || name.length > 120)
    throw Error("اكتب اسم دخول بالإنجليزية واسم عرض صحيحًا");
  if (password.length < 12 || password.length > 1024)
    throw Error("كلمة المرور من ١٢ إلى ١٠٢٤ حرفًا");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const hash = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: ACCOUNT_ITERATIONS },
    key,
    256,
  );
  const hex = (bytes: Uint8Array) =>
    Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return {
    id,
    name: name.trim(),
    role: "admin",
    passwordHash: `pbkdf2-sha256:${ACCOUNT_ITERATIONS}:${hex(salt)}:${hex(new Uint8Array(hash))}`,
  };
}
