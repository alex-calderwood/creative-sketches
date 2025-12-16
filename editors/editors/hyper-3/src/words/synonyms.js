export async function getSynonyms(word) {
  const response = await fetch(`/api/synonyms?word=${encodeURIComponent(word)}`);
  const data = await response.json();

  if (data.error || !data.synonyms) {
    return {
      word: word,
      synonyms: [],
    };
  }

  let synonyms = data.synonyms.map(clean);
  return {
    word: data.word,
    synonyms: synonyms,
  };
}

function clean(synonym) {
  let cleaned = synonym.replace('(a)', '');
  cleaned = cleaned.replaceAll('_', ' ');
  return cleaned;
}
