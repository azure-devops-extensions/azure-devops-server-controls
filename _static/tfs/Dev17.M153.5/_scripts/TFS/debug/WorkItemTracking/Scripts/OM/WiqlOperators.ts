import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");
import WITCommonResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking.Common");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

export namespace WiqlOperators {
    export const NotSpace = "NOT";
    export const OperatorAnd = "AND";
    export const OperatorOr = "OR";
    export const OperatorContains = "CONTAINS";
    export const OperatorNotContains = "NOT CONTAINS";
    export const OperatorContainsWords = "CONTAINS WORDS";
    export const OperatorNotContainsWords = "NOT CONTAINS WORDS";
    export const OperatorIn = "IN";
    export const OperatorNotIn = "NOT IN";
    export const OperatorEver = "EVER";
    export const OperatorNotEver = "NOT EVER";
    export const OperatorUnder = "UNDER";
    export const OperatorNotUnder = "NOT UNDER";
    export const OperatorInGroup = "IN GROUP";
    export const OperatorNotInGroup = "NOT IN GROUP";
    export const OperatorEqualTo = "=";
    export const OperatorNotEqualTo = "<>";
    export const OperatorIsEmpty = "IS EMPTY";
    export const OperatorIsNotEmpty = "IS NOT EMPTY";
    export const OperatorGreaterThan = ">";
    export const OperatorLessThan = "<";
    export const OperatorGreaterThanOrEqualTo = ">=";
    export const OperatorLessThanOrEqualTo = "<=";
    export const MacroStart = "@";
    export const MacroToday = "@today";
    export const MacroMe = "@me";
    export const MacroProject = "@project";
    export const MacroCurrentIteration = "@currentIteration";
    export const MacroTeamAreas = "@teamAreas";
    export const MacroFollows = "@follows";
    export const MacroRecentMentions = "@recentMentions";
    export const MacroMyRecentActivity = "@myRecentActivity";
    export const MacroRecentProjectActivity = "@recentProjectActivity";
}

const invariantToLocalizedMap: IDictionaryStringTo<string> = {};
const localizedToInvariantMap: IDictionaryStringTo<string> = {};
const fieldComparisonOperators: IDictionaryStringTo<string> = {};

export const ProjectOperators = [WiqlOperators.OperatorEqualTo, WiqlOperators.OperatorNotEqualTo, WiqlOperators.OperatorIn, WiqlOperators.OperatorNotIn];

export const StringOperators = [WiqlOperators.OperatorEqualTo, WiqlOperators.OperatorNotEqualTo,
    WiqlOperators.OperatorGreaterThan, WiqlOperators.OperatorLessThan,
    WiqlOperators.OperatorGreaterThanOrEqualTo, WiqlOperators.OperatorLessThanOrEqualTo,
    WiqlOperators.OperatorContains, WiqlOperators.OperatorNotContains,
    WiqlOperators.OperatorIn, WiqlOperators.OperatorNotIn,
    WiqlOperators.OperatorInGroup, WiqlOperators.OperatorNotInGroup];

export const InGroupOperators = [WiqlOperators.OperatorInGroup, WiqlOperators.OperatorNotInGroup];
export const TextOperators = [WiqlOperators.OperatorContains, WiqlOperators.OperatorNotContains];
export const HistoryOperators = [WiqlOperators.OperatorContains, WiqlOperators.OperatorNotContains];
export const TextWithTextSupportOperators = [WiqlOperators.OperatorContainsWords, WiqlOperators.OperatorNotContainsWords];
export const HistoryWithTextSupportOperators = [WiqlOperators.OperatorContainsWords, WiqlOperators.OperatorNotContainsWords];
const isEmptyOperators = [WiqlOperators.OperatorIsEmpty, WiqlOperators.OperatorIsNotEmpty];
TextOperators.push(...isEmptyOperators);
TextWithTextSupportOperators.push(...isEmptyOperators);

export const StringWithTextSupportOperators = StringOperators.concat(TextWithTextSupportOperators);
export const StringWithInGroupOperators = StringOperators; // TODO: We need to separate to have only ingroup operators. #1366312

export const TreePathOperators = [WiqlOperators.OperatorUnder, WiqlOperators.OperatorNotUnder,
    WiqlOperators.OperatorEqualTo, WiqlOperators.OperatorNotEqualTo, WiqlOperators.OperatorIn, WiqlOperators.OperatorNotIn];

export const ComparisonOperators = [WiqlOperators.OperatorEqualTo, WiqlOperators.OperatorNotEqualTo,
    WiqlOperators.OperatorGreaterThan, WiqlOperators.OperatorLessThan,
    WiqlOperators.OperatorGreaterThanOrEqualTo, WiqlOperators.OperatorLessThanOrEqualTo,
    WiqlOperators.OperatorIn, WiqlOperators.OperatorNotIn];

export const EqualityOperators = [WiqlOperators.OperatorEqualTo, WiqlOperators.OperatorNotEqualTo];

const GroupOperators = {};
InGroupOperators.forEach((op) => {
    GroupOperators[op.toUpperCase()] = true;
});

const MultipleValueOperators = {};
[WiqlOperators.OperatorIn, WiqlOperators.OperatorNotIn].forEach((op) => {
    MultipleValueOperators[op.toUpperCase()] = true;
});

export const OperatorsSupportingFieldComparison: {[op: string]: boolean} = {};
[WiqlOperators.OperatorEqualTo, WiqlOperators.OperatorNotEqualTo,
    WiqlOperators.OperatorGreaterThan, WiqlOperators.OperatorLessThan,
    WiqlOperators.OperatorGreaterThanOrEqualTo, WiqlOperators.OperatorLessThanOrEqualTo].forEach((op) => {
        OperatorsSupportingFieldComparison[op.toUpperCase()] = true;
    });

export const FieldTypesSupportingEver = {};
[WITConstants.FieldType.String, WITConstants.FieldType.DateTime, WITConstants.FieldType.Integer, WITConstants.FieldType.Double, WITConstants.FieldType.Boolean, WITConstants.FieldType.Guid]
    .forEach((ft) => {
        FieldTypesSupportingEver[ft] = true;
    });

export const FieldTypesSupportingFieldComparison = {};
[WITConstants.FieldType.String, WITConstants.FieldType.DateTime,
    WITConstants.FieldType.Integer, WITConstants.FieldType.Double,
    WITConstants.FieldType.Boolean, WITConstants.FieldType.Guid]
    .forEach((ft) => {
        FieldTypesSupportingFieldComparison[ft] = true;
    });

const IdentityFieldStringOperators = {};
[WiqlOperators.OperatorContains, WiqlOperators.OperatorContainsWords, WiqlOperators.OperatorGreaterThan, WiqlOperators.OperatorGreaterThanOrEqualTo,
    WiqlOperators.OperatorLessThan, WiqlOperators.OperatorLessThanOrEqualTo, WiqlOperators.OperatorNotContains, WiqlOperators.OperatorNotContainsWords,
    WiqlOperators.OperatorNotUnder, WiqlOperators.OperatorUnder]
    .forEach((op) => {
        IdentityFieldStringOperators[op.toUpperCase()] = true;
    });

function mapOperatorPair(invariantOperator: string, localizedOperator: string) {
    invariantToLocalizedMap[invariantOperator.toUpperCase()] = localizedOperator;
    localizedToInvariantMap[localizedOperator.toLocaleUpperCase()] = invariantOperator;
}

export function getLocalizedOperator(invariantOperator: string): string {
    return invariantToLocalizedMap[$.trim(invariantOperator).toUpperCase()] || invariantOperator;
}

export function getLocalizedOperatorList(invariantOperators: string[]) {
    return $.map(invariantOperators, function (iop: string) {
        return getLocalizedOperator(iop);
    });
}

export function isFieldComparisonOperator(localizedOperator: string): boolean {
    return fieldComparisonOperators.hasOwnProperty($.trim(localizedOperator).toLocaleUpperCase());
}

export function getFieldComparisonOperator(invariantOperator: string): string {
    return getLocalizedOperator(invariantOperator) + WITCommonResources.WiqlOperators_FieldComparisonQualifier;
}

export function isTodayMacro(macro: string, localized: boolean): boolean {
    if (localized) {
        return Utils_String.startsWith(macro, getLocalizedOperator(WiqlOperators.MacroToday), Utils_String.localeIgnoreCaseComparer);
    }

    return Utils_String.startsWith(macro, WiqlOperators.MacroToday, Utils_String.ignoreCaseComparer);
}

export function isMeMacro(macro: string, localized: boolean): boolean {
    if (localized) {
        return Utils_String.localeIgnoreCaseComparer(macro, getLocalizedOperator(WiqlOperators.MacroMe)) === 0;
    }
    return Utils_String.localeIgnoreCaseComparer(macro, WiqlOperators.MacroMe) === 0;
}

export function isCurrentIterationMacro(macro: string, localized: boolean): boolean {
    if (localized) {
        return Utils_String.localeIgnoreCaseComparer(macro, getLocalizedOperator(WiqlOperators.MacroCurrentIteration)) === 0;
    }
    return Utils_String.localeIgnoreCaseComparer(macro, WiqlOperators.MacroCurrentIteration) === 0;
}

export function isProjectMacro(macro: string, localized: boolean): boolean {
    if (localized) {
        return Utils_String.localeIgnoreCaseComparer(macro, getLocalizedOperator(WiqlOperators.MacroProject)) === 0;
    }
    return Utils_String.localeIgnoreCaseComparer(macro, WiqlOperators.MacroProject) === 0;
}

export function isOrOperator(operator: string, localized: boolean): boolean {
    if (localized) {
        return Utils_String.localeIgnoreCaseComparer(operator, getLocalizedOperator(WiqlOperators.OperatorOr)) === 0;
    }
    return Utils_String.localeIgnoreCaseComparer(operator, WiqlOperators.OperatorOr) === 0;
}

export function getInvariantTodayMacro(localizedMacro: string): string {
    return WiqlOperators.MacroToday + localizedMacro.substring(getLocalizedOperator(WiqlOperators.MacroToday).length);
}

export function getLocalizedTodayMacro(invariantMacro: string): string {
    const localizedTodayMacro = getLocalizedOperator(WiqlOperators.MacroToday);
    const invariantTodayMacro = getInvariantTodayMacro(WiqlOperators.MacroToday);
    return localizedTodayMacro + invariantMacro.substring(invariantTodayMacro.length);
}

export function getLocalizedTodayMinusMacro(num: number): string {
    return Utils_String.format("{0} - {1}", getLocalizedOperator(WiqlOperators.MacroToday), num);
}

export function isValidMacro(macro: string, localized: boolean): boolean {
    macro = $.trim(macro);
    if (!Utils_String.startsWith(macro, WiqlOperators.MacroStart, Utils_String.ignoreCaseComparer)) {
        return false;
    }
    return true;
}

export function getInvariantOperator(localizedOperator: string): string {
    const invariantOperator = localizedToInvariantMap[$.trim(localizedOperator).toLocaleUpperCase()];

    if (!invariantOperator) {
        if (isTodayMacro(localizedOperator, true)) {
            return getInvariantTodayMacro(localizedOperator);
        }
    } else {
        return invariantOperator;
    }

    return localizedOperator;
}

export function isGroupOperator(localizedOperator: string): boolean {
    return GroupOperators.hasOwnProperty(getInvariantOperator(localizedOperator).toUpperCase());
}

export function isInOperator(localizedOperator: string): boolean {
    return getInvariantOperator(localizedOperator) === WiqlOperators.OperatorIn;
}

export function isMultipleValueOperator(localizedOperator: string): boolean {
    return MultipleValueOperators.hasOwnProperty(getInvariantOperator(localizedOperator).toUpperCase());
}

export function isIdentityFieldStringOperator(localizedOperator: string): boolean {
    return IdentityFieldStringOperators.hasOwnProperty(getInvariantOperator(localizedOperator).toUpperCase());
}

mapOperatorPair(WiqlOperators.OperatorAnd, WITCommonResources.WiqlOperators_And);
mapOperatorPair(WiqlOperators.OperatorOr, WITCommonResources.WiqlOperators_Or);
mapOperatorPair(WiqlOperators.OperatorContains, WITCommonResources.WiqlOperators_Contains);
mapOperatorPair(WiqlOperators.OperatorNotContains, WITCommonResources.WiqlOperators_NotContains);
mapOperatorPair(WiqlOperators.OperatorContainsWords, WITCommonResources.WiqlOperators_ContainsWords);
mapOperatorPair(WiqlOperators.OperatorNotContainsWords, WITCommonResources.WiqlOperators_NotContainsWords);
mapOperatorPair(WiqlOperators.OperatorIn, WITCommonResources.WiqlOperators_In);
mapOperatorPair(WiqlOperators.OperatorNotIn, WITCommonResources.WiqlOperators_NotIn);
mapOperatorPair(WiqlOperators.OperatorEver, WITCommonResources.WiqlOperators_Ever);
mapOperatorPair(WiqlOperators.OperatorNotEver, WITCommonResources.WiqlOperators_NotEver);
mapOperatorPair(WiqlOperators.OperatorUnder, WITCommonResources.WiqlOperators_Under);
mapOperatorPair(WiqlOperators.OperatorNotUnder, WITCommonResources.WiqlOperators_NotUnder);
mapOperatorPair(WiqlOperators.OperatorEqualTo, WITCommonResources.WiqlOperators_EqualTo);
mapOperatorPair(WiqlOperators.OperatorNotEqualTo, WITCommonResources.WiqlOperators_NotEqualTo);
mapOperatorPair(WiqlOperators.OperatorIsEmpty, WITCommonResources.WiqlOperators_IsEmpty);
mapOperatorPair(WiqlOperators.OperatorIsNotEmpty, WITCommonResources.WiqlOperators_IsNotEmpty);
mapOperatorPair(WiqlOperators.OperatorGreaterThan, WITCommonResources.WiqlOperators_GreaterThan);
mapOperatorPair(WiqlOperators.OperatorLessThan, WITCommonResources.WiqlOperators_LessThan);
mapOperatorPair(WiqlOperators.OperatorGreaterThanOrEqualTo, WITCommonResources.WiqlOperators_GreaterThanOrEqualTo);
mapOperatorPair(WiqlOperators.OperatorLessThanOrEqualTo, WITCommonResources.WiqlOperators_LessThanOrEqualTo);
mapOperatorPair(WiqlOperators.OperatorInGroup, WITCommonResources.WiqlOperators_InGroup);
mapOperatorPair(WiqlOperators.OperatorNotInGroup, WITCommonResources.WiqlOperators_NotInGroup);
mapOperatorPair(WiqlOperators.MacroToday, WiqlOperators.MacroStart + WITCommonResources.WiqlOperators_MacroToday);
mapOperatorPair(WiqlOperators.MacroMe, WiqlOperators.MacroStart + WITCommonResources.WiqlOperators_MacroMe);
mapOperatorPair(WiqlOperators.MacroProject, WiqlOperators.MacroStart + WITCommonResources.WiqlOperators_MacroProject);
mapOperatorPair(WiqlOperators.MacroCurrentIteration, WiqlOperators.MacroStart + WITCommonResources.WiqlOperators_MacroCurrentIteration);
mapOperatorPair(WiqlOperators.MacroTeamAreas, WiqlOperators.MacroStart + WITCommonResources.WiqlOperators_MacroTeamAreas);
mapOperatorPair(WiqlOperators.MacroFollows, WiqlOperators.MacroStart + WITCommonResources.WiqlOperators_MacroFollows);
mapOperatorPair(WiqlOperators.MacroRecentMentions, WiqlOperators.MacroStart + WITCommonResources.WiqlOperators_MacroRecentMentions);
mapOperatorPair(WiqlOperators.MacroMyRecentActivity, WiqlOperators.MacroStart + WITCommonResources.WiqlOperators_MacroMyRecentActivity);
mapOperatorPair(WiqlOperators.MacroRecentProjectActivity, WiqlOperators.MacroStart + WITCommonResources.WiqlOperators_MacroRecentProjectActivity);

for (const op in OperatorsSupportingFieldComparison) {
    const fieldComparisonOperator = getFieldComparisonOperator(op);

    localizedToInvariantMap[fieldComparisonOperator.toLocaleUpperCase()] = op;
    fieldComparisonOperators[fieldComparisonOperator.toLocaleUpperCase()] = op;
}

export function isNonNullableField(fieldId: number): boolean {
    return fieldId === WITConstants.CoreField.State || fieldId === WITConstants.CoreField.WorkItemType || fieldId === WITConstants.CoreField.LinkType;
}

export function quoteString(localizedValue: string): string {
    return "'" + (localizedValue || "").replace(/\'/g, "''") + "'";
}

export function toInvariantDateString(date: Date): string {
    // format is yyyy-MM-ddTHH:mm:ss.fffffffZ
    // Query editor uses day precision so the parsed date is an utc date
    return Utils_Date.format(date, "yyyy-MM-ddT00:00:00.0000000");
}
