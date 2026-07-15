import nodemailer from "nodemailer";
import { env } from "@/lib/env";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // STARTTLS
      auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD },
    });
  }
  return transporter;
}

export async function sendMail(params: { to: string; subject: string; html: string }) {
  await getTransporter().sendMail({
    from: env.GMAIL_USER,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
}
