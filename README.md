# csTimer Discord RPC

Affiche ton ao5, ton ao12 et ton dernier temps de [csTimer](https://cstimer.net) dans ton statut Discord.

Le statut ressemble à ceci, avec le logo csTimer et la durée de la session :

```
csTimer
ao5: 12.34 • ao12: 13.00
Dernier temps : 11.22
```

Le projet fonctionne sur macOS avec [Helium](https://helium.computer) et l'application Discord de bureau. Il n'a aucune dépendance npm.

## Fonctionnement

Une extension seule ne peut pas parler à l'application Discord. Le projet a donc deux parties :

```
cstimer.net ──> extension Helium ──> programme local ──> application Discord
              signal « avg »       Native Messaging    socket discord-ipc
```

- **L'extension** s'abonne au signal `avg` de csTimer et transmet les stats. Elle ne lit pas le HTML de la page.
- **Le programme local** (`host/`) met ces stats en forme et les envoie à Discord par son socket local.

Tu n'as rien à lancer toi-même. Helium démarre le programme à la réception des premières stats et l'arrête à la fermeture du dernier onglet csTimer, ce qui retire le statut. Le programme ne tourne pas en permanence et n'ouvre aucun port réseau.

## Installation

Il te faut Node.js, Helium et l'application Discord de bureau.

1. Crée une application sur le [portail développeur Discord](https://discord.com/developers/applications). Son nom sera le titre affiché sur ton profil.
2. Copie son **Application ID**, puis lance :
   ```sh
   ./install.sh <application_id>
   ```
3. Dans Helium, ouvre `helium://extensions`, active le mode développeur, clique sur **Load unpacked** et choisis le dossier `extension`.
4. Recharge cstimer.net, avec l'application Discord ouverte.

`install.sh` écrit `host/config.json` et `host/run.sh`, ignorés par git, ainsi que le manifeste Native Messaging dans `~/Library/Application Support/net.imput.helium/NativeMessagingHosts/`.

Le manifeste enregistre le chemin du projet et celui de Node.js. Si l'un des deux change, relance `install.sh` et recharge l'extension.

## Désinstallation

1. Retire l'extension dans `helium://extensions`.
2. Supprime le manifeste :
   ```sh
   rm "$HOME/Library/Application Support/net.imput.helium/NativeMessagingHosts/local.cstimer_discord_rpc.json"
   ```
3. Supprime le dossier du projet.

## Limites

- Les deux moyennes affichées sont les deux premières configurées dans csTimer : ao5 et ao12 par défaut.
- Avant d'atteindre 5 ou 12 temps, la moyenne s'affiche `-`, ou en moyenne possible (`bpa5`) à un temps du compte.
- Le statut reste visible tant qu'un onglet csTimer est ouvert, même si tu ne tournes plus.
- Avec plusieurs onglets csTimer, le dernier onglet actif sur une résolution remplace le statut.

## Dépannage

| Symptôme | À vérifier |
|---|---|
| Rien sur Discord | L'application Discord de bureau est ouverte, et le partage d'activité est activé dans ses réglages. |
| Rien sur Discord malgré ça | Dans `helium://extensions`, ouvre le service worker de l'extension et lis sa console. |
| `Specified native messaging host not found` | `install.sh` n'a pas été lancé, ou le dossier a été déplacé. |
| `Access to the specified native messaging host is forbidden` | L'identifiant de l'extension ne correspond pas : le champ `key` de `manifest.json` a changé. |

## Structure

```
extension/
  page.js              lit le signal avg dans la page
  bridge.js            relaie les stats vers le service worker
  background.js        gère la connexion au programme local
host/
  host.js              point d'entrée lancé par Helium
  presence.js          met les stats en forme pour Discord
  discord-ipc.js       client du socket Discord, avec reconnexion
  native-messaging.js  protocole Native Messaging
test/                  tests unitaires et test de bout en bout
install.sh             installation du programme local
```

## Tests

```sh
npm test                  # tests unitaires et faux serveur Discord
node test/e2e-helium.js   # vrai Helium (profil jetable) et vrai cstimer.net
```

`e2e-helium.js` utilise un faux Discord et un profil temporaire : il ne touche ni à ton statut ni à ton profil Helium. Il réécrit `host/run.sh`, ce qui est sans effet tant que le projet ne bouge pas.
