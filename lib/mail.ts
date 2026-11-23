import nodemailer from "nodemailer";
import { StoreError } from "./errors";
import type { AppSettings } from "./types";

export function emailReady(settings: AppSettings) {
  return Boolean(settings.smtp.host && (settings.smtp.fromEmail || settings.smtp.user));
}

export async function deliverEmail(
  settings: AppSettings,
  message: {
    to: string;
    subject: string;
    text: string;
    attachments?: { filename: string; content: Buffer; contentType?: string }[];
  },
) {
  if (!emailReady(settings)) {
    throw new StoreError("Email is not set up yet. Add the SMTP host and from address in Settings.");
  }
  const fromEmail = settings.smtp.fromEmail || settings.smtp.user;
  const fromName = settings.smtp.fromName || fromEmail;
  const transporter = nodemailer.createTransport({
    host: settings.smtp.host,
    port: settings.smtp.port,
    secure: settings.smtp.secure,
    auth: settings.smtp.user ? { user: settings.smtp.user, pass: settings.smtp.password } : undefined,
  });
  try {
    await transporter.sendMail({
      from: `"${fromName.replace(/"/g, "")}" <${fromEmail}>`,
      to: message.to,
      subject: message.subject,
      text: message.text,
      attachments: message.attachments?.map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content,
        contentType: attachment.contentType || "application/pdf",
      })),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Email could not be sent.";
    throw new StoreError(`Email could not be sent. ${detail}`.slice(0, 300));
  }
}
