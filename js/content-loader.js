async function loadYAML(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Cannot load ${path}`);
  const text = await res.text();
  return jsyaml.load(text);
}

async function hydrate() {
  const nodes = document.querySelectorAll("[data-key]");
  const cache = {};

  for (const el of nodes) {
    const [section, field] = el.dataset.key.split(".");
    if (!cache[section]) {
      cache[section] = await loadYAML(`/pros/_data/${section}.yml`);
    }
    el.textContent = cache[section][field] ?? "";
  }
}

hydrate();
