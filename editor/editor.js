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
const resetBtn = document.getElementById("reset"); // NEW

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

  // KEY FIX: Determine value (Draft vs Live)
  const draftKey = `draft_${currentSection}_${field.name}`;
  const localDraft = localStorage.getItem(draftKey);

  // If draft exists and is different from GitHub, use draft
  if (localDraft !== null && localDraft !== githubValue) {
    input.value = localDraft;
    input.style.borderColor = "#e67e22"; // Orange border = Unsaved Draft
    input.title = "Restored from unsaved draft";
  } else {
    input.value = githubValue;
  }

  input.dataset.field = field.name;

  // Save to LocalStorage on typing
  input.addEventListener("input", (e) => {
    localStorage.setItem(draftKey, e.target.value);
    input.style.borderColor = "#e67e22"; 
  });

  wrapper.appendChild(label);
  wrapper.appendChild(input);
  form.appendChild(wrapper);
}

// ---------- load YAML (via API to avoid Cache) ----------
async function loadSection(section) {
  clearForm();
  form.innerHTML = "<p style='color:#666;'>Chargement depuis GitHub API...</p>";
  
  const schema = SCHEMA[section];
  if (!schema) return;

  let data = {};
  
  // 1. Construct API URL instead of Raw URL
  const path = schema.file;
  const api = `https://api.github.com/repos/toulouse-pro/pros/contents/${path}`;

  try {
    // 2. Fetch using Token (Higher limits + No Cache)
    const headers = {};
    if (GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
    }

    // Add timestamp to strictly bypass browser cache
    const res = await fetch(`${api}?t=${Date.now()}`, { headers });
    
    if (res.ok) {
      const json = await res.json();
      
      // 3. Decode Base64 (Handling accents/UTF-8 correctly)
      const yamlContent = decodeURIComponent(escape(atob(json.content)));
      
      data = jsyaml.load(yamlContent) || {};
    } else {
       console.warn("Fichier non trouvé ou erreur API");
    }
  } catch (e) {
    console.warn("Erreur de chargement", e);
    form.innerHTML = "<p style='color:red;'>Erreur de connexion à GitHub.</p>";
    return;
  }

  // 4. Build Form
  clearForm();
  schema.fields.forEach(f => {
    createField(f, data[f.name] || "");
  });
}
// ---------- Reset / Discard ----------
resetBtn.onclick = () => {
  if (confirm("Voulez-vous vraiment annuler vos modifications locales et recharger depuis GitHub ?")) {
    const schema = SCHEMA[currentSection];
    // 1. Clear drafts for this section
    schema.fields.forEach(f => {
        localStorage.removeItem(`draft_${currentSection}_${f.name}`);
    });
    // 2. Reload
    loadSection(currentSection);
  }
};

// ---------- save (Smart Merge) ----------
saveBtn.onclick = async () => {
  if (!GITHUB_TOKEN) return alert("Token manquant !");

  saveBtn.textContent = "Envoi...";
  saveBtn.disabled = true;

  const schema = SCHEMA[currentSection];
  const inputs = form.querySelectorAll("[data-field]");
  const path = schema.file;
  const api = `https://api.github.com/repos/toulouse-pro/pros/contents/${path}`;

  let existingData = {};
  let sha = null;

  try {
      // 1. Get current data (API is fresher than raw)
      const res = await fetch(api, { headers: { Authorization: `Bearer ${GITHUB_TOKEN}` } });

      if (res.ok) {
        const json = await res.json();
        sha = json.sha;
        const existingYaml = decodeURIComponent(escape(atob(json.content)));
        existingData = jsyaml.load(existingYaml) || {};
      }

      // 2. Merge UI data
      inputs.forEach(i => {
        existingData[i.dataset.field] = i.value;
      });

      // 3. Upload
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
        
        // KEY FIX: Clear drafts ONLY after success
        inputs.forEach(i => {
           localStorage.removeItem(`draft_${currentSection}_${i.dataset.field}`);
        });

        loadSection(currentSection); 
      } else {
        alert("❌ Erreur de sauvegarde");
      }
  } catch (error) {
      console.error(error);
      alert("❌ Erreur réseau");
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
