import type { Context } from "@oomol/types/oocana";
import ocr_api20210707, * as $ocr_api20210707 from "@alicloud/ocr-api20210707";

import * as $Util from "@alicloud/tea-util";
import * as $OpenApi from "@alicloud/openapi-client";

type Inputs = {
    accessKeyId: string,
    accessKeySecret: string,
    url: string,
    type: string
}
type Outputs = { 
    content: string
}

export default async function (
    params: Inputs,
    context: Context<Inputs, Outputs>
): Promise<Outputs> {
    const client = createClient(params.accessKeyId, params.accessKeySecret);
    const recognizeAllTextRequest = new $ocr_api20210707.RecognizeAllTextRequest({
        url: params.url,
        type: params.type
    });
    const runtime = new $Util.RuntimeOptions({});
    const resp = await client.recognizeAllTextWithOptions(recognizeAllTextRequest, runtime);
    const content = resp?.body?.data?.content;

    if (!content) {
        throw new Error("no content");
    }
    context.preview({
        type: "markdown",
        data: content,
    })
    return { content };
};


function createClient(accessKeyId: string, accessKeySecret: string): ocr_api20210707 {
    const config = new $OpenApi.Config({
        accessKeyId, accessKeySecret
    });

    config.endpoint = "ocr-api.cn-hangzhou.aliyuncs.com";
    return new (ocr_api20210707 as any).default(config);
}