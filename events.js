// events.js
// The "brains" of the app. These functions only work with data. They don't
// touch the web page, which makes them easy to test (see tests.html).
//
// An event looks like this:
//   {
//     id: "1729100000000-ab12",
//     name: "Open Mic Night",
//     location: "Student Center",
//     date: "2026-10-16",      // year-month-day
//     time: "19:30",           // start time, 24-hour clock
//     endTime: "21:00",        // optional; "" if not given
//     description: "Bring a song or a poem!",
//     tone: "casual",          // "casual", "standard", or "formal" (sets the color)
//     sample: true             // only on the built-in fictional events
//   }

const STORAGE_KEY = "harding-campus-events";

// How formal an event is. Each one gets its own color stripe (see style.css).
const TONES = ["casual", "standard", "formal"];
const DEFAULT_TONE = "standard";

// Events must happen between 7 AM and 10 PM. The hourly calendar shows these hours.
const FIRST_HOUR = 7;
const LAST_HOUR = 22; // 10 PM, when the day ends
const EARLIEST_TIME = pad(FIRST_HOUR) + ":00"; // "07:00"
const LATEST_TIME = pad(LAST_HOUR) + ":00";   // "22:00"

// ---------- Dates and times ----------

// Adds a leading zero: 7 -> "07"
function pad(number) {
  return String(number).padStart(2, "0");
}

// Date object -> "2026-10-16" (local time, so it matches the user's calendar)
function toDateString(date) {
  return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
}

// "2026-10-16" -> Date object at midnight local time
function parseDateString(text) {
  const parts = text.split("-");
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

// Returns a new Date that is `days` days after `date` (negative goes back)
function addDays(date, days) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + days);
  return result;
}

// The Monday that starts the week containing `date`.
// getDay() counts Sunday as 0, so (getDay() + 6) % 7 is how many days since Monday.
function startOfWeek(date) {
  return addDays(date, -((date.getDay() + 6) % 7));
}

// The 7 days (Monday to Sunday) of the week starting at `weekStart`
function getWeekDays(weekStart) {
  const days = [];
  for (let i = 0; i < 7; i++) {
    days.push(addDays(weekStart, i));
  }
  return days;
}

// The 1st of the month containing `date`
function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

// The 1st of the month `months` months after `date` (negative goes back)
function addMonths(date, months) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

// Every day shown on a month calendar: whole weeks (Monday to Sunday) from the
// week containing the 1st to the week containing the last day of the month.
// So it includes a few days from the months before and after.
function getMonthGridDays(monthStart) {
  const lastDay = addDays(addMonths(monthStart, 1), -1);
  const gridEnd = addDays(startOfWeek(lastDay), 6);
  const days = [];
  for (let day = startOfWeek(monthStart); day <= gridEnd; day = addDays(day, 1)) {
    days.push(day);
  }
  return days;
}

// Checks text like "2026-10-16" is a real date (so "2026-02-30" fails)
function isValidDateString(text) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  return toDateString(parseDateString(text)) === text;
}

// Checks text like "19:30" is a real 24-hour time
function isValidTimeString(text) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(text);
}

// "19:30" -> "7:30 PM"
function formatTime(time) {
  const hour = Number(time.slice(0, 2));
  const minutes = time.slice(3, 5);
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return hour12 + ":" + minutes + " " + suffix;
}

// "2026-10-16" -> "Friday, October 16, 2026"
function formatLongDate(dateString) {
  return parseDateString(dateString).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric"
  });
}

// "2026-10-16" -> "Fri, Oct 16"
function formatShortDate(dateString) {
  return parseDateString(dateString).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric"
  });
}

// Monday Oct 12 -> "Oct 12 – Oct 18, 2026"
function formatWeekRange(weekStart) {
  const weekEnd = addDays(weekStart, 6);
  const options = { month: "short", day: "numeric" };
  return weekStart.toLocaleDateString("en-US", options) + " – " +
    weekEnd.toLocaleDateString("en-US", options) + ", " + weekEnd.getFullYear();
}

// Oct 1, 2026 -> "October 2026"
function formatMonthLabel(monthStart) {
  return monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// An event's start and end times: "6:30 PM – 8:00 PM", or just "6:30 PM"
function formatTimeRange(event) {
  if (!event.endTime) return formatTime(event.time);
  return formatTime(event.time) + " – " + formatTime(event.endTime);
}

// 7 -> "7 AM", 13 -> "1 PM"
function formatHourLabel(hour) {
  return formatTime(pad(hour) + ":00").replace(":00", "");
}

// Shortens words longer than `maxLetters` so a name fits in a narrow box:
// abbreviateName("Lunch & Learn: Budgeting Basics", 6) -> "Lunch & Learn: Budge. Basics"
function abbreviateName(name, maxLetters) {
  return name.split(" ").map(function (word) {
    if (word.length <= maxLetters) return word;
    return word.slice(0, Math.max(maxLetters - 1, 1)) + ".";
  }).join(" ");
}

// "09:00" -> "morning", "13:00" -> "afternoon", "19:00" -> "evening"
function getTimeOfDay(time) {
  const hour = Number(time.slice(0, 2));
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

// ---------- Working with lists of events ----------

// Which hour rows of the hourly calendar an event covers. The end hour is
// not included: 6:30–8:00 PM covers the 6 PM and 7 PM rows, so it returns
// { startHour: 18, endHour: 20 }. With no end time, an event fills one hour.
function getHourSpan(event) {
  const startHour = Number(event.time.slice(0, 2));
  let endHour = startHour + 1;
  if (event.endTime && event.endTime > event.time) {
    const endMinutes = Number(event.endTime.slice(0, 2)) * 60 + Number(event.endTime.slice(3, 5));
    endHour = Math.max(Math.ceil(endMinutes / 60), startHour + 1);
  }
  return { startHour: startHour, endHour: Math.min(endHour, LAST_HOUR) };
}

// Places one day's events on the hourly calendar. Events that share an hour
// sit side by side, so each one gets a column number and the number of
// columns its group is split into.
// Returns a list of { event, startHour, endHour, column, columns }.
// Events outside 7 AM – 10 PM (only possible for old saved ones) are left out.
function layoutDayEvents(events) {
  const boxes = sortEvents(events).map(function (event) {
    return Object.assign({ event: event }, getHourSpan(event));
  }).filter(function (box) {
    return box.startHour >= FIRST_HOUR && box.startHour < LAST_HOUR;
  });

  // A "group" is a run of events that overlap, directly or through each other
  let group = [];
  let groupEndHour = 0;
  boxes.forEach(function (box) {
    if (box.startHour >= groupEndHour) {
      setGroupColumns(group);
      group = [];
    }
    // Use the first column that's free at this hour
    let column = 0;
    while (group.some(function (other) { return other.column === column && other.endHour > box.startHour; })) {
      column++;
    }
    box.column = column;
    group.push(box);
    groupEndHour = Math.max(groupEndHour, box.endHour);
  });
  setGroupColumns(group);
  return boxes;
}

// Every event in a group splits the hour the same number of ways, so they line up
function setGroupColumns(group) {
  const columns = group.reduce(function (most, box) { return Math.max(most, box.column + 1); }, 1);
  group.forEach(function (box) { box.columns = columns; });
}

// Earliest first. Returns a new list and leaves the original alone.
function sortEvents(events) {
  return events.slice().sort(function (a, b) {
    return (a.date + a.time).localeCompare(b.date + b.time);
  });
}

// All events on one day, earliest first
function eventsOnDate(events, dateString) {
  return sortEvents(events.filter(function (event) {
    return event.date === dateString;
  }));
}

// Finds events that match ALL the filters that are filled in:
//   keyword:   words to look for in the name, location, or description
//   from, to:  date range like "2026-10-01" (both ends included)
//   timeOfDay: "morning", "afternoon", "evening", or "any"
function searchEvents(events, filters) {
  const words = (filters.keyword || "").toLowerCase().split(/\s+/).filter(Boolean);

  return sortEvents(events.filter(function (event) {
    const text = (event.name + " " + event.location + " " + (event.description || "")).toLowerCase();
    const hasAllWords = words.every(function (word) { return text.includes(word); });
    const afterFrom = !filters.from || event.date >= filters.from;
    const beforeTo = !filters.to || event.date <= filters.to;
    const rightTimeOfDay = !filters.timeOfDay || filters.timeOfDay === "any" ||
      getTimeOfDay(event.time) === filters.timeOfDay;
    return hasAllWords && afterFrom && beforeTo && rightTimeOfDay;
  }));
}

// Checks what someone typed into the "Post an event" form.
// Returns { errors: [...messages], event: {...cleaned-up event} }
function validateEvent(input) {
  const event = {
    name: String(input.name || "").trim(),
    location: String(input.location || "").trim(),
    date: String(input.date || "").trim(),
    time: String(input.time || "").trim(),
    endTime: String(input.endTime || "").trim(),
    description: String(input.description || "").trim(),
    // Events saved before tones existed don't have one, so they get the default
    tone: String(input.tone || DEFAULT_TONE).trim()
  };
  const errors = [];

  if (!event.name) errors.push("Please give the event a name.");
  else if (event.name.length > 100) errors.push("The event name is too long (100 characters max).");

  if (!event.location) errors.push("Please say where the event is.");
  else if (event.location.length > 100) errors.push("The location is too long (100 characters max).");

  if (!event.date) errors.push("Please pick a date.");
  else if (!isValidDateString(event.date)) errors.push("That date doesn't look right.");

  if (!event.time) errors.push("Please pick a start time.");
  else if (!isValidTimeString(event.time)) errors.push("That time doesn't look right.");
  else if (event.time < EARLIEST_TIME || event.time >= LATEST_TIME) {
    errors.push("Events must start between 7:00 AM and 10:00 PM.");
  }

  // The end time is optional, but if it's there it has to make sense
  if (event.endTime) {
    if (!isValidTimeString(event.endTime)) errors.push("That end time doesn't look right.");
    else if (isValidTimeString(event.time) && event.endTime <= event.time) {
      errors.push("The end time must be after the start time.");
    } else if (event.endTime > LATEST_TIME) errors.push("Events must end by 10:00 PM.");
  }

  if (event.description.length > 500) errors.push("The description is too long (500 characters max).");

  if (!TONES.includes(event.tone)) errors.push("Please pick casual, standard, or formal.");

  return { errors: errors, event: event };
}

// A unique-enough id for a new event
function makeId() {
  return Date.now() + "-" + Math.random().toString(36).slice(2, 6);
}

// ---------- Saving in the browser ----------
// Events you post are stored in your browser's "localStorage". That means
// they stay after a page reload, but only on this browser on this device.
// `storage` is window.localStorage (or a fake one in the tests).

function loadSavedEvents(storage) {
  try {
    const text = storage.getItem(STORAGE_KEY);
    if (!text) return [];
    const list = JSON.parse(text);
    if (!Array.isArray(list)) return [];
    // Skip anything broken instead of crashing the page
    return list.filter(isUsableSavedEvent);
  } catch (error) {
    return [];
  }
}

// A saved event only needs the basics to be shown. We don't re-check newer
// rules (like 7 AM – 10 PM) here, so events saved before a rule existed aren't lost.
function isUsableSavedEvent(event) {
  return Boolean(event && event.id && event.name && event.location &&
    isValidDateString(String(event.date)) && isValidTimeString(String(event.time)));
}

// Returns true if it saved, false if the browser wouldn't let us
function saveEvents(storage, events) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(events));
    return true;
  } catch (error) {
    return false;
  }
}
