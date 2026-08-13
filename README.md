# 💊 MediShop - Site E-commerce Pharmacie

Site e-commerce complet pour la vente de médicaments avec panel administrateur.

## 🚀 Installation rapide

```bash
cd pharmacy-ecommerce
npm install
npm start
```

Puis ouvrez : **http://localhost:3000**

## 🔑 Accès Admin

- **URL** : http://localhost:3000/admin
- **Login** : http://localhost:3000/login.html
- **Identifiant** : `admin`
- **Mot de passe** : `admin123`

> ⚠️ **Changez le mot de passe admin après la première connexion !**

## 📋 Fonctionnalités

### Site public
- 🏠 Page d'accueil avec hero, catégories, produits vedettes
- 🛍️ Boutique avec filtres (catégorie, prix, stock, ordonnance)
- 💊 Page produit détaillée avec galerie, onglets, produits similaires
- 🛒 Panier (localStorage) avec mise à jour du stock
- 💳 Checkout avec COD ou virement bancaire
- 📱 Design responsive mobile

### Panel Admin
| Page | Fonctionnalités |
|------|-----------------|
| 📊 Dashboard | Stats, commandes récentes, actions rapides |
| 💊 Produits | CRUD complet, upload images, toggle actif/vedette |
| 📂 Catégories | CRUD, icônes emoji, ordre d'affichage |
| 📦 Commandes | Liste, détail, mise à jour statut |
| ⚙️ Paramètres | Logo, favicon, couleurs, contact, livraison, paiement, SEO, réseaux sociaux |
| 👥 Utilisateurs | Gestion admin, changement de mot de passe |

## ⚙️ Paramètres configurables

- **Identité** : Nom du site, slogan, description, logo, favicon, couleurs
- **Contact** : Email, téléphone, adresse, horaires, devise
- **Livraison** : Seuil livraison gratuite, coût livraison
- **Paiement** : Activer/désactiver COD et virement, coordonnées bancaires
- **SEO** : Meta title, meta description, Google Analytics
- **Réseaux sociaux** : Facebook, Instagram, Twitter, WhatsApp

## 🗂️ Structure du projet

```
pharmacy-ecommerce/
├── server.js           # Serveur Express
├── database/db.js      # SQLite + données initiales
├── middleware/auth.js  # JWT middleware
├── routes/             # API routes
│   ├── auth.js
│   ├── products.js
│   ├── categories.js
│   ├── orders.js
│   ├── banners.js
│   └── settings.js
├── public/             # Site public
│   ├── index.html
│   ├── shop.html
│   ├── product.html
│   ├── cart.html
│   ├── checkout.html
│   ├── login.html
│   ├── css/
│   ├── js/
│   └── uploads/        # Images uploadées
└── admin/              # Panel admin
    ├── index.html
    ├── products.html
    ├── categories.html
    ├── orders.html
    ├── settings.html
    └── users.html
```

## 🔧 Configuration

Modifiez `server.js` pour changer le port (défaut: 3000).
La base de données SQLite est créée automatiquement dans `database/pharmacy.db`.
