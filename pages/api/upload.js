import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

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

    await s3.send(new PutObjectCommand({
      Bucket: 'songtrackermp3',
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }))

    const url = `${process.env.R2_BUCKET_URL}/${key}`
    res.status(200).json({ url })
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ error: 'Upload failed' })
  }
}
