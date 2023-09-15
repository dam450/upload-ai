import { Separator } from '@radix-ui/react-separator'
import { FileVideo, Upload } from 'lucide-react'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Button } from './ui/button'
import { useMemo, useRef, useState } from 'react'
import { getFFmpeg } from '@/lib/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import { api } from '@/lib/axios'

type Status =
  | 'idle'
  | 'converting'
  | 'uploading'
  | 'generating'
  | 'success'
  | 'error'

const statusMessage: Record<Status, string> = {
  converting: 'Convertendo...',
  generating: 'Trancrevendo...',
  uploading: 'Enviando...',
  success: 'Transcrição concluída!',
  error: 'Ocorreu um erro!',
  idle: 'Aguardando...',
}

interface VideoInputFormProps {
  onVideoUploaded: (Id: string) => void
}

export function VideoInputForm({ onVideoUploaded }: VideoInputFormProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [status, setStatus] = useState<Status>('idle')

  const promptInputRef = useRef<HTMLInputElement>(null)

  function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const { files } = event.currentTarget

    if (!files) return

    const FIRST_ITEM = 0
    const selectedFile = files.item(FIRST_ITEM)
    setVideoFile(selectedFile)
  }

  async function convertVideoToAudio(video: File) {
    console.warn('Audio extract started!')

    const ffmpeg = await getFFmpeg()

    ffmpeg.writeFile('input.mp4', await fetchFile(video))

    // ffmpeg.on('log', (message) => {
    //   console.log(message)
    // })

    const PERCENT = 100

    ffmpeg.on('progress', progress => {
      console.warn(
        `convert progress: ${Math.round(progress.progress * PERCENT)}%`
      )
    })

    await ffmpeg.exec([
      '-i',
      'input.mp4',
      '-map',
      '0:a',
      '-b:a',
      '20k',
      '-acodec',
      'libmp3lame',
      'output.mp3',
    ])

    const data = await ffmpeg.readFile('output.mp3')

    const audioBlobFile = new Blob([data], {
      type: 'audio/mpeg',
    })

    const audioFile = new File([audioBlobFile], 'audio.mp3', {
      type: 'audio/mpeg',
    })

    console.warn('Audio extract finished!')

    return audioFile
  }

  async function handleUploadVideo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const prompt = promptInputRef.current?.value

    if (!videoFile) {
      return
    }

    // convert video to audio

    setStatus('converting')

    const audioFile = await convertVideoToAudio(videoFile)

    const data = new FormData()
    data.append('file', audioFile)

    setStatus('uploading')

    const response = await api.post('/videos', data)
    const videoId = response.data.video.id

    setStatus('generating')

    await api.post(`videos/${videoId}/transcription`, {
      prompt,
    })

    setStatus('success')

    onVideoUploaded(videoId)
  }

  const previewUrl = useMemo(() => {
    if (!videoFile) {
      return null
    }

    return URL.createObjectURL(videoFile)
  }, [videoFile])

  return (
    <form className="space-y-6" onSubmit={handleUploadVideo}>
      <label
        className="max-h-44 relative border flex rounded-md aspect-video cursor-pointer border-dashed text-sm flex-col gap-2 items-center justify-center text-muted-foreground hover:bg-primary/5"
        tabIndex={0}
        htmlFor="video"
      >
        {previewUrl ? (
          <video
            className="pointer-events-none inset-0"
            src={previewUrl}
            controls={false}
          />
        ) : (
          <>
            <FileVideo className="w-4 h-4" />
            Selecione um vídeo
          </>
        )}
      </label>

      <input
        className="sr-only"
        type="file"
        name="video"
        accept="video/mp4"
        id="video"
        tabIndex={-1}
        onChange={handleFileSelected}
      />

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="transcription_prompt">Prompt de transcrição</Label>
        <Textarea
          ref={promptInputRef}
          disabled={status !== 'idle'}
          className="h-20 leading-relaxed resize-none"
          id="transcription_prompt"
          placeholder="Inclua palavras-chave mencionadas no vídeo separadas por vírgula (,) "
        />
      </div>

      <Button
        className="w-full data-[success=true]:bg-lime-500"
        data-success={status === 'success'}
        type="submit"
        disabled={status !== 'idle'}
      >
        {status === 'idle' ? (
          <>
            Carregar vídeo <Upload className="w-4 h-4 ml-2" />
          </>
        ) : (
          statusMessage[status]
        )}
      </Button>
    </form>
  )
}
