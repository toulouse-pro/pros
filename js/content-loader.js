async function loadSection(section) {
  const res = await fetch(`/_data/${section}.yml`);
  const text = await res.text();
  return jsyaml.load(text);
}

async function loadAll() {
  const elements = document.querySelectorAll("[data-key]");
  const cache = {};

  for (const el of elements) {
    const [section, field] = el.dataset.key.split(".");
    if (!cache[section]) {
      cache[section] = await loadSection(section);
    }
    el.textContent = cache[section][field] || "";
  }
}

loadAll();
