type AuthEmail = {
  subject: string;
  text: string;
  to: string;
};

export async function sendAuthEmail({ subject, text, to }: AuthEmail) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;

  if (!apiKey || !from) {
    throw new Error("RESEND_API_KEY and AUTH_EMAIL_FROM must be configured.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      subject,
      text,
      to: [to],
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend returned ${response.status}.`);
  }
}
