import { NextRequest, NextResponse } from "next/server";
import { verifyInterServiceAuth } from "@/lib/inter-services/auth";
import {
  handleInterServicePreflight,
  withInterServiceCors,
} from "@/lib/inter-services/cors";
import {
  getPendingEmailQueue,
  enqueueEmail,
  markEmailQueueComplete,
  markEmailQueueFailed,
  retryQueuedEmail,
  type TemplateId,
} from "@/lib/email";
import prisma from "@/lib/prisma";
import { handleError } from "@/utils/error";

export function OPTIONS(request: NextRequest) {
  return handleInterServicePreflight(request);
}

/**
 * GET /api/inter-services/v1/email-queue
 * Retrieves queued emails for dispatch by internal worker services.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyInterServiceAuth(request);
    if (!authResult.authorized) {
      return withInterServiceCors(
        NextResponse.json(
          { success: false, error: authResult.error || "Unauthorized application." },
          { status: authResult.status || 401 }
        ),
        request
      );
    }

    const { searchParams } = request.nextUrl;
    const statusParam = searchParams.get("status") || "pending";
    const status = (["pending", "completed", "all"].includes(statusParam)
      ? statusParam
      : "pending") as "pending" | "completed" | "all";

    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const dueOnly = searchParams.get("due_only") !== "false";
    const userId = searchParams.get("user_id") || undefined;
    const templateId = searchParams.get("template_id") || undefined;

    const { totalPending, items } = await getPendingEmailQueue({
      status,
      limit: isNaN(limit) ? 20 : limit,
      dueOnly,
      userId,
      templateId,
    });

    return withInterServiceCors(
      NextResponse.json({
        success: true,
        count: items.length,
        total_pending: totalPending,
        status_filter: status,
        emails: items,
      }),
      request
    );
  } catch (error) {
    const errorMsg = handleError(error, "Failed to retrieve queued emails");
    return withInterServiceCors(
      NextResponse.json({ success: false, error: errorMsg }, { status: 500 }),
      request
    );
  }
}

/**
 * POST /api/inter-services/v1/email-queue
 * Enqueue new emails, mark dispatched items complete, or report retry failures.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyInterServiceAuth(request);
    if (!authResult.authorized) {
      return withInterServiceCors(
        NextResponse.json(
          { success: false, error: authResult.error || "Unauthorized application." },
          { status: authResult.status || 401 }
        ),
        request
      );
    }

    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      return withInterServiceCors(
        NextResponse.json(
          { success: false, error: "Invalid JSON request body." },
          { status: 400 }
        ),
        request
      );
    }

    const action = String(body.action || "").toLowerCase();

    // 1. Action: Mark complete
    if (action === "mark_complete") {
      const ids: string[] = Array.isArray(body.ids)
        ? (body.ids as string[])
        : body.id
        ? [String(body.id)]
        : [];

      if (ids.length === 0) {
        return withInterServiceCors(
          NextResponse.json(
            { success: false, error: "Missing 'id' or 'ids' array to mark as complete." },
            { status: 400 }
          ),
          request
        );
      }

      const res = await markEmailQueueComplete(ids);
      return withInterServiceCors(
        NextResponse.json({
          success: true,
          updated_count: res.count,
          marked_ids: ids,
        }),
        request
      );
    }

    // 2. Action: Mark failed / schedule retry
    if (action === "mark_failed" || action === "retry") {
      const id = String(body.id || "");
      if (!id) {
        return withInterServiceCors(
          NextResponse.json(
            { success: false, error: "Missing 'id' of failed email queue item." },
            { status: 400 }
          ),
          request
        );
      }

      const errorMsg = body.error ? String(body.error) : undefined;
      const retryInSeconds = typeof body.retry_in_seconds === "number" ? body.retry_in_seconds : 300;
      const updated = await markEmailQueueFailed(id, errorMsg, retryInSeconds);

      if (!updated) {
        return withInterServiceCors(
          NextResponse.json({ success: false, error: "Email queue item not found." }, { status: 404 }),
          request
        );
      }

      return withInterServiceCors(
        NextResponse.json({
          success: true,
          id: updated.id,
          retry_count: updated.retryCount,
          is_complete: updated.isComplete,
          next_retry_at: updated.nextRetryAt,
        }),
        request
      );
    }

    // 3. Action: Dispatch next batch immediately
    if (action === "dispatch") {
      const limit = Math.min(20, Math.max(1, typeof body.limit === "number" ? body.limit : 5));
      const { items } = await getPendingEmailQueue({ limit, dueOnly: true });

      const results: Array<{ id: string; success: boolean }> = [];
      for (const item of items) {
        const sent = await retryQueuedEmail(item.id);
        results.push({ id: item.id, success: sent });
      }

      return withInterServiceCors(
        NextResponse.json({
          success: true,
          dispatched_count: results.length,
          results,
        }),
        request
      );
    }

    // 4. Default: Enqueue email
    const templateId = String(body.template_id || body.templateId || "");
    const userId = String(body.user_id || body.userId || "");
    const to = body.to ? String(body.to) : undefined;
    const subject = body.subject ? String(body.subject) : undefined;
    const data = (body.data && typeof body.data === "object" ? body.data : {}) as Record<string, unknown>;

    if (!templateId || !userId) {
      return withInterServiceCors(
        NextResponse.json(
          {
            success: false,
            error: "Missing required fields: 'template_id' and 'user_id' are required.",
          },
          { status: 400 }
        ),
        request
      );
    }

    const nextRetryAt = body.next_retry_at ? new Date(String(body.next_retry_at)) : undefined;

    const queuedItem = await enqueueEmail(templateId as TemplateId, {
      to,
      userId,
      subject,
      data: data as Record<string, unknown>,
      nextRetryAt,
    });

    return withInterServiceCors(
      NextResponse.json(
        {
          success: true,
          message: "Email queued successfully.",
          item: {
            id: queuedItem.id,
            user_id: queuedItem.userId,
            to: queuedItem.to,
            subject: queuedItem.subject,
            template_id: queuedItem.templateId,
            next_retry_at: queuedItem.nextRetryAt,
            created_at: queuedItem.createdAt,
          },
        },
        { status: 201 }
      ),
      request
    );
  } catch (error) {
    const errorMsg = handleError(error, "Failed to process email queue request");
    return withInterServiceCors(
      NextResponse.json({ success: false, error: errorMsg }, { status: 500 }),
      request
    );
  }
}

/**
 * PATCH /api/inter-services/v1/email-queue
 * Batch update queue item completion status.
 */
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await verifyInterServiceAuth(request);
    if (!authResult.authorized) {
      return withInterServiceCors(
        NextResponse.json(
          { success: false, error: authResult.error || "Unauthorized application." },
          { status: authResult.status || 401 }
        ),
        request
      );
    }

    const body = await request.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body.ids)
      ? (body.ids as string[])
      : body.id
      ? [String(body.id)]
      : [];

    if (ids.length === 0) {
      return withInterServiceCors(
        NextResponse.json({ success: false, error: "Missing 'id' or 'ids' in body." }, { status: 400 }),
        request
      );
    }

    const isComplete = typeof body.is_complete === "boolean" ? body.is_complete : true;
    const res = await prisma.emailQueue.updateMany({
      where: { id: { in: ids } },
      data: { isComplete },
    });

    return withInterServiceCors(
      NextResponse.json({
        success: true,
        updated_count: res.count,
        marked_ids: ids,
        is_complete: isComplete,
      }),
      request
    );
  } catch (error) {
    const errorMsg = handleError(error, "Failed to patch email queue");
    return withInterServiceCors(
      NextResponse.json({ success: false, error: errorMsg }, { status: 500 }),
      request
    );
  }
}

/**
 * DELETE /api/inter-services/v1/email-queue
 * Purge completed or specific email queue items.
 */
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyInterServiceAuth(request);
    if (!authResult.authorized) {
      return withInterServiceCors(
        NextResponse.json(
          { success: false, error: authResult.error || "Unauthorized application." },
          { status: authResult.status || 401 }
        ),
        request
      );
    }

    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status");

    if (status === "completed") {
      const res = await prisma.emailQueue.deleteMany({
        where: { isComplete: true },
      });
      return withInterServiceCors(
        NextResponse.json({
          success: true,
          deleted_count: res.count,
          message: "All completed email queue records purged.",
        }),
        request
      );
    }

    const body = await request.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body.ids)
      ? (body.ids as string[])
      : body.id
      ? [String(body.id)]
      : [];

    if (ids.length === 0) {
      return withInterServiceCors(
        NextResponse.json(
          {
            success: false,
            error: "Provide ?status=completed or body with 'ids' to delete.",
          },
          { status: 400 }
        ),
        request
      );
    }

    const res = await prisma.emailQueue.deleteMany({
      where: { id: { in: ids } },
    });

    return withInterServiceCors(
      NextResponse.json({
        success: true,
        deleted_count: res.count,
        deleted_ids: ids,
      }),
      request
    );
  } catch (error) {
    const errorMsg = handleError(error, "Failed to delete from email queue");
    return withInterServiceCors(
      NextResponse.json({ success: false, error: errorMsg }, { status: 500 }),
      request
    );
  }
}
