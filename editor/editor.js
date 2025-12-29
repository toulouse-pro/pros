// 1. DATA SCHEMA
window.SCHEMA = {
  accueil: {
    label: "Accueil",
    file: "_data/accueil.yml",
    fields: [
      { name: "title", label: "Nom du restaurant", type: "text" },
      { name: "tagline", label: "Sous-titre", type: "text" },
      { name: "lead", label: "Texte de présentation", type: "textarea" },
      { name: "cta_menu", label: "Bouton Menu (Texte)", type: "text" },
      { name: "cta_reserver", label: "Bouton Réserver (Texte)", type: "text" }
    ]
  },
  avis: {
    label: "Avis",
    file: "_data/avis.yml",
    fields: [
      { name: "rating", label: "Note (ex: 4.8)", type: "text" },
      { name: "count", label: "Nombre d'avis", type: "text" },
      { name: "stars", label: "Étoiles (ex: ★★★★★)", type: "text" }
    ]
  },
  horaires: {
    label: "Horaires",
    file: "_data/horaires.yml",
    fields: [
      { name: "lundi", label: "Lundi", type: "text" },
      { name: "mardi", label: "Mardi", type: "text" },
      { name: "mercredi", label: "Mercredi", type: "text" },
      { name: "jeudi", label: "Jeudi", type: "text" },
      { name: "vendredi", label: "Vendredi", type: "text" },
      { name: "samedi", label: "Samedi", type: "text" },
      { name: "dimanche", label: "Dimanche", type: "text" },
      { name: "note", label: "Note bas de tableau", type: "text" }
    ]
  },
  photos: {
    label: "Photos",
    file: "_data/photos.yml",
    fields: [
      { name: "title", label: "Titre Section", type: "text" },
      { name: "subtitle", label: "Sous-titre", type: "text" }
    ]
  },
  specialites: {
    label: "Spécialités",
    file: "_data/specialites.yml",
    fields: [
      { name: "p1_title", label: "Produit Phare - Titre", type: "text" },
      { name: "p1_desc", label: "Produit Phare - Description", type: "text" },
      { name: "p2_title", label: "Spécialité - Titre", type: "text" },
      { name: "p2_desc", label: "Spécialité - Description", type: "text" }
    ]
  },
  carte: {
    label: "Carte / Plan",
    file: "_data/carte.yml",
    fields: [
      { name: "map_url", label: "URL Google Maps (Embed)", type: "text" }
    ]
  },
  contact: {
    label: "Contact",
    file: "_data/contact.yml",
    fields: [
      { name: "address", label: "Adresse complète", type: "textarea" },
      { name: "phone", label: "Téléphone", type: "text" },
      { name: "email", label: "Email", type: "text" },
      { name: "facebook", label: "Lien Facebook", type: "text" },
      { name: "instagram", label: "Lien Instagram", type: "text" }
    ]
  }
};

let GITHUB_TOKEN = localStorage.getItem("gh_token");
if (!GITHUB_TOKEN) {
  GITHUB_TOKEN = prompt("GitHub token (une seule fois) :");
  if(GITHUB_TOKEN) localStorage.setItem("gh_token", GITHUB_TOKEN);
}

const sectionSelect = document.getElementById("section");
const form = document.getElementById("form");
const saveBtn = document.getElementById("save");
const statusDot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");

let currentSection = sectionSelect.value;
let serverData = {}; // Stores the "clean" data from GitHub

// ---------- UI Helpers ----------
function updateStatus() {
  const inputs = form.querySelectorAll("[data-field]");
  let hasDraft = false;

  inputs.forEach(i => {
    const fieldName = i.dataset.field;
    // Check if current value differs from what we fetched from GitHub
    if (i.value !== (serverData[fieldName] || "")) {
      hasDraft = true;
      i.style.borderColor = "#e67e22"; // Orange for modified
      i.style.backgroundColor = "#fffaf5";
    } else {
      i.style.borderColor = "#ddd";
      i.style.backgroundColor = "#fff";
    }
  });

  if (hasDraft) {
    statusDot.style.backgroundColor = "#e67e22";
    statusText.textContent = "Modifications non enregistrées (Brouillon)";
  } else {
    statusDot.style.backgroundColor = "#28a745";
    statusText.textContent = "Synchronisé";
  }
}

function clearForm() { form.innerHTML = ""; }

function createField(field, githubValue = "") {
  const wrapper = document.createElement("div");
  wrapper.className = "field-wrapper";
  wrapper.style.marginBottom = "15px";

  const label = document.createElement("label");
  label.textContent = field.label;
  label.style.display = "block";
  label.style.fontWeight = "bold";

  let input = field.type === "textarea" ? document.createElement("textarea") : document.createElement("input");
  if (field.type !== "textarea") input.type = "text";
  
  input.style.width = "100%";
  input.style.padding = "8px";
  input.dataset.field = field.name;

  // Restore draft if exists
  const draftKey = `draft_${currentSection}_${field.name}`;
  const localDraft = localStorage.getItem(draftKey);
  input.value = (localDraft !== null) ? localDraft : githubValue;

  input.addEventListener("input", (e) => {
    localStorage.setItem(draftKey, e.target.value);
    updateStatus();
  });

  wrapper.appendChild(label);
  wrapper.appendChild(input);
  form.appendChild(wrapper);
}

// ---------- API Logic ----------
async function loadSection(section) {
  clearForm();
  statusText.textContent = "Chargement...";
  statusDot.style.backgroundColor = "#bbb";

  const schema = SCHEMA[section];
  const api = `https://api.github.com/repos/toulouse-pro/pros/contents/${schema.file}`;

  try {
    const res = await fetch(`${api}?t=${Date.now()}`, {
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}` }
    });

    if (res.ok) {
      const json = await res.json();
      const yamlContent = decodeURIComponent(escape(atob(json.content)));
      serverData = jsyaml.load(yamlContent) || {};
      
      schema.fields.forEach(f => createField(f, serverData[f.name] || ""));
      updateStatus();
    }
  } catch (e) {
    statusText.textContent = "Erreur de connexion";
    statusDot.style.backgroundColor = "red";
  }
}

saveBtn.onclick = async () => {
  saveBtn.disabled = true;
  saveBtn.textContent = "Envoi...";
  
  const schema = SCHEMA[currentSection];
  const inputs = form.querySelectorAll("[data-field]");
  const api = `https://api.github.com/repos/toulouse-pro/pros/contents/${schema.file}`;

  try {
    // 1. Get current SHA
    const res = await fetch(api, { headers: { Authorization: `Bearer ${GITHUB_TOKEN}` } });
    const json = await res.json();
    const sha = json.sha;

    // 2. Prepare Data
    let payload = {};
    inputs.forEach(i => payload[i.dataset.field] = i.value);
    const yaml = jsyaml.dump(payload, { lineWidth: 1000 });
    const content = btoa(unescape(encodeURIComponent(yaml)));

    // 3. Push to GitHub
    const commit = await fetch(api, {
      method: "PUT",
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message: `Edit ${currentSection}`, content, sha })
    });

    if (commit.ok) {
      // Clear drafts and update serverData locally to avoid a full re-fetch
      inputs.forEach(i => localStorage.removeItem(`draft_${currentSection}_${i.dataset.field}`));
      serverData = payload; 
      updateStatus();
      alert("✅ Enregistré !");
    }
  } catch (e) {
    alert("❌ Erreur lors de l'enregistrement");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Sauvegarder sur GitHub";
  }
};

sectionSelect.onchange = () => {
  currentSection = sectionSelect.value;
  loadSection(currentSection);
};

loadSection(currentSection);
