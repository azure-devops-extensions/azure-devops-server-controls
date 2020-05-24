import * as _SearchSharedContracts from "Search/Scripts/Generated/Search.SharedLegacy.Contracts";
import { ResultsViewConstants } from "Search/Scenarios/WorkItem/Constants";
import { WorkItemField, WorkItemSearchRequest } from "Search/Scenarios/WebApi/Workitem.Contracts";
import { htmlEncode, ignoreCaseComparer } from "VSS/Utils/String";
import { areFiltersEqual, areSortOptionsEqual } from "Search/Scenarios/Shared/Utils";

export function getFieldValue(fields: WorkItemField[], fieldReferenceName: string): string {
    let fieldValue = fields.filter(field => ignoreCaseComparer(field.referenceName, fieldReferenceName) === 0);
    return fieldValue[0] ? fieldValue[0].value : null;
}

export function sanitizeHtml(html: string): string {
    // replace multiple white spaces with a single white space.
    html = html.replace(ResultsViewConstants.WhiteSpaceRegex, " ");
    let encodedValue = htmlEncode(html);

    return encodedValue
        .replace(ResultsViewConstants.HitHighlightLightHtmlEncodedStartTagRegex, ResultsViewConstants.HighlightStartTag)
        .replace(ResultsViewConstants.HitHighlightLightHtmlEncodedEndTagRegex, ResultsViewConstants.HighlightEndTag);
}

export function areQueriesEqual(left: WorkItemSearchRequest, right: WorkItemSearchRequest): boolean {
    if (left.searchText !== right.searchText) {
        return false;
    }

    if (left.takeResults !== right.takeResults) {
        return false;
    }

    return areSortOptionsEqual(left.sortOptions, right.sortOptions)
        && areFiltersEqual(left.searchFilters, right.searchFilters);
}