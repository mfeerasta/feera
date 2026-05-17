/**
 * Shared primitive types used across packages.
 *
 * Domain entity types (User, Club, Booking, etc.) live in `@feera/db` once Drizzle infers them
 * from the schema. This package keeps cross-cutting tags and brands only.
 */

export type Iso8601String = string & { readonly __brand: 'Iso8601String' };
export type CountryCode = string & { readonly __brand: 'CountryCode' };
export type CurrencyCode = string & { readonly __brand: 'CurrencyCode' };
export type Locale = 'en' | 'ur' | 'ar' | 'es' | 'fr' | 'it' | 'pt';
export type GenderVisibility = 'public' | 'friends' | 'private';

export type Uuid = string & { readonly __brand: 'Uuid' };

export type Money = Readonly<{
  amountMinor: number;
  currency: CurrencyCode;
}>;

export type GeoPoint = Readonly<{
  lat: number;
  lng: number;
}>;
