import Controls = require("VSS/Controls");
import Utils_String = require("VSS/Utils/String");
import MyWorkResources = require("MyWork/Scripts/Resources/TFS.Resources.MyWork");

export module Constants {
    export var SUMMARY_EVENT = "mywork-summary-event";
    export var SUMMARY_TIME_IN_HOURS = 24;
    export var SUMMARY_COUNT_CSSCLASS = "mywork-summary-count";
    export var SUMMARY_TEXT_CSSCLASS = "mywork-summary-text";
}

export interface ISummaryEvent {
    type: SummaryType;
    summary: ISummaryContent;
}

export interface ISummaryContent {
    count: number;
    text: string;
}

export enum SummaryType {
    workItem = 1,
    pullRequest = 2
}

export function fireSummaryEvent(control: Controls.Enhancement<any>, event: ISummaryEvent) {
    control._fire(Constants.SUMMARY_EVENT, event);
}

export function isIncludedInSummary(date: (string | Date)) {
    return false;
}

function formatSummary(summary: ISummaryContent): string {
    var countHtml = $("<span>")
        .addClass(Constants.SUMMARY_COUNT_CSSCLASS)
        .text(summary.count)[0].outerHTML;

    var textHtml = $("<span>")
        .addClass(Constants.SUMMARY_TEXT_CSSCLASS)
        .text(summary.text)[0].outerHTML;

    return Utils_String.format(MyWorkResources.SummaryWithCount, countHtml, textHtml);
}

/*
EN-US EXAMPLE:
undefined       => ""
null            => ""
[]              => ""
["a"]           => "a"
["a","b"]       => "a and b"
["a","b","c"]   => "a, b, and c"
*/
function joinStringsWithLocale(strings: string[]): string {
    if (!strings) {
        return "";
    }

    if (strings.length <= 1) {
        return strings.join();
    }

    var lastString = strings.pop();
    if (strings.length > 1) {
        return strings.join(MyWorkResources.ListSeparator) + MyWorkResources.ListSeparatorWithConjunction + lastString;
    }

    return strings[0] + MyWorkResources.ListConjunction + lastString;
}

export function formatSummaries(summaries: ISummaryContent[]): string {
    if (!summaries || summaries.length === 0) {
        return null;
    }

    var summaryStrings = summaries.map(formatSummary);

    return joinStringsWithLocale(summaryStrings);
}