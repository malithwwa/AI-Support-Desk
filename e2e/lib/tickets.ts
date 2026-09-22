import { Pool } from "pg";
import { getTestDatabaseUrl } from "./test-db";

/**
 * A ticket row as stored in the Postgres `ticket` table. Prisma maps the
 * model to the quoted camelCase columns, hence the SQL quoting below.
 */
export interface TicketRow {
  id: number;
  subject: string;
  body: string;
  bodyHtml: string | null;
  status: string;
  category: string | null;
  senderName: string;
  senderEmail: string;
  assignedToId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const TICKET_COLUMNS = `
  id, subject, body, "bodyHtml", status, category, "senderName",
  "senderEmail", "assignedToId", "createdAt", "updatedAt"
`;

/**
 * Minimal pg-based access to the e2e test database for asserting webhook
 * side effects. There is no tickets API to read or clean up through, so
 * specs talk to Postgres directly (same approach as e2e/global-setup.ts).
 *
 * One instance per test. The fixture teardown calls cleanup(), which deletes
 * only the tickets of senders this test registered via trackSender(), so
 * fully-parallel specs never see (or remove) each other's data.
 */
export class TicketDb {
  private readonly pool: Pool;
  private readonly sendersToClean = new Set<string>();

  constructor(databaseUrl: string = getTestDatabaseUrl()) {
    this.pool = new Pool({ connectionString: databaseUrl, max: 1 });
  }

  /** Remember a sender email whose tickets should be deleted on cleanup(). */
  trackSender(senderEmail: string): void {
    this.sendersToClean.add(senderEmail);
  }

  /** Delete all tickets from every tracked sender. Safe to call once per test. */
  async cleanup(): Promise<void> {
    for (const sender of this.sendersToClean) {
      await this.deleteForSender(sender);
    }
    this.sendersToClean.clear();
  }

  async dispose(): Promise<void> {
    await this.pool.end();
  }

  /** Number of tickets currently stored for the given exact sender email. */
  async countForSender(senderEmail: string): Promise<number> {
    const result = await this.pool.query(
      'SELECT COUNT(*)::int AS n FROM ticket WHERE "senderEmail" = $1',
      [senderEmail],
    );
    return result.rows[0]?.n ?? 0;
  }

  /** Most recent ticket for a sender whose subject matches case-insensitively. */
  async findForSender(
    senderEmail: string,
    subject: string,
  ): Promise<TicketRow | null> {
    const result = await this.pool.query(
      `SELECT ${TICKET_COLUMNS} FROM ticket
       WHERE "senderEmail" = $1 AND lower(subject) = lower($2)
       ORDER BY id DESC LIMIT 1`,
      [senderEmail, subject],
    );
    const row = result.rows[0];
    return row ? (row as TicketRow) : null;
  }

  /** Delete all tickets from the given exact sender email. */
  async deleteForSender(senderEmail: string): Promise<void> {
    await this.pool.query('DELETE FROM ticket WHERE "senderEmail" = $1', [
      senderEmail,
    ]);
  }
}