const burger = document.getElementById("burger");
const menu = document.getElementById("menu-overlay");
const closeBtn = document.getElementById("close");

burger.onclick = () => {
  menu.classList.add("show");
  document.body.style.overflow = "hidden";
};

closeBtn.onclick = () => {
  menu.classList.remove("show");
  document.body.style.overflow = "";
};

document.querySelectorAll("#menu-overlay a").forEach(link => {
  link.addEventListener("click", () => {
    menu.classList.remove("show");
    document.body.style.overflow = "";
  });
});

/* Fade-in on scroll */
const faders = document.querySelectorAll(".fade");

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
    }
  });
}, { threshold: 0.2 });

faders.forEach(el => observer.observe(el));
