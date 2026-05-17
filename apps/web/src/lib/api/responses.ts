import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, { status: 200, ...init });
}

export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: 'bad_request', message, details }, { status: 400 });
}

export function unauthorized(message = 'Authentication required.') {
  return NextResponse.json({ error: 'unauthorized', message }, { status: 401 });
}

export function forbidden(message = 'Not allowed.') {
  return NextResponse.json({ error: 'forbidden', message }, { status: 403 });
}

export function notFound(message = 'Not found.') {
  return NextResponse.json({ error: 'not_found', message }, { status: 404 });
}

export function conflict(message: string) {
  return NextResponse.json({ error: 'conflict', message }, { status: 409 });
}

export function serverError(scope: string, err: unknown) {
  console.error(`[api/v1/${scope}]`, err);
  return NextResponse.json(
    { error: 'internal_error', message: 'Something went wrong.' },
    { status: 500 },
  );
}

export function fromZodError(err: ZodError) {
  return badRequest('Validation failed.', err.flatten());
}
