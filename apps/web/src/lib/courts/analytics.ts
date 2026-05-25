/**
 * Courts analytics helper.
 *
 * No-op wrapper that logs to console in development and can be swapped
 * for PostHog, Mixpanel, or any other provider when available.
 *
 * Supported events:
 * - courts_page_view (path, referrer)
 * - courts_lead_form_opened (page_of_origin)
 * - courts_lead_form_submitted (capex_range, project_stage)
 * - courts_pricing_table_viewed
 * - courts_methodology_page_scrolled_to_bottom
 * - courts_case_study_viewed (project_slug)
 */
export function trackCourtsEvent(
  event: string,
  properties?: Record<string, string | number | boolean>,
) {
  if (typeof window === 'undefined') return;
  if (process.env.NODE_ENV === 'development') {
    console.log('[courts-analytics]', event, properties);
  }
  // TODO: wire to PostHog/Mixpanel when available
  // window.posthog?.capture(event, properties);
}
