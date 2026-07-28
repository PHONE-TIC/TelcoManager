/**
 * Configuration Day.js centralisée, en français.
 *
 * Remplace Moment.js, en maintenance depuis plusieurs années et dont le poids
 * (~19 kB gzip) pesait sur le chargement initial : le tableau de bord, page
 * d'accueil de l'application, l'importait dès le démarrage.
 *
 * Ce module doit être importé à la place de `dayjs` partout dans l'application,
 * afin que la locale et les greffons soient garantis chargés.
 */
import dayjs from "dayjs";
import "dayjs/locale/fr";
import isBetween from "dayjs/plugin/isBetween";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import localeData from "dayjs/plugin/localeData";
import localizedFormat from "dayjs/plugin/localizedFormat";
import minMax from "dayjs/plugin/minMax";
import utc from "dayjs/plugin/utc";
import weekOfYear from "dayjs/plugin/weekOfYear";

// Les sept premiers greffons sont ceux qu'exige le localizer Day.js de
// react-big-calendar ; weekOfYear est requis par les comparaisons à la semaine
// utilisées par la vue planning mobile.
dayjs.extend(isBetween);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(localeData);
dayjs.extend(localizedFormat);
dayjs.extend(minMax);
dayjs.extend(utc);
dayjs.extend(weekOfYear);

// La semaine française commence le lundi. Day.js suit la locale, qui porte
// déjà cette règle — contrairement à Moment, où elle devait être redéclarée.
dayjs.locale("fr");

export default dayjs;
