# Guide Rapide : Installer et Lancer Flutter sous Linux

Ce guide vous permettra d'installer Flutter sur votre système Ubuntu/Debian et de lancer l'application mobile en quelques minutes.

## 1. Installer le SDK Flutter

La méthode la plus simple et officielle sous Linux est d'utiliser `snap` (qui est préinstallé sur la plupart des distributions Ubuntu).

Ouvrez votre terminal et exécutez la commande suivante :
```bash
sudo snap install flutter --classic
```

*Si on vous demande votre mot de passe, entrez-le. L'installation prendra quelques instants pour télécharger le SDK.*

## 2. Vérifier l'installation

Une fois l'installation terminée, exécutez cette commande pour vérifier que Flutter fonctionne et voir s'il vous manque des dépendances (comme Android Studio pour l'émulation) :
```bash


```
*(Si c'est la première fois, Flutter va télécharger quelques outils supplémentaires automatiquement).*

## 3. Initialiser le projet POS Mobile

L'application que j'ai codée ne contient pour l'instant que le code source (`lib/` et `pubspec.yaml`). Il faut dire à Flutter de générer les "coquilles" pour Android, iOS et Linux autour de ce code.

Déplacez-vous dans le dossier de l'application mobile :
```bash
cd /home/hp/Documents/Projet/Restaurant/mobile
```

Générez le projet (n'oubliez pas le point `.` à la fin) :
```bash
flutter create .
```

## 4. Lancer l'Application

Assurez-vous d'abord que votre backend Web tourne dans un autre terminal :
```bash
cd /home/hp/Documents/Projet/Restaurant
npm run dev
```

Ensuite, depuis le dossier `mobile`, lancez l'application :
```bash
flutter run
```

> **Astuce :** Si vous n'avez pas d'émulateur Android installé ni de téléphone branché, Flutter vous proposera de lancer l'application sous forme de fenêtre de bureau Linux (ce qui est parfait pour tester très rapidement le rendu de l'interface mobile !).
