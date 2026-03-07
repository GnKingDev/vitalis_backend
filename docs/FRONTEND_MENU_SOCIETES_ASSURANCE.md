# Frontend — Menu « Gestion des sociétés d’assurance »

## Objectif

Créer un **sous-menu dans Administration** pour gérer les **sociétés / établissements d’assurance** (mutuelles, conventions, etc.). Ces établissements sont utilisés à l’accueil (inscription et paiement) dans le sélecteur « Établissement d’assurance ».

---

## Emplacement dans l’interface

- **Menu principal** : **Administration**
- **Sous-menu à ajouter** : **Sociétés d’assurance** (ou « Établissements d’assurance »)

Exemple de structure :

```
Administration
├── … (autres sous-menus existants)
└── Sociétés d’assurance   ← nouveau
```

---

## Écran à fournir

1. **Liste des sociétés d’assurance**
   - Tableau ou liste : Nom, Code, Actif (oui/non), Actions (Modifier, Désactiver/Activer).
   - Bouton « Ajouter une société ».

2. **Formulaire d’ajout / modification**
   - Champs :
     - **Nom** (obligatoire) — nom affiché (ex. « Mutuelle XYZ »).
     - **Code** (optionnel) — code interne (ex. « MUT-XYZ »).
     - **Actif** (case à cocher) — par défaut `true`.
   - En création : bouton « Enregistrer » → POST.
   - En modification : bouton « Enregistrer » → PUT.

3. **Désactivation**
   - Action « Désactiver » (ou « Activer » si déjà désactivée) → DELETE pour désactiver, ou PUT avec `isActive: false` / `true` selon le comportement backend (voir ci‑dessus : DELETE = désactiver).

---

## APIs à utiliser

| Action | Méthode | URL | Corps (si besoin) |
|--------|--------|-----|-------------------|
| Lister (toutes) | GET | `/api/v1/insurance-establishments` | — |
| Lister (actives seulement) | GET | `/api/v1/insurance-establishments?isActive=true` | — |
| Détail | GET | `/api/v1/insurance-establishments/:id` | — |
| Créer | POST | `/api/v1/insurance-establishments` | Voir ci‑dessous |
| Modifier | PUT | `/api/v1/insurance-establishments/:id` | Voir ci‑dessus |
| Désactiver | DELETE | `/api/v1/insurance-establishments/:id` | — |

**Corps POST (création) :**

```json
{
  "name": "Nom de la société",
  "code": "CODE",
  "isActive": true
}
```

**Corps PUT (modification) :**

```json
{
  "name": "Nom mis à jour",
  "code": "CODE",
  "isActive": true
}
```

- **name** : requis.
- **code** : optionnel.
- **isActive** : booléen (par défaut `true`).

**Réponse liste / détail :** objets avec `id`, `name`, `code`, `isActive`, `createdAt`, `updatedAt`.

---

## Accès

- **Liste / détail** : utilisateur authentifié.
- **Création / modification / désactivation** : rôle **admin** (le backend renvoie 403 si non autorisé).

---

## Récap pour l’accueil

À l’écran **inscription** et **paiement** (réception) :

- Le sélecteur « Établissement d’assurance » doit être alimenté par **GET** `/api/v1/insurance-establishments` ou **GET** `/api/v1/insurance-establishments?isActive=true` (remplacer tout mock par cet appel).
- Pour un patient assuré, le front peut envoyer un **numéro d’adhérent / contrat** optionnel : dans l’objet `insurance`, ajouter `memberNumber` (string). Le backend le persiste en `insuranceMemberNumber` et le renvoie dans la fiche patient (`GET /api/v1/patients/:id`).

---

*Document pour l’équipe frontend — backend VITALIS.* 
