import { fastify } from 'fastify'
import { fastifyCors } from '@fastify/cors'
import { getAllPromptsRoute } from './routes/get-all-prompts'
import { uploadVideoRoute } from './routes/upload-video'
import { createTranscriptionRoute } from './routes/create-transcription'
import { generateAICompletionRoute } from './routes/generate-ai-completion'

const app = fastify()

void app.register(fastifyCors, {
  origin: '*',
})

void app.register(getAllPromptsRoute)
void app.register(uploadVideoRoute)
void app.register(createTranscriptionRoute)
void app.register(generateAICompletionRoute)

app
  .listen({
    port: 3333,
  })
  .then(() => {
    console.info('HTTP server running on port 3333')
  })
  .catch((err) => {
    console.error(err)
  })
