// Demo events used when Google Calendar API is not yet connected
// Each event has: id, title, start, end, person (1 or 2), color, description

const now = new Date();
const year = now.getFullYear();
const month = now.getMonth();

function d(day, hour = 0, minute = 0) {
  return new Date(year, month, day, hour, minute).toISOString();
}

export const PERSON_1 = { name: 'You', color: 'accent-1' };
export const PERSON_2 = { name: 'Partner', color: 'accent-2' };

export const demoEvents = [
  {
    id: '1',
    title: 'Team standup',
    start: d(now.getDate(), 9, 30),
    end: d(now.getDate(), 10, 0),
    person: PERSON_1,
    description: 'Daily sync',
  },
  {
    id: '2',
    title: 'Lunch together',
    start: d(now.getDate(), 12, 30),
    end: d(now.getDate(), 13, 30),
    person: PERSON_2,
    description: 'At the usual place',
  },
  {
    id: '3',
    title: 'Dentist appointment',
    start: d(now.getDate() + 1, 14, 0),
    end: d(now.getDate() + 1, 15, 0),
    person: PERSON_1,
    description: 'Regular checkup',
  },
  {
    id: '4',
    title: 'Movie night',
    start: d(now.getDate() + 2, 19, 0),
    end: d(now.getDate() + 2, 21, 30),
    person: PERSON_2,
    description: 'Pick a movie!',
  },
  {
    id: '5',
    title: 'Grocery shopping',
    start: d(now.getDate() + 3, 10, 0),
    end: d(now.getDate() + 3, 11, 0),
    person: PERSON_1,
    description: 'Weekly groceries',
  },
  {
    id: '6',
    title: 'Yoga class',
    start: d(now.getDate() + 1, 7, 0),
    end: d(now.getDate() + 1, 8, 0),
    person: PERSON_2,
    description: 'Morning yoga',
  },
  {
    id: '7',
    title: 'Project deadline',
    start: d(now.getDate() + 5, 17, 0),
    end: d(now.getDate() + 5, 17, 0),
    person: PERSON_1,
    description: 'Submit final report',
  },
  {
    id: '8',
    title: 'Date night',
    start: d(now.getDate() + 4, 19, 0),
    end: d(now.getDate() + 4, 22, 0),
    person: PERSON_2,
    description: 'Dinner reservation',
  },
  {
    id: '9',
    title: 'Call with client',
    start: d(now.getDate(), 15, 0),
    end: d(now.getDate(), 16, 0),
    person: PERSON_1,
    description: 'Quarterly review',
  },
  {
    id: '10',
    title: 'Gym',
    start: d(now.getDate() + 2, 7, 0),
    end: d(now.getDate() + 2, 8, 30),
    person: PERSON_1,
    description: 'Leg day',
  },
];
