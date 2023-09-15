import { type FastifyInstance } from 'fastify'
import { fastifyMultipart, type MultipartFile } from '@fastify/multipart'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import { pipeline } from 'node:stream'
import { promisify } from 'node:util'
import { prisma } from '../lib/prisma'

const pump = promisify(pipeline)

export async function uploadVideoRoute(app: FastifyInstance): Promise<void> {
  void app.register(fastifyMultipart, {
    limits: {
      fileSize: 1_048_576 * 25, // 25mb
    },
  })

  type FileData = MultipartFile | undefined

  app.post('/videos', async (request, reply) => {
    const data: FileData = await request.file()

    if (data?.filename.length === 0) {
      return await reply.status(400).send({ error: 'missing file input' })
    }

    const extension = path.extname(data.filename)

    if (extension !== '.mp3') {
      return await reply
        .status(400)
        .send({ error: 'Invalid input type, please upload a .mp3 file.' })
    }

    const fileBaseName = path.basename(data.filename, extension)
    const fileUploadName = `${fileBaseName}-${randomUUID()}${extension}`

    const uploadDestination = path.resolve(
      __dirname,
      '../../upload',
      fileUploadName,
    )

    await pump(data.file, fs.createWriteStream(uploadDestination))

    const video = await prisma.video.create({
      data: {
        name: data?.filename,
        path: uploadDestination,
      },
    })

    return { video }
  })
}
