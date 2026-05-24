import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();

  const { name, email, phone, location, courts, courtType, environment, budget, timeline, notes } =
    body as Record<string, string>;

  if (!name || !email || !location || !courts) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const text = [
    '--- New Feera Courts consultation request ---',
    `Name: ${name}`,
    `Email: ${email}`,
    phone ? `Phone: ${phone}` : null,
    `Location: ${location}`,
    `Courts: ${courts}`,
    courtType ? `Court type: ${courtType}` : null,
    environment ? `Environment: ${environment}` : null,
    budget ? `Budget: ${budget}` : null,
    timeline ? `Timeline: ${timeline}` : null,
    notes ? `Notes: ${notes}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  console.log(text);

  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Feera Courts <courts@feera.ai>',
          to: ['meerfeerasta@gmail.com'],
          subject: `[Feera Courts] New inquiry from ${name} — ${courts} courts in ${location}`,
          text,
        }),
      });

      if (!res.ok) {
        console.error('Resend error:', await res.text());
      }
    } catch (err) {
      console.error('Failed to send quote email:', err);
    }
  }

  return NextResponse.json({ ok: true });
}
