import { localeIgnoreCaseComparer } from "VSS/Utils/String";

import { ChangeListSearchCriteria } from "TFS/VersionControl/Contracts";
import { ActionCreator } from "VersionControl/Scenarios/Explorer/ActionCreator";
import { AggregateState } from "VersionControl/Scenarios/Explorer/Stores/StoresHub";
import { TfvcChangesetsFilterStoreState } from "VersionControl/Scenarios/History/TfvcHistory/Stores/TfvcChangesetsFilterStore";
import { VersionControlActionIds } from "VersionControl/Scripts/Controls/ControlsCommon";
import { LineAdornmentOptions } from "VersionControl/Scripts/FileViewerLineAdornment";
import { isSameVersion } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { isInteger } from "VersionControl/Scripts/Utils/Number";

const trueString = "true";

export interface UrlParameters {
    action?: string;
    path?: string;
    version?: string;
    annotate?: string;
    createIfNew?: string;
    fullScreen?: string;
    anchor?: string;
    line?: string;
    lineEnd?: string;
    lineStartColumn?: string;
    lineEndColumn?: string;
    lineStyle?: "plain" | "error";
    lineTooltip?: string;
    historySearchCriteria?: string;
    mpath?: string;
    mversion?: string;
    opath?: string;
    oversion?: string;
}

export function getUrlParameters(aggregateState: AggregateState, previousParameters: UrlParameters): UrlParameters {
    const params: UrlParameters = {};

    if (aggregateState.tab !== aggregateState.pivotTabsState.defaultTab || previousParameters.action) {
        params.action = aggregateState.tab;
    }

    if (!aggregateState.pathState.isRoot || previousParameters.path) {
        params.path = aggregateState.path;
    }

    if (aggregateState.version !== "T" &&
        (previousParameters.version ||
        params.path ||
        !isSameVersion(aggregateState.version, aggregateState.versionState.userLastVisitedVersionSpec))) {
        params.version = aggregateState.version;
    }

    if (aggregateState.pivotTabsState.isFullScreen ||
        isTrueString(previousParameters.fullScreen)) {
        params.fullScreen = Boolean(aggregateState.pivotTabsState.isFullScreen).toString();
    }

    if (aggregateState.fileContentState.createIfNew || aggregateState.fileContentState.isNewFile) {
        params.createIfNew = Boolean(aggregateState.fileContentState.createIfNew || aggregateState.fileContentState.isNewFile).toString();
    }

    return {
        ...params,
        ...getUrlParametersLineAndAnchor(aggregateState),
        ...getUrlParametersHistory(aggregateState),
        ...getUrlParametersCompare(aggregateState),
    };
}

function getUrlParametersLineAndAnchor(aggregateState: AggregateState): UrlParameters {
    const params: UrlParameters = {};

    const { line, scrollToAnchor } = aggregateState.fileContentState;
    if (line) {
        params.line = line.startLineNumber.toString();
        params.lineEnd = line.endLineNumber && line.endLineNumber.toString();
        params.lineStartColumn = line.startColumn && line.startColumn.toString();
        params.lineEndColumn = line.endColumn && line.endColumn.toString();
        params.lineStyle = line.style;
        params.lineTooltip = line.glyphMarginText;
    }

    if (scrollToAnchor) {
        params.anchor = scrollToAnchor;
    }

    return params;
}

function getUrlParametersHistory(aggregateState: AggregateState): UrlParameters {
    if (aggregateState.tab === VersionControlActionIds.History) {
        const filterCriteria = aggregateState.isGit
            ? aggregateState.historyListState.searchCriteria
            : aggregateState.tfvcHistoryFilterState;

        if (filterCriteria) {
            const cleanCriteria = getCleanCriteria(filterCriteria);
            if (cleanCriteria) {
                return {
                    historySearchCriteria: JSON.stringify(cleanCriteria),
                };
            }
        }
    }
}

function getUrlParametersCompare(aggregateState: AggregateState): UrlParameters {
    if (aggregateState.tab === VersionControlActionIds.Compare) {
        return {
            mpath: aggregateState.compareState.mpath,
            mversion: aggregateState.compareState.mversion,
            opath: aggregateState.compareState.opath,
            oversion: aggregateState.compareState.oversion,
        };
    }
}

function getCleanCriteria(criteria: ChangeListSearchCriteria | TfvcChangesetsFilterStoreState): ChangeListSearchCriteria {
    const cleanCriteria = $.extend({}, criteria);
    delete cleanCriteria.itemPath;
    delete cleanCriteria.itemVersion;
    delete cleanCriteria.top;
    delete cleanCriteria.skip;

    let hasSignificantProperty = false;
    for (const property in cleanCriteria) {
        if (cleanCriteria[property] === null || cleanCriteria[property] === undefined || cleanCriteria[property] === "") {
            delete cleanCriteria[property];
        } else {
            hasSignificantProperty = true;
        }
    }

    return hasSignificantProperty && cleanCriteria;
}

export function areEqualUrlParameters(a: UrlParameters, b: UrlParameters): boolean {
    return isEqualAction(a, b) &&
        areEqualUrlParametersButAction(a, b) &&
        areEqualCompareUrlParameters(a, b);
}

function isEqualAction(a: UrlParameters, b: UrlParameters): boolean {
    return (a.action || VersionControlActionIds.Contents) === (b.action || VersionControlActionIds.Contents);
}

function areEqualUrlParametersButAction(a: UrlParameters, b: UrlParameters): boolean {
    return a.path === b.path &&
        (a.version || "T") === (b.version || "T") &&
        areEqualOrFalse(a.fullScreen, b.fullScreen) &&
        areEqualOrFalse(a.createIfNew, b.createIfNew) &&
        a.anchor === b.anchor &&
        a.line === b.line &&
        a.lineEnd === b.lineEnd &&
        a.lineStartColumn === b.lineStartColumn &&
        a.lineEndColumn === b.lineEndColumn &&
        a.lineStyle === b.lineStyle &&
        a.lineTooltip === b.lineTooltip &&
        a.historySearchCriteria === b.historySearchCriteria;
}

function areEqualCompareUrlParameters(a: UrlParameters, b: UrlParameters): boolean {
    return a.mpath === b.mpath &&
        a.mversion === b.mversion &&
        a.opath === b.opath &&
        a.oversion === b.oversion;
}

function areEqualOrFalse(a: string, b: string): boolean {
    return a === b ||
        !isTrueString(a) && !isTrueString(b);
}

export function applyNavigatedUrl(actionCreator: ActionCreator, rawState: UrlParameters, aggregateState: AggregateState): void {
    let action = rawState.action;

    if (isTrueString(rawState.annotate)) {
        action = VersionControlActionIds.Annotate;
    }

    const isFirstTime = !aggregateState.path;
    const existingUrlParameters = getUrlParameters(aggregateState, rawState);

    if (isFirstTime || needChangeItem(rawState, existingUrlParameters)) {
        const createIfNew = isTrueString(rawState.createIfNew);
        if (createIfNew && !action) {
            action = VersionControlActionIds.Contents;
        }

        const historySearchCriteria =
            action !== VersionControlActionIds.History
            ? undefined
            : rawState.historySearchCriteria
            ? JSON.parse(rawState.historySearchCriteria)
            : {};

        actionCreator.changeItem(
            action,
            rawState.path,
            "url-changed",
            rawState.version,
            {
                createIfNew,
                anchor: rawState.anchor,
                line: getLine(rawState),
                isFullScreen: isTrueString(rawState.fullScreen),
                historySearchCriteria,
            },
            rawState);
    } else if (!isEqualAction(rawState, existingUrlParameters)) {
        actionCreator.changeTab(action, rawState);
    } else if (!areEqualCompareUrlParameters(rawState, existingUrlParameters)) {
        actionCreator.changeCompare(rawState);
    }
}

function needChangeItem(rawState: UrlParameters, existing: UrlParameters): boolean {
    return !areEqualUrlParametersButAction(rawState, existing);
}

function getLine(rawState: UrlParameters): LineAdornmentOptions {
    if (rawState.line) {
        const line = parseIntegerGreaterThanZero(rawState.line);
        if (line) {
            return {
                startLineNumber: line,
                endLineNumber: parseIntegerGreaterThanZero(rawState.lineEnd),
                style: rawState.lineStyle,
                glyphMarginText: rawState.lineTooltip,
                startColumn: parseIntegerGreaterThanZero(rawState.lineStartColumn),
                endColumn: parseIntegerGreaterThanZero(rawState.lineEndColumn),
            };
        }
    }
}

function parseIntegerGreaterThanZero(value: any) {
    const num = Number(value);
    if (isInteger(num) && value > 0) {
        return num;
    } else {
        return;
    }
}

function isTrueString(text: string): boolean {
    return localeIgnoreCaseComparer(text, trueString) === 0;
}
