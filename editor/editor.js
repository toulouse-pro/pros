const OWNER = "toulouse-pro";
const REPO = "pros";
const BRANCH = "main";
const FILE_PATH = `_data/${currentSection}.yml`;

let token = localStorage.getItem("gh_token");

if (!token) {
  token = prompt("Paste your GitHub token");
  localStorage.setItem("gh_token", token);
}

async function github(url, options = {}) {
  return fetch(`https://api.github.com${url}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json"
    }
  });
}

async function loadContent() {
  const res = await github(`/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`);
  const file = await res.json();
  const yaml = atob(file.content);
  const data = jsyaml.load(yaml);

  window._sha = file.sha;

  const form = document.getElementById("form");
  form.innerHTML = "";

  for (const key in data) {
    const label = document.createElement("label");
    label.textContent = key;

    const input = document.createElement(
      typeof data[key] === "string" && data[key].length > 60
        ? "textarea"
        : "input"
    );

    input.value = data[key];
    input.dataset.key = key;

    form.appendChild(label);
    form.appendChild(input);
  }
}

async function saveContent() {
  const inputs = document.querySelectorAll("[data-key]");
  const data = {};

  inputs.forEach(i => data[i.dataset.key] = i.value);

  const yaml = jsyaml.dump(data);
  const content = btoa(unescape(encodeURIComponent(yaml)));

  await github(`/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`, {
    method: "PUT",
    body: JSON.stringify({
      message: "Update accueil via editor",
      content,
      sha: window._sha,
      branch: BRANCH
    })
  });

  alert("Saved to GitHub");
}

document.getElementById("save").onclick = saveContent;
loadContent();
