// tests.js
// Automatic checks for the app. Open tests.html to run them.
// Part 1 tests the functions in events.js and sample-data.js.
// Part 2 loads the real app in a hidden frame and clicks through it.

const results = [];

function test(name, check) {
  try {
    check();
    results.push({ name: name, passed: true });
  } catch (error) {
    results.push({ name: name, passed: false, message: error.message });
  }
}

function assertEqual(actual, expected, label) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) {
    throw new Error((label ? label + ": " : "") + "expected " + b + " but got " + a);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// A pretend localStorage, so tests don't touch real saved events
function makeFakeStorage() {
  const data = {};
  return {
    getItem: function (key) { return key in data ? data[key] : null; },
    setItem: function (key, value) { data[key] = String(value); }
  };
}

const exampleEvents = [
  { id: "1", name: "Soccer Game", location: "Soccer Field", date: "2026-10-17", time: "14:00", description: "Wear gold" },
  { id: "2", name: "Study Hall", location: "Library", date: "2026-10-14", time: "19:00", description: "Free coffee" },
  { id: "3", name: "Prayer Walk", location: "Front Lawn", date: "2026-10-12", time: "07:30", description: "" },
  { id: "4", name: "Coffee Chat", location: "Student Center", date: "2026-10-14", time: "09:00", description: "" }
];

function namesOf(events) {
  return events.map(function (event) { return event.name; });
}

// ---------- Part 1: the functions in events.js ----------

function runFunctionTests() {
  test("dates turn into text and back again", function () {
    assertEqual(toDateString(new Date(2026, 9, 16)), "2026-10-16");
    assertEqual(toDateString(parseDateString("2026-01-05")), "2026-01-05");
  });

  test("a week starts on Sunday", function () {
    // Friday Oct 16, 2026 is in the week starting Sunday Oct 11
    assertEqual(toDateString(startOfWeek(new Date(2026, 9, 16))), "2026-10-11");
    // A Sunday is its own week start
    assertEqual(toDateString(startOfWeek(new Date(2026, 9, 11))), "2026-10-11");
  });

  test("week start works across month and year boundaries", function () {
    assertEqual(toDateString(startOfWeek(new Date(2026, 9, 1))), "2026-09-27");
    assertEqual(toDateString(startOfWeek(new Date(2027, 0, 1))), "2026-12-27");
  });

  test("a week has 7 days, Sunday to Saturday", function () {
    const days = getWeekDays(new Date(2026, 9, 11)).map(toDateString);
    assertEqual(days.length, 7);
    assertEqual(days[0], "2026-10-11");
    assertEqual(days[6], "2026-10-17");
  });

  test("times are shown in 12-hour format", function () {
    assertEqual(formatTime("00:15"), "12:15 AM");
    assertEqual(formatTime("09:05"), "9:05 AM");
    assertEqual(formatTime("12:00"), "12:00 PM");
    assertEqual(formatTime("19:30"), "7:30 PM");
  });

  test("week label reads like 'Oct 11 – Oct 17, 2026'", function () {
    assertEqual(formatWeekRange(new Date(2026, 9, 11)), "Oct 11 – Oct 17, 2026");
  });

  test("events on a day come back earliest first", function () {
    assertEqual(namesOf(eventsOnDate(exampleEvents, "2026-10-14")), ["Coffee Chat", "Study Hall"]);
    assertEqual(eventsOnDate(exampleEvents, "2026-10-15"), []);
  });

  test("a complete event passes validation, with spaces trimmed", function () {
    const result = validateEvent({ name: "  Open Mic ", location: "Coffee House", date: "2026-10-20", time: "20:00" });
    assertEqual(result.errors, []);
    assertEqual(result.event.name, "Open Mic");
  });

  test("missing name, location, date, and time are all reported", function () {
    assertEqual(validateEvent({}).errors.length, 4);
  });

  test("impossible dates and times are rejected", function () {
    const result = validateEvent({ name: "X", location: "Y", date: "2026-02-30", time: "25:00" });
    assertEqual(result.errors, ["That date doesn't look right.", "That time doesn't look right."]);
  });

  test("names that are too long are rejected", function () {
    const result = validateEvent({ name: "a".repeat(101), location: "Y", date: "2026-10-20", time: "10:00" });
    assertEqual(result.errors.length, 1);
  });

  test("keyword search ignores upper/lower case and checks name, location, description", function () {
    assertEqual(namesOf(searchEvents(exampleEvents, { keyword: "SOCCER" })), ["Soccer Game"]);
    assertEqual(namesOf(searchEvents(exampleEvents, { keyword: "library" })), ["Study Hall"]);
    assertEqual(namesOf(searchEvents(exampleEvents, { keyword: "coffee" })), ["Coffee Chat", "Study Hall"]);
  });

  test("every keyword must match", function () {
    assertEqual(namesOf(searchEvents(exampleEvents, { keyword: "coffee library" })), ["Study Hall"]);
    assertEqual(searchEvents(exampleEvents, { keyword: "coffee soccer" }), []);
  });

  test("date range search includes both end dates", function () {
    const found = searchEvents(exampleEvents, { from: "2026-10-12", to: "2026-10-14" });
    assertEqual(namesOf(found), ["Prayer Walk", "Coffee Chat", "Study Hall"]);
  });

  test("time-of-day search", function () {
    assertEqual(namesOf(searchEvents(exampleEvents, { timeOfDay: "morning" })), ["Prayer Walk", "Coffee Chat"]);
    assertEqual(namesOf(searchEvents(exampleEvents, { timeOfDay: "afternoon" })), ["Soccer Game"]);
    assertEqual(namesOf(searchEvents(exampleEvents, { timeOfDay: "evening" })), ["Study Hall"]);
  });

  test("an empty search returns every event, sorted", function () {
    assertEqual(searchEvents(exampleEvents, { keyword: "", timeOfDay: "any" }).length, 4);
  });

  test("saved events can be loaded back", function () {
    const storage = makeFakeStorage();
    assertEqual(saveEvents(storage, exampleEvents), true);
    assertEqual(loadSavedEvents(storage), exampleEvents);
  });

  test("broken saved data doesn't crash the app", function () {
    const storage = makeFakeStorage();
    assertEqual(loadSavedEvents(storage), [], "nothing saved yet");
    storage.setItem(STORAGE_KEY, "this is not JSON");
    assertEqual(loadSavedEvents(storage), [], "garbage");
    storage.setItem(STORAGE_KEY, JSON.stringify([exampleEvents[0], { name: "no id or date" }]));
    assertEqual(loadSavedEvents(storage).length, 1, "one good, one bad");
    assertEqual(loadSavedEvents(null), [], "no storage at all");
  });

  test("saving reports failure instead of crashing when storage is blocked", function () {
    const blocked = { setItem: function () { throw new Error("blocked"); } };
    assertEqual(saveEvents(blocked, exampleEvents), false);
  });

  test("all sample events are valid, and some are this week", function () {
    const today = new Date();
    const samples = getSampleEvents(today);
    samples.forEach(function (event) {
      assertEqual(validateEvent(event).errors, [], event.name);
      assert(event.sample === true, event.name + " should be marked as a sample");
    });
    const thisWeek = getWeekDays(startOfWeek(today)).map(toDateString);
    assert(samples.some(function (event) { return thisWeek.includes(event.date); }), "no sample events this week");
  });
}

// ---------- Part 2: clicking through the real app ----------

function runPageTests(done) {
  // Hide any events you've really posted while the tests run, then put them back
  const savedBefore = localStorage.getItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_KEY);

  const frame = document.createElement("iframe");
  frame.src = "index.html";
  frame.className = "test-frame";
  frame.addEventListener("load", function () {
    const page = frame.contentDocument;
    const win = frame.contentWindow;
    const find = function (selector) { return page.querySelector(selector); };
    const findAll = function (selector) { return page.querySelectorAll(selector); };
    const type = function (selector, value) {
      const input = find(selector);
      input.value = value;
      input.dispatchEvent(new win.Event("input", { bubbles: true }));
    };
    const thisWeekLabel = find("#week-label").textContent;

    test("page: the calendar shows 7 days", function () {
      assertEqual(findAll("#week-grid .day").length, 7);
    });

    test("page: today is highlighted and sample events are showing", function () {
      assertEqual(findAll("#week-grid .day.today").length, 1);
      assert(findAll("#week-grid .event-card").length > 0, "no event cards on the calendar");
    });

    test("page: posting an empty form shows helpful errors", function () {
      find("#post-form").requestSubmit();
      // Date is filled in for you, so name, location, and time are missing
      assertEqual(findAll("#post-errors li").length, 3);
    });

    const nextWeekDate = toDateString(addDays(new Date(), 7));

    test("page: posting an event puts it on the calendar and saves it", function () {
      type("#post-form [name=name]", "Test Event Zebra");
      type("#post-form [name=location]", "Test Hall");
      type("#post-form [name=date]", nextWeekDate);
      type("#post-form [name=time]", "13:00");
      find("#post-form").requestSubmit();

      assertEqual(findAll("#post-errors li").length, 0, "errors shown");
      assert(find("#week-grid").textContent.includes("Test Event Zebra"), "new event not on calendar");
      assert(find("#week-label").textContent !== thisWeekLabel, "calendar didn't jump to next week");
      assert(find("#post-message").textContent.includes("Posted"), "no success message");
      assert((localStorage.getItem(STORAGE_KEY) || "").includes("Test Event Zebra"), "not saved");
      assertEqual(find("#post-form [name=name]").value, "", "form not cleared");
    });

    test("page: the new event can be found by search", function () {
      type("#search-form [name=keyword]", "zebra");
      assertEqual(findAll("#search-results li").length, 1);
      assert(find("#search-summary").textContent.includes("1 event found"), "wrong summary");
    });

    test("page: a search with no matches says so", function () {
      type("#search-form [name=keyword]", "nothing-matches-this");
      assertEqual(findAll("#search-results li").length, 0);
      assert(find("#search-summary").textContent.includes("No events"), "wrong summary");
    });

    test("page: searching by time of day", function () {
      type("#search-form [name=keyword]", "");
      const select = find("#search-form [name=timeOfDay]");
      select.value = "morning";
      select.dispatchEvent(new win.Event("input", { bubbles: true }));
      const times = Array.from(findAll("#search-results .result-when")).map(function (el) { return el.textContent; });
      assert(times.length > 0, "no morning events found");
      assert(times.every(function (text) { return text.includes("AM"); }), "found a non-morning event: " + times);
      select.value = "any";
      select.dispatchEvent(new win.Event("input", { bubbles: true }));
    });

    test("page: clicking a search result opens its details", function () {
      type("#search-form [name=keyword]", "zebra");
      find("#search-results .result").click();
      assert(find("#event-dialog").open, "details didn't open");
      assertEqual(find("#dialog-name").textContent, "Test Event Zebra");
      assertEqual(find("#dialog-delete").hidden, false, "delete button should show for your own event");
    });

    test("page: you can delete an event you posted", function () {
      win.confirm = function () { return true; }; // auto-answer "OK"
      find("#dialog-delete").click();
      assert(!find("#event-dialog").open, "details didn't close");
      assert(!find("#week-grid").textContent.includes("Test Event Zebra"), "still on calendar");
      assert(!(localStorage.getItem(STORAGE_KEY) || "").includes("Test Event Zebra"), "still saved");
    });

    test("page: sample events can't be deleted", function () {
      find("#this-week").click();
      find("#week-grid .event-card").click();
      assertEqual(find("#dialog-delete").hidden, true);
      assertEqual(find("#dialog-sample").hidden, false, "sample badge missing");
      find("#event-dialog").close();
    });

    test("page: Previous / Next / This week buttons change the week", function () {
      find("#prev-week").click();
      const lastWeekLabel = find("#week-label").textContent;
      assert(lastWeekLabel !== thisWeekLabel, "Previous didn't change the week");
      find("#next-week").click();
      find("#next-week").click();
      assert(find("#week-label").textContent !== lastWeekLabel, "Next didn't change the week");
      find("#this-week").click();
      assertEqual(find("#week-label").textContent, thisWeekLabel);
    });

    test("page: event names can't inject HTML", function () {
      type("#post-form [name=name]", "<img src=x onerror=alert(1)>");
      type("#post-form [name=location]", "Somewhere");
      type("#post-form [name=date]", toDateString(new Date()));
      type("#post-form [name=time]", "10:00");
      find("#post-form").requestSubmit();
      assertEqual(find("#week-grid").querySelectorAll("img").length, 0);
      assert(find("#week-grid").textContent.includes("<img"), "name not shown as plain text");
    });

    // Put back whatever was saved before the tests
    if (savedBefore === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, savedBefore);
    done();
  });
  document.body.append(frame);
}

// ---------- Show the results ----------

function showResults() {
  const failed = results.filter(function (r) { return !r.passed; });
  const summary = document.getElementById("summary");
  summary.textContent = failed.length === 0
    ? "All " + results.length + " tests passed ✓"
    : failed.length + " of " + results.length + " tests failed ✗";
  summary.className = failed.length === 0 ? "pass" : "fail";

  const list = document.getElementById("results");
  results.forEach(function (r) {
    const item = document.createElement("li");
    item.className = r.passed ? "pass" : "fail";
    item.textContent = (r.passed ? "✓ " : "✗ ") + r.name + (r.passed ? "" : ": " + r.message);
    list.append(item);
  });

  // Used by automated checks: open tests.html?report to send results to the server log
  if (location.search.includes("report")) {
    const report = "pass=" + (results.length - failed.length) + "&fail=" + failed.length +
      "&failed=" + encodeURIComponent(failed.map(function (r) { return r.name + ": " + r.message; }).join(" | "));
    fetch("test-report?" + report).catch(function () {});
  }
}

if (location.protocol === "file:") {
  // Browsers block the page tests when opened straight from a file
  runFunctionTests();
  results.push({ name: "page tests skipped: run a local server to include them (see README)", passed: true });
  showResults();
} else {
  runFunctionTests();
  runPageTests(showResults);
}
