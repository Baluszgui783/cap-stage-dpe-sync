# Cap Stage DPE — actualisation hebdomadaire

Script technique d'import de l'annuaire public officiel des diagnostiqueurs immobiliers, limité aux certifications DPE valides et aux huit départements d'Île-de-France.

Exécution GitHub Actions chaque lundi à 07 h 23, fuseau Europe/Paris, ainsi que sur déclenchement manuel. L'horaire peut être retardé par GitHub. Le runner Ubuntu standard est gratuit pour ce dépôt public ; aucun runner payant, cache ou artefact n'est configuré. Firebase reste sur Spark.

Le dépôt ne contient aucune base de contacts, note, donnée de suivi ni mot de passe. Deux secrets Actions, `SYNC_CONFIG` et `SYNC_PASSWORD`, sont injectés uniquement dans l'étape d'import. Le compte Firebase `cap-stage-updater` peut lire et écrire `/catalog` seulement. Il ne peut accéder à `/tracking`.

Les identifiants existants dépendent du nom normalisé de l'entreprise : une modification d'e-mail conserve donc le suivi. Une entreprise absente du dernier relevé reste dans le catalogue avec un indicateur ; si elle possède un suivi, sa fiche reste consultable. Aucun rapprochement approximatif ni transfert automatique de notes n'est effectué lors d'un changement de nom.

Le remplacement de `/catalog` est atomique. Un CSV illisible, moins de 1 000 contacts valides ou une baisse de plus de 30 % du nombre de contacts actifs bloque l'import et conserve la base antérieure. Les engagements handicap documentés manuellement, notes, étapes, relances et historiques restent dans `/tracking`, hors du périmètre d'import.

`automation-status.json` contient uniquement une date, un résultat technique et un numéro d'exécution. Son actualisation évite la désactivation du planificateur public après 60 jours sans activité. Aucun contact n'est publié dans ce fichier.

Vérification locale : `npm ci --ignore-scripts` puis `npm test`. Les tests utilisent exclusivement des entreprises et adresses fictives.

Classification : CANONICAL_PROGRESS — fermeture de l'actualisation hebdomadaire demandée. Pas de collecte supplémentaire, de messagerie automatique ni de changement des suivis.
