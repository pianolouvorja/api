import { createTransport } from "nodemailer";
import { renderResetPasswordEmail } from "./email-templates.js";

/**
 * Envio de e-mail transacional via SMTP (Hostinger — noreply@).
 *
 * Envs (todas no .env do servidor, NUNCA commitadas):
 *   SMTP_HOST, SMTP_PORT (465 SSL / 587 TLS), SMTP_USER, SMTP_PASS,
 *   SMTP_FROM (ex.: "LouvorJA <noreply@pianolouvorja.com.br>")
 *
 * Sem as envs = sendMail falha rápido com erro descritivo — a rota de
 * reset trata e responde com instrução de suporte.
 */

let transporter: ReturnType<typeof createTransport> | null = null;

export function smtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.SMTP_FROM,
  );
}

function getTransporter() {
  if (!transporter) {
    if (!smtpConfigured()) {
      throw new Error("smtp-not-configured");
    }
    transporter = createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 465),
      secure: Number(process.env.SMTP_PORT ?? 465) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

/** Envia o token de reset. Retorna true se o SMTP aceitou o e-mail. */
export async function sendResetTokenEmail(
  to: string,
  displayName: string,
  token: string,
): Promise<boolean> {
  const transport = getTransporter();
  const expiresLabel = "1 hora";
  const textBody = [
    `Olá, ${displayName}.`,
    "",
    `Seu token de reset de senha é:`,
    "",
    token,
    "",
    `Ele expira em ${expiresLabel} e pode ser usado uma única vez.`,
    "Se você não pediu isso, ignore este e-mail — sua senha continua a mesma.",
    "",
    "— LouvorJA PIANO",
  ].join("\n");
  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject: "LouvorJA — Reset de senha",
      text: textBody,
      html: renderResetPasswordEmail(displayName, token),
    });
    return true;
  } catch (error) {
    console.error("[mail] falha ao enviar token de reset:", error);
    return false;
  }
}
