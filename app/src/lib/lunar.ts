// The Vietnamese lunar calendar (âm lịch), worked out on the TV with no network: new moons and solar terms from the usual astronomical
// series (Jean Meeus, Astronomical Algorithms), at Vietnam's time zone (UTC+7), following Hồ Ngọc Đức's published method. A month starts on
// the day of its new moon; the 11th month holds the winter solstice; in a year with 13 months, the first month with no major solar term is
// the leap one. Right for 1900-2100, which is all a home screen needs.

const TZ = 7;

export interface LunarDate {
	day: number;
	month: number;
	year: number;
	leap: boolean;
}

/** Julian day number of a Gregorian date. */
function jdFromDate (dd: number, mm: number, yy: number): number {
	const a = Math.floor((14 - mm) / 12);
	const y = yy + 4800 - a;
	const m = mm + 12 * a - 3;
	return dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

/** Day number of the k-th new moon after 1 Jan 1900 (local time). */
function newMoonDay (k: number): number {
	const T = k / 1236.85;
	const T2 = T * T, T3 = T2 * T;
	const dr = Math.PI / 180;
	let jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
	jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
	const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;      // sun's mean anomaly
	const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;   // moon's mean anomaly
	const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;      // moon's argument of latitude
	let C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
	C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
	C1 = C1 - 0.0004 * Math.sin(dr * 3 * Mpr);
	C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
	C1 = C1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
	C1 = C1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
	C1 = C1 + 0.0010 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
	const deltat = T < -11 ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3 : -0.000278 + 0.000265 * T + 0.000262 * T2;
	return Math.floor(jd1 + C1 - deltat + 0.5 + TZ / 24);
}

/** Which of the 12 major solar terms (0-11, 30° of the sun's longitude each) the day falls in. */
function sunLongitude (dayNumber: number): number {
	const T = (dayNumber - 2451545.5 - TZ / 24) / 36525;
	const T2 = T * T;
	const dr = Math.PI / 180;
	const M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
	const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
	let DL = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
	DL = DL + (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.000290 * Math.sin(dr * 3 * M);
	let L = (L0 + DL) * dr;
	L = L - Math.PI * 2 * Math.floor(L / (Math.PI * 2));
	return Math.floor(L / Math.PI * 6);
}

/** The first day of the 11th lunar month of a Gregorian year (the month with the winter solstice). */
function lunarMonth11 (yy: number): number {
	const off = jdFromDate(31, 12, yy) - 2415021;
	const k = Math.floor(off / 29.530588853);
	let nm = newMoonDay(k);
	if (sunLongitude(nm) >= 9) nm = newMoonDay(k - 1);
	return nm;
}

/** In a 13-month year, how many months after month 11 the leap month comes. */
function leapMonthOffset (a11: number): number {
	const k = Math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5);
	let last = 0;
	let i = 1;
	let arc = sunLongitude(newMoonDay(k + i));
	do {
		last = arc;
		i++;
		arc = sunLongitude(newMoonDay(k + i));
	} while (arc !== last && i < 14);
	return i - 1;
}

/** The lunar date of a Gregorian date (day, month 1-12, year). */
export function toLunar (dd: number, mm: number, yy: number): LunarDate {
	const dayNumber = jdFromDate(dd, mm, yy);
	const k = Math.floor((dayNumber - 2415021.076998695) / 29.530588853);
	let monthStart = newMoonDay(k + 1);
	if (monthStart > dayNumber) monthStart = newMoonDay(k);
	let a11 = lunarMonth11(yy);
	let b11 = a11;
	let year: number;
	if (a11 >= monthStart) {
		year = yy;
		a11 = lunarMonth11(yy - 1);
	} else {
		year = yy + 1;
		b11 = lunarMonth11(yy + 1);
	}
	const day = dayNumber - monthStart + 1;
	const diff = Math.floor((monthStart - a11) / 29);
	let leap = false;
	let month = diff + 11;
	if (b11 - a11 > 365) {
		const leapDiff = leapMonthOffset(a11);
		if (diff >= leapDiff) {
			month = diff + 10;
			if (diff === leapDiff) leap = true;
		}
	}
	if (month > 12) month -= 12;
	if (month >= 11 && diff < 4) year -= 1;
	return {day, month, year, leap};
}

/** The day number of Tết (1/1 lunar) in a Gregorian year: it always falls between 21 January and 20 February. */
function tetDayNumber (yy: number): number {
	for (let d = 21; d <= 51; d++) {
		const mm = d > 31 ? 2 : 1, dd = d > 31 ? d - 31 : d;
		const l = toLunar(dd, mm, yy);
		if (l.day === 1 && l.month === 1 && !l.leap) return jdFromDate(dd, mm, yy);
	}
	return 0;
}

/** Lunar holidays, by "day/month". */
const HOLIDAYS: Record<string, string> = {
	'1/1': 'Mùng 1 Tết', '2/1': 'Mùng 2 Tết', '3/1': 'Mùng 3 Tết', '15/1': 'Rằm tháng Giêng', '10/3': 'Giỗ Tổ Hùng Vương',
	'15/4': 'Lễ Phật Đản', '5/5': 'Tết Đoan Ngọ', '15/7': 'Lễ Vu Lan', '15/8': 'Tết Trung Thu', '23/12': 'Ông Công Ông Táo'
};
/** how many days before Tết the countdown shows */
const TET_COUNTDOWN_DAYS = 30;

/** The lunar line for the home screen: "9/9 âm lịch", then a holiday's name on its day, and a countdown in the month before Tết. */
export function lunarText (date = new Date()): string {
	const dd = date.getDate(), mm = date.getMonth() + 1, yy = date.getFullYear();
	const l = toLunar(dd, mm, yy);
	const holiday = l.leap ? '' : HOLIDAYS[`${l.day}/${l.month}`];
	const parts = [`${l.day}/${l.month}${l.leap ? ' nhuận' : ''} âm lịch`];
	if (holiday) parts.push(holiday);
	const today = jdFromDate(dd, mm, yy);
	let tet = tetDayNumber(yy);
	if (tet <= today) tet = tetDayNumber(yy + 1);
	const left = tet - today;
	if (tet && left > 0 && left <= TET_COUNTDOWN_DAYS) parts.push(`còn ${left} ngày đến Tết`);
	return parts.join(' · ');
}
