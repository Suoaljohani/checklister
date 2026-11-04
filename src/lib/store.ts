import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { defaultSettings, seedChecklists, seedDepartments } from "./seed";
import type { Checklist, Department, Employee, EntityName, Settings, Submission } from "./types";

type Row = Department | Checklist | Submission | Employee;
type EntityMap = { departments: Department; checklists: Checklist; submissions: Submission; employees: Employee };

export type SubmissionQuery = {
  checklist_id?: string;
  department_id?: string;
  from?: string;
  to?: string;
  withSignature?: boolean;
  limit?: number;
};

interface Store {
  list<E extends EntityName>(entity: E): Promise<EntityMap[E][]>;
  get<E extends EntityName>(entity: E, id: string): Promise<EntityMap[E] | null>;
  insert<E extends EntityName>(entity: E, row: EntityMap[E]): Promise<EntityMap[E]>;
  update<E extends EntityName>(entity: E, id: string, patch: Partial<EntityMap[E]>): Promise<EntityMap[E] | null>;
  remove(entity: EntityName, id: string): Promise<void>;
  submissions(q: SubmissionQuery): Promise<Submission[]>;
  getSettings(): Promise<Settings>;
  putSettings(s: Settings): Promise<Settings>;
}

const ORDER: Record<EntityName, { col: string; asc: boolean }> = {
  departments: { col: "sort", asc: true },
  checklists: { col: "sort", asc: true },
  submissions: { col: "submitted_at", asc: false },
  employees: { col: "name", asc: true },
};

function sortRows<T extends Row>(entity: EntityName, rows: T[]): T[] {
  const { col, asc } = ORDER[entity];
  return [...rows].sort((a, b) => {
    const av = (a as Record<string, unknown>)[col] as string | number;
    const bv = (b as Record<string, unknown>)[col] as string | number;
    if (av === bv) return 0;
    return (av > bv ? 1 : -1) * (asc ? 1 : -1);
  });
}

/* ---------------- Supabase (production) ---------------- */

/**
 * Talks to Postgres only through SECURITY DEFINER functions (supabase/migrations/0002_rpc_api.sql)
 * that check CHK_DB_SECRET, so the tables stay closed even to someone holding the public key.
 */
class SupabaseStore implements Store {
  constructor(
    private db: SupabaseClient,
    private secret: string,
  ) {}

  private async call<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
    const { data, error } = await this.db.rpc(fn, { p_secret: this.secret, ...args });
    if (error) throw new Error(`${fn}: ${error.message}`);
    return data as T;
  }

  list<E extends EntityName>(entity: E) {
    return this.call<EntityMap[E][]>("chk_list", { p_table: entity });
  }
  get<E extends EntityName>(entity: E, id: string) {
    return this.call<EntityMap[E] | null>("chk_get", { p_table: entity, p_id: id });
  }
  insert<E extends EntityName>(entity: E, row: EntityMap[E]) {
    return this.call<EntityMap[E]>("chk_insert", { p_table: entity, p_row: row });
  }
  update<E extends EntityName>(entity: E, id: string, patch: Partial<EntityMap[E]>) {
    return this.call<EntityMap[E] | null>("chk_update", { p_table: entity, p_id: id, p_patch: patch });
  }
  async remove(entity: EntityName, id: string) {
    await this.call("chk_delete", { p_table: entity, p_id: id });
  }
  submissions(q: SubmissionQuery) {
    return this.call<Submission[]>("chk_submissions", { p_filter: q });
  }
  async getSettings() {
    const v = await this.call<Partial<Settings> | null>("chk_settings_get");
    return { ...defaultSettings, ...(v ?? {}) };
  }
  async putSettings(s: Settings) {
    await this.call("chk_settings_put", { p_value: s });
    return s;
  }
}

/* ---------------- JSON file (local / demo) ---------------- */

type FileDb = {
  departments: Department[];
  checklists: Checklist[];
  submissions: Submission[];
  employees: Employee[];
  settings: Settings;
};

class FileStore implements Store {
  private file = path.join(process.env.VERCEL ? "/tmp" : path.join(process.cwd(), ".data"), "db.json");
  private cache: FileDb | null = null;
  private queue: Promise<unknown> = Promise.resolve();

  private async read(): Promise<FileDb> {
    if (this.cache) return this.cache;
    try {
      this.cache = JSON.parse(await fs.readFile(this.file, "utf8")) as FileDb;
      this.cache.employees ??= [];
    } catch {
      this.cache = {
        departments: seedDepartments,
        checklists: seedChecklists,
        submissions: [],
        employees: [],
        settings: defaultSettings,
      };
      await this.flush();
    }
    return this.cache;
  }
  private async flush() {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(this.cache));
  }
  private write<T>(fn: (db: FileDb) => T): Promise<T> {
    const run = this.queue.then(async () => {
      const db = await this.read();
      const out = fn(db);
      await this.flush();
      return out;
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  async list<E extends EntityName>(entity: E) {
    const db = await this.read();
    return sortRows(entity, db[entity] as Row[]) as EntityMap[E][];
  }
  async get<E extends EntityName>(entity: E, id: string) {
    const db = await this.read();
    return ((db[entity] as Row[]).find((r) => r.id === id) as EntityMap[E]) ?? null;
  }
  insert<E extends EntityName>(entity: E, row: EntityMap[E]) {
    return this.write((db) => {
      (db[entity] as Row[]).push(row);
      return row;
    });
  }
  update<E extends EntityName>(entity: E, id: string, patch: Partial<EntityMap[E]>) {
    return this.write((db) => {
      const rows = db[entity] as Row[];
      const i = rows.findIndex((r) => r.id === id);
      if (i < 0) return null;
      rows[i] = { ...rows[i], ...patch, id } as Row;
      return rows[i] as EntityMap[E];
    });
  }
  remove(entity: EntityName, id: string) {
    return this.write((db) => {
      (db as Record<EntityName, Row[]>)[entity] = (db[entity] as Row[]).filter((r) => r.id !== id);
      if (entity === "checklists") db.submissions = db.submissions.filter((s) => s.checklist_id !== id);
      if (entity === "departments") {
        const gone = new Set(db.checklists.filter((c) => c.department_id === id).map((c) => c.id));
        db.checklists = db.checklists.filter((c) => c.department_id !== id);
        db.submissions = db.submissions.filter((s) => !gone.has(s.checklist_id));
      }
    });
  }
  async submissions(q: SubmissionQuery) {
    const db = await this.read();
    const rows = db.submissions
      .filter(
        (s) =>
          (!q.checklist_id || s.checklist_id === q.checklist_id) &&
          (!q.department_id || s.department_id === q.department_id) &&
          (!q.from || s.submitted_at >= q.from) &&
          (!q.to || s.submitted_at < q.to),
      )
      .sort((a, b) => (a.submitted_at < b.submitted_at ? 1 : -1))
      .slice(0, q.limit ?? 5000);
    return q.withSignature ? rows : rows.map((r) => ({ ...r, signature: "", photos: {} }));
  }
  async getSettings() {
    const db = await this.read();
    return { ...defaultSettings, ...db.settings };
  }
  putSettings(s: Settings) {
    return this.write((db) => {
      db.settings = s;
      return s;
    });
  }
}

const SB_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const g = globalThis as unknown as { __store?: Store };

export function backend(): "supabase" | "file" {
  return SB_URL && SB_KEY && process.env.CHK_DB_SECRET ? "supabase" : "file";
}

export function store(): Store {
  if (g.__store) return g.__store;
  g.__store =
    backend() === "supabase"
      ? new SupabaseStore(
          createClient(SB_URL!, SB_KEY!, { auth: { persistSession: false } }),
          process.env.CHK_DB_SECRET!,
        )
      : new FileStore();
  return g.__store;
}
