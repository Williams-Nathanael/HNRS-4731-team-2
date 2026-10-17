// app.js
// Connects the web page (index.html) to the functions in events.js:
// draws the week, hourly, or month calendar, handles the "Post an event" form, and runs searches.

// ---------- App data ----------

// Some browsers block localStorage (e.g. strict privacy settings)
function getStorage() {
  try {
    return window.localStorage;
  } catch (error) {
    return null;
  }
}

const storage = getStorage();
const sampleEvents = getSampleEvents(new Date());
let savedEvents = loadSavedEvents(storage);   // events posted in this browser
let calendarView = "week"; // "week", "hourly", or "month"
let shownDate = new Date(); // the calendar shows the week or month containing this day
let eventInDialog = null;

function allEvents() {
  return sampleEvents.concat(savedEvents);
}

// ---------- Page elements ----------

const periodLabel = document.getElementById("period-label");
const weekGrid = document.getElementById("week-grid");
const hourlyView = document.getElementById("hourly-view");
const hourlyGrid = document.getElementById("hourly-grid");
const monthView = document.getElementById("month-view");
const monthGrid = document.getElementById("month-grid");
const weekViewButton = document.getElementById("week-view-button");
const hourlyViewButton = document.getElementById("hourly-view-button");
const monthViewButton = document.getElementById("month-view-button");
const hoverPreview = document.getElementById("hover-preview");
const postForm = document.getElementById("post-form");
const postDate = document.getElementById("post-date");
const postErrors = document.getElementById("post-errors");
const postMessage = document.getElementById("post-message");
const searchForm = document.getElementById("search-form");
const searchSummary = document.getElementById("search-summary");
const searchResults = document.getElementById("search-results");
const dialog = document.getElementById("event-dialog");
const deleteButton = document.getElementById("dialog-delete");

// Makes an HTML element. We set text with textContent (never innerHTML)
// so nobody can sneak code into the page through an event name.
function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

// ---------- The calendar (week, hourly, or month) ----------

// Draws whichever calendar view is chosen
function renderCalendar() {
  weekGrid.hidden = calendarView !== "week";
  hourlyView.hidden = calendarView !== "hourly";
  monthView.hidden = calendarView !== "month";
  weekViewButton.setAttribute("aria-pressed", String(calendarView === "week"));
  hourlyViewButton.setAttribute("aria-pressed", String(calendarView === "hourly"));
  monthViewButton.setAttribute("aria-pressed", String(calendarView === "month"));
  hidePreview();

  if (calendarView === "month") renderMonth();
  else if (calendarView === "hourly") renderHourly();
  else renderWeek();
}

// Today, Fridays, and weekends get their own colors (see style.css)
function addDayColors(element, day) {
  if (toDateString(day) === toDateString(new Date())) element.classList.add("today");
  if (day.getDay() === 5) element.classList.add("friday");
  if (day.getDay() === 0 || day.getDay() === 6) element.classList.add("weekend");
}

function renderWeek() {
  const weekStart = startOfWeek(shownDate);
  periodLabel.textContent = formatWeekRange(weekStart);
  weekGrid.replaceChildren();

  getWeekDays(weekStart).forEach(function (day) {
    const column = makeElement("div", "day");
    addDayColors(column, day);

    const heading = makeElement("h3", "day-heading");
    heading.append(
      makeElement("span", "day-name", day.toLocaleDateString("en-US", { weekday: "short" })),
      makeElement("span", "day-number", day.getDate())
    );
    column.append(heading);

    const dayEvents = eventsOnDate(allEvents(), toDateString(day));
    if (dayEvents.length === 0) {
      column.append(makeElement("p", "no-events", "No events"));
    }
    dayEvents.forEach(function (event) {
      column.append(makeEventCard(event));
    });

    weekGrid.append(column);
  });
}

// The week with a row for each hour, 7 AM to 10 PM
function renderHourly() {
  const weekStart = startOfWeek(shownDate);
  const days = getWeekDays(weekStart);
  periodLabel.textContent = formatWeekRange(weekStart);
  hourlyGrid.replaceChildren();
  hourlyGrid.style.setProperty("--hours", LAST_HOUR - FIRST_HOUR); // style.css uses this for the height

  // Top row: an empty corner above the hour labels, then the 7 day names
  hourlyGrid.append(makeElement("div", "hour-corner"));
  days.forEach(function (day) {
    const heading = makeElement("div", "hour-day-heading");
    addDayColors(heading, day);
    heading.append(
      makeElement("span", "day-name", day.toLocaleDateString("en-US", { weekday: "short" })),
      makeElement("span", "day-number", day.getDate())
    );
    hourlyGrid.append(heading);
  });

  // Left column: "7 AM", "8 AM", ... "9 PM"
  const labels = makeElement("div", "hour-labels");
  for (let hour = FIRST_HOUR; hour < LAST_HOUR; hour++) {
    labels.append(makeElement("div", "hour-label", formatHourLabel(hour)));
  }
  hourlyGrid.append(labels);

  // One tall column per day, with the events placed inside it
  days.forEach(function (day) {
    const column = makeElement("div", "hour-day");
    addDayColors(column, day);
    hourlyGrid.append(column);
    // Now that the column is on the page we know how wide it is
    const columnWidth = column.getBoundingClientRect().width;
    layoutDayEvents(eventsOnDate(allEvents(), toDateString(day))).forEach(function (box) {
      column.append(makeHourBlock(box, columnWidth));
    });
  });
}

// Box widths depend on the window size, so redraw if it changes
window.addEventListener("resize", function () {
  if (calendarView === "hourly") renderCalendar();
});

function renderMonth() {
  const monthStart = startOfMonth(shownDate);
  periodLabel.textContent = formatMonthLabel(monthStart);
  monthGrid.replaceChildren();

  getMonthGridDays(monthStart).forEach(function (day) {
    const cell = makeElement("div", "month-day");
    addDayColors(cell, day);
    // Days from the month before or after are shown faded
    if (day.getMonth() !== monthStart.getMonth()) cell.classList.add("outside-month");

    // The weekday name only shows on phones, where days are listed instead of in a grid
    const heading = makeElement("h3", "month-day-heading");
    heading.append(
      makeElement("span", "month-day-name", day.toLocaleDateString("en-US", { weekday: "short" })),
      makeElement("span", "month-day-number", day.getDate())
    );
    cell.append(heading);

    const dayEvents = eventsOnDate(allEvents(), toDateString(day));
    if (dayEvents.length === 0) cell.classList.add("empty");
    dayEvents.forEach(function (event) {
      cell.append(makeCompactEvent(event));
    });

    monthGrid.append(cell);
  });
}

// Full card for the week view: time, name, and location
function makeEventCard(event) {
  const card = makeElement("button", "event-card tone-" + (event.tone || DEFAULT_TONE));
  card.type = "button";
  card.append(
    makeElement("span", "event-time", formatTimeRange(event)),
    makeElement("span", "event-name", event.name),
    makeElement("span", "event-location", event.location)
  );
  card.addEventListener("click", function () {
    showDetails(event);
  });
  return card;
}

// Small entry for the month view: just time and name
function makeCompactEvent(event) {
  const entry = makeElement("button", "month-event tone-" + (event.tone || DEFAULT_TONE));
  entry.type = "button";
  entry.title = formatTime(event.time) + " " + event.name; // full text on hover, in case it's cut off
  entry.append(
    makeElement("span", "month-event-time", formatTime(event.time)),
    makeElement("span", "month-event-name", event.name)
  );
  entry.addEventListener("click", function () {
    showDetails(event);
  });
  return entry;
}

// Box for the hourly view, showing only the event's name. The numbers set
// here tell style.css where to put it and how big to make it (see .hour-event).
function makeHourBlock(box, columnWidth) {
  const event = box.event;
  const hours = box.endHour - box.startHour;
  const block = makeElement("button", "hour-event tone-" + (event.tone || DEFAULT_TONE));
  block.type = "button";
  block.style.setProperty("--start", box.startHour - FIRST_HOUR);
  block.style.setProperty("--hours-long", hours);
  block.style.setProperty("--column", box.column);
  block.style.setProperty("--columns", box.columns);
  // Screen readers can't see the hover preview, so give them the time too
  block.setAttribute("aria-label", event.name + ", " + formatTimeRange(event));

  // Shorten words that are too long for the box. The text is at most about 8 pixels
  // per letter, and the box loses about 10 pixels to its border and padding.
  const lettersPerLine = Math.floor((columnWidth / box.columns - 10) / 8);
  const name = makeElement("span", "hour-event-name", abbreviateName(event.name, Math.max(lettersPerLine, 3)));
  // Then cut the name off with "…" after as many lines as fit: 3 per hour
  name.style.setProperty("-webkit-line-clamp", String(hours * 3));
  block.append(name);

  block.addEventListener("mouseenter", function () { showPreview(event); });
  block.addEventListener("focus", function () { showPreview(event); });
  block.addEventListener("mouseleave", hidePreview);
  block.addEventListener("blur", hidePreview);
  block.addEventListener("click", function () {
    hidePreview();
    showDetails(event);
  });
  return block;
}

// Jumps the calendar to the week or month containing a date like "2026-10-16"
function showDate(dateString) {
  shownDate = parseDateString(dateString);
  renderCalendar();
}

weekViewButton.addEventListener("click", function () {
  calendarView = "week";
  renderCalendar();
});

hourlyViewButton.addEventListener("click", function () {
  calendarView = "hourly";
  renderCalendar();
});

monthViewButton.addEventListener("click", function () {
  calendarView = "month";
  renderCalendar();
});

// Previous / Next move by a month in month view, otherwise by a week
document.getElementById("prev-period").addEventListener("click", function () {
  shownDate = calendarView === "month" ? addMonths(shownDate, -1) : addDays(shownDate, -7);
  renderCalendar();
});

document.getElementById("next-period").addEventListener("click", function () {
  shownDate = calendarView === "month" ? addMonths(shownDate, 1) : addDays(shownDate, 7);
  renderCalendar();
});

document.getElementById("today-button").addEventListener("click", function () {
  shownDate = new Date();
  renderCalendar();
});

// ---------- Event details pop-up and hover preview ----------

// "Friday, October 16, 2026, 6:30 PM – 8:00 PM"
function describeWhen(event) {
  return formatLongDate(event.date) + ", " + formatTimeRange(event);
}

// "formal" -> "Formal"
function describeTone(event) {
  const tone = event.tone || DEFAULT_TONE;
  return tone.charAt(0).toUpperCase() + tone.slice(1);
}

function showDetails(event) {
  eventInDialog = event;
  document.getElementById("dialog-name").textContent = event.name;
  document.getElementById("dialog-when").textContent = describeWhen(event);
  document.getElementById("dialog-location").textContent = event.location;
  document.getElementById("dialog-tone").textContent = describeTone(event);
  dialog.className = "tone-" + (event.tone || DEFAULT_TONE); // colors the pop-up's top stripe
  document.getElementById("dialog-description").textContent = event.description || "";
  document.getElementById("dialog-sample").hidden = !event.sample;
  deleteButton.hidden = Boolean(event.sample); // you can only delete events you posted
  dialog.showModal();
}

// The hover preview sits on top of the "Post an event" section (see style.css)
function showPreview(event) {
  document.getElementById("preview-name").textContent = event.name;
  document.getElementById("preview-when").textContent = describeWhen(event);
  document.getElementById("preview-location").textContent = event.location;
  document.getElementById("preview-tone").textContent = describeTone(event);
  document.getElementById("preview-description").textContent = event.description || "";
  document.getElementById("preview-sample").hidden = !event.sample;
  hoverPreview.className = "hover-preview tone-" + (event.tone || DEFAULT_TONE);
  hoverPreview.hidden = false;
}

function hidePreview() {
  hoverPreview.hidden = true;
}

deleteButton.addEventListener("click", function () {
  if (!eventInDialog || !confirm("Delete \"" + eventInDialog.name + "\"?")) return;
  const idToDelete = eventInDialog.id;
  savedEvents = savedEvents.filter(function (event) {
    return event.id !== idToDelete;
  });
  saveEvents(storage, savedEvents);
  dialog.close();
  renderCalendar();
  runSearch();
});

// ---------- Posting a new event ----------

postForm.addEventListener("submit", function (submitEvent) {
  submitEvent.preventDefault(); // stop the browser from reloading the page
  postMessage.textContent = "";
  postErrors.replaceChildren();

  const input = Object.fromEntries(new FormData(postForm));
  const result = validateEvent(input);

  if (result.errors.length > 0) {
    result.errors.forEach(function (message) {
      postErrors.append(makeElement("li", "", message));
    });
    return;
  }

  const newEvent = Object.assign({ id: makeId() }, result.event);
  savedEvents.push(newEvent);
  const saved = storage !== null && saveEvents(storage, savedEvents);

  postMessage.textContent = saved
    ? "Posted \"" + newEvent.name + "\"! It's now on the calendar."
    : "Posted, but this browser won't let us save it, so it will disappear if you reload.";

  postForm.reset();
  postDate.value = toDateString(new Date());
  showDate(newEvent.date); // jump to the new event on the calendar
  runSearch();
});

// ---------- Searching ----------

function runSearch() {
  const filters = Object.fromEntries(new FormData(searchForm));
  searchResults.replaceChildren();

  const isSearching = filters.keyword.trim() || filters.from || filters.to || filters.timeOfDay !== "any";
  if (!isSearching) {
    searchSummary.textContent = "Type a keyword or pick dates to search.";
    return;
  }
  if (filters.from && filters.to && filters.from > filters.to) {
    searchSummary.textContent = "The \"From\" date is after the \"To\" date.";
    return;
  }

  const matches = searchEvents(allEvents(), filters);
  if (matches.length === 0) {
    searchSummary.textContent = "No events match your search.";
    return;
  }
  searchSummary.textContent = matches.length === 1 ? "1 event found:" : matches.length + " events found:";

  matches.forEach(function (event) {
    const item = makeElement("li");
    const button = makeElement("button", "result tone-" + (event.tone || DEFAULT_TONE));
    button.type = "button";
    button.append(
      makeElement("span", "result-when", formatShortDate(event.date) + " · " + formatTimeRange(event)),
      makeElement("span", "result-name", event.name),
      makeElement("span", "result-location", event.location)
    );
    button.addEventListener("click", function () {
      showDate(event.date);
      showDetails(event);
    });
    item.append(button);
    searchResults.append(item);
  });
}

// Search as you type
searchForm.addEventListener("input", runSearch);
searchForm.addEventListener("submit", function (submitEvent) {
  submitEvent.preventDefault();
  runSearch();
});
// The "Clear search" button resets the form; wait a moment so the
// fields are actually empty before searching again
searchForm.addEventListener("reset", function () {
  setTimeout(runSearch, 0);
});

// ---------- The squirrel button (a joke) ----------

const squirrelDialog = document.getElementById("squirrel-dialog");

document.getElementById("squirrel-button").addEventListener("click", function () {
  const date = pickSquirrelDate(new Date(), Math.random);
  document.getElementById("squirrel-user").textContent = date.userNumber;
  document.getElementById("squirrel-when").textContent =
    formatLongDate(date.date) + " at " + formatTime(date.time);
  document.getElementById("squirrel-place").textContent = date.place;
  document.getElementById("squirrel-color").textContent = date.color;
  squirrelDialog.showModal();
});

// "Accept" is the only way out: block the Escape key from closing it
squirrelDialog.addEventListener("cancel", function (cancelEvent) {
  cancelEvent.preventDefault();
});

document.getElementById("squirrel-accept").addEventListener("click", function () {
  squirrelDialog.close();
});

// ---------- Start the app ----------

postDate.value = toDateString(new Date());
renderCalendar();
runSearch();
