import { z } from "zod";
import { clientIp, handler, ok, parseBody, rateLimit } from "@/lib/api";
import { sendEmail } from "@/lib/email";
import { getSettings } from "@/lib/settings";

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(100),
  email: z.string().trim().email("Enter a valid email"),
  message: z.string().trim().min(5, "Message is too short").max(2000),
});

export const POST = handler(async (req: Request) => {
  rateLimit(`contact:${clientIp(req)}`, 5, 60 * 60 * 1000);
  const body = await parseBody(req, schema);
  const settings = await getSettings();
  const to = process.env.SHOP_NOTIFY_EMAIL || settings.email;
  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
  await sendEmail(
    to,
    `Website message from ${body.name}`,
    `<p><strong>${esc(body.name)}</strong> (${esc(body.email)}) wrote:</p><p>${esc(body.message).replace(/\n/g, "<br>")}</p>`,
    `${body.name} (${body.email}) wrote:\n\n${body.message}`,
  );
  return ok({ sent: true });
});
