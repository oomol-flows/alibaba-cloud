import type { Context } from "@oomol/types/oocana";
import OSS from "ali-oss";
import path from "path";
import fs from "fs/promises";
import { lookup } from "mime-types";

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
}
type Outputs = {
  url: string,
  originFilePath: string,
  objectKey: string,
  fileSize: number,
  mimeType: string,
  uploadTime: string,
  progress: number,
}



/**
 * Sleep function for retry delays
 */
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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

        // For small files, use simple put method
        if (fileSize < 1024 * 1024) { // Less than 1MB
          context.reportProgress(0);
          await client.put(objectKey, params.localfile, {
            mime: mimeType,
          });
          uploadProgress = 100;
          context.reportProgress(100);
        } else {
          // For larger files, use multipart upload with progress tracking
          await client.multipartUpload(objectKey, params.localfile, {
            mime: mimeType,
            progress: (p: number) => {
              uploadProgress = Math.round(p * 100);
              // Report progress to OOMOL platform
              context.reportProgress(uploadProgress);
            }
          });
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