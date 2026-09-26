import "server-only";
import nodemailer from "nodemailer";

/**
 * Envoi d'emails par SMTP (Brevo, Gmail, Resend… : tout service SMTP convient).
 * SMTP_URL : smtps://utilisateur:motdepasse@serveur:465 ; EMAIL_FROM : « Watchnext <adresse@exemple.fr> ».
 */
export function mailConfigured() {
  return !!process.env.SMTP_URL && !!process.env.EMAIL_FROM;
}

/** L'envoi d'emails est-il utilisable ? En développement, les emails sont affichés dans la console. */
export function mailAvailable() {
  return mailConfigured() || process.env.NODE_ENV !== "production";
}

let transport: nodemailer.Transporter | null = null;

export async function sendMail(message: { to: string; subject: string; text: string; html: string }) {
  if (!mailConfigured()) {
    if (process.env.NODE_ENV === "production") throw new Error("SMTP_URL / EMAIL_FROM non configurés");
    console.info(`\n[email de développement] À : ${message.to}\nObjet : ${message.subject}\n\n${message.text}\n`);
    return;
  }
  transport ??= nodemailer.createTransport(process.env.SMTP_URL);
  await transport.sendMail({ from: process.env.EMAIL_FROM, ...message });
}
