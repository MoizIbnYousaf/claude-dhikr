// The four most beloved words to Allah (Sahih Muslim 2137)
// + La hawla: "a treasure from the treasures of Jannah" (Bukhari 4205)
// + Morning dua for beneficial knowledge (Ibn Majah 925)
const adhkar: string[] = [
  'SubhanAllah — Glory be to Allah',
  'Alhamdulillah — All praise is for Allah',
  'Allahu Akbar — Allah is the Greatest',
  'La ilaha illAllah — There is no god but Allah',
  'La hawla wa la quwwata illa billah — There is no power except with Allah',
  'Ask Allah for beneficial knowledge',
  'Rabbi zidni ilma — My Lord, increase me in knowledge',
];

export function getShuffled(): string[] {
  const shuffled = [...adhkar];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
