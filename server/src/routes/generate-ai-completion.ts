import { type FastifyRequest, type FastifyInstance } from 'fastify'
import { z } from 'zod'
import { streamToResponse, OpenAIStream } from 'ai'

import { prisma } from '../lib/prisma'
import { openAI } from '../lib/openai'

interface VideoReq extends FastifyRequest {
  params: {
    videoId: string
  }
}
export async function generateAICompletionRoute(
  app: FastifyInstance,
): Promise<void> {
  app.post('/ai/complete', async function (request: VideoReq, reply: any) {
    const bodySchema = z.object({
      videoId: z.string().uuid(),
      prompt: z.string(),
      temperature: z.number().min(0).max(1).default(0.5),
    })

    const { videoId, temperature, prompt } = bodySchema.parse(request.body)

    const video = await prisma.video.findUniqueOrThrow({
      where: {
        id: videoId,
      },
    })

    if (video.transcription == null) {
      void reply.status(404).send({
        error: 'Vídeo has no transcription',
      })
    }

    const transcription = video.transcription!

    const promptMessage = prompt.replace('{transcription}', transcription)

    const response = await openAI.chat.completions.create({
      model: 'gpt-3.5-turbo-16k',
      temperature,
      messages: [{ role: 'user', content: promptMessage }],
      stream: true,
    })

    // return { response }

    const stream = OpenAIStream(response)
    streamToResponse(stream, reply.raw, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      },
    })
  })
}
