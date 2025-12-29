let GITHUB_TOKEN = localStorage.getItem("gh_token");

if (!GITHUB_TOKEN) {
  GITHUB_TOKEN = prompt("GitHub token (une seule fois) :");
  localStorage.setItem("gh_token", GITHUB_TOKEN);
}

const sectionSelect = document.getElementById("section");
const form = document.getElementById("form");
const saveBtn = document.getElementById("save");

let currentSection = sectionSelect.value;

// ---------- helpers ----------
function clearForm() {
  form.innerHTML = "";
}

function createField(field, value = "") {
  const wrapper = document.createElement("div");
  wrapper.style.marginBottom = "12px";

  const label = document.createElement("label");
  label.textContent = field.label;
  label.style.display = "block";
  label.style.fontWeight = "600";

  let input;
  if (field.type === "textarea") {
    input = document.createElement("textarea");
    input.rows = 4;
  } else {
    input = document.createElement("input");
    input.type = "text";
  }

  input.value = value;
  input.dataset.field = field.name;
  input.style.width = "100%";

  wrapper.appendChild(label);
  wrapper.appendChild(input);
  form.appendChild(wrapper);
}

// ---------- load YAML ----------
async function loadSection(section) {
  clearForm();

  const schema = SCHEMA[section];
  if (!schema) return;

  let data = {};
  try {
    const res = await fetch(`/${schema.file}`);
    const text = await res.text();
    data = jsyaml.load(text) || {};
  } catch (e) {
    console.warn("No existing YAML, starting fresh");
  }

  schema.fields.forEach(f => {
    createField(f, data[f.name] || "");
  });
}

// ---------- save ----------
saveBtn.onclick = async () => {
  const schema = SCHEMA[currentSection];
  const inputs = form.querySelectorAll("[data-field]");
  const obj = {};

  inputs.forEach(i => {
    obj[i.dataset.field] = i.value;
  });

  const yaml = jsyaml.dump(obj, { lineWidth: 1000 });
  const content = btoa(unescape(encodeURIComponent(yaml)));

  const path = schema.file;
  const api = `https://api.github.com/repos/toulouse-pro/pros/contents/${path}`;

  // get SHA if file exists
  let sha = null;
  const res = await fetch(api, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}` }
  });

  if (res.ok) {
    const json = await res.json();
    sha = json.sha;
  }

  const commit = await fetch(api, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: `Update ${currentSection}`,
      content,
      sha
    })
  });

  if (commit.ok) {
    alert("✅ Sauvegardé et publié !");
  } else {
    alert("❌ Erreur lors de la sauvegarde");
  }
};

// ---------- events ----------
sectionSelect.onchange = () => {
  currentSection = sectionSelect.value;
  loadSection(currentSection);
};

// ---------- init ----------
loadSection(currentSection);
