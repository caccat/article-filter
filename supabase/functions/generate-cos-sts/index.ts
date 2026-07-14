// 生成 COS 临时密钥（STS）- 腾讯云 API 3.0 签名
// 部署后需设置环境变量：TENCENT_SECRET_ID, TENCENT_SECRET_KEY, COS_BUCKET, COS_REGION

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const ENV = {
  secretId: Deno.env.get('TENCENT_SECRET_ID') || '',
  secretKey: Deno.env.get('TENCENT_SECRET_KEY') || '',
  bucket: Deno.env.get('COS_BUCKET') || '',
  region: Deno.env.get('COS_REGION') || 'ap-nanjing',
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

const SERVICE = 'sts'
const HOST = 'sts.tencentcloudapi.com'
const ALGORITHM = 'TC3-HMAC-SHA256'
const API_VERSION = '2018-08-13'
const ACTION = 'GetFederationToken'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (!ENV.secretId || !ENV.secretKey) {
    return new Response(JSON.stringify({ error: 'COS 密钥未配置' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const credentials = await generateSTS()
    return new Response(JSON.stringify(credentials), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function generateSTS() {
  const timestamp = Math.floor(Date.now() / 1000)
  const date = new Date(timestamp * 1000).toISOString().split('T')[0]

  // 策略：允许对该桶的所有操作
  const policy = JSON.stringify({
    version: '2.0',
    statement: [{
      effect: 'allow',
      action: ['name/cos:*'],
    }],
  })

  const payload = JSON.stringify({
    Name: 'cos-uploader',
    Policy: policy,
    DurationSeconds: 1800,
  })

  // TC3-HMAC-SHA256 签名
  const canonicalHeaders = 'content-type:application/json; charset=utf-8\nhost:' + HOST + '\n'
  const signedHeaders = 'content-type;host'
  const hashedRequestPayload = await sha256Hex(payload)
  const canonicalRequest = [
    'POST', '/', '',
    canonicalHeaders, signedHeaders, hashedRequestPayload
  ].join('\n')

  const credentialScope = `${date}/${SERVICE}/tc3_request`
  const hashedCanonicalRequest = await sha256Hex(canonicalRequest)
  const stringToSign = [ALGORITHM, timestamp, credentialScope, hashedCanonicalRequest].join('\n')

  // 派生密钥
  const secretDate = await hmac(`TC3${ENV.secretKey}`, date)
  const secretService = await hmac(secretDate, SERVICE)
  const secretSigning = await hmac(secretService, 'tc3_request')
  const signature = await hmacHex(secretSigning, stringToSign)

  const authorization = `${ALGORITHM} Credential=${ENV.secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  // 发送请求
  const resp = await fetch(`https://${HOST}/`, {
    method: 'POST',
    headers: {
      'Authorization': authorization,
      'Content-Type': 'application/json; charset=utf-8',
      'Host': HOST,
      'X-TC-Action': ACTION,
      'X-TC-Timestamp': String(timestamp),
      'X-TC-Version': API_VERSION,
      'X-TC-Region': 'ap-guangzhou',
    },
    body: payload,
  })
  const data = await resp.json()
  if (data.Response?.Error) throw new Error(`${data.Response.Error.Code}: ${data.Response.Error.Message}`)
  const cred = data.Response.Credentials
  return {
    tmpSecretId: cred.TmpSecretId,
    tmpSecretKey: cred.TmpSecretKey,
    sessionToken: cred.Token,
    startTime: timestamp,
    expiredTime: cred.ExpiredTime,
    bucket: ENV.bucket,
    region: ENV.region,
  }
}

function toBytes(str) { return new TextEncoder().encode(str) }
function toHex(buf) { return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('') }
async function sha256Hex(str) { return toHex(await crypto.subtle.digest('SHA-256', toBytes(str))) }
async function hmac(key, msg) {
  const keyData = typeof key === 'string' ? toBytes(key) : key
  const ck = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', ck, toBytes(msg)))
}
async function hmacHex(key, msg) { return toHex(await hmac(key, msg)) }

