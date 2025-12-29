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

// ---------- load YAML (Directly from GitHub) ----------
async function loadSection(section) {
  clearForm();
  const schema = SCHEMA[section];
  if (!schema) return;

  let data = {};
  try {
    // We fetch from the 'main' branch to see what's currently live
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

// ---------- save (Smart Merge Logic) ----------
saveBtn.onclick = async () => {
  const schema = SCHEMA[currentSection];
  const inputs = form.querySelectorAll("[data-field]");
  
  const path = schema.file;
  const api = `https://api.github.com/repos/toulouse-pro/pros/contents/${path}`;

  // 1. Get existing file content & SHA
  let existingData = {};
  let sha = null;

  const res = await fetch(api, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}` }
  });

  if (res.ok) {
    const json = await res.json();
    sha = json.sha;
    const existingYaml = decodeURIComponent(escape(atob(json.content)));
    existingData = jsyaml.load(existingYaml) || {};
  }

  // 2. SMART MERGE: Only update if the field isn't empty
  inputs.forEach(i => {
    const newVal = i.value.trim();
    if (newVal !== "") {
      existingData[i.dataset.field] = i.value;
    }
    // If it's empty, we keep existingData[i.dataset.field] as it was
  });

  // 3. Convert back to YAML
  const yaml = jsyaml.dump(existingData, { lineWidth: 1000 });
  const content = btoa(unescape(encodeURIComponent(yaml)));

  // 4. Push to GitHub
  const commit = await fetch(api, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: `Update ${currentSection} (Smart Merge)`,
      content,
      sha
    })
  });

  if (commit.ok) {
    alert("✅ Sauvegardé ! Les champs vides ont été ignorés pour préserver vos données.");
    loadSection(currentSection); // Refresh UI
  } else {
    alert("❌ Erreur lors de la sauvegarde. Vérifiez votre Token.");
  }
};

// ---------- events ----------
sectionSelect.onchange = () => {
  currentSection = sectionSelect.value;
  loadSection(currentSection);
};

// ---------- init ----------
loadSection(currentSection);
