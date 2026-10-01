import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;
let testAccount: nodemailer.TestAccount | null = null;

export async function getEtherealTransporter(): Promise<nodemailer.Transporter> {
  if (!transporter) {
    console.log('[Ethereal] Initializing Ethereal SMTP test account...');
    testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log(`[Ethereal] Account created: ${testAccount.user}`);
  }
  return transporter;
}

export interface SendMailOptions {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendMailResult {
  messageId: string;
  previewUrl: string | false;
}

export async function sendMailViaEthereal(options: SendMailOptions): Promise<SendMailResult> {
  const mailer = await getEtherealTransporter();
  const info = await mailer.sendMail({
    from: options.from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text || options.html.replace(/<[^>]+>/g, ''),
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  console.log(`[Ethereal Mail Sent] To: ${options.to} | MessageID: ${info.messageId} | Preview: ${previewUrl}`);

  return {
    messageId: info.messageId,
    previewUrl: previewUrl || false,
  };
}
