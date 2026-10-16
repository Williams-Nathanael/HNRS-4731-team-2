// app.js
// Connects the web page (index.html) to the functions in events.js:
// draws the week, handles the "Post an event" form, and runs searches.

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
let shownWeekStart = startOfWeek(new Date()); // the Sunday of the week on screen
let eventInDialog = null;

function allEvents() {
  return sampleEvents.concat(savedEvents);
}

// ---------- Page elements ----------

const weekLabel = document.getElementById("week-label");
const weekGrid = document.getElementById("week-grid");
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

// ---------- The week calendar ----------

function renderWeek() {
  weekLabel.textContent = formatWeekRange(shownWeekStart);
  weekGrid.replaceChildren();
  const today = toDateString(new Date());

  getWeekDays(shownWeekStart).forEach(function (day) {
    const dateString = toDateString(day);
    const column = makeElement("div", "day");
    if (dateString === today) column.classList.add("today");
    // Fridays and weekends get their own colors (see style.css)
    if (day.getDay() === 5) column.classList.add("friday");
    if (day.getDay() === 0 || day.getDay() === 6) column.classList.add("weekend");

    const heading = makeElement("h3", "day-heading");
    heading.append(
      makeElement("span", "day-name", day.toLocaleDateString("en-US", { weekday: "short" })),
      makeElement("span", "day-number", day.getDate())
    );
    column.append(heading);

    const dayEvents = eventsOnDate(allEvents(), dateString);
    if (dayEvents.length === 0) {
      column.append(makeElement("p", "no-events", "No events"));
    }
    dayEvents.forEach(function (event) {
      column.append(makeEventCard(event));
    });

    weekGrid.append(column);
  });
}

function makeEventCard(event) {
  const card = makeElement("button", "event-card tone-" + (event.tone || DEFAULT_TONE));
  card.type = "button";
  card.append(
    makeElement("span", "event-time", formatTime(event.time)),
    makeElement("span", "event-name", event.name),
    makeElement("span", "event-location", event.location)
  );
  card.addEventListener("click", function () {
    showDetails(event);
  });
  return card;
}

function showWeekOf(dateString) {
  shownWeekStart = startOfWeek(parseDateString(dateString));
  renderWeek();
}

document.getElementById("prev-week").addEventListener("click", function () {
  shownWeekStart = addDays(shownWeekStart, -7);
  renderWeek();
});

document.getElementById("next-week").addEventListener("click", function () {
  shownWeekStart = addDays(shownWeekStart, 7);
  renderWeek();
});

document.getElementById("this-week").addEventListener("click", function () {
  shownWeekStart = startOfWeek(new Date());
  renderWeek();
});

// ---------- Event details pop-up ----------

function showDetails(event) {
  eventInDialog = event;
  document.getElementById("dialog-name").textContent = event.name;
  document.getElementById("dialog-when").textContent =
    formatLongDate(event.date) + " at " + formatTime(event.time);
  document.getElementById("dialog-location").textContent = event.location;
  const tone = event.tone || DEFAULT_TONE;
  document.getElementById("dialog-tone").textContent = tone.charAt(0).toUpperCase() + tone.slice(1);
  dialog.className = "tone-" + tone; // colors the pop-up's top stripe
  document.getElementById("dialog-description").textContent = event.description || "";
  document.getElementById("dialog-sample").hidden = !event.sample;
  deleteButton.hidden = Boolean(event.sample); // you can only delete events you posted
  dialog.showModal();
}

deleteButton.addEventListener("click", function () {
  if (!eventInDialog || !confirm("Delete \"" + eventInDialog.name + "\"?")) return;
  const idToDelete = eventInDialog.id;
  savedEvents = savedEvents.filter(function (event) {
    return event.id !== idToDelete;
  });
  saveEvents(storage, savedEvents);
  dialog.close();
  renderWeek();
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
  showWeekOf(newEvent.date); // jump to the week of the new event
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
      makeElement("span", "result-when", formatShortDate(event.date) + " · " + formatTime(event.time)),
      makeElement("span", "result-name", event.name),
      makeElement("span", "result-location", event.location)
    );
    button.addEventListener("click", function () {
      showWeekOf(event.date);
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

// ---------- Start the app ----------

postDate.value = toDateString(new Date());
renderWeek();
runSearch();
