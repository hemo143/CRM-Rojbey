import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { seed, type Data } from "./domain";
// Implement this contract for Google Sheets/PostgreSQL. No provider silently falls back.
export interface CrmRepository {
  read(): Promise<Data>;
  mutate<T>(fn: (data: Data) => T): Promise<T>;
}
let queue: Promise<unknown> = Promise.resolve();
class LocalRepository implements CrmRepository {
  private file = path.join(
    process.env.CRM_DATA_DIR || path.join(process.cwd(), ".data"),
    "crm.json",
  );
  private async load(): Promise<Data> {
    try {
      return JSON.parse(await readFile(this.file, "utf8"));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      const data = seed();
      await this.save(data);
      return data;
    }
  }
  private async save(data: Data) {
    await mkdir(path.dirname(this.file), { recursive: true, mode: 0o700 });
    const tmp = this.file + ".tmp";
    await writeFile(tmp, JSON.stringify(data, null, 2), { mode: 0o600 });
    await rename(tmp, this.file);
  }
  async read() {
    return this.mutate((data) => structuredClone(data));
  }
  async mutate<T>(fn: (data: Data) => T): Promise<T> {
    const operation = queue.then(async () => {
      const data = await this.load();
      const result = fn(data);
      await this.save(data);
      return result;
    });
    queue = operation.catch(() => {});
    return operation;
  }
}
const local = new LocalRepository();
export function repository(): CrmRepository {
  const provider = process.env.CRM_DATA_PROVIDER || "local";
  if (provider !== "local")
    throw Error(
      "ربط Google Sheets غير مُعدّ بعد؛ لا يوجد تحويل تلقائي للبيانات المحلية.",
    );
  return local;
}
