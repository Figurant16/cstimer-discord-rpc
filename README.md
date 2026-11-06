# csTimer Discord RPC

Affiche ton ao5, ton ao12 et ton dernier temps de [csTimer](https://cstimer.net) dans ton statut Discord.

Une extension lit les stats dans la page, puis un petit programme Node.js lancé par Helium les transmet à Discord. Le statut disparaît quand tu fermes le dernier onglet csTimer.

## Installation (macOS, Helium)

1. Crée une application sur le [portail développeur Discord](https://discord.com/developers/applications). Son nom sera le titre affiché sur ton profil.
2. Copie son **Application ID**, puis lance :
   ```sh
   ./install.sh <application_id>
   ```
3. Dans Helium, ouvre `helium://extensions`, active le mode développeur, clique sur **Load unpacked** et choisis le dossier `extension`.
4. Recharge cstimer.net, avec l'application Discord de bureau ouverte.

Déplacer ce dossier oblige à relancer `install.sh` et à recharger l'extension.

## Limites

- Les deux moyennes affichées sont les deux premières configurées dans csTimer : ao5 et ao12 par défaut.
- Le statut reste visible tant qu'un onglet csTimer est ouvert, même si tu ne tournes plus.

## Tests

```sh
npm test                  # tests unitaires et faux serveur Discord
node test/e2e-helium.js   # vrai Helium (profil jetable) et vrai cstimer.net
```
