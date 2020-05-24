import { TfvcHistoryActionCreator } from "VersionControl/Scenarios/History/TfvcHistory/Actions/TfvcHistoryActionCreator";
import { AggregateState } from "VersionControl/Scenarios/History/TfvcHistory/Stores/TfvcChangeSetsStoresHub";
import { CriteriaChangedPayload } from "VersionControl/Scenarios/History/TfvcHistory/TfvcInterfaces";
import { PathState } from "VersionControl/Scenarios/Shared/Path/PathStore";

export interface UrlParameters {
    path?: string;
    itemPath?: string;
    userName?: string;
    userId?: string;
    fromDate?: string;
    toDate?: string;
    fromVersion?: string;
    toVersion?: string;
}

export function applyNavigatedUrl(actionCreator: TfvcHistoryActionCreator, rawState: UrlParameters, pageState: AggregateState): void {
    const existingUrlParameters = getUrlParameters(pageState, rawState);
    const isFirstTime = !pageState.pathState.path;  
    const {path, itemPath, userName, userId, fromVersion, toVersion, fromDate, toDate} = rawState;

    // both itempath and path are supported (based on item is selected or menu clicked)
    // logic same as history page - give preference to itemPath
    // ideally both itemPath and path will never co-exist in the Url
    const criteriaChangedPayload = {
        itemPath: itemPath || path || "",
        userId,
        userName,
        fromDate,
        toDate,
        fromVersion,
        toVersion,
    } as CriteriaChangedPayload;

    if (isFirstTime) {
        actionCreator.loadChangesets(criteriaChangedPayload);
    }

    if (!areEqualUrlParamters(rawState, existingUrlParameters)) {
        actionCreator.changeCriteria(criteriaChangedPayload);
    }
}

export function getUrlParameters(pageState: AggregateState, previousParameters: UrlParameters): UrlParameters {
    const params = {} as CriteriaChangedPayload;

    if (!pageState.pathState.isRoot || previousParameters.itemPath) {
        params.itemPath = pageState.pathState.path;
    }

    return $.extend(params, pageState.filterState);
}

export function areEqualUrlParamters(a: UrlParameters, b: UrlParameters): boolean {
    a = clearObject(a);
    b = clearObject(b);
    return (
        a.path === b.path &&
        a.itemPath === b.itemPath &&
        a.fromDate === b.fromDate &&
        a.toDate === b.toDate &&
        a.userName === b.userName &&
        a.userId === b.userId &&
        a.toVersion === b.toVersion &&
        a.fromVersion === b.fromVersion
    );
}

function clearObject(obj: any): any {
    Object.keys(obj).forEach(key => obj[key] == null && delete obj[key]);
    return obj;
}
