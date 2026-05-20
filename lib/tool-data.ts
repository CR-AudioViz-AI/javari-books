// lib/tool-data.ts — javari-books
// Tool definitions extracted from page.tsx to keep JSX parser clean
// CR AudioViz AI · May 2026

export const ACTIONS = [
  { id: 'book_recommendations', label: '📚 Book Finder',        desc: 'Personalized book recommendations',        prompt: (v) => `Recommend 8 books for someone who: enjoys ${v.genres || 'fiction, thrillers'}, recently loved "${v.lastBook || ''}", reading level: ${v.level || 'adult'}, mood: ${v.mood || 'any'}. For each: title, author, year, 2-sentence description, why they'll love it, and Goodreads rating if known.` },
  { id: 'reading_list',         label: '📋 Reading List',        desc: 'Curated reading list for your goals',      prompt: (v) => `Build a ${v.length || '12'}-book reading list for someone who wants to: ${v.goal || 'read more fiction'}. Theme: ${v.theme || 'any'}. Level: ${v.level || 'adult'}. Mix classic and contemporary. Include: title, author, brief rationale, order to read them, and an estimated reading time for each.` },
  { id: 'book_summary',         label: '📖 Book Summary',        desc: 'Chapter-by-chapter summary and themes',    prompt: (v) => `Provide a comprehensive summary of "${v.bookTitle || ''}" by ${v.author || ''}. Include: plot overview, key characters, major themes, important quotes, chapter-by-chapter breakdown, critical reception, and why it matters. Make it useful for both understanding and discussion.` },
  { id: 'author_research',      label: '✍️ Author Deep Dive',    desc: 'Research an author's life and work',      prompt: (v) => `Create a comprehensive profile of author ${v.author || ''}. Cover: biography, major works with descriptions, writing style, themes across their work, literary influences, awards, controversy (if any), best books to start with, chronological reading order, and their cultural impact.` },
  { id: 'discussion_questions', label: '💬 Book Club Questions', desc: 'Discussion questions for your book club',  prompt: (v) => `Create 15 deep discussion questions for "${v.bookTitle || ''}" by ${v.author || ''}. Include: opening icebreakers, character analysis questions, theme exploration, historical/cultural context questions, personal reflection prompts, and a closing discussion question. Suitable for a ${v.groupSize || '6-8'} person book club.` },
  { id: 'genre_explorer',       label: '🗺️ Genre Explorer',      desc: 'Deep dive into any literary genre',        prompt: (v) => `Write a comprehensive guide to the ${v.genre || 'science fiction'} genre. Include: definition and history, subgenres with descriptions, essential classic texts, modern masterworks, rising new authors, what makes it special, how to get started, and 10 essential reads with brief descriptions.` },
  { id: 'speed_read_guide',     label: '⚡ Speed Reading',       desc: 'Techniques to read faster and retain more', prompt: (v) => `Create a personalized speed reading and retention guide for someone who currently reads ${v.currentSpeed || '200-250'} words per minute. Goal: ${v.goal || 'double reading speed'}. Time available: ${v.timeAvailable || '15 minutes per day'}. Include: techniques, exercises, weekly training plan, retention strategies, and book recommendations for practice.` },
]


export const FIELDS = {
  book_recommendations: [{ id: 'genres', label: 'Favorite Genres', placeholder: 'Literary fiction, sci-fi, mystery...' }, { id: 'lastBook', label: 'Last Book You Loved', placeholder: 'The Name of the Wind, Project Hail Mary...' }, { id: 'mood', label: 'Current Mood', placeholder: 'Adventurous, thoughtful, escapist...' }],
  reading_list:         [{ id: 'goal', label: 'Reading Goal', placeholder: 'Understand AI, explore history, pure entertainment...' }, { id: 'theme', label: 'Theme or Era', placeholder: 'Victorian novels, modern sci-fi, Pulitzer winners...' }, { id: 'length', label: 'Number of Books', placeholder: '12' }],
  book_summary:         [{ id: 'bookTitle', label: 'Book Title', placeholder: 'Dune, 1984, The Midnight Library...' }, { id: 'author', label: 'Author', placeholder: 'Frank Herbert, George Orwell...' }],
  author_research:      [{ id: 'author', label: 'Author Name', placeholder: 'Ursula K. Le Guin, Toni Morrison...' }],
  discussion_questions: [{ id: 'bookTitle', label: 'Book Title', placeholder: 'Educated, Pachinko...' }, { id: 'author', label: 'Author', placeholder: 'Tara Westover, Min Jin Lee...' }, { id: 'groupSize', label: 'Group Size', placeholder: '6-8 people' }],
  genre_explorer:       [{ id: 'genre', label: 'Genre', placeholder: 'Science fiction, Gothic horror, Magical realism...' }],
  speed_read_guide:     [{ id: 'currentSpeed', label: 'Current Reading Speed', placeholder: '200-250 wpm' }, { id: 'timeAvailable', label: 'Daily Practice Time', placeholder: '15-20 minutes' }],
}

export function getFields(actionId) {
  return FIELDS[actionId] || []
}
