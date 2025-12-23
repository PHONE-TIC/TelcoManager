/**
 * Moment.js French locale configuration
 * Imported once at app startup for consistent date formatting
 */
import moment from "moment";

// Only define locale if not already defined (avoid duplicate registration)
if (!moment.locales().includes("fr")) {
  moment.defineLocale("fr", {
    months:
      "janvier_février_mars_avril_mai_juin_juillet_août_septembre_octobre_novembre_décembre".split(
        "_"
      ),
    monthsShort:
      "janv._févr._mars_avr._mai_juin_juil._août_sept._oct._nov._déc.".split(
        "_"
      ),
    monthsParseExact: true,
    weekdays: "dimanche_lundi_mardi_mercredi_jeudi_vendredi_samedi".split("_"),
    weekdaysShort: "dim._lun._mar._mer._jeu._ven._sam.".split("_"),
    weekdaysMin: "Di_Lu_Ma_Me_Je_Ve_Sa".split("_"),
    longDateFormat: {
      LT: "HH:mm",
      LTS: "HH:mm:ss",
      L: "DD/MM/YYYY",
      LL: "D MMMM YYYY",
      LLL: "D MMMM YYYY HH:mm",
      LLLL: "dddd D MMMM YYYY HH:mm",
    },
    calendar: {
      sameDay: "[Aujourd'hui à] LT",
      nextDay: "[Demain à] LT",
      nextWeek: "dddd [à] LT",
      lastDay: "[Hier à] LT",
      lastWeek: "dddd [dernier à] LT",
      sameElse: "L",
    },
    relativeTime: {
      future: "dans %s",
      past: "il y a %s",
      s: "quelques secondes",
      m: "une minute",
      mm: "%d minutes",
      h: "une heure",
      hh: "%d heures",
      d: "un jour",
      dd: "%d jours",
      M: "un mois",
      MM: "%d mois",
      y: "un an",
      yy: "%d ans",
    },
    dayOfMonthOrdinalParse: /\d{1,2}(er|e)/,
    ordinal: function (number: number) {
      return number + (number === 1 ? "er" : "");
    },
    week: {
      dow: 1, // Lundi est le premier jour de la semaine
      doy: 4, // La semaine qui contient le 4 janvier est la première semaine de l'année
    },
  });
}

// Set French as default locale
moment.locale("fr");

// Configure moment to parse dates as UTC by default
// This prevents double timezone conversion since our dates are stored in UTC
// but represent local time (i.e., 16:00 stored as 16:00Z means 16:00 local)
moment.parseZone();

// Export configured moment for use throughout the app
export default moment;
