import { AsyncLocalStorage } from 'node:async_hooks';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { createClient } from '@libsql/client/http';
import type { Client, Transaction } from '@libsql/client';
import { initialState } from '../src/lib/model.ts';
import type { Mission, Submission, State } from '../src/lib/model.ts';
import type { LeaderboardData } from '../src/lib/leaderboard.ts';

export type Member = {
  wallet: string;
  name: string;
  chain: number;
  x_id: string | null;
  x_username: string | null;
  x_name: string | null;
  x_avatar: string | null;
  tokens: string | null;
  created_at: string;
  linked_at: string | null;
};
export type Session = { id: string; wallet: string | null; csrf: string; expires: number };
type Row = Record<string, unknown>;
type Arg = string | number | null;
const schema = [
  'CREATE TABLE IF NOT EXISTS members(wallet TEXT PRIMARY KEY, name TEXT NOT NULL, chain INTEGER NOT NULL, x_id TEXT UNIQUE, x_username TEXT, x_name TEXT, x_avatar TEXT, tokens TEXT, created_at TEXT NOT NULL, linked_at TEXT)',
  'CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, wallet TEXT, csrf TEXT NOT NULL, expires INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS challenges(session TEXT PRIMARY KEY, message TEXT NOT NULL, expires INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS oauth(state TEXT PRIMARY KEY, session TEXT NOT NULL, wallet TEXT NOT NULL, verifier TEXT NOT NULL, expires INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS token_refresh_locks(wallet TEXT PRIMARY KEY, owner TEXT NOT NULL, expires INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS missions(id TEXT PRIMARY KEY, data TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS deleted_missions(id TEXT PRIMARY KEY, deleted_at TEXT NOT NULL, deleted_by TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS mission_visits(id TEXT PRIMARY KEY, wallet TEXT NOT NULL REFERENCES members(wallet), mission_id TEXT NOT NULL, mission_version TEXT NOT NULL, started_at INTEGER NOT NULL, expires INTEGER NOT NULL, submission_id TEXT)',
  'CREATE TABLE IF NOT EXISTS submissions(id TEXT PRIMARY KEY, wallet TEXT NOT NULL REFERENCES members(wallet), evidence TEXT NOT NULL UNIQUE, data TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, subject TEXT NOT NULL, at TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS schema_migrations(id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)',
];

export class OrderDatabase {
  private local?: DatabaseSync;
  private client?: Client;
  private scope = new AsyncLocalStorage<{ remote?: Transaction; local?: true }>();
  private queue: Promise<void> = Promise.resolve();

  // AsyncLocalStorage keeps concurrent requests out of each other's transactions.
  readonly db = {
    prepare: (sql: string) => ({
      get: async (...args: Arg[]) => (await this.execute(sql, args, 'get'))[0],
      all: async (...args: Arg[]) => this.execute(sql, args, 'all'),
      run: async (...args: Arg[]) => {
        await this.execute(sql, args, 'run');
      },
    }),
    close: () => {
      this.local?.close();
      this.client?.close();
    },
  };

  private constructor() {}

  static async open(file: string, authToken?: string, client?: Client) {
    const database = new OrderDatabase();
    if (client) database.client = client;
    else if (/^(libsql|https):\/\//.test(file)) {
      database.client = createClient({ url: file, authToken, intMode: 'number' });
    } else {
      if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
      const { DatabaseSync } = await import('node:sqlite');
      database.local = new DatabaseSync(file);
      database.local.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
    }
    try {
      if (database.client) await database.client.batch(schema, 'write');
      await database.transaction(async () => {
        if (!database.client) {
          for (const statement of schema) await database.db.prepare(statement).run();
        }
        const memberColumns = await database.db.prepare('PRAGMA table_info(members)').all();
        if (!memberColumns.some((column) => column.name === 'x_avatar')) {
          await database.db.prepare('ALTER TABLE members ADD COLUMN x_avatar TEXT').run();
        }
        const cleanupId = 'retire-genesis-examples-v1';
        if (
          !(await database.db.prepare('SELECT id FROM schema_migrations WHERE id=?').get(cleanupId))
        ) {
          const missions = await database.missions();
          for (const example of initialState().missions) {
            const current = missions.find((mission) => mission.id === example.id);
            if (!current || current.title !== example.title) continue;
            await database.db.prepare('DELETE FROM missions WHERE id=?').run(current.id);
            await database.audit('system', 'retire_example_mission', current.id);
          }
          await database.db
            .prepare('INSERT INTO schema_migrations(id,applied_at) VALUES(?,?)')
            .run(cleanupId, new Date().toISOString());
        }
      });
      return database;
    } catch (error) {
      database.db.close();
      throw error;
    }
  }

  private async exclusive<T>(fn: () => Promise<T>): Promise<T> {
    const previous = this.queue;
    let release!: () => void;
    this.queue = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await fn();
    } finally {
      release();
    }
  }

  private async execute(sql: string, args: Arg[], mode: 'get' | 'all' | 'run'): Promise<Row[]> {
    if (this.client) {
      const transaction = this.scope.getStore()?.remote;
      if (transaction) return (await transaction.execute({ sql, args })).rows as unknown as Row[];
      return this.exclusive(
        async () => (await this.client!.execute({ sql, args })).rows as unknown as Row[],
      );
    }
    const run = async () => {
      const statement = this.local!.prepare(sql);
      if (mode === 'run') {
        statement.run(...args);
        return [];
      }
      if (mode === 'all') return statement.all(...args) as Row[];
      const row = statement.get(...args) as Row | undefined;
      return row ? [row] : [];
    };
    return this.scope.getStore()?.local ? run() : this.exclusive(run);
  }

  async member(wallet: string) {
    return (await this.db.prepare('SELECT * FROM members WHERE wallet=?').get(wallet)) as
      Member | undefined;
  }
  async session(id: string) {
    return (await this.db
      .prepare('SELECT * FROM sessions WHERE id=? AND expires>?')
      .get(id, Date.now())) as Session | undefined;
  }
  async missions() {
    return (await this.db.prepare('SELECT data FROM missions ORDER BY rowid DESC').all()).map(
      (row) => JSON.parse(row.data as string) as Mission,
    );
  }
  async submissions(wallet?: string) {
    const rows = wallet
      ? await this.db
          .prepare('SELECT data FROM submissions WHERE wallet=? ORDER BY rowid DESC')
          .all(wallet)
      : await this.db.prepare('SELECT data FROM submissions ORDER BY rowid DESC').all();
    return rows.map((row) => JSON.parse(row.data as string) as Submission);
  }
  async leaderboard(wallet?: string): Promise<LeaderboardData> {
    // Keep mission history in the score even when its mission has been removed.
    // SQL aggregates the records; only the top 50 public X identities leave the server.
    const rows = await this.db
      .prepare(
        `
      WITH scores AS (
        SELECT wallet, SUM(CAST(json_extract(data, '$.points') AS INTEGER)) AS points
        FROM submissions
        WHERE json_extract(data, '$.status') = 'verified'
        GROUP BY wallet
      )
      SELECT m.wallet, m.x_name, m.x_username, m.x_avatar, COALESCE(s.points, 0) AS points
      FROM members m
      LEFT JOIN scores s ON s.wallet = m.wallet
      WHERE m.x_id IS NOT NULL AND m.x_username IS NOT NULL
      ORDER BY points DESC, m.created_at ASC, m.wallet ASC
      LIMIT 50
    `,
      )
      .all();
    return {
      entries: rows.map((row, index) => ({
        rank: index + 1,
        name: (row.x_name || row.x_username) as string,
        username: row.x_username as string,
        avatarUrl: row.x_avatar as string | null,
        points: Number(row.points),
        isYou: !!wallet && row.wallet === wallet,
      })),
    };
  }
  async state(wallet?: string): Promise<State> {
    return {
      version: 1,
      profile: wallet ? (await this.member(wallet))?.name || 'Member' : 'Explorer',
      missions: await this.missions(),
      submissions: wallet ? await this.submissions(wallet) : [],
    };
  }
  async putMission(mission: Mission) {
    await this.db
      .prepare(
        'INSERT INTO missions(id,data) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data',
      )
      .run(mission.id, JSON.stringify(mission));
  }
  async putSubmission(submission: Submission, wallet: string, evidenceKey = submission.url) {
    await this.db
      .prepare(
        'INSERT INTO submissions(id,wallet,evidence,data) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data',
      )
      .run(submission.id, wallet, evidenceKey, JSON.stringify(submission));
  }
  async audit(actor: string, action: string, subject: string) {
    await this.db
      .prepare('INSERT INTO audit(actor,action,subject,at) VALUES(?,?,?,?)')
      .run(actor, action, subject, new Date().toISOString());
  }
  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    if (this.scope.getStore()) return fn();
    if (this.client) {
      return this.exclusive(async () => {
        const tx = await this.client!.transaction('write');
        try {
          const value = await this.scope.run({ remote: tx }, fn);
          await tx.commit();
          return value;
        } catch (error) {
          await tx.rollback();
          throw error;
        } finally {
          tx.close();
        }
      });
    }
    return this.exclusive(async () => {
      this.local!.exec('BEGIN IMMEDIATE');
      try {
        const value = await this.scope.run({ local: true }, fn);
        this.local!.exec('COMMIT');
        return value;
      } catch (error) {
        this.local!.exec('ROLLBACK');
        throw error;
      }
    });
  }
  async prune() {
    const now = Date.now();
    await this.db.prepare('DELETE FROM sessions WHERE expires<?').run(now);
    await this.db.prepare('DELETE FROM challenges WHERE expires<?').run(now);
    await this.db.prepare('DELETE FROM oauth WHERE expires<?').run(now);
    await this.db.prepare('DELETE FROM mission_visits WHERE expires<?').run(now);
  }
}
