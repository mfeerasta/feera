#!/usr/bin/env node
/**
 * One-shot CORS configuration for the three Feera Hetzner buckets.
 *
 * Usage:
 *   S3_ACCESS_KEY_ID=... S3_SECRET_ACCESS_KEY=... \
 *     node packages/storage/scripts/setup-buckets.mjs
 *
 * Bucket creation itself is manual in the Hetzner Console (S3 API CreateBucket
 * is supported but ACL provisioning is not yet stable, ADR-0008 follow-up).
 * See docs/runbooks/storage.md for the click-path. This script applies the
 * idempotent bits: CORS rules + a smoke PutObject to verify creds.
 */

import {
  S3Client,
  PutBucketCorsCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';

const ENDPOINT = process.env.S3_ENDPOINT ?? 'https://fsn1.your-objectstorage.com';
const REGION = process.env.S3_REGION ?? 'fsn1';
const PUBLIC_BUCKET = process.env.S3_BUCKET_PUBLIC ?? 'feera-public';
const PRIVATE_BUCKET = process.env.S3_BUCKET_PRIVATE ?? 'feera-user-private';
const EDITION_BUCKET = process.env.S3_BUCKET_EDITION ?? 'feera-edition';

const ALLOWED_ORIGINS = [
  'https://www.feera.ai',
  'https://feera.ai',
  'https://staging.feera.ai',
  'http://localhost:3000',
];

if (!process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY) {
  console.error('S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY must be set.');
  process.exit(1);
}

const client = new S3Client({
  endpoint: ENDPOINT,
  region: REGION,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
});

const corsConfig = {
  CORSRules: [
    {
      AllowedHeaders: ['*'],
      AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
      AllowedOrigins: ALLOWED_ORIGINS,
      ExposeHeaders: ['ETag', 'x-amz-meta-*'],
      MaxAgeSeconds: 3600,
    },
  ],
};

async function check(bucket) {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    console.log(`[ok] bucket exists: ${bucket}`);
  } catch (err) {
    console.error(`[fail] cannot HEAD bucket ${bucket}:`, err.message ?? err);
    throw err;
  }
}

async function applyCors(bucket) {
  await client.send(new PutBucketCorsCommand({ Bucket: bucket, CORSConfiguration: corsConfig }));
  console.log(`[ok] CORS applied: ${bucket}`);
}

async function smokeWrite(bucket) {
  const key = `.feera-smoke/${Date.now()}.txt`;
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: 'feera storage smoke ok',
      ContentType: 'text/plain',
    }),
  );
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  console.log(`[ok] read+write smoke passed: ${bucket}`);
}

async function main() {
  for (const bucket of [PUBLIC_BUCKET, PRIVATE_BUCKET, EDITION_BUCKET]) {
    await check(bucket);
    await applyCors(bucket);
    await smokeWrite(bucket);
  }
  console.log('done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
