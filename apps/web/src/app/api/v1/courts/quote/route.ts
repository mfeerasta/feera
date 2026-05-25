import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();

  const {
    name,
    email,
    phone,
    company,
    targetCity,
    projectStage,
    capexRange,
    message,
  } = body as Record<string, string>;

  if (!name || !email || !targetCity || !projectStage) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const text = [
    '--- New Feera Courts inquiry ---',
    `Name: ${name}`,
    `Email: ${email}`,
    phone ? `Phone: ${phone}` : null,
    company ? `Company / Project: ${company}` : null,
    `Target city: ${targetCity}`,
    `Project stage: ${projectStage}`,
    capexRange ? `Capex range: ${capexRange}` : null,
    message ? `Message: ${message}` : null,
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
          subject: `[Feera Courts] New inquiry from ${name} — ${targetCity} (${projectStage})`,
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
