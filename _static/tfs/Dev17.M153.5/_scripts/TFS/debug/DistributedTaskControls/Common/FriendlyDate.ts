// Copyright (c) Microsoft Corporation.  All rights reserved.
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { localeFormat, dateToString, empty, format } from "VSS/Utils/String";
import * as UtilsDate from "VSS/Utils/Date";

export interface IFriendlyFormat {
    text: string;
    conjunction: string;
}

export interface IDateStep {
    differenceLimit: number;
    format: (date: Date, diffInSeconds: number) => IFriendlyFormat;
}

export enum PastDateMode {
    none = "none",
    ago = "ago",
    since = "since"
}

export interface IHTMLStringDetails {
    html: string;
    tooltip: string;
    useStrongFont?: boolean;
}

export class FriendlyDate {

    constructor(private _date: Date,
        private _mode?: PastDateMode,
        private _useConjunction?: boolean,
        private _now?: Date,
        private _doNotUseLocaleFormat?: boolean,
        private _useStrongFont?: boolean,
        customStepsForDateInPast?: IDateStep[],
        customStepsForDateInFuture?: IDateStep[],
        private _compact?: boolean) {

        this._now = this._now || new Date();
        this._useLocaleFormat = !this._doNotUseLocaleFormat;
        this._mode = this._mode || PastDateMode.ago;

        this._initializeSteps(customStepsForDateInPast, customStepsForDateInFuture);

        this._differenceInSeconds = (this._now.getTime() - this._date.getTime()) / FriendlyDate.c_milliSecondsInASecond;
        let steps: IDateStep[];

        if (this._differenceInSeconds >= 0) {
            steps = this._stepsForDateInPast;
        }
        else {
            steps = this._stepsForDateInFuture;
            this._differenceInSeconds = Math.abs(this._differenceInSeconds);
        }

        for (const step of steps) {
            if (this._differenceInSeconds < step.differenceLimit) {
                const friendlyFormat = step.format(this._date, this._differenceInSeconds);
                const displayFormat = this._useStrongFont ? "<strong><span title='{0}'>{1}</span></strong>" : "<span title='{0}'>{1}</span>";
                const friendlyHtmlTime = friendlyFormat.text ? localeFormat(displayFormat, UtilsDate.localeFormat(this._date, "F"), friendlyFormat.text) : empty;
                if (friendlyHtmlTime && this._useConjunction && friendlyFormat.conjunction) {
                    this._friendlyString = localeFormat(Resources.ConjunctionWithFriendlyDateFormat, friendlyFormat.conjunction, friendlyFormat.text);
                    this._friendlyHtml = localeFormat(Resources.ConjunctionWithFriendlyDateFormat, friendlyFormat.conjunction, friendlyHtmlTime);
                }
                else {
                    this._friendlyString = friendlyFormat.text;
                    this._friendlyHtml = friendlyHtmlTime;
                }

                this._friendlyDateDetails = {
                    html: this._friendlyString,
                    tooltip: UtilsDate.localeFormat(this._date, "F"),
                    useStrongFont: !!this._useStrongFont
                };

                break;
            }
        }
    }

    public toString(): string {
        return this._friendlyString;
    }

    public toHtml(): string {
        return this._friendlyHtml;
    }

    public getDetails(): IHTMLStringDetails {
        return this._friendlyDateDetails;
    }

    private _initializeSteps(customStepsForDateInPast: IDateStep[], customStepsForDateInFuture: IDateStep[]): void {

        const oneMinute = 60;
        const oneHour = 60 * 60;
        const oneDay = 24 * 60 * 60;
        const oneYear = 365 * oneDay;

        const secondsSinceStartOfToday = this._getSecondsSinceStartOfToday();
        const secondsSinceStartOfYesterday = this._getSecondsSinceStartOfYesterday();
        const secondsSinceStartOfCurrentYear = this._getSecondsSinceStartOfCurrentYear();
        const secondsSinceStartOfSixthDayBefore = this._getSecondsSinceStartOfSixthDayBefore();

        this._stepsForDateInPast = customStepsForDateInPast ? customStepsForDateInPast : [
            {
                differenceLimit: oneMinute,
                format: (date: Date, diffInSeconds: number) => {
                    return { text: empty, conjunction: empty };
                },
                conjunction: empty
            },
            {
                differenceLimit: oneHour,
                format: (date: Date, diffInSeconds: number) => {
                    const roundedMintes = Math.floor(diffInSeconds / oneMinute);
                    if (this._mode === PastDateMode.since) {
                        return {
                            text: localeFormat((this._compact ? Resources.ForMinutesCompactFormat : (roundedMintes === 1 ? Resources.ForMinutesSingluarFormat : Resources.ForMinutesPluralFormat)), roundedMintes),
                            conjunction: Resources.ForConjunctionInFriendlyDate
                        };
                    }
                    else {
                        return {
                            text: localeFormat((this._compact ? Resources.MinutesAgoCompactFormat : (roundedMintes === 1 ? Resources.MinutesAgoSingularFormat : Resources.MinutesAgoPluralFormat)), roundedMintes),
                            conjunction: empty
                        };
                    }
                },
            },
            {
                differenceLimit: oneDay,
                format: (date: Date, diffInSeconds: number) => {
                    const roundedHours = Math.floor(diffInSeconds / oneHour);
                    if (this._mode === PastDateMode.since) {
                        const format = roundedHours === 1 ? Resources.ForHoursSingularFormat : Resources.ForHoursFormat;
                        return {
                            text: localeFormat((this._compact ? Resources.ForHoursCompactFormat : format), roundedHours),
                            conjunction: Resources.ForConjunctionInFriendlyDate
                        };
                    }
                    else {
                        const format = roundedHours === 1 ? Resources.HoursAgoSingularFormat : Resources.HoursAgoFormat;
                        return {
                            text: localeFormat((this._compact ? Resources.HoursAgoCompactFormat : format), roundedHours),
                            conjunction: empty
                        };
                    }
                }
            },
            {
                differenceLimit: oneYear,
                format: (date: Date, diffInSeconds: number) => {
                    const dayOfTheWeek = FriendlyDate.c_dayOfTheWeekList[date.getDay()];
                    const roundedDays = Math.floor(diffInSeconds / oneDay);
                    if (this._mode === PastDateMode.since) {
                        const format = roundedDays === 1 ? Resources.ForDaysSingularFormat : Resources.ForDaysFormat;
                        return {
                            text: localeFormat((this._compact ? Resources.ForDaysCompactFormat : format), roundedDays),
                            conjunction: Resources.ForConjunctionInFriendlyDate
                        };
                    }
                    else {
                        const format = roundedDays === 1 ? Resources.DaysAgoSingularFormat : Resources.DaysAgoFormat;
                        return {
                            text: localeFormat((this._compact ? Resources.DaysAgoCompactFormat : format), roundedDays),
                            conjunction: empty
                        };
                    }
                }
            },
            {
                differenceLimit: Number.POSITIVE_INFINITY,
                format: (date: Date, diffInSeconds: number) => {
                    const roundedYears = Math.floor(diffInSeconds / oneYear);
                    if (this._mode === PastDateMode.since) {
                        const format = roundedYears === 1 ? Resources.ForYearsSingularFormat : Resources.ForYearsFormat;
                        return {
                            text: localeFormat((this._compact ? Resources.ForYearsCompactFormat : format), roundedYears),
                            conjunction: Resources.ForConjunctionInFriendlyDate
                        };
                    }
                    else {
                        const format = roundedYears === 1 ? Resources.YearsAgoSingularFormat : Resources.YearsAgoFormat;
                        return {
                            text: localeFormat((this._compact ? Resources.YearsAgoCompactFormat : format), roundedYears),
                            conjunction: empty
                        };
                    }
                }
            }
        ];

        const secondsTillEndOfToday = this._getSecondsTillEndOfToday();
        const secondsTillEndOfTomorrow = this._getSecondsTillEndOfTomorrow();
        const secondsTillEndOfCurrentYear = this._getSecondsTillEndOfCurrentYear();
        const secondsTillEndOfSixthDayAfter = this._getSecondsTillEndOfSixthDayAfter();

        this._stepsForDateInFuture = customStepsForDateInFuture ? customStepsForDateInFuture : [
            {
                differenceLimit: oneMinute,
                format: (date: Date, diffInSeconds: number) => {
                    return { text: empty, conjunction: empty };
                }
            },
            {
                differenceLimit: secondsTillEndOfToday,
                format: (date: Date, diffInSeconds: number) => {
                    return {
                        text: localeFormat(Resources.TodayFormat, dateToString(date, this._useLocaleFormat, "t")),
                        conjunction: Resources.ForConjunctionInFriendlyDate
                    };
                }
            },
            {
                differenceLimit: secondsTillEndOfTomorrow,
                format: (date: Date, diffInSeconds: number) => {
                    return {
                        text: localeFormat(Resources.TomorrowFormat, dateToString(date, this._useLocaleFormat, "t")),
                        conjunction: Resources.ForConjunctionInFriendlyDate
                    };
                }
            },
            {
                differenceLimit: secondsTillEndOfSixthDayAfter,
                format: (date: Date, diffInSeconds: number) => {
                    const dayOfTheWeek = FriendlyDate.c_dayOfTheWeekList[date.getDay()];
                    return {
                        text: localeFormat(Resources.SevenDaysFormat, dayOfTheWeek, dateToString(date, this._useLocaleFormat, "t")),
                        conjunction: Resources.ForConjunctionInFriendlyDate
                    };
                }
            },
            {
                differenceLimit: secondsTillEndOfCurrentYear,
                format: (date: Date, diffInSeconds: number) => {
                    return {
                        text: dateToString(date, this._useLocaleFormat, "MMM d"),
                        conjunction: Resources.ForConjunctionInFriendlyDate
                    };
                }
            },
            {
                differenceLimit: Number.POSITIVE_INFINITY,
                format: (date: Date, diffInSeconds: number) => {
                    return {
                        text: dateToString(date, this._useLocaleFormat, "MMM d, yyyy"),
                        conjunction: Resources.ForConjunctionInFriendlyDate
                    };
                }
            }
        ];
    }

    private _getSecondsSinceStartOfToday(): number {
        let startOfToday = new Date(this._now);
        startOfToday.setHours(0, 0, 0, 0);
        return (this._now.getTime() - startOfToday.getTime()) / FriendlyDate.c_milliSecondsInASecond + 1;
    }

    private _getSecondsSinceStartOfYesterday(): number {
        let startOfYesterday = new Date(this._now);
        startOfYesterday.setDate(startOfYesterday.getDate() - 1);
        startOfYesterday.setHours(0, 0, 0, 0);

        return (this._now.getTime() - startOfYesterday.getTime()) / FriendlyDate.c_milliSecondsInASecond + 1;
    }

    private _getSecondsSinceStartOfCurrentYear(): number {
        let startOfTheYear = new Date(this._now);
        startOfTheYear.setMonth(0);
        startOfTheYear.setDate(1);
        startOfTheYear.setHours(0, 0, 0, 0);

        return (this._now.getTime() - startOfTheYear.getTime()) / FriendlyDate.c_milliSecondsInASecond + 1;
    }

    private _getSecondsSinceStartOfSixthDayBefore(): number {
        let startOfSixDayBefore = new Date(this._now);
        startOfSixDayBefore.setDate(startOfSixDayBefore.getDate() - 6);
        startOfSixDayBefore.setHours(0, 0, 0, 0);

        return (this._now.getTime() - startOfSixDayBefore.getTime()) / FriendlyDate.c_milliSecondsInASecond + 1;
    }

    private _getSecondsTillEndOfToday(): number {
        let endOfToday = new Date(this._now);
        endOfToday.setHours(23, 59, 59, 999);
        return (endOfToday.getTime() - this._now.getTime()) / FriendlyDate.c_milliSecondsInASecond;
    }

    private _getSecondsTillEndOfTomorrow(): number {
        let endOfTomorrow = new Date(this._now);
        endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);
        endOfTomorrow.setHours(23, 59, 59, 999);

        return (endOfTomorrow.getTime() - this._now.getTime()) / FriendlyDate.c_milliSecondsInASecond;
    }

    private _getSecondsTillEndOfCurrentYear(): number {
        let endOfCurrentYear = new Date(this._now);
        endOfCurrentYear.setMonth(11);
        endOfCurrentYear.setDate(31);
        endOfCurrentYear.setHours(23, 59, 59, 999);

        return (endOfCurrentYear.getTime() - this._now.getTime()) / FriendlyDate.c_milliSecondsInASecond;
    }

    private _getSecondsTillEndOfSixthDayAfter(): number {
        let startOfSixDayBefore = new Date(this._now);
        startOfSixDayBefore.setDate(startOfSixDayBefore.getDate() + 6);
        startOfSixDayBefore.setHours(23, 59, 59, 999);

        return (startOfSixDayBefore.getTime() - this._now.getTime()) / FriendlyDate.c_milliSecondsInASecond;
    }

    private _stepsForDateInPast: IDateStep[] = [];
    private _stepsForDateInFuture: IDateStep[] = [];
    private _differenceInSeconds: number = 0;
    private _friendlyString: string;
    private _friendlyHtml: string;
    private _friendlyDateDetails: IHTMLStringDetails;
    private _useLocaleFormat: boolean = true;

    private static readonly c_milliSecondsInASecond = 1000;
    private static readonly c_dayOfTheWeekList: string[] = [
        Resources.Sunday,
        Resources.Monday,
        Resources.Tuesday,
        Resources.Wednesday,
        Resources.Thursday,
        Resources.Friday,
        Resources.Saturday
    ];
}