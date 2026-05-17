# Feera KPIs

Definitions are authoritative. Event names map to PostHog event taxonomy in `packages/analytics/src/events.ts`.

## Activation

| Metric | Definition |
|---|---|
| `signup_to_first_booking_14d` | % of users where `booking_completed` occurs within 14 days of `user_signed_up`. |
| `signup_to_first_match_30d` | % of users where `match_played` occurs within 30 days. |
| `signup_to_first_rated_match_30d` | % of users with at least one ranked match in 30 days. |

## Retention

| Metric | Definition |
|---|---|
| `booking_retention_d7` | % of booking-active users in week 0 who book again in week 1. |
| `booking_retention_d30` | Same, week 4. |
| `booking_retention_d90` | Same, week 12. |

## Liquidity

| Metric | Definition |
|---|---|
| `open_match_fill_rate_48h` | % of open matches (3 of 4 slots empty at creation) that reach 4 confirmed participants within 48 hours. |
| `time_to_fill_p50` | Median time from open-match-created to 4-confirmed. |
| `time_to_fill_p95` | 95th percentile. |

## Match quality

| Metric | Definition |
|---|---|
| `match_completion_rate` | % of confirmed bookings that result in `match_verified`. |
| `peer_verification_rate` | % of recorded matches verified by both teams within 24h. |
| `dispute_rate` | % of recorded matches with a disputed score. |

## Rating health

| Metric | Definition |
|---|---|
| `reliable_rating_pct` | % of active users with reliability_pct > 70. |
| `provisional_pct` | % of active users still flagged provisional. |
| `sandbag_flag_pct` | % of active users currently flagged is_flagged_sandbag. |

## Edition funnel

| Metric | Definition |
|---|---|
| `edition_application_rate` | applications / monthly active users. |
| `edition_acceptance_rate` | accepted / applied (rolling 30d). |
| `edition_activation` | % of accepted members with at least one Edition-tagged event in 30d. |
| `edition_retention_y1` | % of members renewing at month 12. |

## Revenue

| Metric | Definition |
|---|---|
| `gmv_total` | Sum of all confirmed booking + tournament + coaching transaction amounts, in USD. |
| `take_rate` | Platform fee revenue / GMV. |
| `gmv_per_market` | GMV by country_code. |
| `arpu` | Platform fee revenue / monthly active users. |
