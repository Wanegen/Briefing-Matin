# Briefing du Matin 📰

PWA personnelle d'actualités : un briefing chaque matin, installable sur l'écran d'accueil.

## Rubriques
🏛️ Politique française · 🌍 Monde · 🕯️ Personnalités décédées · 🎬 Sorties cinéma · 🎵 Nouveaux albums · 🎨 Expos & événements Lyon & Paris · 💻 Tech & science · 📈 Économie & finance — plus des rubriques personnalisables (mots-clés Google Actualités ou flux RSS).

## Déploiement (GitHub Pages)
1. **Settings → Pages** → *Deploy from a branch* → branche `main`, dossier `/ (root)`
2. L'app est servie sur `https://<user>.github.io/briefing-matin/`

## Installation
- **Android / Chrome** : menu ⋮ → *Installer l'application*
- **iOS / Safari** : Partager → *Sur l'écran d'accueil*

## Fonctionnement
- Flux RSS publics : Google Actualités (FR/EN), France 24, BBC News, The Verge
- Requêtes cross-origin via replieurs CORS communautaires (allOrigins, corsproxy.io, CodeTabs), avec repli automatique
- Préférences, rubriques personnalisées et dernier briefing conservés en `localStorage`
- `sw.js` met l'app shell en cache (démarrage instantané + hors-ligne)
