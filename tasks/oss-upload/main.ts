import type { Context } from "@oomol/types/oocana";
import OSS from "ali-oss";
import path from "path";
import fs from "fs/promises";
import { createReadStream } from "fs";
import { lookup } from "mime-types";
import crypto from "crypto";

enum OssRegion {
  // China Regions
  CN_HANGZHOU = "oss-cn-hangzhou",        // 华东1（杭州）
  CN_SHANGHAI = "oss-cn-shanghai",        // 华东2（上海）
  CN_QINGDAO = "oss-cn-qingdao",          // 华北1（青岛）
  CN_BEIJING = "oss-cn-beijing",          // 华北2（北京）
  CN_ZHANGJIAKOU = "oss-cn-zhangjiakou",  // 华北3（张家口）
  CN_HUHEHAOTE = "oss-cn-huhehaote",      // 华北5（呼和浩特）
  CN_WULANCHABU = "oss-cn-wulanchabu",    // 华北6（乌兰察布）
  CN_SHENZHEN = "oss-cn-shenzhen",        // 华南1（深圳）
  CN_HEYUAN = "oss-cn-heyuan",            // 华南2（河源）
  CN_GUANGZHOU = "oss-cn-guangzhou",      // 华南3（广州）
  CN_CHENGDU = "oss-cn-chengdu",          // 西南1（成都）
  CN_HONGKONG = "oss-cn-hongkong",        // 中国（香港）

  // International Regions
  US_WEST_1 = "oss-us-west-1",            // 美国西部1（硅谷）
  US_EAST_1 = "oss-us-east-1",            // 美国东部1（弗吉尼亚）
  AP_SOUTHEAST_1 = "oss-ap-southeast-1",  // 亚太东南1（新加坡）
  AP_SOUTHEAST_2 = "oss-ap-southeast-2",  // 亚太东南2（悉尼）
  AP_SOUTHEAST_3 = "oss-ap-southeast-3",  // 亚太东南3（吉隆坡）
  AP_SOUTHEAST_5 = "oss-ap-southeast-5",  // 亚太东南5（雅加达）
  AP_NORTHEAST_1 = "oss-ap-northeast-1",  // 亚太东北1（日本）
  AP_SOUTH_1 = "oss-ap-south-1",          // 亚太南部1（孟买）
  EU_CENTRAL_1 = "oss-eu-central-1",      // 欧洲中部1（法兰克福）
  EU_WEST_1 = "oss-eu-west-1",            // 英国（伦敦）
  ME_EAST_1 = "oss-me-east-1"             // 中东东部1（迪拜）
}


type Inputs = {
  region: OssRegion,
  accessKeyId: string,
  accessKeySecret: string,
  bucket: string,
  localfile: string,
  customPath?: string,
  keepOriginalName?: boolean,
  maxRetries?: number,
  enableResumableUpload?: boolean,
  chunkSize?: number,
}
type Outputs = {
  url: string,
  originFilePath: string,
  objectKey: string,
  fileSize: number,
  mimeType: string,
  uploadTime: string,
  progress: number,
  resumedFromCheckpoint?: boolean,
  totalParts?: number,
}



interface UploadCheckpoint {
  uploadId: string;
  objectKey: string;
  fileHash: string;
  fileSize: number;
  chunkSize: number;
  uploadedParts: { partNumber: number; etag: string }[];
  createdAt: string;
}

interface PartUploadResult {
  partNumber: number;
  etag: string;
}

/**
 * Sleep function for retry delays
 */
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate file hash for checkpoint validation
 */
async function calculateFileHash(filePath: string): Promise<string> {
  const hash = crypto.createHash('md5');
  const stream = createReadStream(filePath);

  for await (const chunk of stream) {
    hash.update(chunk);
  }

  return hash.digest('hex');
}

/**
 * Get checkpoint storage path
 */
function getCheckpointPath(filePath: string, objectKey: string): string {
  const hash = crypto.createHash('md5').update(filePath + objectKey).digest('hex');
  return `/tmp/oss-upload-${hash}.json`;
}

/**
 * Save upload checkpoint
 */
async function saveCheckpoint(checkpoint: UploadCheckpoint, checkpointPath: string): Promise<void> {
  await fs.writeFile(checkpointPath, JSON.stringify(checkpoint, null, 2), 'utf-8');
}

/**
 * Load upload checkpoint
 */
async function loadCheckpoint(checkpointPath: string): Promise<UploadCheckpoint | null> {
  try {
    const data = await fs.readFile(checkpointPath, 'utf-8');
    return JSON.parse(data) as UploadCheckpoint;
  } catch (error) {
    return null;
  }
}

/**
 * Remove checkpoint file
 */
async function removeCheckpoint(checkpointPath: string): Promise<void> {
  try {
    await fs.unlink(checkpointPath);
  } catch (error) {
    // Ignore error if file doesn't exist
  }
}

/**
 * Read file chunk
 */
async function readFileChunk(filePath: string, start: number, size: number): Promise<Buffer> {
  const buffer = Buffer.alloc(size);
  const fd = await fs.open(filePath, 'r');
  try {
    const result = await fd.read(buffer, 0, size, start);
    return buffer.subarray(0, result.bytesRead);
  } finally {
    await fd.close();
  }
}

/**
 * Validate input parameters
 */
function validateInputs(params: Inputs): void {
  if (!params.region) {
    throw new Error("Region is required");
  }
  if (!params.accessKeyId) {
    throw new Error("Access Key ID is required");
  }
  if (!params.accessKeySecret) {
    throw new Error("Access Key Secret is required");
  }
  if (!params.bucket) {
    throw new Error("Bucket name is required");
  }
  if (!params.localfile) {
    throw new Error("Local file path is required");
  }
}

/**
 * Generate object key based on parameters
 */
function generateObjectKey(
  localFilePath: string,
  customPath?: string,
  keepOriginalName?: boolean
): string {
  const fileName = path.basename(localFilePath);
  const finalFileName = keepOriginalName
    ? fileName
    : `${Math.floor(Date.now() / 1000)}_${fileName}`;

  if (customPath) {
    // Ensure customPath ends with / if it doesn't already
    const normalizedPath = customPath.endsWith('/') ? customPath : `${customPath}/`;
    return `${normalizedPath}${finalFileName}`;
  }

  return finalFileName;
}

/**
 * Resumable multipart upload with checkpoint support
 */
async function resumableMultipartUpload(
  client: OSS,
  objectKey: string,
  filePath: string,
  fileSize: number,
  mimeType: string,
  chunkSize: number,
  context: Context<Inputs, Outputs>
): Promise<{ resumedFromCheckpoint: boolean; totalParts: number }> {
  const checkpointPath = getCheckpointPath(filePath, objectKey);
  const fileHash = await calculateFileHash(filePath);

  let checkpoint = await loadCheckpoint(checkpointPath);
  let uploadId: string;
  let uploadedParts: { partNumber: number; etag: string }[] = [];
  let resumedFromCheckpoint = false;

  // Validate existing checkpoint
  if (checkpoint) {
    if (checkpoint.fileHash === fileHash &&
        checkpoint.fileSize === fileSize &&
        checkpoint.objectKey === objectKey) {
      // Valid checkpoint, resume upload
      uploadId = checkpoint.uploadId;
      uploadedParts = checkpoint.uploadedParts || [];
      resumedFromCheckpoint = true;
      console.log(`Resuming upload from checkpoint with ${uploadedParts.length} completed parts`);
    } else {
      // Invalid checkpoint, start fresh
      await removeCheckpoint(checkpointPath);
      checkpoint = null;
    }
  }

  // Start new multipart upload if no valid checkpoint
  if (!checkpoint) {
    const initResult = await client.initMultipartUpload(objectKey, {
      mime: mimeType,
    });
    uploadId = initResult.uploadId;

    checkpoint = {
      uploadId,
      objectKey,
      fileHash,
      fileSize,
      chunkSize,
      uploadedParts: [],
      createdAt: new Date().toISOString()
    };

    await saveCheckpoint(checkpoint, checkpointPath);
  }

  const totalParts = Math.ceil(fileSize / chunkSize);
  const uploadedPartNumbers = new Set(uploadedParts.map(p => p.partNumber));

  // Calculate initial progress based on uploaded parts
  const initialProgress = Math.round((uploadedParts.length / totalParts) * 100);
  if (initialProgress > 0) {
    context.reportProgress(initialProgress);
  }

  try {
    // Upload remaining parts
    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      if (uploadedPartNumbers.has(partNumber)) {
        continue; // Skip already uploaded parts
      }

      const start = (partNumber - 1) * chunkSize;
      const end = Math.min(start + chunkSize, fileSize);
      const partSize = end - start;

      const chunkData = await readFileChunk(filePath, start, partSize);

      // Upload part with retry
      let partResult: PartUploadResult | null = null;
      for (let retry = 0; retry < 3; retry++) {
        try {
          const result = await client.uploadPart(objectKey, uploadId, partNumber, chunkData, 0, partSize);
          partResult = { partNumber, etag: result.etag };
          break;
        } catch (error: any) {
          if (retry === 2) throw error;
          await sleep(1000 * (retry + 1));
        }
      }

      if (partResult) {
        uploadedParts.push(partResult);

        // Update checkpoint
        checkpoint.uploadedParts = uploadedParts;
        await saveCheckpoint(checkpoint, checkpointPath);

        // Report progress
        const progress = Math.round((uploadedParts.length / totalParts) * 100);
        context.reportProgress(progress);
      }
    }

    // Complete multipart upload
    const parts = uploadedParts.map(part => ({ number: part.partNumber, etag: part.etag }));
    await client.completeMultipartUpload(objectKey, uploadId, parts);

    // Clean up checkpoint
    await removeCheckpoint(checkpointPath);

    return {
      resumedFromCheckpoint,
      totalParts
    };

  } catch (error) {
    // Keep checkpoint for future resume
    console.error('Upload failed, checkpoint saved for resume:', error);
    throw error;
  }
}

export default async function (
  params: Inputs,
  context: Context<Inputs, Outputs>
): Promise<Outputs> {
  try {
    // Validate inputs
    validateInputs(params);

    // Check if file exists
    let fileStats: any;
    try {
      fileStats = await fs.stat(params.localfile);
      if (!fileStats.isFile()) {
        throw new Error(`Path "${params.localfile}" is not a file`);
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`File not found: "${params.localfile}"`);
      }
      throw new Error(`Cannot access file "${params.localfile}": ${error.message}`);
    }

    // Get file information
    const fileSize = fileStats.size;
    const mimeType = lookup(params.localfile) || 'application/octet-stream';

    // Initialize OSS client
    const client = new OSS({
      region: params.region,
      accessKeyId: params.accessKeyId,
      accessKeySecret: params.accessKeySecret,
      bucket: params.bucket,
      secure: true,
    });

    // Generate object key
    const objectKey = generateObjectKey(
      params.localfile,
      params.customPath,
      params.keepOriginalName
    );
    // Upload with retry mechanism
    const maxRetries = Math.max(0, Math.min(params.maxRetries || 3, 5));
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Initialize progress tracking
        let uploadProgress = 0;
        let resumedFromCheckpoint = false;

        // For small files, use simple put method
        if (fileSize < 1024 * 1024) { // Less than 1MB
          context.reportProgress(0);
          await client.put(objectKey, params.localfile, {
            mime: mimeType,
          });
          uploadProgress = 100;
          context.reportProgress(100);
        } else {
          // For larger files, use resumable multipart upload or standard multipart
          if (params.enableResumableUpload) {
            const chunkSize = Math.max(params.chunkSize ?? 5 * 1024 * 1024, 100 * 1024); // Min 100KB, default 5MB
            const resumableResult = await resumableMultipartUpload(client, objectKey, params.localfile, fileSize, mimeType, chunkSize, context);
            uploadProgress = 100;
            resumedFromCheckpoint = resumableResult.resumedFromCheckpoint;
          } else {
            // Standard multipart upload without resumable support
            await client.multipartUpload(objectKey, params.localfile, {
              mime: mimeType,
              progress: (p: number) => {
                uploadProgress = Math.round(p * 100);
                // Report progress to OOMOL platform
                context.reportProgress(uploadProgress);
              }
            });
          }
        }

        // Generate the URL properly
        const url = `https://${params.bucket}.${params.region}.aliyuncs.com/${objectKey}`;

        // Success - return results
        return {
          url: url,
          originFilePath: params.localfile,
          objectKey: objectKey,
          fileSize: fileSize,
          mimeType: mimeType,
          uploadTime: new Date().toISOString(),
          progress: 100,
          resumedFromCheckpoint: params.enableResumableUpload ? resumedFromCheckpoint : undefined,
          totalParts: params.enableResumableUpload && fileSize >= 1024 * 1024 ? Math.ceil(fileSize / Math.max(params.chunkSize ?? 5 * 1024 * 1024, 100 * 1024)) : undefined,
        };

      } catch (error: any) {
        lastError = error;

        // If this is the last attempt, don't wait
        if (attempt === maxRetries) {
          break;
        }

        // Wait before retrying (exponential backoff)
        const delayMs = Math.min(1000 * Math.pow(2, attempt), 10000);
        await sleep(delayMs);

        // Log retry attempt (optional)
        console.warn(`Upload attempt ${attempt + 1} failed, retrying in ${delayMs}ms: ${error.message}`);
      }
    }

    // All retry attempts failed
    throw new Error(
      `Upload failed after ${maxRetries + 1} attempts. Last error: ${lastError?.message || 'Unknown error'}`
    );

  } catch (error: any) {
    // Enhance error message with context
    const errorMessage = error.message || 'Unknown error occurred during upload';
    throw new Error(`OSS Upload Error: ${errorMessage}`);
  }
};