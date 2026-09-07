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
 * True once this round's scheduled moment has arrived or passed.
 *
 * The round is skipped when its scheduled moment falls before the committee
 * begins. Without that check, creating a committee on the 7th with a draw day of
 * the 5th fired a draw immediately — for a round that pre-dated the committee.
 * Catch-up within a round is deliberate, so a draw missed while the server was
 * down still runs; reaching back before the committee started is not.
 */
const isDue = (committee, date = new Date()) => {
    const start = committee.startDate ? new Date(committee.startDate) : null;

    if (start && date < start) return false;

    const scheduled = scheduledInstantFor(committee, date);
    if (start && scheduled < start) return false;

    return date >= scheduled;
};

/**
 * Milliseconds until the next scheduled withdrawal. Used by the UI countdown so
 * the clock on screen refers to the moment the server will actually act.
 */
const msUntilNext = (committee, date = new Date()) => {
    const tz = committeeTimezone(committee);
    const hour = committee.withdrawHour ?? DEFAULT_HOUR;
    const minute = committee.withdrawMinute ?? DEFAULT_MINUTE;

    const start = committee.startDate ? new Date(committee.startDate) : null;

    // Step forward a month at a time until a scheduled instant lies ahead, and
    // skip any that fall before the committee begins.
    for (let offset = 0; offset <= 13; offset += 1) {
        const { year, month } = zonedParts(date, tz);
        const probeMonth = month + offset;
        const probeYear = year + Math.floor((probeMonth - 1) / 12);
        const normalisedMonth = ((probeMonth - 1) % 12) + 1;

        const daysInMonth = new Date(Date.UTC(probeYear, normalisedMonth, 0)).getUTCDate();
        const day = Math.min(committee.withdrawDay || 1, daysInMonth);

        const instant = instantForZonedTime(
            { year: probeYear, month: normalisedMonth, day, hour, minute },
            tz
        );
        if (instant > date && (!start || instant >= start)) return instant - date;
    }
    return 0;
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
    isDue,
    scheduledInstantFor,
    msUntilNext,
    instantForZonedTime,
};
