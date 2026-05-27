import { NextResponse } from 'next/server';
import { db, courtsLeads } from '@feera/db';

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
    utmSource,
    utmMedium,
    utmCampaign,
  } = body as Record<string, string>;

  if (!name || !email || !targetCity || !projectStage) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 },
    );
  }

  const referer = request.headers.get('referer') ?? undefined;

  /* ------------------------------------------------------------------ */
  /*  1. Write to database (non-blocking for email)                      */
  /* ------------------------------------------------------------------ */

  let leadId: string | undefined;

  try {
    const [inserted] = await db
      .insert(courtsLeads)
      .values({
        name,
        email,
        phone: phone || undefined,
        company: company || undefined,
        city: targetCity,
        projectStage,
        capexRange: capexRange || undefined,
        message: message || undefined,
        sourcePage: referer,
        utmSource: utmSource || undefined,
        utmMedium: utmMedium || undefined,
        utmCampaign: utmCampaign || undefined,
        referrer: referer,
        status: 'new',
      })
      .returning({ id: courtsLeads.id });

    leadId = inserted?.id;
    console.log('[courts/quote] Lead saved:', leadId);
  } catch (err) {
    console.error('[courts/quote] DB insert failed (continuing to email):', err);
  }

  /* ------------------------------------------------------------------ */
  /*  2. Send rich HTML email via Resend                                 */
  /* ------------------------------------------------------------------ */

  const now = new Date().toISOString();

  const htmlBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
  <h2 style="margin: 0 0 24px; font-size: 20px; border-bottom: 2px solid #2d5016; padding-bottom: 12px;">
    New Feera Courts Lead
  </h2>
  <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
    <tr><td style="padding: 8px 12px; font-weight: 600; width: 140px; vertical-align: top;">Name</td><td style="padding: 8px 12px;">${name}</td></tr>
    <tr style="background: #f9f9f9;"><td style="padding: 8px 12px; font-weight: 600; vertical-align: top;">Email</td><td style="padding: 8px 12px;"><a href="mailto:${email}">${email}</a></td></tr>
    ${phone ? `<tr><td style="padding: 8px 12px; font-weight: 600; vertical-align: top;">Phone</td><td style="padding: 8px 12px;"><a href="tel:${phone}">${phone}</a></td></tr>` : ''}
    ${company ? `<tr style="background: #f9f9f9;"><td style="padding: 8px 12px; font-weight: 600; vertical-align: top;">Company / Project</td><td style="padding: 8px 12px;">${company}</td></tr>` : ''}
    <tr><td style="padding: 8px 12px; font-weight: 600; vertical-align: top;">Target City</td><td style="padding: 8px 12px;">${targetCity}</td></tr>
    <tr style="background: #f9f9f9;"><td style="padding: 8px 12px; font-weight: 600; vertical-align: top;">Project Stage</td><td style="padding: 8px 12px;">${projectStage}</td></tr>
    ${capexRange ? `<tr><td style="padding: 8px 12px; font-weight: 600; vertical-align: top;">Capex Range</td><td style="padding: 8px 12px;">${capexRange}</td></tr>` : ''}
    ${message ? `<tr style="background: #f9f9f9;"><td style="padding: 8px 12px; font-weight: 600; vertical-align: top;">Message</td><td style="padding: 8px 12px;">${message}</td></tr>` : ''}
    ${utmSource ? `<tr><td style="padding: 8px 12px; font-weight: 600; vertical-align: top;">UTM Source</td><td style="padding: 8px 12px;">${utmSource}</td></tr>` : ''}
    ${utmMedium ? `<tr style="background: #f9f9f9;"><td style="padding: 8px 12px; font-weight: 600; vertical-align: top;">UTM Medium</td><td style="padding: 8px 12px;">${utmMedium}</td></tr>` : ''}
    ${utmCampaign ? `<tr><td style="padding: 8px 12px; font-weight: 600; vertical-align: top;">UTM Campaign</td><td style="padding: 8px 12px;">${utmCampaign}</td></tr>` : ''}
    ${referer ? `<tr style="background: #f9f9f9;"><td style="padding: 8px 12px; font-weight: 600; vertical-align: top;">Source Page</td><td style="padding: 8px 12px;">${referer}</td></tr>` : ''}
  </table>
  <p style="margin: 24px 0 8px; font-size: 12px; color: #888;">
    Received: ${now}
  </p>
  <a href="https://feera.ai/admin/courts/leads" style="display: inline-block; margin-top: 12px; padding: 10px 20px; background: #2d5016; color: #fff; text-decoration: none; font-size: 13px; border-radius: 4px;">
    View all leads
  </a>
</div>`.trim();

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
          subject: `[Feera Courts] New lead: ${name} — ${targetCity} (${projectStage})`,
          html: htmlBody,
        }),
      });

      if (!res.ok) {
        console.error('[courts/quote] Resend error:', await res.text());
      }
    } catch (err) {
      console.error('[courts/quote] Failed to send email:', err);
    }
  }

  return NextResponse.json({ ok: true, id: leadId ?? null });
}
