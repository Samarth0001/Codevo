import { Request, Response } from 'express';
import { S3Client, ListObjectsV2Command, CopyObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from 'dotenv';
dotenv.config();

const endpoint = process.env.R2_ENDPOINT!;
const accessKeyId = process.env.R2_ACCESS_KEY_ID!;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!;

const r2 = new S3Client({
  region: "us-east-1",
  endpoint: endpoint, // Replace with your R2 endpoint
  credentials: {
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
  },
  forcePathStyle: false  
});

export async function copyTemplateToProjectR2(
  bucket: string,
  srcPrefix: string,
  destPrefix: string
) {
    
    console.log(endpoint,accessKeyId,secretAccessKey);

//     console.log("R2_ENDPOINT:"+String(process.env.R2_ENDPOINT));
// console.log("R2_ACCESS_KEY_ID:"+String(process.env.R2_ACCESS_KEY_ID));
// console.log("R2_SECRET_ACCESS_KEY:"+String(process.env.R2_SECRET_ACCESS_KEY));

  // 1. List all objects under srcPrefix
  const listed = await r2.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: srcPrefix.endsWith("/") ? srcPrefix : srcPrefix + "/",
    })
  );

  if (!listed.Contents || listed.Contents.length === 0) {
    throw new Error("No files found in source prefix!");
  }

  // 2. Copy each object to the new prefix
  for (const obj of listed.Contents) {
    if (!obj.Key) continue;
    // Remove the srcPrefix from the key, then prepend destPrefix
    const relativeKey = obj.Key.substring(srcPrefix.length);
    const destKey = destPrefix.replace(/\/?$/, "/") + relativeKey;
    console.log(destKey)
    console.log(obj.Key)
    await r2.send(
      new CopyObjectCommand({
        Bucket: bucket,
        CopySource: `/${bucket}/${obj.Key}`,
        Key: destKey,
      })
    );
  }

  // 3. Create a "folder marker" so the folder appears in the UI
  await r2.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: destPrefix.replace(/\/?$/, "/"), // ensures trailing slash
      Body: "",
    })
  );
}

// interface CreateProjectBody {
//     projectId: string;
//     title: string;
// }

export const copyProject = async(req: Request, res: Response) => {
    const {uniqueId, selectedTemplate} = req.body;

    console.log('copyProject called with:', { uniqueId, selectedTemplate });

    if(!uniqueId || !selectedTemplate){
        res.status(400).json({
            success: false,
            message: "Please fill all the details carefully!"
        });
        return;
    }

    await copyTemplateToProjectR2("codevo",`Base_Code/${selectedTemplate}/`,`Project_Code/${uniqueId}`)
    console.log("Project copied successfully!")

    res.status(200).json({
        success: true,
        message: "Project copied successfully!"
    })
}
