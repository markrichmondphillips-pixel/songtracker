import crypto from 'crypto'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { filename, contentType } = req.body
  const key = `${Date.now()}-${filename}`

  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const bucket = 'songtrackermp3'

  const datetime = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z'
  const date = datetime.slice(0, 8)
  const region = 'auto'
  const service = 's3'
  const host = `${accountId}.r2.cloudflarestorage.com`

  function hmac(key, data, encoding) {
    return crypto.createHmac('sha256', key).update(data).digest(encoding)
  }

  const credentialScope = `${date}/${region}/${service}/aws4_request`
  const credential = `${accessKeyId}/${credentialScope}`
  const expiresIn = 3600

  const queryString = [
    `X-Amz-Algorithm=AWS4-HMAC-SHA256`,
    `X-Amz-Credential=${encodeURIComponent(credential)}`,
    `X-Amz-Date=${datetime}`,
    `X-Amz-Expires=${expiresIn}`,
    `X-Amz-SignedHeaders=host`,
  ].join('&')

  const canonicalRequest = [
    'PUT',
    `/${bucket}/${key}`,
    queryString,
    `host:${host}\n`,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n')

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    datetime,
    credentialScope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
  ].join('\n')

  const signingKey = hmac(hmac(hmac(hmac(`AWS4${secretAccessKey}`, date), region), service), 'aws4_request')
  const signature = hmac(signingKey, stringToSign, 'hex')

  const presignedUrl = `https://${host}/${bucket}/${key}?${queryString}&X-Amz-Signature=${signature}`
  const publicUrl = `${process.env.R2_BUCKET_URL}/${key}`

  res.status(200).json({ presignedUrl, publicUrl })
}
