// Bell schedules, transcribed from the original rhemangtimer.vercel.app source.
// Each bell: [24h time "HH:MM:SS", sound, toast message, recording cue?]
//
// The optional fourth value is the recording-reminder cue layered on top of the
// timer. It does not change the bell at all:
//   "start" -> red "START RECORDING NOW" alert when the session begins
//   "stop"  -> amber "STOP RECORDING NOW" alert when the break begins
// Warning bells and "Close Meeting" intentionally have no cue.

const W = "warning";
const F = "final";

const nightBells = [
  // Session 1
  ["17:00:00", W, "Start Session 1", "start"],
  ["17:40:00", W, "Session 1: Warning Bell to Break Time"],
  ["17:50:00", F, "Session 1: Final Bell to Break Time", "stop"],
  // Session 2
  ["17:55:00", F, "Start Session 2", "start"],
  ["18:35:00", W, "Session 2: Warning Bell to Break Time"],
  ["18:45:00", F, "Session 2: Final Bell to Break Time", "stop"],
  // Session 3
  ["19:05:00", F, "Start Session 3", "start"],
  ["19:35:00", W, "Session 3: Warning Bell to Break Time"],
  ["19:45:00", F, "Session 3: Final Bell to Break Time", "stop"],
  // Session 4
  ["19:50:00", F, "Start Session 4", "start"],
  ["20:20:00", W, "Session 4: Warning Bell to Closing Time"],
  ["20:30:00", F, "Session 4: Final Bell to Closing Time", "stop"],
  // Close meeting
  ["20:40:00", F, "Close Meeting"],
];

const nightTable = [
  ["5.00 - 5.50pm", "Session 1"],
  ["5.50 - 5.55pm", "5 Minute break"],
  ["5.55 - 6.45pm", "Session 2"],
  ["6.45 - 7.05pm", "20 Minute break"],
  ["7.05 - 7.45pm", "Session 3"],
  ["7.45 - 7.50pm", "5 Minute break"],
  ["7.50 - 8.30pm", "Session 4"],
  ["8.30 - 8.40pm", "Notices"],
];

const dayBells = [
  ["08:00:00", W, "Prayer session", "start"],
  ["08:20:00", F, "Final Bell", "stop"],
  // Session 5
  ["08:30:00", W, "Break Over, Start Session", "start"],
  ["09:10:00", W, "Warning Bell"],
  ["09:20:00", F, "Final Bell", "stop"],
  // Session 6
  ["09:30:00", W, "Break Over, Start Session", "start"],
  ["10:10:00", W, "Warning Bell"],
  ["10:20:00", F, "Final Bell", "stop"],
  // Session 7
  ["10:40:00", W, "Break Over, Start Session", "start"],
  ["11:10:00", W, "Warning Bell"],
  ["11:20:00", F, "Final Bell", "stop"],
  // Session 8
  ["11:30:00", W, "Break Over, Start Session", "start"],
  ["12:10:00", W, "Warning Bell"],
  ["12:20:00", F, "Final Bell", "stop"],
  // Session 9
  ["13:30:00", W, "Break Over, Start Session", "start"],
  ["14:10:00", W, "Warning Bell"],
  ["14:20:00", F, "Final Bell", "stop"],
  // Session 10
  ["14:30:00", W, "Break Over, Start Session", "start"],
  ["15:10:00", W, "Warning Bell"],
  ["15:20:00", F, "Final Bell", "stop"],
  // Session 11
  ["15:40:00", W, "Break Over, Start Session", "start"],
  ["16:10:00", W, "Warning Bell"],
  ["16:20:00", F, "Final Bell", "stop"],
  // Session 12
  ["16:30:00", W, "Break Over, Start Session", "start"],
  ["17:10:00", W, "Warning Bell"],
  ["17:20:00", F, "Final Bell", "stop"],
  // Close meeting
  ["17:30:00", F, "Close Meeting"],
];

const dayTable = [
  ["8.00 - 8.20am", "Prayer"],
  ["8.20 - 8.30am", "10 Minute break"],
  ["8.30 - 9.20am", "Session 5"],
  ["9.20 - 9.30am", "10 Minute break"],
  ["9.30 - 10.20am", "Session 6"],
  ["10.20 - 10.40am", "20 Minute break"],
  ["10.40 - 11.20am", "Session 7"],
  ["11.20 - 11.30am", "10 Minute break"],
  ["11.30 - 12.20pm", "Session 8"],
  ["12.20 - 1.30pm", "Lunch break"],
  ["1.30 - 2.20pm", "Session 9"],
  ["2.20 - 2.30pm", "10 Minute break"],
  ["2.30 - 3.20pm", "Session 10"],
  ["3.20 - 3.40pm", "20 Minute break"],
  ["3.40 - 4.20pm", "Session 11"],
  ["4.20 - 4.30pm", "10 Minute break"],
  ["4.30 - 5.20pm", "Session 12"],
  ["5.20 - 5.30pm", "Notices"],
];

const toBells = (rows) =>
  rows.map(([time, sound, message, recording = null]) => ({ time, sound, message, recording }));
const toTable = (rows) => rows.map(([time, event]) => ({ time, event }));

const night = { bells: toBells(nightBells), table: toTable(nightTable) };
const day = { bells: toBells(dayBells), table: toTable(dayTable) };

// Pages, keyed by id. Matches the original sidebar menu and routes.
export const pages = {
  sunday: { title: "Sunday", heading: "Level 1 - Night Class", ...night },
  monday: { title: "Monday", heading: "Level 1 - Night Class", ...night },
  tuesday: { title: "Tuesday", heading: "Level 1 - Night Class", ...night },
  friday: { title: "Friday", heading: "Level 1 - Weekend Class", ...night },
  saturday: { title: "Saturday", heading: "Level 1 - Weekend Class", ...day },
};

export const menu = [
  { id: "home", title: "Home", icon: "home" },
  { title: "Level 1 Night", icon: "alarmFill", children: ["sunday", "monday", "tuesday"] },
  { title: "Level 1 Weekend", icon: "alarm", children: ["friday", "saturday"] },
];

export const toSeconds = (hms) => {
  const [h, m, s] = hms.split(":").map(Number);
  return h * 3600 + m * 60 + s;
};
