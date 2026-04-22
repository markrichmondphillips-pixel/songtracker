export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { filename, contentType, fileData } = req.body
    const buffer = Buffer.from(fileData, 'base64')
    const key = `${Date.now()}-${filename}`

    const url = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/songtrackermp3/${key}`

    const crypto = require('crypto')
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const datetime = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z'
    const region = 'auto'
    const service = 's3'

    function hmac(key, data) {
      return crypto.createHmac('sha256', key).update(data).digest()
    }

    function hmacHex(key, data) {
      return crypto.createHmac('sha256', key).update(data).digest('hex')
    }

    const payloadHash = crypto.createHash('sha256').update(buffer).digest('hex')
    const host = `${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`

    const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${datetime}\n`
    const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date'
    const canonicalRequest = `PUT\n/songtrackermp3/${key}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`

    const credentialScope = `${date}/${region}/${service}/aws4_request`
    const stringToSign = `AWS4-HMAC-SHA256\n${datetime}\n${credentialScope}\n${crypto.createHash('sha256').update(canonicalRequest).digest('hex')}`

    const signingKey = hmac(hmac(hmac(hmac(`AWS4${process.env.R2_SECRET_ACCESS_KEY}`, date), region), service), 'aws4_request')
    const signature = hmacHex(signingKey, stringToSign)

    const authorization = `AWS4-HMAC-SHA256 Credential=${process.env.R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': datetime,
        'Authorization': authorization,
      },
      body: buffer,
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('R2 error:', text)
      return res.status(500).json({ error: 'Upload to R2 failed', detail: text })
    }

    const publicUrl = `${process.env.R2_BUCKET_URL}/${key}`
    res.status(200).json({ url: publicUrl })
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ error: error.message })
  }
}
