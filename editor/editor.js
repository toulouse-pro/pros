// 1. FULL 7-SECTION SCHEMA
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
  avis: {
    label: "Avis",
    file: "_data/avis.yml",
    fields: [
      { name: "rating", label: "Note (ex: 4.8)", type: "text" },
      { name: "count", label: "Nombre d'avis", type: "text" },
      { name: "stars", label: "Étoiles (★★★★★)", type: "text" }
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
      { name: "dimanche", label: "Dimanche", type: "text" }
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
      { name: "p1_title", label: "Titre 1", type: "text" },
      { name: "p1_desc", label: "Description 1", type: "text" },
      { name: "p2_title", label: "Titre 2", type: "text" },
      { name: "p2_desc", label: "Description 2", type: "text" }
    ]
  },
  carte: {
    label: "Carte",
    file: "_data/carte.yml",
    fields: [{ name: "map_url", label: "Lien Google Maps Iframe", type: "text" }]
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

// 2. CORE LOGIC
let GITHUB_TOKEN = localStorage.getItem("gh_token");
if (!GITHUB_TOKEN) {
  GITHUB_TOKEN = prompt("GitHub token :");
  if(GITHUB_TOKEN) localStorage.setItem("gh_token", GITHUB_TOKEN);
}

const sectionSelect = document.getElementById("section");
const form = document.getElementById("form");
const saveBtn = document.getElementById("save");
const resetBtn = document.getElementById("reset");
const statusDot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");

let currentSection = sectionSelect.value;
let serverData = {};

// Fill the dropdown with all 7 sections automatically
function buildDropdown() {
    sectionSelect.innerHTML = "";
    Object.keys(SCHEMA).forEach(key => {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = SCHEMA[key].label;
        sectionSelect.appendChild(opt);
    });
}

function updateStatus() {
  const inputs = form.querySelectorAll("[data-field]");
  let hasDraft = false;
  inputs.forEach(i => {
    if (i.value !== (serverData[i.dataset.field] || "")) {
      hasDraft = true;
      i.style.borderColor = "#e67e22";
    } else {
      i.style.borderColor = "#ddd";
    }
  });
  statusDot.style.backgroundColor = hasDraft ? "#e67e22" : "#28a745";
  statusText.textContent = hasDraft ? "Brouillon non enregistré" : "Synchronisé avec GitHub";
}

async function loadSection(section) {
  form.innerHTML = "Chargement...";
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
      form.innerHTML = "";
      schema.fields.forEach(f => {
        const wrap = document.createElement("div");
        wrap.style.marginBottom = "10px";
        const lab = document.createElement("label");
        lab.textContent = f.label;
        lab.style.display = "block";
        
        const input = f.type === "textarea" ? document.createElement("textarea") : document.createElement("input");
        input.dataset.field = f.name;
        input.style.width = "100%";
        
        // Restore Draft or use Server
        const draft = localStorage.getItem(`draft_${section}_${f.name}`);
        input.value = (draft !== null) ? draft : (serverData[f.name] || "");
        
        input.oninput = () => {
          localStorage.setItem(`draft_${section}_${f.name}`, input.value);
          updateStatus();
        };
        
        wrap.appendChild(lab);
        wrap.appendChild(input);
        form.appendChild(wrap);
      });
      updateStatus();
    }
  } catch (e) {
    statusText.textContent = "Fichier introuvable sur GitHub";
  }
}

resetBtn.onclick = () => {
  if(confirm("Effacer les brouillons et recharger?")) {
    SCHEMA[currentSection].fields.forEach(f => {
      localStorage.removeItem(`draft_${currentSection}_${f.name}`);
    });
    loadSection(currentSection);
  }
};

saveBtn.onclick = async () => {
  saveBtn.disabled = true;
  const schema = SCHEMA[currentSection];
  const api = `https://api.github.com/repos/toulouse-pro/pros/contents/${schema.file}`;
  
  try {
    const res = await fetch(api, { headers: { Authorization: `Bearer ${GITHUB_TOKEN}` } });
    const json = await res.json();
    
    let newData = {};
    form.querySelectorAll("[data-field]").forEach(i => newData[i.dataset.field] = i.value);
    
    const yaml = jsyaml.dump(newData);
    const content = btoa(unescape(encodeURIComponent(yaml)));

    const put = await fetch(api, {
      method: "PUT",
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message: `Update ${currentSection}`, content, sha: json.sha })
    });

    if (put.ok) {
      alert("Enregistré!");
      SCHEMA[currentSection].fields.forEach(f => localStorage.removeItem(`draft_${currentSection}_${f.name}`));
      serverData = newData;
      updateStatus();
    }
  } catch (e) { alert("Erreur de sauvegarde"); }
  saveBtn.disabled = false;
};

sectionSelect.onchange = (e) => {
  currentSection = e.target.value;
  loadSection(currentSection);
};

buildDropdown();
loadSection(currentSection);
