
import Culture = require("VSS/Utils/Culture");
import Utils_String = require("VSS/Utils/String");
import Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");

function zeroPad(str: string, count: number, left: boolean): string {
    for (var l = str.length; l < count; l++) {
        str = (left ? ('0' + str) : (str + '0'));
    }
    return str;
}

/**
    * @param a 
    * @param b 
    * @return 
    */
export function defaultComparer(a: any, b: any): number {

    return a - b;
}

/**
    * Converts this number to a string in the current culture's locale
    * without specifying a precision. So, for example, with Spanish culture,
    * (3) gets translated to "3", and (3.1416) becomes "3,1416". The jQuery's
    * localeFormat requires a precision (the default is "2" if not specified).
    * So 3.localeFormat("N") become "3,00".
    * 
    * @param num  The Number to format 
    * @param includeGroupSeparators If true, use locale-specific
    * group separators (i.e. 3,000) in the output
    * @param cultureInfo Culture info (CurrentCulture if not specified)
    * @return 
    */
export function toDecimalLocaleString(num: number, includeGroupSeparators?: boolean, cultureInfo?: Culture.ICultureInfo): string {

    var exponent: number;
    var nf: any; // TODO: If we end up typing MSAjax we can get the actual numberFormat object type here
    var split: string[];
    var numberString = num.toString();
    var right = "";
    var groupSizes: number[];
    var sep: string;
    var curSize: number;
    var curGroupIndex: number;
    var stringIndex: number;
    var ret: string;

    if (cultureInfo) {
        nf = cultureInfo.numberFormat;
    }
    else {
        nf = Culture.getNumberFormat();
    }

    split = numberString.split(/e/i);
    numberString = split[0];
    exponent = (split.length > 1 ? parseInt(split[1], 10) : 0);
    split = numberString.split('.');
    numberString = split[0];
    right = split.length > 1 ? split[1] : "";

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

    if (right.length > 0) {
        right = nf.NumberDecimalSeparator + right;
    }

    if (includeGroupSeparators === true) {
        groupSizes = nf.NumberGroupSizes;
        sep = nf.NumberGroupSeparator;
        curSize = groupSizes[0];
        curGroupIndex = 1;
        stringIndex = numberString.length - 1;
        ret = "";

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
    else {
        return numberString + right;
    }
}

/**
    * @param value 
    * @return 
    */
export function isPositiveNumber(value: any): boolean {
    return value > 0 && parseInt(value) == value;
}

/**
    * @param value 
    * @return 
    */
export function parseLocale(value: string): number {
    return _parseNumber(value, Culture.getCurrentCulture().numberFormat);
}

/**
    * @param value 
    * @return 
    */
export function parseInvariant(value: string): number {
    return _parseNumber(value, Culture.getInvariantCulture().numberFormat);
}

/**
    * @param value 
    * @param format 
    * @return 
    */
export function localeFormat(value: number, format: string): string {
    return Utils_String.numberToString(value, true, format);
}

function _parseNumber(value: string, numberFormat: Culture.INumberFormatSettings) {
    value = value.trim();

    if (value.match(/^[+-]?infinity$/i)) {
        return parseFloat(value);
    }
    if (value.match(/^0x[a-f0-9]+$/i)) {
        return parseInt(value);
    }

    var signInfo = _parseNumberNegativePattern(value, numberFormat, numberFormat.NumberNegativePattern);
    var sign = signInfo[0];
    var num = signInfo[1];

    if ((sign === '') && (numberFormat.NumberNegativePattern !== 1)) {
        signInfo = _parseNumberNegativePattern(value, numberFormat, 1);
        sign = signInfo[0];
        num = signInfo[1];
    }
    if (sign === '') sign = '+';

    var exponent;
    var intAndFraction;
    var exponentPos = num.indexOf('e');
    if (exponentPos < 0) exponentPos = num.indexOf('E');
    if (exponentPos < 0) {
        intAndFraction = num;
        exponent = null;
    }
    else {
        intAndFraction = num.substr(0, exponentPos);
        exponent = num.substr(exponentPos + 1);
    }

    var integer;
    var fraction;
    var decimalPos = intAndFraction.indexOf(numberFormat.NumberDecimalSeparator);
    if (decimalPos < 0) {
        integer = intAndFraction;
        fraction = null;
    }
    else {
        integer = intAndFraction.substr(0, decimalPos);
        fraction = intAndFraction.substr(decimalPos + numberFormat.NumberDecimalSeparator.length);
    }

    integer = integer.split(numberFormat.NumberGroupSeparator).join('');
    var altNumGroupSeparator = numberFormat.NumberGroupSeparator.replace(/\u00A0/g, " ");
    if (numberFormat.NumberGroupSeparator !== altNumGroupSeparator) {
        integer = integer.split(altNumGroupSeparator).join('');
    }

    var p = sign + integer;
    if (fraction !== null) {
        p += '.' + fraction;
    }
    if (exponent !== null) {
        var expSignInfo = _parseNumberNegativePattern(exponent, numberFormat, 1);
        if (expSignInfo[0] === '') {
            expSignInfo[0] = '+';
        }
        p += 'e' + expSignInfo[0] + expSignInfo[1];
    }
    if (p.match(/^[+-]?\d*\.?\d*(e[+-]?\d+)?$/)) {
        return parseFloat(p);
    }
    return Number.NaN;
}

function _parseNumberNegativePattern(value: string, numFormat: Culture.INumberFormatSettings, numberNegativePattern: number) {
    var neg = numFormat.NegativeSign;
    var pos = numFormat.PositiveSign;
    switch (numberNegativePattern) {
        case 4:
            neg = ' ' + neg;
            pos = ' ' + pos;
        case 3:
            if (Utils_String.endsWith(value, neg)) {
                return ['-', value.substr(0, value.length - neg.length)];
            }
            else if (Utils_String.endsWith(value, pos)) {
                return ['+', value.substr(0, value.length - pos.length)];
            }
            break;
        case 2:
            neg += ' ';
            pos += ' ';
        case 1:
            if (Utils_String.startsWith(value, neg)) {
                return ['-', value.substr(neg.length)];
            }
            else if (Utils_String.startsWith(value, pos)) {
                return ['+', value.substr(pos.length)];
            }
            break;
        case 0:
            if (Utils_String.startsWith(value, '(') && Utils_String.endsWith(value, ')')) {
                return ['-', value.substr(1, value.length - 2)];
            }
            break;
        default:
            throw new Error("Invalid negative number pattern.");
    }
    return ['', value];
}

/**
 * Format a given number to the AbbreviatedShortForm with the given locale.
 * For example (US) 10,000 -> 10k ; 9,200 -> 9.2K (JA) 10,000 -> 1万 ; 9,200 -> 9.2千
 * @param count - the number to format with
 * @param cultureInfo - the cultureInfo, use user's default if not given.
 */
export function formatAbbreviatedNumber(count: number, cultureInfo?: Culture.ICultureInfo): string {
    var summarizedValue: string;
    var numberShortForm: Culture.INumberShortForm;
    var decimalSeparator: string;

    //Format a number to desired precision, and apply a string format to it (for Numerical suffix)
    var formatNumber = (numberSymbol: string, value: number, decimalCount: number, decimalSep: string): string => {
        if (numberSymbol) {
            var formattedNumber = value.toFixed(decimalCount);
            return (formattedNumber + numberSymbol).replace(".", decimalSep);
        } else {
            return toDecimalLocaleString(value, false);
        }
    };

    if (cultureInfo) {
        numberShortForm = cultureInfo.numberShortForm;
        decimalSeparator = cultureInfo.numberFormat.NumberDecimalSeparator;
    } else {
        numberShortForm = Culture.getNumberShortForm();
        decimalSeparator = Culture.getNumberFormat().NumberDecimalSeparator;
    }

    //Pack a string which has a maximum size of 3 characters + a suffix. This means are only able to allow a decimal in the case of a lone whole number digit
    //If we have a number larger than a trillion, that's unsupported for forseeable future and can be dealt with as a feature request when someone run's into
    //use cases for larger values.
    if (count < 1000) {
        summarizedValue = formatNumber("", count, 0, "");
    } else if ((count / 1000) < 10) {
        summarizedValue = formatNumber(numberShortForm.ThousandSymbol, (count / 1000), 1, decimalSeparator);
    }

    // We would use the shortForm logic to check
    if (count / numberShortForm.NumberGroupSize > 1) {
        for (var i = 0; i < numberShortForm.QuantitySymbols.length; i++) {
            var divider = Math.pow(numberShortForm.NumberGroupSize, i + 1);
            if (count / divider < 10) {
                summarizedValue = formatNumber(numberShortForm.QuantitySymbols[i], (count / divider), 1, decimalSeparator);
                break;
            } else if (count / divider < numberShortForm.NumberGroupSize) {
                summarizedValue = formatNumber(numberShortForm.QuantitySymbols[i], (count / divider), 0, "");
                break;
            }
        }

        // If we don't have a number, then it is too big to handle
        if (summarizedValue == null) {
            summarizedValue = count.toExponential(0);
        }
    }

    return summarizedValue;
}