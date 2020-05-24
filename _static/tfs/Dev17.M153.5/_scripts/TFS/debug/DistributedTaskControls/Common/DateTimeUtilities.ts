interface IDateTime {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}

/**
 * @brief Set of Utility methods for date and time
 */
export class DateTimeUtilities {
    /**
     * @brief For given two dates, will return the diff in the format of HH:MM:SS 
     */
    public static getDateDiffFriendlyString(endDate: Date, startDate: Date): string {
        if (!endDate) {
            endDate = new Date();
        }
        if (!startDate) {
            startDate = new Date();
        }

        let friendlyString = "";
        let diffSeconds: number = Math.round(Math.abs(endDate.valueOf() - startDate.valueOf()) / this.MILLISECONDS_IN_ONE_SECOND);

        const hours: number = Math.floor(diffSeconds / this.SECONDS_IN_ONE_HOUR);

        // Show hours only when value is greater than 0
        if (hours > 0) {
            friendlyString += this._padWithZeroes(hours, 2) + this.TIME_SEPARATOR;
        }

        diffSeconds = diffSeconds - (hours * this.SECONDS_IN_ONE_HOUR);

        const minutes = Math.floor(diffSeconds / this.SECONDS_IN_ONE_MINUTE);
        friendlyString += this._padWithZeroes(minutes, 2) + this.TIME_SEPARATOR;
        diffSeconds = diffSeconds - minutes * this.SECONDS_IN_ONE_MINUTE;

        friendlyString += this._padWithZeroes(Math.round(diffSeconds), 2);

        return friendlyString;
    }

    /**
     * @brief For given two dates, will return the diff in the format of d:hh:mm:ss.fff
     * e.g. 2:01:02:03.456 (2 days, 1 hour, 2 minutes, 3 seconds and 456 milliseconds)
     */
    public static getDateDiffWithMilliSecondPrecision(endDate: Date, startDate: Date): string {
        if (!endDate) {
            endDate = new Date();
        }
        if (!startDate) {
            startDate = new Date();
        }

        // Get difference in seconds, getTime() returns in millisecond, divide by 1000 to make it in seconds
        let diffSeconds: number = (endDate.getTime() - startDate.getTime()) / this.MILLISECONDS_IN_ONE_SECOND;
        const secondsInOneDay = this.HOURS_IN_ONE_DAY * this.SECONDS_IN_ONE_HOUR;
        const days: number = Math.floor(diffSeconds / secondsInOneDay);
        diffSeconds = diffSeconds - (days * secondsInOneDay);
        const hours: number = Math.floor(diffSeconds / this.SECONDS_IN_ONE_HOUR);
        diffSeconds = diffSeconds - (hours * this.SECONDS_IN_ONE_HOUR);
        const minutes = Math.floor(diffSeconds / this.SECONDS_IN_ONE_MINUTE);
        const seconds = (diffSeconds - (minutes * this.SECONDS_IN_ONE_MINUTE));

        return this._formatDateWithMilliSecondPrecision({ days: days, hours: hours, minutes: minutes, seconds: seconds });
    }

    private static _formatDateWithMilliSecondPrecision(dateTime: IDateTime) {
        let friendlyString = "";
        const days = dateTime.days;
        const hours = dateTime.hours;
        const minutes = dateTime.minutes;
        const seconds = dateTime.seconds;

        if (days > 0) {
            friendlyString += days + this.TIME_SEPARATOR;
        }

        // Show hours only when days or hours value is greater than 0
        if (days > 0 || hours > 0) {
            const hoursDigitSize = (days > 0) ? 2 : 1;
            friendlyString += this._padWithZeroes(hours, hoursDigitSize) + this.TIME_SEPARATOR;
        }

        // Show minutes only when days or hours or minutes is greater than 0
        if (days > 0 || minutes > 0 || hours > 0) {
            // If days or hours is greater than 0 then make digit size 2, add leading 0 in case minute is less than 10
            const minuteDigitSize = (days > 0 || hours > 0) ? 2 : 1;
            friendlyString += this._padWithZeroes(minutes, minuteDigitSize) + this.TIME_SEPARATOR;
        }

        // Seconds will be shown with millisecond precision and we want to show at max 3 digit after decimal, ex: 10.138
        // If minutes or hours or days is greater than zero or diffSeconds is greater than or equal to 10 then total digit count would be 6
        // else it would be 5, for example 1 sec and 372 ms will be represented as 1.372 instead 01.372
        const secondDigitSize = (minutes > 0 || hours > 0 || days > 0 || seconds >= 10) ? 6 : 5;
        friendlyString += this._padWithZeroes(seconds.toFixed(3), secondDigitSize);

        return friendlyString;
    }

    private static _padWithZeroes(input: number | string, size: number): string {
        let text = "" + input;
        while (text.length < size) {
            text = "0" + text;
        }
        return text;
    }

    private static readonly SECONDS_IN_ONE_MINUTE: number = 60;
    private static readonly SECONDS_IN_ONE_HOUR: number = 60 * 60;
    private static readonly HOURS_IN_ONE_DAY: number = 24;
    private static readonly MILLISECONDS_IN_ONE_SECOND: number = 1000;
    private static readonly TIME_SEPARATOR: string = ":";
}
