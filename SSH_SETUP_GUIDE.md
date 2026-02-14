# Guide Complet : Configuration SSH pour GitHub

## Vue d'ensemble

Ce guide explique comment configurer une connexion SSH avec GitHub pour pouvoir faire `git push` et `git pull` sans entrer de mot de passe.

---

## Étape 1 : Vérifier les clés SSH existantes

```bash
# Lister toutes les clés SSH existantes
ls -la ~/.ssh/*.pub

# Vérifier si une clé existe déjà pour votre compte
cat ~/.ssh/id_rsa.pub
cat ~/.ssh/id_ed25519.pub
```

**Note** : Si vous avez déjà une clé SSH, vous pouvez l'utiliser ou en créer une nouvelle.

---

## Étape 2 : Générer une nouvelle clé SSH (si nécessaire)

```bash
# Générer une clé ED25519 (recommandée, plus sécurisée)
ssh-keygen -t ed25519 -C "votre_email@example.com" -f ~/.ssh/id_ed25519_gnkingdev

# OU générer une clé RSA (alternative)
ssh-keygen -t rsa -b 4096 -C "votre_email@example.com" -f ~/.ssh/id_rsa_gnkingdev
```

**Options** :
- `-t ed25519` : Type de clé (ED25519 est recommandé)
- `-C "email"` : Commentaire (généralement votre email)
- `-f ~/.ssh/id_ed25519_gnkingdev` : Nom du fichier de la clé
- **Ne pas mettre de passphrase** (appuyez sur Entrée) si vous voulez éviter de taper un mot de passe à chaque fois

**Résultat** : Deux fichiers sont créés :
- `~/.ssh/id_ed25519_gnkingdev` : Clé privée (NE JAMAIS PARTAGER)
- `~/.ssh/id_ed25519_gnkingdev.pub` : Clé publique (à ajouter sur GitHub)

---

## Étape 3 : Afficher la clé publique

```bash
# Afficher la clé publique à copier
cat ~/.ssh/id_ed25519_gnkingdev.pub
```

**Copiez tout le contenu** qui ressemble à :
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINGEibaH1o/ZQjTEc5ck+pLVL14l213J92ftgLVVl4pL votre_email@example.com
```

---

## Étape 4 : Ajouter la clé sur GitHub

### Option A : SSH Keys du Compte (RECOMMANDÉ - Accès à tous les repos)

1. Allez sur : **https://github.com/settings/keys**
2. Cliquez sur **"New SSH key"**
3. Remplissez :
   - **Title** : Un nom descriptif (ex: "MacBook Pro - GnKingDev")
   - **Key** : Collez la clé publique copiée à l'étape 3
   - **Key type** : Authentication Key (par défaut)
4. Cliquez sur **"Add SSH key"**

### Option B : Deploy Key (NON RECOMMANDÉ - Lecture seule, un seul repo)

⚠️ **ATTENTION** : Les Deploy Keys sont en lecture seule et ne permettent pas de `git push`.

Si vous avez ajouté la clé comme Deploy Key :
1. Allez sur : **https://github.com/GnKingDev/vitalis_backend/settings/keys**
2. **Supprimez** toutes les Deploy Keys
3. Ajoutez-la comme SSH Key du compte (Option A)

---

## Étape 5 : Configurer SSH pour plusieurs comptes GitHub

Si vous avez plusieurs comptes GitHub, configurez `~/.ssh/config` :

```bash
# Ouvrir ou créer le fichier de configuration
nano ~/.ssh/config
# OU
code ~/.ssh/config
```

**Ajoutez cette configuration** :

```
# Configuration pour le compte GitHub GnKingDev
Host github-gnkingdev
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_gnkingdev
  IdentitiesOnly yes
```

**Explication** :
- `Host github-gnkingdev` : Alias pour ce compte
- `HostName github.com` : Le vrai serveur GitHub
- `User git` : Utilisateur Git (toujours "git" pour GitHub)
- `IdentityFile` : Chemin vers votre clé privée
- `IdentitiesOnly yes` : N'utiliser que cette clé (ignore les autres)

---

## Étape 6 : Configurer Git pour utiliser le bon host SSH

```bash
# Vérifier le remote actuel
git remote -v

# Changer l'URL du remote pour utiliser l'alias SSH
git remote set-url origin git@github-gnkingdev:GnKingDev/vitalis_backend.git

# Vérifier que c'est bien changé
git remote -v
```

**Résultat attendu** :
```
origin  git@github-gnkingdev:GnKingDev/vitalis_backend.git (fetch)
origin  git@github-gnkingdev:GnKingDev/vitalis_backend.git (push)
```

---

## Étape 7 : Tester la connexion SSH

```bash
# Tester la connexion
ssh -T git@github-gnkingdev
```

**Réponse attendue** :
```
Hi GnKingDev! You've successfully authenticated, but GitHub does not provide shell access.
```

Si vous voyez cette réponse, la connexion fonctionne ! ✅

**Si vous voyez une erreur** :
- `Permission denied (publickey)` : La clé n'est pas ajoutée sur GitHub
- `Permission denied to deploy key` : La clé est ajoutée comme Deploy Key au lieu de SSH Key
- `Host key verification failed` : Ajoutez GitHub aux known hosts :
  ```bash
  ssh-keyscan github.com >> ~/.ssh/known_hosts
  ```

---

## Étape 8 : Tester Git Push

```bash
# Essayer de pousser vos changements
git push -u origin main
```

**Si ça fonctionne** : Félicitations ! 🎉

**Si vous avez encore une erreur "deploy key"** :

1. **Vérifiez que la clé est bien dans les SSH Keys du compte** :
   - https://github.com/settings/keys
   - La clé doit être listée ici (pas dans les Deploy Keys)

2. **Supprimez toutes les Deploy Keys du repository** :
   - https://github.com/GnKingDev/vitalis_backend/settings/keys
   - Supprimez toutes les clés listées

3. **Forcez Git à utiliser la bonne clé** :
   ```bash
   GIT_SSH_COMMAND="ssh -i ~/.ssh/id_ed25519_gnkingdev -o IdentitiesOnly=yes" git push -u origin main
   ```

---

## Étape 9 : Vérifier les permissions des fichiers SSH

```bash
# Les permissions doivent être correctes
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_ed25519_gnkingdev
chmod 644 ~/.ssh/id_ed25519_gnkingdev.pub
chmod 644 ~/.ssh/config
```

---

## Résumé des Commandes Essentielles

```bash
# 1. Générer une clé SSH
ssh-keygen -t ed25519 -C "votre_email@example.com" -f ~/.ssh/id_ed25519_gnkingdev

# 2. Afficher la clé publique
cat ~/.ssh/id_ed25519_gnkingdev.pub

# 3. Configurer SSH (ajouter dans ~/.ssh/config)
Host github-gnkingdev
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_gnkingdev
  IdentitiesOnly yes

# 4. Configurer Git remote
git remote set-url origin git@github-gnkingdev:GnKingDev/vitalis_backend.git

# 5. Tester la connexion
ssh -T git@github-gnkingdev

# 6. Pousser les changements
git push -u origin main
```

---

## Dépannage

### Problème : "Permission denied to deploy key"

**Solution** :
1. Supprimez la clé des Deploy Keys du repository
2. Ajoutez-la dans les SSH Keys du compte (Settings > SSH and GPG keys)
3. Attendez quelques minutes pour que GitHub mette à jour

### Problème : "Host key verification failed"

**Solution** :
```bash
ssh-keyscan github.com >> ~/.ssh/known_hosts
```

### Problème : "Could not resolve hostname"

**Solution** :
```bash
# Vérifier la connexion internet
ping github.com

# Vérifier la configuration DNS
cat /etc/resolv.conf
```

### Problème : Git utilise toujours la mauvaise clé

**Solution** :
```bash
# Forcer l'utilisation d'une clé spécifique
GIT_SSH_COMMAND="ssh -i ~/.ssh/id_ed25519_gnkingdev -o IdentitiesOnly=yes" git push -u origin main
```

---

## Différence entre SSH Key et Deploy Key

| Caractéristique | SSH Key (Compte) | Deploy Key (Repository) |
|----------------|------------------|--------------------------|
| **Où l'ajouter** | Settings > SSH and GPG keys | Repository > Settings > Deploy keys |
| **Accès** | Tous vos repositories | Un seul repository |
| **Permissions** | Lecture + Écriture | Lecture seule |
| **Utilisation** | ✅ Recommandé pour développement | ❌ Pour déploiement uniquement |

**Conclusion** : Utilisez toujours une **SSH Key du compte** pour le développement.

---

## Checklist Finale

- [ ] Clé SSH générée
- [ ] Clé publique copiée
- [ ] Clé ajoutée dans **Settings > SSH and GPG keys** (pas dans Deploy Keys)
- [ ] Configuration SSH ajoutée dans `~/.ssh/config`
- [ ] Remote Git configuré avec l'alias SSH
- [ ] Test SSH réussi (`ssh -T git@github-gnkingdev`)
- [ ] `git push` fonctionne

---

## Ressources

- [Documentation GitHub SSH](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)
- [Générer une nouvelle clé SSH](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent)
- [Ajouter une clé SSH à votre compte](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account)
