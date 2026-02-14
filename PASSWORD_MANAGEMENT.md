# Gestion des Mots de Passe - Documentation Frontend

## Vue d'ensemble

Le système de gestion des utilisateurs a été amélioré pour inclure la génération automatique de mots de passe aléatoires lors de la création d'un utilisateur, et un mécanisme pour inviter l'utilisateur à modifier son mot de passe lors de sa première connexion.

## Fonctionnalités

### Création d'utilisateur

Lorsqu'un administrateur crée un nouvel utilisateur via l'API, le système génère automatiquement un mot de passe aléatoire sécurisé si aucun mot de passe n'est fourni. Ce mot de passe est retourné dans la réponse de création pour que l'administrateur puisse le communiquer à l'utilisateur.

Le mot de passe généré contient au moins 12 caractères avec une combinaison de majuscules, minuscules, chiffres et caractères spéciaux pour garantir la sécurité.

### Première connexion

Lorsqu'un utilisateur se connecte pour la première fois, l'API retourne un indicateur spécial dans la réponse de connexion. Cet indicateur permet au frontend de détecter qu'il s'agit de la première connexion et d'afficher une invitation pour modifier le mot de passe.

### Changement de mot de passe

Une nouvelle route API permet aux utilisateurs de modifier leur mot de passe. Lors de la première connexion, l'utilisateur n'a pas besoin de fournir son mot de passe actuel. Pour les connexions suivantes, le mot de passe actuel est requis pour des raisons de sécurité.

## Modifications des réponses API

### Création d'utilisateur

Lors de la création d'un utilisateur, le mot de passe généré automatiquement est immédiatement crypté avant d'être stocké dans la base de données. Le mot de passe en clair n'est jamais stocké en base de données, seul le hash crypté est conservé.

Le mot de passe en clair est retourné UNE SEULE FOIS dans le champ `password` de la réponse de création d'utilisateur. Ce mot de passe doit être affiché à l'administrateur pour qu'il puisse le communiquer à l'utilisateur. Après cette réponse, le mot de passe en clair n'est plus jamais accessible ni retourné par l'API.

### Connexion

La réponse de connexion inclut un nouveau champ `mustChangePassword` dans l'objet `user` qui indique si l'utilisateur doit modifier son mot de passe. Ce champ est basé sur le fait que l'utilisateur n'a jamais eu de connexion précédente, ce qui signifie qu'il utilise encore le mot de passe généré automatiquement. Le champ `mustChangePassword` est un booléen qui sera `true` lors de la première connexion et `false` pour les connexions suivantes.

### Informations utilisateur

La route qui récupère les informations de l'utilisateur connecté inclut également le champ `mustChangePassword` dans la réponse, permettant au frontend de vérifier à tout moment si un changement de mot de passe est nécessaire. Ce champ suit la même logique que dans la réponse de connexion.

## Workflow recommandé pour le frontend

Lors de la création d'un utilisateur, afficher le mot de passe généré dans une modal ou une notification pour que l'administrateur puisse le copier et le communiquer à l'utilisateur.

Lors de la connexion, vérifier l'indicateur de changement de mot de passe obligatoire. Si cet indicateur est présent, rediriger automatiquement l'utilisateur vers une page de changement de mot de passe ou afficher une modal l'invitant à modifier son mot de passe avant de continuer.

Sur la page de changement de mot de passe, adapter le formulaire selon le contexte. Pour la première connexion, ne pas demander le mot de passe actuel. Pour les changements ultérieurs, inclure un champ pour le mot de passe actuel.

Après un changement de mot de passe réussi, mettre à jour l'état de l'application pour indiquer que le changement de mot de passe n'est plus nécessaire et permettre à l'utilisateur d'accéder normalement à l'application.

## Sécurité

Le mot de passe généré automatiquement est suffisamment complexe pour garantir la sécurité initiale. Cependant, il est fortement recommandé que l'utilisateur le modifie lors de sa première connexion pour choisir un mot de passe qu'il peut mémoriser facilement.

Le mot de passe en clair n'est retourné qu'une seule fois lors de la création de l'utilisateur dans la réponse API. Il est immédiatement crypté avant d'être stocké dans la base de données. Seul le hash crypté est conservé en base de données, jamais le mot de passe en clair. Après la création, le mot de passe en clair n'est plus jamais accessible ni retourné par l'API, même pour les administrateurs.

Lors du changement de mot de passe, le nouveau mot de passe doit respecter les règles de sécurité minimales, notamment une longueur minimale de 8 caractères.
