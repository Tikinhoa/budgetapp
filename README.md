# 💰 BudgetApp — PWA de Gestion de Finances Personnelles

Application web progressive (PWA) optimisée pour iPhone, avec gestion multicompte, multidevise, scan de reçus OCR et statistiques avancées.

## ✨ Fonctionnalités

- **Multicompte** — Cash, Banque, Épargne, Crypto avec devises MUR/EUR/USD
- **Conversion automatique** — Taux de change en temps réel via API, solde global en EUR
- **Transactions** — Dépenses & revenus avec catégories, notes, récurrence (hebdo/mensuelle)
- **Scan OCR** — Prise de photo de ticket, extraction automatique du montant et de la date
- **Statistiques** — Camemberts, courbes d'évolution, barres revenus/dépenses par période
- **PWA installable** — Fonctionne hors-ligne, installable sur iPhone via "Sur l'écran d'accueil"
- **IndexedDB** — Stockage local rapide et persistant

## 🚀 Déploiement

### Option A : Vercel (recommandé)

```bash
# 1. Installer les dépendances
npm install

# 2. Build
npm run build

# 3. Déployer sur Vercel
npx vercel --prod
```

Ou connectez votre repo GitHub à [vercel.com](https://vercel.com) pour un déploiement automatique.

### Option B : GitHub Pages

```bash
# 1. Créer un repo GitHub et pousser le code
git init
git add .
git commit -m "Initial commit - BudgetApp PWA"
git remote add origin https://github.com/VOTRE_USER/budgetapp.git
git push -u origin main

# 2. Installer les dépendances et build
npm install
npm run build

# 3. Déployer le dossier dist/
npx gh-pages -d dist
```

Puis activez GitHub Pages dans Settings > Pages > Source: `gh-pages` branch.

> ⚠️ Pour GitHub Pages, modifiez `base` dans `vite.config.js` :
> ```js
> base: '/budgetapp/',
> ```

### Option C : Développement local

```bash
npm install
npm run dev
```

Ouvrez `http://localhost:5173` dans votre navigateur.

## 📱 Installation sur iPhone

1. Ouvrez l'app dans Safari sur votre iPhone
2. Appuyez sur le bouton **Partager** (carré avec flèche)
3. Sélectionnez **"Sur l'écran d'accueil"**
4. Confirmez en appuyant sur **"Ajouter"**

L'app apparaîtra comme une application native sur votre écran d'accueil.

## 📁 Structure du Projet

```
budgetapp/
├── public/
│   ├── manifest.json      # Configuration PWA
│   ├── sw.js              # Service Worker (cache offline)
│   └── icons/
│       ├── icon-192.png   # Icône PWA
│       └── icon-512.png   # Icône PWA grande
├── src/
│   ├── BudgetApp.jsx      # Composant principal (toute l'app)
│   ├── main.jsx           # Point d'entrée React
│   └── index.css          # Styles globaux + Tailwind
├── index.html             # HTML avec meta PWA/iOS
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## 🛠 Stack Technique

| Technologie | Usage |
|---|---|
| React 18 | UI & State management |
| Tailwind CSS 3 | Styling utility-first |
| Lucide React | Icônes SVG |
| Recharts | Graphiques (Pie, Line, Bar, Area) |
| IndexedDB | Stockage local persistant |
| Tesseract.js | OCR pour scan de reçus |
| Vite | Build & dev server |

## 📝 Notes

- Les taux de change sont récupérés automatiquement via `exchangerate-api.com`
- Le scan OCR charge Tesseract.js dynamiquement depuis un CDN
- Toutes les données restent **locales** sur l'appareil (IndexedDB)
- L'app est **responsive** mais optimisée pour mobile (iPhone)
