 splitIntoChunks(text: string, maxLength: number): string[] {
  const chunks: string[] = []
  const sentences = text.split(/(?<=[.!?])\s+/)
  let currentChunk = ''

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxLength) {
      if (currentChunk) chunks.push(currentChunk.trim())
      currentChunk = sentence
    } else {
      currentChunk += ' ' + sentence
    }
  }
  if (currentChunk) chunks.push(currentChunk.trim())
  return chunks
}

function estimateDuration(text: string): string {
  const words = text.split(/\s+/).length
  const minutes = Math.ceil(words / 150)
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return hours > 0 ? `${hours}h ${remainingMinutes}m` : `${minutes}m`
}

function structureIntoChapters(text: string): string[] {
  const words = text.split(/\s+/)
  const WORDS_PER_CHAPTER = 1500
  const chapters: string[] = []
  
  for (let i = 0; i < words.length; i += WORDS_PER_CHAPTER) {
    chapters.push(words.slice(i, i + WORDS_PER_CHAPTER).join(' '))
  }
  
  return chapters
}
