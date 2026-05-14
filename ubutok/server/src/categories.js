export const CATEGORIES = [
  {
    key: 'film',
    label: 'Film & Video',
    base: 'https://ubuweb.com/film/',
    index: 'https://ubuweb.com/film/index.html',
    mediaType: 'video',
  },
  {
    key: 'sound',
    label: 'Sound',
    base: 'https://ubuweb.com/sound/',
    index: 'https://ubuweb.com/sound/index.html',
    mediaType: 'audio',
  },
  {
    key: 'dance',
    label: 'Dance',
    base: 'https://ubuweb.com/dance/',
    index: 'https://ubuweb.com/dance/index.html',
    mediaType: 'video',
  },
  {
    key: 'contemp',
    label: 'Contemporary',
    base: 'https://ubuweb.com/contemp/',
    index: 'https://ubuweb.com/contemp/index.html',
    mediaType: null,  // mixed: pdf, html, video
  },
  {
    key: 'vp',
    label: 'Visual Poetry',
    base: 'https://ubuweb.com/vp/',
    index: 'https://ubuweb.com/vp/index.html',
    mediaType: 'pdf',
  },
  {
    key: 'cc',
    label: 'Conceptual Comics',
    base: 'https://ubuweb.com/cc/',
    index: 'https://ubuweb.com/cc/index.html',
    mediaType: 'pdf',
  },
  {
    key: 'historical',
    label: 'Historical',
    base: 'https://ubuweb.com/historical/',
    index: 'https://ubuweb.com/historical/index.html',
    mediaType: null,  // auto-detects: pdf → image → text
  },
  {
    key: 'concept',
    label: 'Conceptual Writing',
    base: 'https://ubuweb.com/concept/',
    index: 'https://ubuweb.com/concept/index.html',
    mediaType: 'text',
  },
  {
    key: 'papers',
    label: 'Papers',
    base: 'https://ubuweb.com/papers/',
    index: 'https://ubuweb.com/papers/index.html',
    mediaType: 'text',
  },
];
