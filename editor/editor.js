// 1. DATA SCHEMA
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

// 2. LOGIC
let GITHUB_TOKEN = localStorage.getItem("gh_token");

if (!GITHUB_TOKEN) {
  GITHUB_TOKEN = prompt("GitHub token (une seule fois) :");
  if(GITHUB_TOKEN) localStorage.setItem("gh_token", GITHUB_TOKEN);
}

const sectionSelect = document.getElementById("section");
const form = document.getElementById("form");
const saveBtn = document.getElementById("save");

let currentSection = sectionSelect.value;

// ---------- helpers ----------
function clearForm() {
  form.innerHTML = "";
}

function createField(field, githubValue = "") {
  const wrapper = document.createElement("div");
  wrapper.className = "field-wrapper";

  const label = document.createElement("label");
  label.textContent = field.label;

  let input;
  if (field.type === "textarea") {
    input = document.createElement("textarea");
    input.rows = 4;
  } else {
    input = document.createElement("input");
    input.type = "text";
  }

  // A. Determine value: Draft > GitHub > Empty
  const draftKey = `draft_${currentSection}_${field.name}`;
  const localDraft = localStorage.getItem(draftKey);

  // If we have a local draft, use it. Otherwise use data from GitHub.
  if (localDraft !== null && localDraft !== "") {
    input.value = localDraft;
    input.style.borderColor = "#e67e22"; // Visual cue that this is a draft
    // Optional: Add a small note saying "Restored from draft"
  } else {
    input.value = githubValue;
  }

  input.dataset.field = field.name;

  // B. Save to LocalStorage on typing
  input.addEventListener("input", (e) => {
    localStorage.setItem(draftKey, e.target.value);
  });

  wrapper.appendChild(label);
  wrapper.appendChild(input);
  form.appendChild(wrapper);
}

// ---------- load YAML ----------
async function loadSection(section) {
  clearForm();
  form.innerHTML = "<p>Chargement des données...</p>";
  
  const schema = SCHEMA[section];
  if (!schema) {
      form.innerHTML = "<p>Section non configurée dans le schéma.</p>";
      return;
  }

  let data = {};
  try {
    // 1. Fetch from live site
    // Ensure the URL is correct for your repo structure
    const res = await fetch(`https://raw.githubusercontent.com/toulouse-pro/pros/main/${schema.file}`);
    
    if (res.ok) {
      const text = await res.text();
      data = jsyaml.load(text) || {};
    } else {
      console.warn("File not found on GitHub, starting fresh.");
    }
  } catch (e) {
    console.warn("Error loading YAML", e);
  }

  // 2. Clear loading message and build form
  clearForm();
  schema.fields.forEach(f => {
    createField(f, data[f.name] || "");
  });
}

// ---------- save (Smart Merge) ----------
saveBtn.onclick = async () => {
  if (!GITHUB_TOKEN) {
      alert("Token manquant !");
      return;
  }

  saveBtn.textContent = "Envoi en cours...";
  saveBtn.disabled = true;

  const schema = SCHEMA[currentSection];
  const inputs = form.querySelectorAll("[data-field]");
  
  const path = schema.file;
  const api = `https://api.github.com/repos/toulouse-pro/pros/contents/${path}`;

  let existingData = {};
  let sha = null;

  try {
      // 1. Get current data from GitHub (to get SHA and merge)
      const res = await fetch(api, {
        headers: { Authorization: `Bearer ${GITHUB_TOKEN}` }
      });

      if (res.ok) {
        const json = await res.json();
        sha = json.sha;
        // Decode content: Base64 -> UTF8
        const existingYaml = decodeURIComponent(escape(atob(json.content)));
        existingData = jsyaml.load(existingYaml) || {};
      }

      // 2. Merge UI data into Existing Data
      inputs.forEach(i => {
        existingData[i.dataset.field] = i.value;
        
        // C. Clear draft from localStorage on successful save intent
        // (Optional: you might want to keep it until confirmed success, but this is cleaner)
        const draftKey = `draft_${currentSection}_${i.dataset.field}`;
        localStorage.removeItem(draftKey);
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
          message: `Update ${currentSection} via Editor`,
          content,
          sha
        })
      });

      if (commit.ok) {
        alert("✅ Sauvegardé avec succès !");
        // Reload to show clean state
        loadSection(currentSection); 
      } else {
        const err = await commit.json();
        alert("❌ Erreur: " + (err.message || "Inconnue"));
      }
  } catch (error) {
      console.error(error);
      alert("❌ Erreur réseau ou script");
  } finally {
      saveBtn.textContent = "Sauvegarder sur GitHub";
      saveBtn.disabled = false;
  }
};

// ---------- events ----------
sectionSelect.onchange = () => {
  currentSection = sectionSelect.value;
  loadSection(currentSection);
};

// ---------- init ----------
loadSection(currentSection);
