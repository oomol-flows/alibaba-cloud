import type { Context } from "@oomol/types/oocana";
import OSS from "ali-oss";
import path from "path";

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
}
type Outputs = {
  url: string,
  originFilePath: string;
}



export default async function (
  params: Inputs,
  context: Context<Inputs, Outputs>
): Promise<Outputs> {

  // your code
  const client = new OSS({
    region: params.region,
    accessKeyId: params.accessKeyId,
    accessKeySecret: params.accessKeySecret,
    bucket: params.bucket,
    secure: true,
  });
  const timestampInSeconds = Math.floor(Date.now() / 1000)
  const localfile_name = `${timestampInSeconds}_${path.basename(params.localfile)}`;
  const uploadResult = await client.put(localfile_name, params.localfile);
  return {
    originFilePath: params.localfile,
    url: uploadResult.url,
  }
};