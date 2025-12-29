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

  alert(
    "YAML prêt à être envoyé à GitHub:\n\n" +
    yaml +
    "\n\n(Prochaine étape: commit GitHub)"
  );
};

// ---------- events ----------
sectionSelect.onchange = () => {
  currentSection = sectionSelect.value;
  loadSection(currentSection);
};

// ---------- init ----------
loadSection(currentSection);
