// lib/tool-data.ts — javari-books
// CR AudioViz AI · May 2026
export function getActions() {
  return [
    { id: 'book_recommendations', label: '📚 Book Finder',         desc: 'Personalized book recommendations',      buildPrompt: function(v) { return 'Recommend 8 books for someone who enjoys ' + (v.genres||'fiction, thrillers') + ', recently loved "' + (v.lastBook||'') + '", mood: ' + (v.mood||'any') + '. For each: title, author, year, 2-sentence description, why they will love it, and Goodreads rating if known.' } },
    { id: 'reading_list',         label: '📋 Reading List',         desc: 'Curated reading list for your goals',   buildPrompt: function(v) { return 'Build a ' + (v.length||'12') + '-book reading list for someone who wants to: ' + (v.goal||'read more fiction') + '. Theme: ' + (v.theme||'any') + '. Mix classic and contemporary. Include: title, author, rationale, reading order, and estimated reading time for each.' } },
    { id: 'book_summary',         label: '📖 Book Summary',         desc: 'Chapter-by-chapter summary and themes',  buildPrompt: function(v) { return 'Provide a comprehensive summary of "' + (v.bookTitle||'') + '" by ' + (v.author||'') + '. Include: plot overview, key characters, major themes, important quotes, chapter breakdown, critical reception, and why it matters.' } },
    { id: 'author_research',      label: '✍️ Author Deep Dive',     desc: 'Research an author life and work',   buildPrompt: function(v) { return 'Create a comprehensive profile of author ' + (v.author||'') + '. Cover: biography, major works, writing style, themes, literary influences, awards, best books to start with, chronological reading order, and cultural impact.' } },
    { id: 'discussion_questions', label: '💬 Book Club Questions',  desc: 'Discussion questions for your club',    buildPrompt: function(v) { return 'Create 15 deep discussion questions for "' + (v.bookTitle||'') + '" by ' + (v.author||'') + '. Include: icebreakers, character analysis, theme exploration, historical context, personal reflection, and a closing question. For ' + (v.groupSize||'6-8') + ' people.' } },
    { id: 'genre_explorer',       label: '🗺️ Genre Explorer',       desc: 'Deep dive into any literary genre',      buildPrompt: function(v) { return 'Write a comprehensive guide to the ' + (v.genre||'science fiction') + ' genre. Include: definition, history, subgenres, essential classics, modern masterworks, rising authors, how to get started, and 10 essential reads with descriptions.' } },
    { id: 'speed_read_guide',     label: '⚡ Speed Reading',        desc: 'Techniques to read faster and retain more', buildPrompt: function(v) { return 'Create a personalized speed reading guide for someone who reads ' + (v.currentSpeed||'200-250') + ' wpm. Goal: ' + (v.goal||'double speed') + '. Available time: ' + (v.timeAvailable||'15 min/day') + '. Include: techniques, exercises, weekly plan, retention strategies, and practice book recommendations.' } },
  ]
}
export function getFields(actionId) {
  const map = {
    book_recommendations: { label: 'Your Preferences', fields: [{ id: 'genres', label: 'Favorite Genres', placeholder: 'Literary fiction, sci-fi, mystery...' }, { id: 'lastBook', label: 'Last Book You Loved', placeholder: 'The Name of the Wind...' }, { id: 'mood', label: 'Current Mood', placeholder: 'Adventurous, thoughtful, escapist...' }] },
    reading_list: { label: 'Reading Goal', fields: [{ id: 'goal', label: 'Goal', placeholder: 'Understand AI, explore history...' }, { id: 'theme', label: 'Theme or Era', placeholder: 'Victorian, modern sci-fi, Pulitzer winners...' }, { id: 'length', label: 'Number of Books', placeholder: '12' }] },
    book_summary: { label: 'Book Details', fields: [{ id: 'bookTitle', label: 'Book Title', placeholder: 'Dune, 1984, The Midnight Library...' }, { id: 'author', label: 'Author', placeholder: 'Frank Herbert, George Orwell...' }] },
    author_research: { label: 'Author', fields: [{ id: 'author', label: 'Author Name', placeholder: 'Ursula K. Le Guin, Toni Morrison...' }] },
    discussion_questions: { label: 'Book Club', fields: [{ id: 'bookTitle', label: 'Book Title', placeholder: 'Educated, Pachinko...' }, { id: 'author', label: 'Author', placeholder: 'Tara Westover, Min Jin Lee...' }, { id: 'groupSize', label: 'Group Size', placeholder: '6-8 people' }] },
    genre_explorer: { label: 'Genre', fields: [{ id: 'genre', label: 'Genre', placeholder: 'Science fiction, Gothic horror, Magical realism...' }] },
    speed_read_guide: { label: 'Reading Goals', fields: [{ id: 'currentSpeed', label: 'Current Speed', placeholder: '200-250 wpm' }, { id: 'timeAvailable', label: 'Daily Practice Time', placeholder: '15-20 minutes' }] },
  }
  return map[actionId] || { label: 'Details', fields: [] }
}
