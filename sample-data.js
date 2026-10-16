// sample-data.js
// Made-up events so the calendar isn't empty. None of these are real.
//
// Instead of fixed dates, each event is placed a number of days from the
// start of the current week (day 0 = this Sunday, day 7 = next Sunday,
// day -3 = last Thursday). That way the demo always has events around
// "now", no matter when you open it.

const SAMPLE_EVENTS = [
  { day: -4, time: "19:00", name: "Movie Night on the Lawn", tone: "casual",
    location: "Front Lawn",
    description: "Bring a blanket. Popcorn provided while it lasts." },
  { day: -2, time: "10:00", name: "Fall Photo Walk", tone: "casual",
    location: "Meet at the Bell Tower",
    description: "A relaxed walk around campus for anyone with a camera or phone." },
  { day: 0, time: "15:00", name: "Board Game Afternoon", tone: "casual",
    location: "Dorm Lounge, Building C",
    description: "Classic and new board games. Snacks welcome." },
  { day: 1, time: "07:30", name: "Sunrise Prayer Walk", location: "Front Lawn",
    description: "A quiet walk to start the week together." },
  { day: 1, time: "12:00", name: "Résumé Review Drop-In", tone: "formal",
    location: "Career Center, Room 104",
    description: "Bring a printed résumé for quick feedback." },
  { day: 2, time: "18:30", name: "Intramural Volleyball Finals", location: "Rec Center, Court 2",
    description: "Come cheer on the final four teams." },
  { day: 3, time: "11:00", name: "Study Abroad Info Session", tone: "formal",
    location: "Library, Room 210",
    description: "Hear from students who spent a semester overseas." },
  { day: 3, time: "19:00", name: "Late-Night Study Hall", location: "Library, 2nd Floor",
    description: "Quiet tables, free coffee, and tutors on hand until 11 PM." },
  { day: 4, time: "16:00", name: "Club Fair", location: "Student Center Lobby",
    description: "Meet over 30 student clubs and sign up for the ones you like." },
  { day: 5, time: "20:00", name: "Open Mic Night", tone: "casual",
    location: "Student Center Coffee House",
    description: "Music, poetry, and comedy. Sign up at the door." },
  { day: 6, time: "09:00", name: "Service Saturday: Park Cleanup", location: "Meet at the Front Lawn",
    description: "Gloves and bags provided. Rides leave at 9:15." },
  { day: 6, time: "14:00", name: "Soccer Game vs. Riverside College", location: "Soccer Field",
    description: "Wear black and gold!" },
  { day: 9, time: "17:30", name: "Honors Council Pizza & Planning", tone: "casual",
    location: "Honors House",
    description: "Help plan next month's honors events. Pizza provided." },
  { day: 10, time: "13:00", name: "Guest Lecture: Building Apps with AI", tone: "formal",
    location: "Science Building, Room 120",
    description: "A (fictional) visiting speaker talks about AI-assisted programming." },
  { day: 12, time: "18:00", name: "Fall Festival", tone: "casual",
    location: "Front Lawn",
    description: "Food trucks, games, and live music." }
];

// Events without a tone use the default ("standard").
// Turns the list above into real events with real dates
function getSampleEvents(today) {
  const weekStart = startOfWeek(today);
  return SAMPLE_EVENTS.map(function (sample, index) {
    return {
      id: "sample-" + index,
      name: sample.name,
      location: sample.location,
      date: toDateString(addDays(weekStart, sample.day)),
      time: sample.time,
      description: sample.description,
      tone: sample.tone || DEFAULT_TONE,
      sample: true
    };
  });
}
