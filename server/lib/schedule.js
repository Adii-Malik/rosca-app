// lib/schedule.js
// Working out "the 10th at 15:00 in Asia/Karachi" correctly matters here: the
// server may run in UTC while the committee is in Pakistan, and a draw that
// fires on the wrong calendar day is a real problem. Intl gives us the zone
// arithmetic without pulling in a date library.

const DEFAULT_TIMEZONE = 'Asia/Karachi';
const DEFAULT_HOUR = 15;
const DEFAULT_MINUTE = 0;

/** Calendar fields of `date` as seen in `timeZone`. */
const zonedParts = (date, timeZone = DEFAULT_TIMEZONE) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).formatToParts(date);

    const get = (type) => Number(parts.find((p) => p.type === type).value);
    return {
        year: get('year'),
        month: get('month'), // 1-12
        day: get('day'),
        hour: get('hour') % 24, // 'en-CA' can render midnight as 24
        minute: get('minute'),
    };
};

/**
 * Identifies the round a date falls in, e.g. "2026-09". Draw records carry this
 * so "has this committee drawn this month?" is an exact match rather than a
 * date-range comparison that shifts with the server's timezone.
 */
const periodKeyFor = (date, timeZone = DEFAULT_TIMEZONE) => {
    const { year, month } = zonedParts(date, timeZone);
    return `${year}-${String(month).padStart(2, '0')}`;
};

const committeeTimezone = (committee) => committee?.timezone || DEFAULT_TIMEZONE;

/**
 * The scheduled withdrawal moment for the month `date` falls in, expressed in
 * the committee's own calendar. Returns zone-local fields, not an instant —
 * comparisons happen field-wise so no UTC conversion is needed.
 */
const scheduledFieldsFor = (committee, date = new Date()) => {
    const tz = committeeTimezone(committee);
    const { year, month } = zonedParts(date, tz);

    // A committee set to withdraw on the 31st still needs to fire in February.
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const day = Math.min(committee.withdrawDay || 1, daysInMonth);

    return {
        year,
        month,
        day,
        hour: committee.withdrawHour ?? DEFAULT_HOUR,
        minute: committee.withdrawMinute ?? DEFAULT_MINUTE,
    };
};

/**
 * The scheduled moment for the round `date` falls in, as an absolute instant.
 */
const scheduledInstantFor = (committee, date = new Date()) =>
    instantForZonedTime(scheduledFieldsFor(committee, date), committeeTimezone(committee));

/**
 * The period a round belongs to, counted from the committee's first month.
 *
 * Rounds are positions in the term, not "whatever month it happens to be".
 * A round that could not be drawn on its day — nobody had finished paying in,
 * say — is still that round afterwards, so it waits rather than being lost when
 * the calendar moves on. Round 1 is always the committee's start month, which
 * is a payout month like any other.
 */
const periodKeyForRound = (committee, roundNumber) => {
    const { year, month } = zonedParts(new Date(committee.startDate), committeeTimezone(committee));
    const index = month - 1 + (roundNumber - 1);
    return `${year + Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
};

/** The instants bounding a period's calendar month, in the committee's zone. */
const periodBounds = (periodKey, timeZone = DEFAULT_TIMEZONE) => {
    const [year, month] = periodKey.split('-').map(Number);
    const at = (y, m) => instantForZonedTime({ year: y, month: m, day: 1, hour: 0, minute: 0 }, timeZone);
    return {
        start: at(year, month),
        end: month === 12 ? at(year + 1, 1) : at(year, month + 1),
    };
};

/**
 * The round's own scheduled moment — its configured day and time in its month,
 * with no regard for when the committee began. This is the announced time, the
 * one members are told to watch.
 */
const scheduledInstantForRound = (committee, roundNumber) => {
    const [year, month] = periodKeyForRound(committee, roundNumber).split('-').map(Number);

    // A committee set to withdraw on the 31st still needs to fire in February.
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

    return instantForZonedTime(
        {
            year,
            month,
            day: Math.min(committee.withdrawDay || 1, daysInMonth),
            hour: committee.withdrawHour ?? DEFAULT_HOUR,
            minute: committee.withdrawMinute ?? DEFAULT_MINUTE,
        },
        committeeTimezone(committee)
    );
};

/**
 * The moment a round may be drawn at all: its scheduled moment, but never before
 * the committee itself begins.
 *
 * The clamp is what makes the start month count. A committee created on the 7th
 * with a draw day of the 5th used to skip its first round entirely — the
 * scheduled moment had already passed, so the round was treated as belonging to
 * a time before the committee existed. That round is now simply drawable from
 * the start date onwards.
 */
const dueAtForRound = (committee, roundNumber) => {
    const scheduled = scheduledInstantForRound(committee, roundNumber);
    const start = committee.startDate ? new Date(committee.startDate) : null;
    return start && scheduled < start ? start : scheduled;
};

/** True once the round may be drawn. Overdue rounds stay drawable. */
const roundIsDue = (committee, roundNumber, date = new Date()) =>
    date >= dueAtForRound(committee, roundNumber);

/**
 * When, if ever, the server should run this round unattended — or null if it
 * should not.
 *
 * Being *allowed* to draw and being drawn *automatically* are different things.
 * A draw is an event members are told to watch, so the server runs one only at
 * the announced moment. A round whose announced moment falls before the
 * committee started never had one, and a round drawn hours or days late because
 * the money arrived late has already missed it — firing then would spring a
 * draw on an empty room, the moment an admin happened to record the last
 * payment. Those are left for an admin to run when everyone is present.
 */
const autoDrawInstantFor = (committee, roundNumber) => {
    const scheduled = scheduledInstantForRound(committee, roundNumber);
    const start = committee.startDate ? new Date(committee.startDate) : null;
    return start && scheduled < start ? null : scheduled;
};

/**
 * Converts zone-local calendar fields to a UTC instant. Guessing from UTC and
 * correcting by the observed offset resolves DST without a tz database.
 */
const instantForZonedTime = ({ year, month, day, hour, minute }, timeZone) => {
    const guess = Date.UTC(year, month - 1, day, hour, minute, 0);
    const seen = zonedParts(new Date(guess), timeZone);
    const seenAsUtc = Date.UTC(seen.year, seen.month - 1, seen.day, seen.hour, seen.minute, 0);
    return new Date(guess - (seenAsUtc - guess));
};

module.exports = {
    DEFAULT_TIMEZONE,
    DEFAULT_HOUR,
    DEFAULT_MINUTE,
    zonedParts,
    periodKeyFor,
    committeeTimezone,
    scheduledFieldsFor,
    scheduledInstantFor,
    periodKeyForRound,
    periodBounds,
    scheduledInstantForRound,
    dueAtForRound,
    roundIsDue,
    autoDrawInstantFor,
    instantForZonedTime,
};
