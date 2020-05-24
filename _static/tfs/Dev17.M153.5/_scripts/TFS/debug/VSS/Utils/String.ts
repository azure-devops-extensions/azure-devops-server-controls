
import Culture = require("VSS/Utils/Culture");

var slice: (start: number, end?: number) => any[] = Array.prototype.slice; // Needs to be typed because Array is declared as any above. When we get rid of above we get type for free.
var controlChars = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/;
var surrogateChars = /(^[\uD800-\uDFFF]$)|[^\uD800-\uDBFF](?=[\uDC00-\uDFFF])|[\uD800-\uDBFF](?![\uDC00-\uDFFF])/;

/**
 * Converts the value provided to a string.
 * 
 * @param upperCase Indicates if the string should be made upper case.
 * @param useLocale Indicates if the locale should be used in the string conversion.
 */
function convertToString(value: any, upperCase: boolean, useLocale: boolean): string {
    var result: string;

    if (value === null || value === undefined) {
        return "";
    }

    // Convert the value to a string.
    result = useLocale ? value.toLocaleString() : value.toString();

    // Convert the value to upper case if requested.
    if (upperCase) {
        result = useLocale ? result.toLocaleUpperCase() : result.toUpperCase();
    }

    return result;
}

export var EmptyGuidString = "00000000-0000-0000-0000-000000000000";

export var empty = "";
export var newLine = "\r\n";
export var tab = "\t";
export var lineFeed = "\n";

/**
    * 		HTML Encodes the string. Use this method to help prevent cross site scripting attacks
    *     by cleaning text which may contain HTML elements before the string is display in a web page.
    * 	
    * 
    * @param str The string to be encoded
    * @return A copy of the current string which has been HTML encoded
    */
export function htmlEncode(str: string): string {

    // we can write a slightly faster (30%) version that uses a regexp to find and replace
    // all occurences of [&<>"] by their corresponding HTML entities but this approach
    // uses the DOM implementation, so presumably it covers all input/edge cases.

    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));

    // The trick we are using here doesnt encode quotes. So we have to replace them using regexp search
    return div.innerHTML
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
    * 		HTML Encodes the string. Use this method to help prevent cross site scripting attacks
    *     by cleaning text which may contain HTML elements before the string is display in a web page.
    *     Does not encode single quotes.
    * 	
    * 
    * @param str The string to be encoded
    * @return A copy of the current string which has been HTML encoded
    */
export function htmlEncodeJavascriptAttribute(str: string): string {

    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));

    // The trick we are using here doesnt encode quotes. So we have to replace them using regexp search
    return div.innerHTML
        .replace(/"/g, '&quot;')
}

/**
    * 		HTML Decodes the string.
    * 	
    * 
    * @param str The string to be decoded
    * @return A copy of the current string which has been HTML decoded
    */
export function htmlDecode(str: string): string {
    const textArea = document.createElement('textarea');
    textArea.innerHTML = str;
    return textArea.innerHTML;
}

/**
    * 		HTML Decodes the string.
    * 	
    * 
    * @param str The string to be decoded
    * @return 
    *    A copy of the current string which has been HTML decoded.
    *    > < etc are converted back to HTML form(<, > etc)
    * 
    */
export function decodeHtmlSpecialChars(str: string): string {
    const textArea = document.createElement('textarea');
    textArea.innerHTML = str;
    return textArea.value;
}

/**
    * 		HTML encodes the string and replaces newlines with HTML break tags.
    * 		Use this method to maintain line breaks when displaying strings.
    * 	
    * 
    * @param str The string to be encoded.
    * @return A copy of the current string which has been HTML encoded
    */
export function nl2br(str: string): string {

    return htmlEncode(str).replace(/(\r\n|\n|\r)/gm, '<br/>');
}

/**
*	returns a string with the first letter as UpperCase and the rest lower case
*   Assumes the string is trimmed (no leading white-space) and starts with a valid character
*   if the first char is not an alphabet, no char will be made upper case
* @param str  The string to be converted.</param>
* @return A copy of the current string which has been sentence cased
*/
export function toSentenceCase(str: string): string {

    if (str) {
        //for non null values
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    } else {
        return str;
    }
}

/**
    * @param a 
    * @param b 
    * @return 
    */
export function defaultComparer(a: string, b: string): number {

    // Optimization: if the strings are equal no need to convert and perform a locale compare. 
    if (a === b) {
        return 0;
    }

    var a1 = convertToString(a, false, false),  // Convert the arguments to strings without adjusting casing or locale.
        b1 = convertToString(b, false, false);

    if (a1 === b1) {
        return 0;
    }
    else if (a1 > b1) {
        return 1;
    }
    else {
        return -1;
    }
}

/**
    * @param a 
    * @param b 
    * @return 
    */
export function ignoreCaseComparer(a: string, b: string): number {

    // Optimization: if the strings are equal no need to convert and perform a locale compare. 
    if (a === b) {
        return 0;
    }

    var a1 = convertToString(a, true, false),   // Convert the arguments to upper case strings without adjusting the locale.
        b1 = convertToString(b, true, false);

    if (a1 === b1) {
        return 0;
    }
    else if (a1 > b1) {
        return 1;
    }
    else {
        return -1;
    }
}

/**
    * @param a 
    * @param b 
    * @return 
    */
export function localeComparer(a: string, b: string): number {

    // Optimization: if the strings are equal no need to convert and perform a locale compare. 
    if (a === b) {
        return 0;
    }

    var a1 = convertToString(a, false, true),   // Convert the arguments to locale strings without adjusting the casing.
        b1 = convertToString(b, false, true);

    return a1.localeCompare(b1);
}

/**
    * @param a 
    * @param b 
    * @return 
    */
export function localeIgnoreCaseComparer(a: string, b: string): number {

    // Optimization: if the strings are equal no need to convert and perform a locale compare. 
    if (a === b) {
        return 0;
    }

    var a1 = convertToString(a, true, true),    // Convert the arguments to upercase locale strings.
        b1 = convertToString(b, true, true);

    return a1.localeCompare(b1);
}

/**
* Compares 2 strings for equality.
*
* @param a First string to compare
* @param b Second string to compare
* @param ignoreCase If true, do a case-insensitive comparison.
*/
export function equals(a: string, b: string, ignoreCase: boolean = false): boolean {
    if (ignoreCase) {
        return localeIgnoreCaseComparer(a, b) === 0;
    }
    else {
        return localeComparer(a, b) === 0;
    }
}

/**
    * @param str 
    * @param prefix 
    * @param comparer 
    * @return 
    */
export function startsWith(str: string, prefix: string, comparer?: IComparer<string>): boolean {

    comparer = comparer || defaultComparer;

    return comparer(prefix, str.substr(0, prefix.length)) === 0;
}

/**
    * @param str 
    * @param suffix 
    * @param comparer 
    * @return 
    */
export function endsWith(str: string, suffix: string, comparer?: IComparer<string>): boolean {

    comparer = comparer || defaultComparer;

    return comparer(suffix, str.substr(str.length - suffix.length, suffix.length)) === 0;
}

/**
    * @param str 
    * @param subStr 
    * @return 
    */
export function caseInsensitiveContains(str: string, subStr: string): boolean {

    // Handling when str or subStr is null/undefined
    if (str == null || subStr == null) {
        return false;
    }

    return (str.toLowerCase().indexOf(subStr.toLowerCase()) !== -1);
}

/**
    * @param format 
    * @param args 
    * @return 
    */
export function format(format: string, ...args: any[]): string {
    return _stringFormat(false, format, args);
}

/**
    * @param format 
    * @param args 
    * @return 
    */
export function localeFormat(format: string, ...args: any[]): string {
    return _stringFormat(true, format, args);
}

function _stringFormat(useLocale: boolean, format: string, args: any[]): string {

    var result = '';
    for (var i = 0; ;) {

        var open = format.indexOf("{", i);
        var close = format.indexOf("}", i);
        if ((open < 0) && (close < 0)) {
            result += format.slice(i);
            break;
        }

        if ((close > 0) && ((close < open) || (open < 0))) {
            if (format.charAt(close + 1) !== '}') {
                throw new Error("The format string contains an unmatched opening or closing brace.");
            }
            result += format.slice(i, close + 1);
            i = close + 2;
            continue;
        }

        result += format.slice(i, open);
        i = open + 1;
        if (format.charAt(i) === "{") {
            result += "{";
            i++;
            continue;
        }

        if (close < 0) {
            throw new Error("The format string contains an unmatched opening or closing brace.");
        }

        var brace = format.substring(i, close);
        var colonIndex = brace.indexOf(":");
        var argNumber = parseInt((colonIndex < 0) ? brace : brace.substring(0, colonIndex), 10);

        if (isNaN(argNumber)) {
            throw new Error("The format string is invalid.");
        }

        var argFormat = (colonIndex < 0) ? "" : brace.substring(colonIndex + 1);
        var arg = args[argNumber];
        if (typeof (arg) === "undefined" || arg === null) {
            arg = "";
        }
        if (arg.toFormattedString) {
            result += arg.toFormattedString(argFormat);
        }
        else if (typeof arg === "number") {
            result += numberToString(arg, useLocale, argFormat);
        }
        else if (arg instanceof Date) {
            result += dateToString(arg, useLocale, argFormat);
        }
        else if (arg.format) {
            result += arg.format(argFormat);
        }
        else {
            result += arg.toString();
        }

        i = close + 1;
    }
    return result;
}

export function dateToString(value: Date, useLocale?: boolean, format?: string): string {
    return MicrosoftAjaxDateFormatting.dateToString(value, useLocale, format);
}

export function numberToString(value: number, useLocale?: boolean, format?: string): string {
    return MicrosoftAjaxNumberFormatting.numberToString(value, useLocale, format);
}

export function parseDateString(value: string, cultureInfo?: Culture.ICultureInfo, formats?: string[]): Date {
    return MicrosoftAjaxDateFormatting.parseDateString(value, cultureInfo, formats);
}

module MicrosoftAjaxDateFormatting {

    function _getDateEra(date: Date, eras: any[]): number {
        if (!eras) {
            return 0;
        }
        var start, ticks = date.getTime();
        for (var i = 0, l = eras.length; i < l; i += 4) {
            start = eras[i + 2];
            if ((start === null) || (ticks >= start)) {
                return i;
            }
        }
        return 0;
    }

    function _getDateEraYear(date: Date, dtf: Culture.IDateTimeFormatSettings, era: number, sortable?: boolean) {

        var year = date.getFullYear();

        // If we have a locale conversion function then we need to use it to get the year before applying the era
        var convert = dtf.Calendar.convert;
        if (convert) {
            year = convert.fromGregorian(date)[0];
        }

        if (!sortable && dtf.eras) {
            year -= dtf.eras[era + 3];
        }
        return year;
    }

    function _expandDateFormat(dtf: Culture.IDateTimeFormatSettings, format: string) {
        if (!format) {
            format = "F";
        }
        var len = format.length;
        if (len === 1) {
            switch (format) {
                case "d":
                    return dtf.ShortDatePattern;
                case "D":
                    return dtf.LongDatePattern;
                case "g":
                    return dtf.ShortDatePattern + " " + dtf.ShortTimePattern;
                case "G":
                    return dtf.ShortDatePattern + " " + dtf.LongTimePattern;
                case "t":
                    return dtf.ShortTimePattern;
                case "T":
                    return dtf.LongTimePattern;
                case "f":
                    return dtf.LongDatePattern + " " + dtf.ShortTimePattern;
                case "F":
                    return dtf.FullDateTimePattern;
                case "M": case "m":
                    return dtf.MonthDayPattern;
                case "s":
                    return dtf.SortableDateTimePattern;
                case "Y": case "y":
                    return dtf.YearMonthPattern;
                case "R": case "r":
                    return dtf.RFC1123Pattern;
                case "u":
                    return dtf.UniversalSortableDateTimePattern;
                default:
                    throw new Error("Input string was not in a correct format.");
            }
        }
        else if ((len === 2) && (format.charAt(0) === "%")) {
            format = format.charAt(1);
        }
        return format;
    }

    export function dateToString(value: Date, useLocale?: boolean, format?: string): string {

        var dtf = useLocale ? Culture.getCurrentCulture().dateTimeFormat : Culture.getInvariantCulture().dateTimeFormat;
        var convert = dtf.Calendar.convert;

        if (!format || !format.length || (format === 'i')) {
            if (useLocale) {
                if (convert) {
                    format = dtf.FullDateTimePattern;
                }
                else {
                    var eraDate = new Date(value.getTime());
                    var era = _getDateEra(value, dtf.eras);
                    eraDate.setFullYear(_getDateEraYear(value, dtf, era));
                    return eraDate.toLocaleString();
                }
            }
            else {
                return value.toString();
            }
        }
        var eras = dtf.eras;
        var sortable = (format === "s");
        format = _expandDateFormat(dtf, format);
        var ret = new StringBuilder();
        var hour;
        function addLeadingZero(num) {
            if (num < 10) {
                return '0' + num;
            }
            return num.toString();
        }
        function addLeadingZeros(num) {
            if (num < 10) {
                return '00' + num;
            }
            if (num < 100) {
                return '0' + num;
            }
            return num.toString();
        }
        function padYear(year) {
            if (year < 10) {
                return '000' + year;
            }
            else if (year < 100) {
                return '00' + year;
            }
            else if (year < 1000) {
                return '0' + year;
            }
            return year.toString();
        }
        function _appendPreOrPostMatch(preMatch, strBuilder) {
            var quoteCount = 0;
            var escaped = false;
            for (var i = 0, il = preMatch.length; i < il; i++) {
                var c = preMatch.charAt(i);
                switch (c) {
                    case '\'':
                        if (escaped) strBuilder.append("'");
                        else quoteCount++;
                        escaped = false;
                        break;
                    case '\\':
                        if (escaped) strBuilder.append("\\");
                        escaped = !escaped;
                        break;
                    default:
                        strBuilder.append(c);
                        escaped = false;
                        break;
                }
            }
            return quoteCount;
        }

        var foundDay, checkedDay, dayPartRegExp = /([^d]|^)(d|dd)([^d]|$)/g;
        function hasDay() {
            if (foundDay || checkedDay) {
                return foundDay;
            }
            foundDay = dayPartRegExp.test(format);
            checkedDay = true;
            return foundDay;
        }

        var quoteCount = 0,
            tokenRegExp = /\/|dddd|ddd|dd|d|MMMM|MMM|MM|M|yyyy|yy|y|hh|h|HH|H|mm|m|ss|s|tt|t|fff|ff|f|zzz|zz|z|gg|g/g,
            converted;
        if (!sortable && convert) {
            converted = convert.fromGregorian(value);
        }
        function getPart(date, part) {
            if (converted) {
                return converted[part];
            }
            switch (part) {
                case 0: return date.getFullYear();
                case 1: return date.getMonth();
                case 2: return date.getDate();
            }
        }
        for (; ;) {
            var index = tokenRegExp.lastIndex;
            var ar = tokenRegExp.exec(format);
            var preMatch = format.slice(index, ar ? ar.index : format.length);
            quoteCount += _appendPreOrPostMatch(preMatch, ret);
            if (!ar) break;
            if ((quoteCount % 2) === 1) {
                ret.append(ar[0]);
                continue;
            }

            switch (ar[0]) {
                case "dddd":
                    ret.append(dtf.DayNames[value.getDay()]);
                    break;
                case "ddd":
                    ret.append(dtf.AbbreviatedDayNames[value.getDay()]);
                    break;
                case "dd":
                    foundDay = true;
                    ret.append(addLeadingZero(getPart(value, 2)));
                    break;
                case "d":
                    foundDay = true;
                    ret.append(getPart(value, 2));
                    break;
                case "MMMM":
                    ret.append((dtf.MonthGenitiveNames && hasDay())
                        ? dtf.MonthGenitiveNames[getPart(value, 1)]
                        : dtf.MonthNames[getPart(value, 1)]);
                    break;
                case "MMM":
                    ret.append((dtf.AbbreviatedMonthGenitiveNames && hasDay())
                        ? dtf.AbbreviatedMonthGenitiveNames[getPart(value, 1)]
                        : dtf.AbbreviatedMonthNames[getPart(value, 1)]);
                    break;
                case "MM":
                    ret.append(addLeadingZero(getPart(value, 1) + 1));
                    break;
                case "M":
                    ret.append(getPart(value, 1) + 1);
                    break;
                case "yyyy":
                    ret.append(padYear(converted ? converted[0] : _getDateEraYear(value, dtf, _getDateEra(value, eras), sortable)));
                    break;
                case "yy":
                    ret.append(addLeadingZero((converted ? converted[0] : _getDateEraYear(value, dtf, _getDateEra(value, eras), sortable)) % 100));
                    break;
                case "y":
                    ret.append((converted ? converted[0] : _getDateEraYear(value, dtf, _getDateEra(value, eras), sortable)) % 100);
                    break;
                case "hh":
                    hour = value.getHours() % 12;
                    if (hour === 0) hour = 12;
                    ret.append(addLeadingZero(hour));
                    break;
                case "h":
                    hour = value.getHours() % 12;
                    if (hour === 0) hour = 12;
                    ret.append(hour);
                    break;
                case "HH":
                    ret.append(addLeadingZero(value.getHours()));
                    break;
                case "H":
                    ret.append(value.getHours());
                    break;
                case "mm":
                    ret.append(addLeadingZero(value.getMinutes()));
                    break;
                case "m":
                    ret.append(value.getMinutes());
                    break;
                case "ss":
                    ret.append(addLeadingZero(value.getSeconds()));
                    break;
                case "s":
                    ret.append(value.getSeconds());
                    break;
                case "tt":
                    ret.append((value.getHours() < 12) ? dtf.AMDesignator : dtf.PMDesignator);
                    break;
                case "t":
                    ret.append(((value.getHours() < 12) ? dtf.AMDesignator : dtf.PMDesignator).charAt(0));
                    break;
                case "f":
                    ret.append(addLeadingZeros(value.getMilliseconds()).charAt(0));
                    break;
                case "ff":
                    ret.append(addLeadingZeros(value.getMilliseconds()).substr(0, 2));
                    break;
                case "fff":
                    ret.append(addLeadingZeros(value.getMilliseconds()));
                    break;
                case "z":
                    hour = value.getTimezoneOffset() / 60;
                    ret.append(((hour <= 0) ? '+' : '-') + Math.floor(Math.abs(hour)));
                    break;
                case "zz":
                    hour = value.getTimezoneOffset() / 60;
                    ret.append(((hour <= 0) ? '+' : '-') + addLeadingZero(Math.floor(Math.abs(hour))));
                    break;
                case "zzz":
                    hour = value.getTimezoneOffset() / 60;
                    ret.append(((hour <= 0) ? '+' : '-') + addLeadingZero(Math.floor(Math.abs(hour))) +
                        ":" + addLeadingZero(Math.abs(value.getTimezoneOffset() % 60)));
                    break;
                case "g":
                case "gg":
                    if (dtf.eras) {
                        ret.append(dtf.eras[_getDateEra(value, eras) + 1]);
                    }
                    break;
                case "/":
                    ret.append(dtf.DateSeparator);
                    break;
                default:
                    new Error("Invalid date format pattern");
                    break;
            }
        }
        return ret.toString();
    }

    export function parseDateString(value: string, cultureInfo?: Culture.ICultureInfo, formats?: string[]): Date {

        var custom = false;

        for (var i = 0, l = formats.length; i < l; i++) {
            var format = formats[i];
            if (format) {
                custom = true;
                var date = _parseExact(value, format, cultureInfo);
                if (date) {
                    return date;
                }
            }
        }

        if (!custom) {
            var allFormats = _getDateTimeFormats(cultureInfo.dateTimeFormat);
            for (i = 0, l = allFormats.length; i < l; i++) {
                var date = _parseExact(value, allFormats[i], cultureInfo);
                if (date) {
                    return date;
                }
            }
        }
        return null;
    }

    function _getDateTimeFormats(dtf: Culture.IDateTimeFormatSettings) {
        return [
            dtf.MonthDayPattern,
            dtf.YearMonthPattern,
            dtf.ShortDatePattern,
            dtf.ShortTimePattern,
            dtf.LongDatePattern,
            dtf.LongTimePattern,
            dtf.FullDateTimePattern,
            dtf.RFC1123Pattern,
            dtf.SortableDateTimePattern,
            dtf.UniversalSortableDateTimePattern,
            `${dtf.ShortDatePattern} ${dtf.LongTimePattern}`,
            `${dtf.LongDatePattern} ${dtf.ShortTimePattern}`,
            `${dtf.ShortDatePattern} ${dtf.ShortTimePattern}`
        ];
    }

    function _appendPreOrPostMatch(preMatch, strBuilder) {
        var quoteCount = 0;
        var escaped = false;
        for (var i = 0, il = preMatch.length; i < il; i++) {
            var c = preMatch.charAt(i);
            switch (c) {
                case '\'':
                    if (escaped) strBuilder.append("'");
                    else quoteCount++;
                    escaped = false;
                    break;
                case '\\':
                    if (escaped) strBuilder.append("\\");
                    escaped = !escaped;
                    break;
                default:
                    strBuilder.append(c);
                    escaped = false;
                    break;
            }
        }
        return quoteCount;
    }

    function _expandYear(dtf: Culture.IDateTimeFormatSettings, year: number) {
        var now = new Date(),
            era = _getDateEra(now, dtf.eras);

        if (year < 100) {
            var curr = _getDateEraYear(now, dtf, era);
            year += curr - (curr % 100);
            if (year > dtf.Calendar.TwoDigitYearMax) {
                year -= 100;
            }
        }
        return year;
    }

    function _getParseRegExp(dtf: Culture.IDateTimeFormatSettings, format: string) {

        if (!(<any>dtf)._parseRegExp) {
            (<any>dtf)._parseRegExp = {};
        }
        else if ((<any>dtf)._parseRegExp[format]) {
            return (<any>dtf)._parseRegExp[format];
        }

        var expFormat = _expandDateFormat(dtf, format);
        expFormat = expFormat.replace(/([\^\$\.\*\+\?\|\[\]\(\)\{\}])/g, "\\\\$1");
        var regexp = new StringBuilder("^");
        var groups = [];
        var index = 0;
        var quoteCount = 0;
        var tokenRegExp = /\/|dddd|ddd|dd|d|MMMM|MMM|MM|M|yyyy|yy|y|hh|h|HH|H|mm|m|ss|s|tt|t|fff|ff|f|zzz|zz|z|gg|g/g;
        var match;
        while ((match = tokenRegExp.exec(expFormat)) !== null) {
            var preMatch = expFormat.slice(index, match.index);
            index = tokenRegExp.lastIndex;
            quoteCount += _appendPreOrPostMatch(preMatch, regexp);
            if ((quoteCount % 2) === 1) {
                regexp.append(match[0]);
                continue;
            }
            switch (match[0]) {
                case 'MMMM': case 'MMM':
                    regexp.append("([\\d\\D]+)");
                    break;
                case 'dddd': case 'ddd':
                case 'gg': case 'g':
                    regexp.append("(\\D+)");
                    break;
                case 'tt': case 't':
                    regexp.append("(\\D*)");
                    break;
                case 'yyyy':
                    regexp.append("(\\d{4})");
                    break;
                case 'fff':
                    regexp.append("(\\d{3})");
                    break;
                case 'ff':
                    regexp.append("(\\d{2})");
                    break;
                case 'f':
                    regexp.append("(\\d)");
                    break;
                case 'dd': case 'd':
                case 'MM': case 'M':
                case 'yy': case 'y':
                case 'HH': case 'H':
                case 'hh': case 'h':
                case 'mm': case 'm':
                case 'ss': case 's':
                    regexp.append("(\\d\\d?)");
                    break;
                case 'zzz':
                    regexp.append("([+-]?\\d\\d?:\\d{2})");
                    break;
                case 'zz': case 'z':
                    regexp.append("([+-]?\\d\\d?)");
                    break;
                case '/':
                    regexp.append("(\\" + dtf.DateSeparator + ")");
                    break;
                default:
                    throw new Error("Invalid date format pattern.");
            }
            groups.push(match[0]);
        }
        _appendPreOrPostMatch(expFormat.slice(index), regexp);
        regexp.append("$");
        var regexpStr = regexp.toString().replace(/\s+/g, "\\s+");
        var parseRegExp = { 'regExp': regexpStr, 'groups': groups };
        (<any>dtf)._parseRegExp[format] = parseRegExp;
        return parseRegExp;
    }

    function _indexOf(array: any[], item: any): number {
        if (typeof (item) === "undefined") return -1;
        for (var i = 0, length = array.length; i < length; i++) {
            if ((typeof (array[i]) !== "undefined") && (array[i] === item)) {
                return i;
            }
        }
        return -1;
    }
    function _getIndex(value: number, a1, a2) {
        var upper = _toUpper(value),
            i = _indexOf(a1, upper);
        if (i === -1) {
            i = _indexOf(a2, upper);
        }
        return i;
    }
    function _getMonthIndex(cultureInfo: Culture.ICultureInfo, value: any) {
        if (!(<any>cultureInfo)._upperMonths) {
            (<any>cultureInfo)._upperMonths = _toUpperArray(cultureInfo.dateTimeFormat.MonthNames);
            (<any>cultureInfo)._upperMonthsGenitive = _toUpperArray(cultureInfo.dateTimeFormat.MonthGenitiveNames);
        }
        return _getIndex(value, (<any>cultureInfo)._upperMonths, (<any>cultureInfo)._upperMonthsGenitive);
    }
    function _getAbbrMonthIndex(cultureInfo: Culture.ICultureInfo, value: any) {
        if (!(<any>cultureInfo)._upperAbbrMonths) {
            (<any>cultureInfo)._upperAbbrMonths = _toUpperArray(cultureInfo.dateTimeFormat.AbbreviatedMonthNames);
            (<any>cultureInfo)._upperAbbrMonthsGenitive = _toUpperArray(cultureInfo.dateTimeFormat.AbbreviatedMonthGenitiveNames);
        }
        return _getIndex(value, (<any>cultureInfo)._upperAbbrMonths, (<any>cultureInfo)._upperAbbrMonthsGenitive);
    }
    function _getDayIndex(cultureInfo: Culture.ICultureInfo, value: any) {
        if (!(<any>cultureInfo)._upperDays) {
            (<any>cultureInfo)._upperDays = _toUpperArray(cultureInfo.dateTimeFormat.DayNames);
        }
        return _indexOf((<any>cultureInfo)._upperDays, _toUpper(value));
    }
    function _getAbbrDayIndex(cultureInfo: Culture.ICultureInfo, value: any) {
        if (!(<any>cultureInfo)._upperAbbrDays) {
            (<any>cultureInfo)._upperAbbrDays = _toUpperArray(cultureInfo.dateTimeFormat.AbbreviatedDayNames);
        }
        return _indexOf((<any>cultureInfo)._upperAbbrDays, _toUpper(value));
    }
    function _toUpperArray(arr) {
        var result = [];
        for (var i = 0, il = arr.length; i < il; i++) {
            result[i] = _toUpper(arr[i]);
        }
        return result;
    }
    function _toUpper(value) {
        return value.split("\u00A0").join(' ').toUpperCase();
    }

    function _parseExact(value: string, format: string, cultureInfo: Culture.ICultureInfo) {
        value = value.trim();
        var dtf = cultureInfo.dateTimeFormat,
            parseInfo = _getParseRegExp(dtf, format),
            match = new RegExp(parseInfo.regExp).exec(value);
        if (match === null) return null;

        var groups = parseInfo.groups,
            era = null, year = null, month = null, date = null, weekDay = null,
            hour = 0, hourOffset, min = 0, sec = 0, msec = 0, tzMinOffset = null,
            pmHour = false;
        for (var j = 0, jl = groups.length; j < jl; j++) {
            var matchGroup = match[j + 1];
            if (matchGroup) {
                switch (groups[j]) {
                    case 'dd': case 'd':
                        date = parseInt(matchGroup, 10);
                        if ((date < 1) || (date > 31)) return null;
                        break;
                    case 'MMMM':
                        month = _getMonthIndex(cultureInfo, matchGroup);
                        if ((month < 0) || (month > 11)) return null;
                        break;
                    case 'MMM':
                        month = _getAbbrMonthIndex(cultureInfo, matchGroup);
                        if ((month < 0) || (month > 11)) return null;
                        break;
                    case 'M': case 'MM':
                        month = parseInt(matchGroup, 10) - 1;
                        if ((month < 0) || (month > 11)) return null;
                        break;
                    case 'y': case 'yy':
                        year = _expandYear(dtf, parseInt(matchGroup, 10));
                        if ((year < 0) || (year > 9999)) return null;
                        break;
                    case 'yyyy':
                        year = parseInt(matchGroup, 10);
                        if ((year < 0) || (year > 9999)) return null;
                        break;
                    case 'h': case 'hh':
                        hour = parseInt(matchGroup, 10);
                        if (hour === 12) hour = 0;
                        if ((hour < 0) || (hour > 11)) return null;
                        break;
                    case 'H': case 'HH':
                        hour = parseInt(matchGroup, 10);
                        if ((hour < 0) || (hour > 23)) return null;
                        break;
                    case 'm': case 'mm':
                        min = parseInt(matchGroup, 10);
                        if ((min < 0) || (min > 59)) return null;
                        break;
                    case 's': case 'ss':
                        sec = parseInt(matchGroup, 10);
                        if ((sec < 0) || (sec > 59)) return null;
                        break;
                    case 'tt': case 't':
                        var upperToken = matchGroup.toUpperCase();
                        pmHour = (upperToken === dtf.PMDesignator.toUpperCase());
                        if (!pmHour && (upperToken !== dtf.AMDesignator.toUpperCase())) return null;
                        break;
                    case 'f':
                        msec = parseInt(matchGroup, 10) * 100;
                        if ((msec < 0) || (msec > 999)) return null;
                        break;
                    case 'ff':
                        msec = parseInt(matchGroup, 10) * 10;
                        if ((msec < 0) || (msec > 999)) return null;
                        break;
                    case 'fff':
                        msec = parseInt(matchGroup, 10);
                        if ((msec < 0) || (msec > 999)) return null;
                        break;
                    case 'dddd':
                        weekDay = _getDayIndex(cultureInfo, matchGroup);
                        if ((weekDay < 0) || (weekDay > 6)) return null;
                        break;
                    case 'ddd':
                        weekDay = _getAbbrDayIndex(cultureInfo, matchGroup);
                        if ((weekDay < 0) || (weekDay > 6)) return null;
                        break;
                    case 'zzz':
                        var offsets = matchGroup.split(/:/);
                        if (offsets.length !== 2) return null;
                        hourOffset = parseInt(offsets[0], 10);
                        if ((hourOffset < -12) || (hourOffset > 13)) return null;
                        var minOffset = parseInt(offsets[1], 10);
                        if ((minOffset < 0) || (minOffset > 59)) return null;
                        tzMinOffset = (hourOffset * 60) + (startsWith(matchGroup, "-") ? -minOffset : minOffset);
                        break;
                    case 'z': case 'zz':
                        hourOffset = parseInt(matchGroup, 10);
                        if ((hourOffset < -12) || (hourOffset > 13)) return null;
                        tzMinOffset = hourOffset * 60;
                        break;
                    case 'g': case 'gg':
                        var eraName = matchGroup;
                        if (!eraName || !dtf.eras) return null;
                        eraName = eraName.toLowerCase().trim();
                        for (var i = 0, l = dtf.eras.length; i < l; i += 4) {
                            if (eraName === dtf.eras[i + 1].toLowerCase()) {
                                era = i;
                                break;
                            }
                        }
                        if (era === null) return null;
                        break;
                }
            }
        }
        var result = new Date(), defaultYear, convert = dtf.Calendar.convert;
        if (convert) {
            defaultYear = convert.fromGregorian(result)[0];
        }
        else {
            defaultYear = result.getFullYear();
        }
        if (year === null) {
            year = defaultYear;
        }
        else if (dtf.eras) {
            year += dtf.eras[(era || 0) + 3];
        }
        if (month === null) {
            month = 0;
        }
        if (date === null) {
            date = 1;
        }
        if (convert) {
            result = convert.toGregorian(year, month, date);
            if (result === null) return null;
        }
        else {
            result.setFullYear(year, month, date);
            if (result.getDate() !== date) return null;
            if ((weekDay !== null) && (result.getDay() !== weekDay)) {
                return null;
            }
        }
        if (pmHour && (hour < 12)) {
            hour += 12;
        }
        result.setHours(hour, min, sec, msec);
        if (tzMinOffset !== null) {
            var adjustedMin = result.getMinutes() - (tzMinOffset + result.getTimezoneOffset());
            result.setHours(result.getHours() + parseInt(<any>(adjustedMin / 60), 10), adjustedMin % 60);
        }
        return result;
    }
}

module MicrosoftAjaxNumberFormatting {

    export function numberToString(value: number, useLocale?: boolean, format?: string): string {

        if (!format || (format.length === 0) || (format === "i")) {
            if (useLocale) {
                return value.toLocaleString();
            }
            else {
                return value.toString();
            }
        }

        var _percentPositivePattern = ["n %", "n%", "%n"];
        var _percentNegativePattern = ["-n %", "-n%", "-%n"];
        var _numberNegativePattern = ["(n)", "-n", "- n", "n-", "n -"];
        var _currencyPositivePattern = ["$n", "n$", "$ n", "n $"];
        var _currencyNegativePattern = ["($n)", "-$n", "$-n", "$n-", "(n$)", "-n$", "n-$", "n$-", "-n $", "-$ n", "n $-", "$ n-", "$ -n", "n- $", "($ n)", "(n $)"];

        function zeroPad(str: string, count: number, left: boolean): string {
            for (var l = str.length; l < count; l++) {
                str = (left ? ('0' + str) : (str + '0'));
            }
            return str;
        }

        function expandNumber(numToExpand: number, precision: number, groupSizes: number[], sep: string, decimalChar: string): string {

            var curSize = groupSizes[0];
            var curGroupIndex = 1;
            var factor = Math.pow(10, precision);
            var rounded = (Math.round(numToExpand * factor) / factor);
            if (!isFinite(rounded)) {
                rounded = numToExpand;
            }
            numToExpand = rounded;

            var numberString = numToExpand.toString();
            var right = "";
            var exponent;


            var split = numberString.split(/e/i);
            numberString = split[0];
            exponent = (split.length > 1 ? parseInt(split[1]) : 0);
            split = numberString.split('.');
            numberString = split[0];
            right = split.length > 1 ? split[1] : "";

            var l;
            if (exponent > 0) {
                right = zeroPad(right, exponent, false);
                numberString += right.slice(0, exponent);
                right = right.substr(exponent);
            }
            else if (exponent < 0) {
                exponent = -exponent;
                numberString = zeroPad(numberString, exponent + 1, true);
                right = numberString.slice(-exponent, numberString.length) + right;
                numberString = numberString.slice(0, -exponent);
            }
            if (precision > 0) {
                if (right.length > precision) {
                    right = right.slice(0, precision);
                }
                else {
                    right = zeroPad(right, precision, false);
                }
                right = decimalChar + right;
            }
            else {
                right = "";
            }
            var stringIndex = numberString.length - 1;
            var ret = "";
            while (stringIndex >= 0) {
                if (curSize === 0 || curSize > stringIndex) {
                    if (ret.length > 0) {
                        return numberString.slice(0, stringIndex + 1) + sep + ret + right;
                    }
                    else {
                        return numberString.slice(0, stringIndex + 1) + right;
                    }
                }
                if (ret.length > 0) {
                    ret = numberString.slice(stringIndex - curSize + 1, stringIndex + 1) + sep + ret;
                }
                else {
                    ret = numberString.slice(stringIndex - curSize + 1, stringIndex + 1);
                }

                stringIndex -= curSize;
                if (curGroupIndex < groupSizes.length) {
                    curSize = groupSizes[curGroupIndex];
                    curGroupIndex++;
                }
            }
            return numberString.slice(0, stringIndex + 1) + sep + ret + right;
        }

        var nf = useLocale ? Culture.getCurrentCulture().numberFormat : Culture.getInvariantCulture().numberFormat;
        var num: string;
        if (!format) {
            format = "D";
        }
        var precision = -1;
        if (format.length > 1) precision = parseInt(format.slice(1), 10);
        var pattern;
        switch (format.charAt(0)) {
            case "d":
            case "D":
                pattern = 'n';
                if (precision !== -1) {
                    num = zeroPad("" + Math.abs(value), precision, true);
                    if (value < 0) {
                        num = "-" + num;
                    }
                }
                else {
                    num = "" + value;
                }
                break;
            case "c":
            case "C":
                if (value < 0) {
                    pattern = _currencyNegativePattern[nf.CurrencyNegativePattern];
                }
                else {
                    pattern = _currencyPositivePattern[nf.CurrencyPositivePattern];
                }
                if (precision === -1) {
                    precision = nf.CurrencyDecimalDigits;
                }
                num = expandNumber(Math.abs(value), precision, nf.CurrencyGroupSizes, nf.CurrencyGroupSeparator, nf.CurrencyDecimalSeparator);
                break;
            case "n":
            case "N":
                if (value < 0) {
                    pattern = _numberNegativePattern[nf.NumberNegativePattern];
                }
                else {
                    pattern = 'n';
                }
                if (precision === -1) {
                    precision = nf.NumberDecimalDigits;
                }
                num = expandNumber(Math.abs(value), precision, nf.NumberGroupSizes, nf.NumberGroupSeparator, nf.NumberDecimalSeparator);
                break;
            case "p":
            case "P":
                if (value < 0) {
                    pattern = _percentNegativePattern[nf.PercentNegativePattern];
                }
                else {
                    pattern = _percentPositivePattern[nf.PercentPositivePattern];
                }
                if (precision === -1) {
                    precision = nf.PercentDecimalDigits;
                }
                num = expandNumber(Math.abs(value) * 100, precision, nf.PercentGroupSizes, nf.PercentGroupSeparator, nf.PercentDecimalSeparator);
                break;
            default:
                throw new Error("Format specifier was invalid.");
        }
        var regex = /n|\$|-|%/g;
        var ret = "";
        for (; ;) {
            var index = regex.lastIndex;
            var ar = regex.exec(pattern);
            ret += pattern.slice(index, ar ? ar.index : pattern.length);
            if (!ar)
                break;
            switch (ar[0]) {
                case "n":
                    ret += num;
                    break;
                case "$":
                    ret += nf.CurrencySymbol;
                    break;
                case "-":
                    if (/[1-9]/.test(num)) {
                        ret += nf.NegativeSign;
                    }
                    break;
                case "%":
                    ret += nf.PercentSymbol;
                    break;
                default:
                    throw new Error("Invalid number format pattern");
            }
        }
        return ret;
    }
}

export function containsControlChars(str: string): boolean {
    return controlChars.test(str);
}

export function containsMismatchedSurrogateChars(str: string): boolean {
    return surrogateChars.test(str);
}

/**
    *  Base64 encodes the string. Uses the native version if available.
    *  @param s The string that should be encoded.
    *  @return The string in base64 encoding.
    */
export function base64Encode(s: string): string {
    if (typeof window.btoa === "function") {
        return window.btoa(s);
    } else {
        return _btoa(s);
    }
}

/**
    *  The map of the allowed output characters in base64 encoding.
    */
var _base64OutputMap = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

/**
    *  Hand-rolled function to base64 encode a string.
    *  @param s The string to encode
    *  @return The base64 encoded string.
    */
function _btoa(s: string): string {
    var c0: number;
    var c1: number;
    var c2: number;
    var i = 0;
    var len = s.length;
    var outBuffer: string[] = [];
    while (i < len) {
        c0 = s.charCodeAt(i);
        c1 = s.charCodeAt(i + 1);
        c2 = s.charCodeAt(i + 2);

        outBuffer.push(_base64OutputMap.charAt(c0 >> 2));
        outBuffer.push(_base64OutputMap.charAt(((c0 & 3) << 4) | (c1 >> 4)));
        outBuffer.push(_base64OutputMap.charAt(isNaN(c1) ? 64 : (((c1 & 15) << 2) | (c2 >> 6))));
        outBuffer.push(_base64OutputMap.charAt(isNaN(c2) ? 64 : (c2 & 63)));

        i += 3;
    }

    return outBuffer.join('');
}

export function isGuid(str: string): boolean {
    var guidRegex = /^\{?([\dA-F]{8})-?([\dA-F]{4})-?([\dA-F]{4})-?([\dA-F]{4})-?([\dA-F]{12})\}?$/i;
    return guidRegex.test(str);
}

export function isEmptyGuid(str: string): boolean {
    return ignoreCaseComparer(str, EmptyGuidString) === 0;
}

/** Returns a new, pseudo-random uid */
export function generateUID(): string {
    var getRand: () => number;

    if (window.crypto && window.crypto.getRandomValues) {
        let b = new Uint8Array(32);
        window.crypto.getRandomValues(b);
        let c = 0;
        getRand = () => b[c++] % 16;
    } else {
        getRand = () => Math.random() * 16 | 0;
    }

    // Template for version 4 uuid, s will be replaced using 8, 9, a, or b
    var template = 'nnnnnnnn-nnnn-4nnn-snnn-nnnnnnnnnnnn';
    return template.replace(/[ns]/g, (c: string) => {
        var val = getRand() | 0;

        // handle rfc4122 reserved bits
        var v = c == 'n' ? val : (val & 0x3 | 0x8);

        // return in base 16
        return v.toString(16);
    });
}

/**
* Result from a singleSplit operation
*/
export interface ISingleSplitResult {
    /**
    * The part of the string before the split (or the original string if no match)
    */
    part1: string;

    /**
    * The segment of the string after the split
    */
    part2: string;

    /**
    * Whether or not the separator was found in the string
    */
    match: boolean;
}

/**
* Split a string into 2 parts by finding the first (or optionally, last) match of a given separator.
* This is close to the C# String.Split API using 2 as the "count". In javascript, supplying the count ignores everything
* in the string after that number of segments. For example calling "a b c".split(" ", 2) returns ["a", "b"] where in C#
* this would return ["a", "b c"]. This method works like the C# version where singleSplit("a b c", " ") will return 
* { part1: "a", part2: "b c"}.
*
* @param value The string to split
* @param separator The separator string to split on
* @param ignoreCase Optional parameter to ignore case of the separator
* @param lastMatch If true, search in the reverse direction (find the last instance of the separator). By default, the first instance of the separator is used.
*/
export function singleSplit(value: string, separator: string, ignoreCase?: boolean, lastMatch?: boolean): ISingleSplitResult {

    var result = {
        part1: value,
        part2: null,
        match: false
    };

    if (value && separator) {

        var valueToSearch = ignoreCase ? value.toLowerCase() : value;
        var separatorToSearch = ignoreCase ? separator.toLowerCase() : separator;

        var matchIndex: number;
        if (lastMatch) {
            matchIndex = valueToSearch.lastIndexOf(separatorToSearch);
        }
        else {
            matchIndex = valueToSearch.indexOf(separatorToSearch);
        }

        if (matchIndex >= 0) {
            result.part1 = value.substr(0, matchIndex);
            result.part2 = value.substr(matchIndex + separator.length);
            result.match = true;
        }
    }
    return result;
}

export class StringBuilder {

    private _textBuilder: string[];

    /**
     * Utility class for building strings - similar to the System.Text.StringBuilder .NET class.
     *
     * @param initialText The initial text for the builder
     */
    constructor(initialText?: string) {
        this._textBuilder = [];

        if (initialText) {
            this._textBuilder.push(initialText);
        }
    }

    /**
     * Appends the specified text to the end of the string buffer.
     * 
     * @param text The text to append.
     */
    public append(text: string | any) {
        this._textBuilder[this._textBuilder.length] = text;
    }

    /**
     * Appends a new-line to the current text buffer.
     */
    public appendNewLine() {
        this.append(newLine);
    }

    /**
     * Concatenates all text in the string buffer into a single string value.
     * 
     * @return The string version of the accumulated text.
     */
    public toString(): string {
        return this._textBuilder.join("");
    }
}
