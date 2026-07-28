import type { CSSProperties } from "react";
import { Calendar, dayjsLocalizer, type View } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "../styles/calendar-dark-theme.css";
import dayjs from "../utils/dayjsFrConfig";
import type { Intervention } from "../types";

const localizer = dayjsLocalizer(dayjs);

type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Intervention;
};

interface InterventionsCalendarProps {
  calendarDate: Date;
  calendarEvents: CalendarEvent[];
  calendarView: View;
  eventStyleGetter: (event: CalendarEvent) => { style: CSSProperties };
  handleNavigate: (date: Date) => void;
  handleViewChange: (view: View) => void;
  onSelectEvent: (event: CalendarEvent) => void;
}

function InterventionsCalendar({
  calendarDate,
  calendarEvents,
  calendarView,
  eventStyleGetter,
  handleNavigate,
  handleViewChange,
  onSelectEvent,
}: InterventionsCalendarProps) {
  return (
    <Calendar
      localizer={localizer}
      culture="fr"
      defaultView="month"
      selectable
      min={new Date(0, 0, 0, 0, 0, 0)}
      max={new Date(0, 0, 0, 23, 59, 59)}
      events={calendarEvents}
      startAccessor="start"
      endAccessor="end"
      style={{
        height: "calc(100vh - 400px)",
        minHeight: "450px",
        maxHeight: "700px",
      }}
      date={calendarDate}
      onNavigate={handleNavigate}
      view={calendarView}
      onView={handleViewChange}
      eventPropGetter={eventStyleGetter}
      formats={{
        dayFormat: (date: Date) => dayjs(date).format("dddd D"),
        weekdayFormat: (date: Date) => dayjs(date).format("dddd"),
        monthHeaderFormat: (date: Date) => dayjs(date).format("MMMM YYYY"),
        dayHeaderFormat: (date: Date) => dayjs(date).format("dddd D MMMM"),
      }}
      messages={{
        next: "Suivant",
        previous: "Précédent",
        today: "Aujourd'hui",
        month: "Mois",
        week: "Semaine",
        day: "Jour",
        agenda: "Agenda",
        date: "Date",
        time: "Heure",
        event: "Événement",
      }}
      onSelectEvent={onSelectEvent}
    />
  );
}

export default InterventionsCalendar;
export type { CalendarEvent };
