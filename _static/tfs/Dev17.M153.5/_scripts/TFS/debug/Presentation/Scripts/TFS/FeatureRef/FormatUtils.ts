import Diag = require("VSS/Diag");
import Utils_Culture = require("VSS/Utils/Culture");
import Utils_Number = require("VSS/Utils/Number");
import Utils_String = require("VSS/Utils/String");

export module FormatUtils {

    export var _numberFormatRegexp: any = new RegExp("(\\" + Utils_Culture.getCurrentCulture().numberFormat.NumberDecimalSeparator + "0*|0+)$");

    export var REMAINING_WORK_PRECISION: number = 2;

    export function formatNumberForDisplay(value: number, precision: number) {
        /// <summary>Formats a number to the specified precision for display purposes.</summary>
        /// <param name="value" type="number">The number to format</param>
        /// <param name="precision" type="number">The maximum number of decimal places to use</param>

        Diag.Debug.assertParamIsNumber(value, "value");
        Diag.Debug.assertParamIsNumber(precision, "precision");

        var fixedPrecisionValue = Utils_String.localeFormat("{0:n" + precision + "}", value);

        return fixedPrecisionValue.replace(FormatUtils._numberFormatRegexp, '');
    }

    export function formatRemainingWorkForDisplay(remainingWorkValue: number | string) {
        /// <summary>Used to consistently format the remaining work value across sprint planning and taskboard pages.</summary>
        /// <param name="remainingWorkValue" type="object">The value to format.</param>

        // Utils_Number.parseLocale can only handle strings. attempt locale, otherwise fall back to number
        var result,
            value = (typeof remainingWorkValue === "string") ? Utils_Number.parseLocale(remainingWorkValue) : Number(remainingWorkValue);

        // If there is no value, return empty string.
        if (!remainingWorkValue || isNaN(value)) {
            result = "";
        }
        else {
            // There is a value, so format it with the precision.
            result = FormatUtils.formatNumberForDisplay(value, FormatUtils.REMAINING_WORK_PRECISION);

            // If the value is zero after truncating to precision, return empty string.
            if (result === "0") {
                result = "";
            }
        }

        return result;
    }
}
