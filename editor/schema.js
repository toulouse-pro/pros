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
