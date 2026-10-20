export type CalendarEntry = {
  id: string;
  title: string;
  starts_at: string;
  ends_at?: string | null;
  description?: string | null;
  location?: string | null;
  link?: string | null;
  kind?: string;
};

export function calendarStamp(value: string) {
  return new Date(value)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}
export function escapeCalendarText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}
// RFC 5545 folds at 75 UTF-8 octets (not JavaScript characters).
export function foldCalendarLine(line: string) {
  const encoder = new TextEncoder();
  let result = "",
    current = "",
    size = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    if (size + bytes > 75) {
      result += current + "\r\n";
      current = " ";
      size = 1;
    }
    current += char;
    size += bytes;
  }
  return result + current;
}
export function calendarFile(entries: CalendarEntry[], now = new Date()) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Beyond Medicine//Member Portal//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  for (const entry of entries) {
    const end =
      entry.ends_at || new Date(new Date(entry.starts_at).getTime() + 3600000).toISOString();
    lines.push(
      "BEGIN:VEVENT",
      `UID:${entry.id}@beyond-medicine.org`,
      `DTSTAMP:${calendarStamp(now.toISOString())}`,
      `DTSTART:${calendarStamp(entry.starts_at)}`,
      `DTEND:${calendarStamp(end)}`,
      `SUMMARY:${escapeCalendarText(entry.title)}`,
      `DESCRIPTION:${escapeCalendarText(entry.description || "")}`,
      `LOCATION:${escapeCalendarText(entry.location || "")}`,
      "END:VEVENT",
    );
  }
  return lines.map(foldCalendarLine).join("\r\n") + "\r\n";
}
export function downloadCalendar(entries: CalendarEntry[]) {
  const url = URL.createObjectURL(
    new Blob([calendarFile(entries)], { type: "text/calendar;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "beyond-medicine.ics";
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function googleCalendarLink(entry: CalendarEntry) {
  const end =
    entry.ends_at || new Date(new Date(entry.starts_at).getTime() + 3600000).toISOString();
  return (
    "https://calendar.google.com/calendar/render?" +
    new URLSearchParams({
      action: "TEMPLATE",
      text: entry.title,
      dates: `${calendarStamp(entry.starts_at)}/${calendarStamp(end)}`,
      details: entry.description || "",
      location: entry.location || "",
    })
  );
}
export function outlookCalendarLink(entry: CalendarEntry) {
  return (
    "https://outlook.live.com/calendar/0/deeplink/compose?" +
    new URLSearchParams({
      path: "/calendar/action/compose",
      rru: "addevent",
      subject: entry.title,
      startdt: entry.starts_at,
      enddt: entry.ends_at || new Date(new Date(entry.starts_at).getTime() + 3600000).toISOString(),
      body: entry.description || "",
      location: entry.location || "",
    })
  );
}
