// 1. DATA SCHEMA (Used to be schema.js)
window.SCHEMA = {
  accueil: {
    label: "Accueil",
    file: "_data/accueil.yml",
    fields: [
      { name: "title", label: "Nom du restaurant", type: "text" },
      { name: "tagline", label: "Sous-titre", type: "text" },
      { name: "lead", label: "Texte principal", type: "textarea" },
      { name: "cta_menu", label: "Bouton Menu", type: "text" },
      { name: "cta_reserver", label: "Bouton Réserver", type: "text" }
    ]
  },
  contact: {
    label: "Contact",
    file: "_data/contact.yml",
    fields: [
      { name: "address", label: "Adresse", type: "textarea" },
      { name: "phone", label: "Téléphone", type: "text" },
      { name: "email", label: "Email", type: "text" }
    ]
  }
};

// 2. LOGIC (The editor engine)
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
    // Fetch from live site to pre-fill the boxes
    const res = await fetch(`https://raw.githubusercontent.com/toulouse-pro/pros/main/${schema.file}`);
    if (res.ok) {
      const text = await res.text();
      data = jsyaml.load(text) || {};
    }
  } catch (e) {
    console.warn("Could not load existing YAML, starting empty");
  }

  schema.fields.forEach(f => {
    createField(f, data[f.name] || "");
  });
}

// ---------- save (Smart Merge) ----------
saveBtn.onclick = async () => {
  const schema = SCHEMA[currentSection];
  const inputs = form.querySelectorAll("[data-field]");
  
  const path = schema.file;
  const api = `https://api.github.com/repos/toulouse-pro/pros/contents/${path}`;

  let existingData = {};
  let sha = null;

  // 1. Get current data from GitHub
  const res = await fetch(api, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}` }
  });

  if (res.ok) {
    const json = await res.json();
    sha = json.sha;
    const existingYaml = decodeURIComponent(escape(atob(json.content)));
    existingData = jsyaml.load(existingYaml) || {};
  }

  // 2. Merge: Only overwrite if user typed something
  inputs.forEach(i => {
    const newVal = i.value.trim();
    if (newVal !== "") {
      existingData[i.dataset.field] = i.value;
    }
  });

  // 3. Convert and Upload
  const yaml = jsyaml.dump(existingData, { lineWidth: 1000 });
  const content = btoa(unescape(encodeURIComponent(yaml)));

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
    alert("✅ Sauvegardé !");
    loadSection(currentSection); 
  } else {
    alert("❌ Erreur");
  }
};

// ---------- events ----------
sectionSelect.onchange = () => {
  currentSection = sectionSelect.value;
  loadSection(currentSection);
};

// ---------- init ----------
loadSection(currentSection);
