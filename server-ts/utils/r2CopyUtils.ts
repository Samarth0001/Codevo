import { S3Client, ListObjectsV2Command, CopyObjectCommand } from "@aws-sdk/client-s3";

// Configure your R2 S3 client
const r2 = new S3Client({
  region: "auto", // R2 ignores region, but you must provide something
  endpoint: process.env.R2_ENDPOINT!, // Replace with your R2 endpoint
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// Copy all objects from srcPrefix to destPrefix in the same bucket
export async function copyTemplateToProjectR2(
  bucket: string,
  srcPrefix: string,
  destPrefix: string
) {
  // 1. List all objects under srcPrefix
  const listed = await r2.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: srcPrefix.endsWith("/") ? srcPrefix : srcPrefix + "/",
    })
  );

  if (!listed.Contents) return;

  // 2. Copy each object to the new prefix
  for (const obj of listed.Contents) {
    if (!obj.Key) continue;
    const destKey = obj.Key.replace(srcPrefix, destPrefix);
    await r2.send(
      new CopyObjectCommand({
        Bucket: bucket,
        CopySource: `/${bucket}/${obj.Key}`,
        Key: destKey,
      })
    );
  }
}
