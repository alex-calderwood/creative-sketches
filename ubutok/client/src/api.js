export async function fetchNext(category = null) {
  const params = category ? `?category=${category}` : '';
  const res = await fetch(`/api/next${params}`);
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({}));
    throw new Error(error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchCategories() {
  const res = await fetch('/api/categories');
  return res.json();
}
