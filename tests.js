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

  test("a week starts on Monday", function () {
    // Friday Oct 16, 2026 is in the week starting Monday Oct 12
    assertEqual(toDateString(startOfWeek(new Date(2026, 9, 16))), "2026-10-12");
    // A Monday is its own week start
    assertEqual(toDateString(startOfWeek(new Date(2026, 9, 12))), "2026-10-12");
    // Sunday is the END of a week, so Sunday Oct 18 belongs to the week of Oct 12
    assertEqual(toDateString(startOfWeek(new Date(2026, 9, 18))), "2026-10-12");
  });

  test("week start works across month and year boundaries", function () {
    assertEqual(toDateString(startOfWeek(new Date(2026, 9, 1))), "2026-09-28");
    assertEqual(toDateString(startOfWeek(new Date(2027, 0, 1))), "2026-12-28");
  });

  test("a week has 7 days, Monday to Sunday", function () {
    const days = getWeekDays(new Date(2026, 9, 12)).map(toDateString);
    assertEqual(days.length, 7);
    assertEqual(days[0], "2026-10-12");
    assertEqual(days[6], "2026-10-18");
  });

  test("times are shown in 12-hour format", function () {
    assertEqual(formatTime("00:15"), "12:15 AM");
    assertEqual(formatTime("09:05"), "9:05 AM");
    assertEqual(formatTime("12:00"), "12:00 PM");
    assertEqual(formatTime("19:30"), "7:30 PM");
  });

  test("month helpers find the 1st of the month", function () {
    assertEqual(toDateString(startOfMonth(new Date(2026, 9, 16))), "2026-10-01");
    assertEqual(toDateString(addMonths(new Date(2026, 9, 16), 1)), "2026-11-01");
    assertEqual(toDateString(addMonths(new Date(2026, 11, 31), 1)), "2027-01-01", "into next year");
    assertEqual(toDateString(addMonths(new Date(2026, 0, 31), -1)), "2025-12-01", "into last year");
    assertEqual(formatMonthLabel(new Date(2026, 9, 1)), "October 2026");
  });

  test("month grid covers whole Monday-to-Sunday weeks", function () {
    // October 2026 starts on a Thursday and ends on a Saturday
    const october = getMonthGridDays(new Date(2026, 9, 1)).map(toDateString);
    assertEqual(october.length, 35);
    assertEqual(october[0], "2026-09-28");
    assertEqual(october[34], "2026-11-01");
    // February 2027 starts on a Monday and ends on a Sunday: exactly 4 weeks
    const february = getMonthGridDays(new Date(2027, 1, 1)).map(toDateString);
    assertEqual(february.length, 28);
    assertEqual(february[0], "2027-02-01");
    assertEqual(february[27], "2027-02-28");
  });

  test("week label reads like 'Oct 12 – Oct 18, 2026'", function () {
    assertEqual(formatWeekRange(new Date(2026, 9, 12)), "Oct 12 – Oct 18, 2026");
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

  test("events must start between 7:00 AM and 10:00 PM", function () {
    const base = { name: "X", location: "Y", date: "2026-10-20" };
    const startError = ["Events must start between 7:00 AM and 10:00 PM."];
    assertEqual(validateEvent(Object.assign({ time: "06:59" }, base)).errors, startError, "6:59 AM");
    assertEqual(validateEvent(Object.assign({ time: "22:00" }, base)).errors, startError, "10:00 PM");
    assertEqual(validateEvent(Object.assign({ time: "07:00" }, base)).errors, [], "7:00 AM");
    assertEqual(validateEvent(Object.assign({ time: "21:59" }, base)).errors, [], "9:59 PM");
  });

  test("the end time is optional, but must be after the start and by 10 PM", function () {
    const base = { name: "X", location: "Y", date: "2026-10-20", time: "18:00" };
    const check = function (endTime) {
      return validateEvent(Object.assign({ endTime: endTime }, base)).errors;
    };
    assertEqual(check(""), [], "no end time");
    assertEqual(check("20:30"), [], "8:30 PM");
    assertEqual(check("22:00"), [], "10:00 PM exactly");
    assertEqual(check("18:00"), ["The end time must be after the start time."], "same as start");
    assertEqual(check("17:00"), ["The end time must be after the start time."], "before start");
    assertEqual(check("22:30"), ["Events must end by 10:00 PM."], "too late");
    assertEqual(check("99:99"), ["That end time doesn't look right."], "nonsense");
  });

  test("time ranges read like '6:30 PM – 8:00 PM'", function () {
    assertEqual(formatTimeRange({ time: "18:30", endTime: "20:00" }), "6:30 PM – 8:00 PM");
    assertEqual(formatTimeRange({ time: "18:30", endTime: "" }), "6:30 PM");
    assertEqual(formatHourLabel(7), "7 AM");
    assertEqual(formatHourLabel(12), "12 PM");
    assertEqual(formatHourLabel(21), "9 PM");
  });

  test("long words in names get abbreviated", function () {
    assertEqual(abbreviateName("Lunch & Learn: Budgeting Basics", 6), "Lunch & Learn: Budge. Basics");
    assertEqual(abbreviateName("Club Fair", 6), "Club Fair", "short names stay the same");
    assertEqual(abbreviateName("Résumé Review Drop-In", 4), "Rés. Rev. Dro.");
  });

  test("events cover the hour rows they overlap", function () {
    assertEqual(getHourSpan({ time: "18:30", endTime: "20:00" }), { startHour: 18, endHour: 20 });
    assertEqual(getHourSpan({ time: "18:30", endTime: "20:15" }), { startHour: 18, endHour: 21 });
    assertEqual(getHourSpan({ time: "07:30", endTime: "" }), { startHour: 7, endHour: 8 }, "no end time");
    assertEqual(getHourSpan({ time: "12:00", endTime: "12:15" }), { startHour: 12, endHour: 13 }, "short event");
  });

  test("events that share an hour are placed side by side", function () {
    const at = function (name, time, endTime) {
      return { id: name, name: name, location: "L", date: "2026-10-12", time: time, endTime: endTime };
    };
    const layout = function (events) {
      return layoutDayEvents(events).map(function (box) {
        return [box.event.name, box.column, box.columns];
      });
    };
    // Different hours: each gets the full width
    assertEqual(layout([at("A", "09:00", ""), at("B", "11:00", "")]), [["A", 0, 1], ["B", 0, 1]]);
    // Same hour: split in two
    assertEqual(layout([at("A", "12:00", "14:00"), at("B", "12:30", "13:30")]), [["A", 0, 2], ["B", 1, 2]]);
    // A (9–11) overlaps B (10–12), and C (11–12) can reuse A's column once A ends
    assertEqual(layout([at("A", "09:00", "11:00"), at("B", "10:00", "12:00"), at("C", "11:00", "")]),
      [["A", 0, 2], ["B", 1, 2], ["C", 0, 2]]);
    // An old saved event outside 7 AM – 10 PM is left out
    assertEqual(layout([at("Late", "23:00", "")]), []);
  });

  test("old saved events outside 7 AM – 10 PM still load", function () {
    const storage = makeFakeStorage();
    const late = { id: "x", name: "Late", location: "L", date: "2026-10-12", time: "23:00" };
    storage.setItem(STORAGE_KEY, JSON.stringify([late]));
    assertEqual(loadSavedEvents(storage), [late]);
  });

  test("events without a tone get the standard tone", function () {
    const result = validateEvent({ name: "X", location: "Y", date: "2026-10-20", time: "10:00" });
    assertEqual(result.event.tone, "standard");
  });

  test("casual, standard, and formal tones are accepted; others aren't", function () {
    TONES.forEach(function (tone) {
      const result = validateEvent({ name: "X", location: "Y", date: "2026-10-20", time: "10:00", tone: tone });
      assertEqual(result.errors, [], tone);
      assertEqual(result.event.tone, tone);
    });
    const bad = validateEvent({ name: "X", location: "Y", date: "2026-10-20", time: "10:00", tone: "fancy" });
    assertEqual(bad.errors, ["Please pick casual, standard, or formal."]);
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
    const thisWeekLabel = find("#period-label").textContent;

    test("page: the calendar shows 7 days", function () {
      assertEqual(findAll("#week-grid .day").length, 7);
    });

    test("page: today is highlighted and sample events are showing", function () {
      assertEqual(findAll("#week-grid .day.today").length, 1);
      assert(findAll("#week-grid .event-card").length > 0, "no event cards on the calendar");
    });

    test("page: Friday is pale purple, Saturday and Sunday are medium purple", function () {
      const days = findAll("#week-grid .day"); // Monday first, Sunday last
      const background = function (el) { return win.getComputedStyle(el).backgroundColor; };
      assert(days[0].textContent.startsWith("Mon"), "week should start on Monday");
      assert(days[6].textContent.startsWith("Sun"), "week should end on Sunday");
      assertEqual(background(days[4]), "rgb(241, 234, 251)", "Friday");
      assertEqual(background(days[5]), "rgb(201, 179, 234)", "Saturday");
      assertEqual(background(days[6]), "rgb(201, 179, 234)", "Sunday");
      assert(background(days[2]) !== background(days[4]), "Wednesday shouldn't be purple");
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
      find("#post-form [name=tone][value=formal]").checked = true;
      find("#post-form").requestSubmit();

      assertEqual(findAll("#post-errors li").length, 0, "errors shown");
      assert(find("#week-grid").textContent.includes("Test Event Zebra"), "new event not on calendar");
      const card = Array.from(findAll("#week-grid .event-card")).find(function (el) {
        return el.textContent.includes("Test Event Zebra");
      });
      assert(card.classList.contains("tone-formal"), "card isn't colored as formal");
      assertEqual(win.getComputedStyle(card).borderLeftColor, "rgb(242, 183, 5)", "formal stripe color");
      assert(find("#post-form [name=tone][value=standard]").checked, "tone didn't reset to standard");
      assert(find("#period-label").textContent !== thisWeekLabel, "calendar didn't jump to next week");
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
      assertEqual(find("#dialog-tone").textContent, "Formal");
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
      find("#today-button").click();
      find("#week-grid .event-card").click();
      assertEqual(find("#dialog-delete").hidden, true);
      assertEqual(find("#dialog-sample").hidden, false, "sample badge missing");
      find("#event-dialog").close();
    });

    test("page: Previous / Next / This week buttons change the week", function () {
      find("#prev-period").click();
      const lastWeekLabel = find("#period-label").textContent;
      assert(lastWeekLabel !== thisWeekLabel, "Previous didn't change the week");
      find("#next-period").click();
      find("#next-period").click();
      assert(find("#period-label").textContent !== lastWeekLabel, "Next didn't change the week");
      find("#today-button").click();
      assertEqual(find("#period-label").textContent, thisWeekLabel);
    });

    test("page: the Month button switches to a month calendar", function () {
      find("#month-view-button").click();
      assert(find("#week-grid").hidden, "week view still showing");
      assert(!find("#month-view").hidden, "month view not showing");
      assertEqual(find("#month-view-button").getAttribute("aria-pressed"), "true");
      assertEqual(find("#period-label").textContent, formatMonthLabel(startOfMonth(new Date())));
      const cells = findAll("#month-grid .month-day");
      assert(cells.length >= 28 && cells.length % 7 === 0, "month grid should be whole weeks, got " + cells.length);
      assertEqual(findAll("#month-grid .month-day.today").length, 1, "today highlighted");
    });

    test("page: month view shows each event as just time and name", function () {
      const entries = findAll("#month-grid .month-event");
      assert(entries.length > 0, "no events in the month view");
      const entry = entries[0];
      assert(entry.querySelector(".month-event-time"), "missing time");
      assert(entry.querySelector(".month-event-name"), "missing name");
      assertEqual(entry.children.length, 2, "should only have time and name");
      // Check against the real data: every sample event this month is on its day
      const thisMonth = startOfMonth(new Date()).getMonth();
      const expected = getSampleEvents(new Date()).filter(function (e) {
        return parseDateString(e.date).getMonth() === thisMonth;
      });
      assert(entries.length >= expected.length, "some of this month's events are missing");
    });

    test("page: month view uses the Friday and weekend colors", function () {
      const background = function (el) { return win.getComputedStyle(el).backgroundColor; };
      const cells = findAll("#month-grid .month-day"); // each row is Monday to Sunday
      assertEqual(background(cells[4]), "rgb(241, 234, 251)", "Friday");
      assertEqual(background(cells[5]), "rgb(201, 179, 234)", "Saturday");
      assertEqual(background(cells[6]), "rgb(201, 179, 234)", "Sunday");
    });

    test("page: clicking an event in month view opens its details", function () {
      const entry = find("#month-grid .month-event");
      const name = entry.querySelector(".month-event-name").textContent;
      entry.click();
      assert(find("#event-dialog").open, "details didn't open");
      assertEqual(find("#dialog-name").textContent, name);
      find("#event-dialog").close();
    });

    test("page: Previous / Next move by a month in month view", function () {
      const thisMonthLabel = find("#period-label").textContent;
      find("#next-period").click();
      assertEqual(find("#period-label").textContent, formatMonthLabel(addMonths(new Date(), 1)));
      find("#prev-period").click();
      find("#prev-period").click();
      assertEqual(find("#period-label").textContent, formatMonthLabel(addMonths(new Date(), -1)));
      find("#today-button").click();
      assertEqual(find("#period-label").textContent, thisMonthLabel);
    });

    test("page: the Week button switches back", function () {
      find("#week-view-button").click();
      assert(!find("#week-grid").hidden, "week view not showing");
      assert(find("#month-view").hidden, "month view still showing");
      assertEqual(find("#period-label").textContent, thisWeekLabel);
    });

    test("page: the Hourly button shows hour rows from 7 AM to 9 PM", function () {
      find("#hourly-view-button").click();
      assert(!find("#hourly-view").hidden, "hourly view not showing");
      assert(find("#week-grid").hidden && find("#month-view").hidden, "other views still showing");
      assertEqual(find("#period-label").textContent, thisWeekLabel);
      const labels = Array.from(findAll("#hourly-grid .hour-label")).map(function (el) { return el.textContent; });
      assertEqual(labels.length, 15);
      assertEqual(labels[0], "7 AM");
      assertEqual(labels[14], "9 PM");
      assertEqual(findAll("#hourly-grid .hour-day").length, 7);
    });

    // Finds an event's box in the hourly view by its full name (the label
    // screen readers use, since the name on screen may be abbreviated)
    const hourBlock = function (name) {
      return Array.from(findAll("#hourly-grid .hour-event")).find(function (el) {
        return el.getAttribute("aria-label").startsWith(name + ",");
      });
    };

    test("page: hourly boxes show only the name and stretch over their hours", function () {
      // Club Fair is a sample event, Thursday 4:00–6:00 PM
      const box = hourBlock("Club Fair");
      assert(box, "Club Fair not found");
      assertEqual(box.textContent, "Club Fair", "box should show just the name");
      assertEqual(box.style.getPropertyValue("--start"), String(16 - 7), "starts in the 4 PM row");
      assertEqual(box.style.getPropertyValue("--hours-long"), "2", "covers 2 hours");
      const columns = findAll("#hourly-grid .hour-day");
      assert(columns[3].contains(box), "should be in Thursday's column");
      assertEqual(Math.round(box.getBoundingClientRect().height), 2 * 52 - 2, "height of 2 hours");
    });

    test("page: events in the same hour split the space", function () {
      // Sample events on Monday: Résumé Review 12–2 PM and Lunch & Learn 12:30–1:30 PM
      const resume = hourBlock("Résumé Review Drop-In");
      const lunch = hourBlock("Lunch & Learn: Budgeting Basics");
      const dayWidth = findAll("#hourly-grid .hour-day")[0].getBoundingClientRect().width;
      const resumeBox = resume.getBoundingClientRect();
      const lunchBox = lunch.getBoundingClientRect();
      assert(Math.abs(resumeBox.width - dayWidth / 2) < 4, "should be half the day's width");
      assert(lunchBox.left >= resumeBox.right - 1, "should sit beside, not on top of, each other");
      assert(lunch.textContent.includes("."), "long words in the narrow box should be abbreviated");
      const nameLine = lunch.querySelector(".hour-event-name");
      assert(nameLine.scrollWidth <= nameLine.clientWidth + 1, "abbreviated name still too wide for its box");
    });

    test("page: hovering an event shows a preview over the Post section", function () {
      const box = hourBlock("Club Fair");
      const preview = find("#hover-preview");
      assert(preview.hidden, "preview showing before hover");
      box.dispatchEvent(new win.MouseEvent("mouseenter"));
      assert(!preview.hidden, "preview didn't appear");
      assertEqual(find("#preview-name").textContent, "Club Fair");
      assert(find("#preview-when").textContent.includes("4:00 PM – 6:00 PM"), "time missing");
      assertEqual(find("#preview-location").textContent, "Student Center Lobby");
      const panel = find(".post-panel").getBoundingClientRect();
      const shown = preview.getBoundingClientRect();
      assert(Math.abs(shown.top - panel.top) < 2 && Math.abs(shown.height - panel.height) < 3,
        "preview should cover the Post section");
      box.dispatchEvent(new win.MouseEvent("mouseleave"));
      assert(preview.hidden, "preview didn't go away");
    });

    test("page: clicking an hourly event opens its details", function () {
      hourBlock("Club Fair").click();
      assert(find("#event-dialog").open, "details didn't open");
      assertEqual(find("#dialog-name").textContent, "Club Fair");
      find("#event-dialog").close();
      find("#week-view-button").click();
    });

    test("page: posting with an end time shows it; posting too late is blocked", function () {
      type("#post-form [name=name]", "Test Late Event");
      type("#post-form [name=location]", "Test Hall");
      type("#post-form [name=date]", toDateString(new Date()));
      type("#post-form [name=time]", "22:30");
      find("#post-form").requestSubmit();
      assertEqual(find("#post-errors").textContent, "Events must start between 7:00 AM and 10:00 PM.");

      type("#post-form [name=time]", "20:00");
      type("#post-form [name=endTime]", "21:15");
      find("#post-form").requestSubmit();
      assertEqual(findAll("#post-errors li").length, 0, "errors shown");
      assert(find("#week-grid").textContent.includes("8:00 PM – 9:15 PM"), "end time not on the week card");
      assertEqual(find("#post-form [name=endTime]").value, "", "end time not cleared");
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
