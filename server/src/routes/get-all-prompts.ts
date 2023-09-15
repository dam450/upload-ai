import { type FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'

interface Prompt {
  id: string
  title: string
  template: string
}

export async function getAllPromptsRoute(app: FastifyInstance): Promise<void> {
  app.get('/prompts', async () => {
    const prompts: Prompt[] = await prisma.prompt.findMany()

    return prompts
  })
}
