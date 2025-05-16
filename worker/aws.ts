import * as AWS from 'aws-sdk';
import fs from "fs";
import path from "path";

// Initialize S3 client for R2
const s3Client = new AWS.S3({
  endpoint: process.env.R2_ENDPOINT,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  signatureVersion: 'v4',
  region: 'auto'
});

export const copyTemplateToProject = async (
  sourcePath: string,
  destinationPath: string
) => {
  try {
    // List all objects in the source path
    const listedObjects = await s3Client.listObjectsV2({
      Bucket: process.env.R2_BUCKET_NAME!,
      Prefix: sourcePath,
    }).promise();
    
    if (!listedObjects.Contents) {
      throw new Error('No files found in source path');
    }

    // Copy each file to the destination path
    const copyPromises = listedObjects.Contents.map(async (object) => {
      if (!object.Key) return;

      const destinationKey = object.Key.replace(sourcePath, destinationPath);
      
      await s3Client.copyObject({
        Bucket: process.env.R2_BUCKET_NAME!,
        CopySource: `${process.env.R2_BUCKET_NAME}/${object.Key}`,
        Key: destinationKey,
      }).promise();
    });

    await Promise.all(copyPromises);

    return {
      success: true,
      message: 'Template files copied successfully',
    };
  } catch (error) {
    console.error('Error copying template files:', error);
    throw error;
  }
};


export const saveToS3 = async (key: string, filePath: string, content: string): Promise<void> => {
    const params = {
        Bucket: process.env.S3_BUCKET ?? "",
        Key: `${key}${filePath}`,
        Body: content
    }

    await s3Client.putObject(params).promise()
}


function createFolder(dirName: string) {
  return new Promise<void>((resolve, reject) => {
      fs.mkdir(dirName, { recursive: true }, (err) => {
          if (err) {
              return reject(err)
          }
          resolve()
      });
  })
}

function writeFile(filePath: string, fileData: Buffer): Promise<void> {
  return new Promise(async (resolve, reject) => {
      await createFolder(path.dirname(filePath));

      fs.writeFile(filePath, fileData, (err) => {
          if (err) {
              reject(err)
          } else {
              resolve()
          }
      })
  });
}


export const fetchS3Folder = async (key: string, localPath: string): Promise<void> => {
  const params = {
      Bucket: process.env.S3_BUCKET ?? "",
      Prefix: key
  }

  const response = await s3Client.listObjectsV2(params).promise()
  if (response.Contents) {
      for (const file of response.Contents) {
          const fileKey = file.Key
          if (fileKey) {
              const params = {
                  Bucket: process.env.S3_BUCKET ?? "",
                  Key: fileKey
              }
              const data = await s3Client.getObject(params).promise()
              if (data.Body) {
                  const fileData = data.Body
                  const filePath = `${localPath}/${fileKey.replace(key, "")}`
                  //@ts-ignore
                  await writeFile(filePath, fileData)
              }
          }
      }
  }
}