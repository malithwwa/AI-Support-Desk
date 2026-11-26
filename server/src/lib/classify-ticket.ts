import prisma from "../db.ts";
import { AiNotConfiguredError, classifyTicket } from "./ai.ts";

interface TicketToClassify {
  id: number;
  subject: string;
  body: string;
  senderName: string;
}

let missingKeyWarned = false;

/**
 * Starts classification without holding up the caller (e.g. the inbound-email
 * webhook). Failures are logged only — a classification error must never fail
 * ticket creation. An existing manual category is never overwritten.
 */
export function classifyTicketInBackground(ticket: TicketToClassify): void {
  void (async () => {
    try {
      const category = await classifyTicket(ticket);
      const result = await prisma.ticket.updateMany({
        where: { id: ticket.id, category: null },
        data: { category },
      });

      if (result.count === 0) {
        console.info(
          `Ticket ${ticket.id} already has a category; skipping AI classification result.`,
        );
      }
    } catch (error) {
      if (error instanceof AiNotConfiguredError) {
        if (!missingKeyWarned) {
          console.warn(
            "Automatic ticket classification disabled: OPENROUTER_API_KEY is not set.",
          );
          missingKeyWarned = true;
        }
        return;
      }

      console.error(
        `Failed to classify ticket ${ticket.id}:`,
        error instanceof Error ? error.message : error,
      );
    }
  })();
}
