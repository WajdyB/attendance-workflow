# Présentation orale — Avancement du projet RHpro  
## Réunion de démonstration avec les superviseurs

*Document d’aide à la prise de parole — à adapter à votre temps de parole et à votre style.*

---

## 1. Introduction et accroche (1–2 minutes)

Bonjour à toutes et à tous. Je vous remercie d’être présents pour cette session de présentation de l’avancement de mon projet.

Aujourd’hui, je vous présente **RHpro**, une plateforme web de gestion des ressources humaines et des flux opérationnels autour du **temps de travail**, des **congés**, des **projets** et de la **performance**. L’objectif est d’offrir à l’entreprise un **point d’entrée unique**, sécurisé et structuré, pour les équipes RH, les managers et les collaborateurs.

Je vais d’abord situer le périmètre du projet, puis décrire l’architecture technique de façon accessible, ensuite détailler les **fonctionnalités réellement présentes** dans l’application — notamment le **tableau de bord** et les **statistiques affichées selon le rôle** — et je terminerai par les perspectives et les suites possibles.

---

## 2. Contexte et problématique

Dans beaucoup d’organisations, les informations RH et opérationnelles sont **éclatées** : feuilles de temps dans un outil, demandes de congés par e-mail ou formulaires isolés, suivi des projets ailleurs, entretiens et évaluations sur des fichiers dispersés.

**RHpro** vise à **centraliser** ces flux dans une application web moderne, avec des **écrans adaptés à chaque rôle** : administrateur, manager et collaborateur. Chacun voit ce dont il a besoin pour **travailler au quotidien**, tout en gardant une vision cohérente des statuts — brouillon, soumis, en attente, approuvé, rejeté, etc.

---

## 3. Périmètre fonctionnel global

Le projet couvre notamment :

- **Authentification** des utilisateurs et gestion de session.
- **Gestion des employés** : fiches, création, modification, consultation, hiérarchie, photo de profil.
- **Feuilles de temps** hebdomadaires liées aux **projets**, avec workflow de validation.
- **Demandes de congés**, soldes, calendrier, et **approbation** côté manager (et vue globale côté administration).
- **Projets** et affectation du temps.
- **Performance** : évaluations, historique salarial, rapports selon les droits.
- **Dossier collaborateur** : informations personnelles, contrats, documents, hiérarchie.
- **Notifications** dans l’interface pour suivre l’activité.

Je détaillerai chaque bloc dans les sections suivantes.

---

## 4. Architecture technique (vue synthétique)

Pour les personnes intéressées par la technique, le dépôt est organisé en **monorepo** :

- Un **front-end** basé sur **Next.js** (interface utilisateur, navigation, tableaux de bord).
- Un **back-end** basé sur **NestJS**, qui expose une API REST structurée par modules.
- Une **base de données** gérée avec **Prisma**, et l’**authentification** s’appuie sur **Supabase** pour la partie identité et sécurité des accès.

Cette séparation permet de faire évoluer l’interface et les règles métier de façon indépendante, tout en gardant un modèle de données cohérent.

### Architecture implémentée — à préciser à l’oral (grandes lignes)

Si on vous demande **comment c’est construit concrètement**, vous pouvez enchaîner ainsi :

1. **Découpage en couches**  
   - **Front** : interface utilisateur (écrans, navigation, formulaires) — **Next.js** (React) avec **Tailwind CSS** pour le style.  
   - **Back** : logique métier et exposition d’**API REST** — **NestJS** (TypeScript), avec des **modules par domaine** (utilisateurs, feuilles de temps, congés, projets, évaluations, notifications, etc.).  
   - **Données** : **base relationnelle** pilotée par **Prisma** (schéma, requêtes typées, migrations).  
   - **Identité** : **Supabase** pour l’authentification et la sécurisation des accès (variables d’environnement côté serveur, validation des requêtes).

2. **Pourquoi ce choix**  
   - **Séparation front / back** : on peut faire évoluer l’UI sans tout casser côté métier, et inversement.  
   - **API REST** : le front consomme les mêmes endpoints selon le rôle ; les **droits** sont appliqués côté serveur.  
   - **Prisma** : un **modèle de données unique** partagé entre les modules, moins d’erreurs et une meilleure traçabilité.

3. **En une phrase de synthèse**  
   *« C’est une application web classique en trois tiers : client Next.js, serveur NestJS avec une API REST modulaire, persistance via Prisma, et authentification Supabase. »*

*(La suite du document détaille comment les **statistiques** sont rendues à l’écran — Recharts vs composants simples.)*

### Graphiques, statistiques et bibliothèques (détails techniques)

Côté **front-end**, les « statistiques » et visualisations ne reposent pas toutes sur la même approche :

| Approche | Où c’est utilisé | Détail |
|----------|------------------|--------|
| **Recharts** | Tableaux de bord **admin** et **manager**, espace **feuilles de temps** | Dépendance npm `recharts` (composants React : `BarChart`, `AreaChart`, `PieChart`, etc.). Rendu en **SVG**, souvent dans un `ResponsiveContainer`. Les données sont **agrégées en JavaScript** (tableaux d’objets) puis passées en `data={...}`. **Tooltips** parfois personnalisés. |
| **HTML + CSS** | Tableau de bord **collaborateur** (`dashboard.tsx`) | **Cartes KPI** (chiffres + icônes Lucide). Section « Éléments prioritaires » : **barres de progression** = `div` avec largeur en `%`, pas de librairie graphique. |
| **Barres « faits maison »** | Rapports **projets** et **performance** (`project-reports`, `performance-reports`) | Barres horizontales : fond gris + `div` interne dont la **largeur** est calculée en pourcentage (ex. heures / max). Commentaires dans le code du type « chart-like » / « bar chart » — **pas** Recharts. |
| **Icônes uniquement** | Divers écrans | `BarChart2`, `BarChart3` (Lucide) sont des **pictogrammes**, pas des graphiques. |

**Routage de la page `/dashboard`** : selon le rôle, l’application affiche un composant différent — **`AdminDashboard`** (graphiques Recharts : aires, secteurs, barres pour congés, projets, départements, etc.), **`ManagerDashboard`** (ex. barres horizontales heures par projet), ou **`Dashboard`** classique pour le **collaborateur** (KPI + barres CSS + listes d’activité réelle).

En résumé pour une question technique : **Recharts** est le choix explicite pour les vues analytiques « lourdes » ; le reste repose sur des **composants légers** (cartes, barres CSS) pour limiter la complexité et la taille du bundle sur les écrans les plus simples.

---

## 5. Les trois rôles et ce qu’ils voient

L’application distingue principalement :

| Rôle | Rôle métier typique | Accès principal |
|------|---------------------|-----------------|
| **Administrateur** | RH, administration | Employés, tous les modules, paramétrage des soldes et jours fériés, vue globale des demandes |
| **Manager** | Chef d’équipe | Validation des feuilles de temps soumises, approbation des congés de l’équipe, performance de l’équipe, page « Approbations » |
| **Collaborateur** | Employé | Ses feuilles de temps, ses demandes de congé, ses projets, son dossier et sa performance |

Le **menu latéral** et le **tableau de bord** s’adaptent automatiquement au rôle connecté.

---

## 6. Tableau de bord : statistiques et indicateurs

Le **tableau de bord** est la première page après connexion. Il présente une **bannière d’accueil** avec la date du jour, un message de bienvenue personnalisé et une phrase qui rappelle la **vue** : administrateur, manager ou collaborateur.

### 6.1 Administrateur

Les **cartes indicateurs** affichent notamment :

- Le **nombre total d’employés** (chargé depuis la liste des utilisateurs).
- Le **nombre de projets actifs** (projets au statut « en cours »).

D’autres indicateurs comme les demandes en attente ou les feuilles de temps soumises peuvent apparaître dans l’interface en tant que **libellés de suivi** ; certaines valeurs sont encore présentées comme **à compléter** ou génériques selon l’état d’avancement du branchement aux données agrégées.

Une zone **« Activité récente »** propose des exemples illustratifs pour les vues administration et management. Une zone **« Éléments prioritaires »** montre des **barres de progression** sur des objectifs typiques (à titre pédagogique pour la démo).

### 6.2 Manager

Les indicateurs mettent l’accent sur l’**équipe** :

- **Nombre de membres** supervisés.
- **Nombre de feuilles de temps** en attente de validation pour ce manager.
- **Projets actifs** (vue globale des projets).
- Un indicateur de **volume d’heures d’équipe** peut être prévu dans les libellés ; le branchement complet des agrégats peut être mentionné comme **évolution en cours** si c’est le cas.

### 6.3 Collaborateur

Les indicateurs sont **personnels** et **alimentés par des données réelles** :

- **Heures de la semaine en cours** (rapport hebdomadaire).
- **Statut de la dernière feuille de temps** (brouillon, soumise, approuvée, rejetée), avec libellés en français.
- **Nombre de demandes de congé en attente**.
- **Nombre de projets actifs**.

En complément, la section **« Activité récente »** liste pour le collaborateur ses **dernières feuilles de temps** et ses **dernières demandes de congé**, avec statuts colorés — ce qui rend la démo très concrète.

---

## 7. Module par module — fonctionnalités à mettre en avant

### 7.1 Authentification et sécurité

- Page de **connexion**.
- Parcours **mot de passe oublié** et **réinitialisation** du mot de passe.
- Session utilisateur avec **jeton** et persistance adaptée (souvenir de la connexion ou session navigateur).

### 7.2 Employés (administration)

- **Liste des employés** avec recherche et informations clés.
- **Création** d’un nouvel employé, **fiche détail**, **édition** : coordonnées, poste, département, rôle, statut de compte, **photo de profil** (upload, formats image pris en charge côté stockage), pièces jointes de dossier.
- Gestion de la **hiérarchie** : rattachement d’un collaborateur à un manager.
- Les administrateurs peuvent enrichir les dossiers ; les collaborateurs consultent leur **mon dossier** depuis le profil.

### 7.3 Feuilles de temps

- Saisie **hebdomadaire** du temps par **projet**.
- Statuts : **brouillon**, **soumis**, **approuvé**, **rejeté**.
- Côté **manager** : file des feuilles à **valider**.
- Côté **administrateur** : vue d’ensemble des flux (selon les écrans implémentés).
- Possibilité de **rapports** et exports dans les parties avancées du module (selon votre branchement actuel — à dire clairement en démo si certaines fonctions sont encore en cours).

### 7.4 Demandes de congés

- **Création** d’une demande (types de congés : payé, maladie, maternité, etc.).
- **Solde** de congés affiché pour le collaborateur.
- **Calendrier** des absences.
- **Manager** : interface d’**approbation** des demandes de son équipe (avec visuels sur le demandeur).
- **Administrateur** : vue **globale** des demandes, gestion des **soldes** et des **jours fériés** (onglets dédiés sur la page des demandes).

### 7.5 Projets

- Liste des **projets** et suivi du **temps passé** par projet.
- Lien naturel avec les feuilles de temps pour la **répartition du temps**.

### 7.6 Performance

- **Évaluations** : annuelles, semestrielles, projet, 360°, avec scores et commentaires.
- **Historique salarial** et évolutions.
- **Rapports** de performance selon le profil (administrateur / manager / collaborateur).
- Les **managers** saisissent ou consultent les évaluations pour leurs collaborateurs ; les **collaborateurs** consultent leurs historiques.

### 7.7 Mon dossier (profil)

- Vue **dossier RH** : contact, coordonnées bancaires et administratives, selon les droits de modification.
- Onglets : **informations personnelles**, **hiérarchie**, **contrat**, **performance**, **documents**.
- **Documents** : dépôt et consultation par catégories (RH, contrat, paie, etc.) — souvent réservé à l’administration pour l’upload.
- **Photo de profil** : tout utilisateur peut mettre à jour sa photo ; elle apparaît dans la **barre de navigation**.

### 7.8 Notifications et navigation

- **Cloche de notifications** dans l’en-tête, avec marquage lu / non lu.
- **Menu utilisateur** avec accès rapide au dossier et **déconnexion**.
- Interface **bilingue** possible (français / anglais) selon la configuration des langues de l’application.

### 7.9 Page d’accueil publique (landing)

- Si vous la montrez : vitrine du produit, **arguments métier**, aperçu marketing des modules — utile pour situer le projet face à un outil « grand public » RH.

---

## 8. Discours suggéré — synthèse « fil conducteur » pour la démo (à lire ou s’en inspirer)

*Vous pouvez enchaîner ainsi pendant la démonstration écran partagé :*

« Je commence par la **page de connexion** : l’accès est sécurisé. Une fois connecté, nous arrivons sur le **tableau de bord**, qui change selon que je suis **admin**, **manager** ou **collaborateur**.

En tant qu’**administrateur**, je vois le **nombre d’employés** et les **projets actifs**, et j’accède au module **Employés** pour créer ou modifier une fiche, gérer la **photo**, la **hiérarchie** et les **documents**.

En tant que **manager**, je vois l’effectif de mon **équipe**, les feuilles de temps **à approuver**, et j’utilise la page **Approbations** ou les **demandes de congé** pour traiter les demandes de mon équipe.

En tant que **collaborateur**, mon tableau de bord est **personnel** : **heures de la semaine**, **statut de ma feuille de temps**, **demandes en attente**, et **activité récente** réelle sur mes congés et mes temps.

Je peux ensuite montrer les **feuilles de temps** par projet, les **demandes de congé** avec le **calendrier**, le module **Projets**, puis **Performance** avec les **évaluations** et l’**historique salarial**. Enfin, **Mon dossier** regroupe contrat, hiérarchie et documents, et la **photo** se reflète dans la barre du haut.

Techniquement, le tout repose sur un **front Next.js**, un **API NestJS**, une base **Prisma** et **Supabase** pour l’**authentification**, ce qui nous donne une base solide pour la suite. »

---

## 9. Points d’honnêteté pour la crédibilité

Si on vous pose des questions sur ce qui est « encore en cours », vous pouvez être transparent :

- Certaines **cartes du tableau de bord administrateur** affichent des **placeholders** ou des agrégats à finaliser (par exemple compteurs globaux de demandes ou de feuilles soumises), alors que la vue **collaborateur** est déjà très **branchée sur des données réelles**.
- Les blocs **« Activité récente »** et **« Éléments prioritaires »** pour admin et manager peuvent combiner **données réelles** et **exemples illustratifs** selon les écrans — précisez-le si on vous demande si tout est « en production ».

Cela montre que vous maîtrisez le **périmètre réel** et la **roadmap**.

---

## 10. Perspectives et prochaines étapes (à ajuster selon votre planning)

Exemples de suites possibles à mentionner :

- Finaliser les **indicateurs agrégés** pour le tableau de bord administrateur et manager.
- Renforcer les **rapports** exportables (Excel, PDF) là où ils sont partiellement présents.
- **Tests automatisés** et durcissement des parcours critiques.
- **Déploiement** sur un environnement de préproduction ou de production.

---

## 11. Conclusion

Pour conclure, **RHpro** propose déjà un **parcours complet** autour du temps, des congés, des projets et de la performance, avec une **interface role-based** et un **tableau de bord** qui met en avant les bons indicateurs selon le profil. L’architecture **Next.js + NestJS + Prisma + Supabase** permet d’industrialiser la suite du projet.

Je vous remercie pour votre attention. Je suis prêt à répondre à vos questions et à approfondir tout module en particulier.

---

*Bon courage pour votre démo de demain.*
