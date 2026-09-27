import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Emergency notification delivery.
 *
 * Real providers only: Twilio for SMS, Resend for email. If the credentials
 * are not configured the server reports demo mode — nothing is faked.
 */

function twilioConfigured() {
  return Boolean(
    process.env["TWILIO_ACCOUNT_SID"] && process.env["TWILIO_AUTH_TOKEN"] && process.env["TWILIO_FROM_NUMBER"],
  );
}

function resendConfigured() {
  return Boolean(process.env["RESEND_API_KEY"] && process.env["LOVABLE_API_KEY"]);
}

const RESEND_GATEWAY = "https://connector-gateway.lovable.dev/resend";

export const getNotifierStatus = createServerFn({ method: "GET" }).handler(async () => ({
  sms: twilioConfigured(),
  email: resendConfigured(),
}));

const payload = z.object({
  eventId: z.string().uuid(),
  shareUrl: z.string().url(),
  message: z.string().min(1).max(500),
});

export const sendEmergencyAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => payload.parse(data))
  .handler(async ({ data, context }) => {
    const { data: contacts, error } = await context.supabase
      .from("emergency_contacts")
      .select("name, phone, email")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);

    const sms = twilioConfigured();
    const email = resendConfigured();
    if (!sms && !email) {
      return {
        status: "demo_mode" as const,
        detail: "Demo mode — notification not sent. No SMS or email provider is configured.",
        delivered: 0,
        contacts: contacts?.length ?? 0,
      };
    }

    const body = `${data.message}\nLive location: ${data.shareUrl}`;
    let delivered = 0;
    const failures: string[] = [];

    for (const contact of contacts ?? []) {
      if (sms && contact.phone) {
        const sid = process.env["TWILIO_ACCOUNT_SID"]!;
        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
          method: "POST",
          headers: {
            Authorization: "Basic " + btoa(`${sid}:${process.env["TWILIO_AUTH_TOKEN"]}`),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: contact.phone,
            From: process.env["TWILIO_FROM_NUMBER"]!,
            Body: body,
          }),
        });
        if (res.ok) delivered++;
        else failures.push(`SMS to ${contact.name}: ${res.status}`);
      }
      if (email && contact.email) {
        const from = process.env["EMERGENCY_FROM_EMAIL"] ?? "SignBridge AI <onboarding@resend.dev>";
        const res = await fetch(`${RESEND_GATEWAY}/emails`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]}`,
            "X-Connection-Api-Key": process.env["RESEND_API_KEY"]!,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from,
            to: [contact.email],
            subject: "Emergency alert from SignBridge AI",
            text: body,
          }),
        });
        if (res.ok) delivered++;
        else failures.push(`Email to ${contact.name}: ${res.status} ${await res.text()}`);
      }
    }

    return {
      status: delivered > 0 ? ("sent" as const) : ("failed" as const),
      detail:
        delivered > 0
          ? `Alert delivered to ${delivered} recipient channel(s).`
          : `No alert could be delivered. ${failures.join("; ") || "No contact had a reachable phone or email."}`,
      delivered,
      contacts: contacts?.length ?? 0,
    };
  });
