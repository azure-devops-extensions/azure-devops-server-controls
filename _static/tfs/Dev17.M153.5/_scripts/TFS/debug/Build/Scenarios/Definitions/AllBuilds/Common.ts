import { Build, BuildStatus, BuildQueryOrder } from "TFS/Build/Contracts";

import { getHistoryService } from "VSS/Navigation/Services";

import { arrayEquals, subtract } from "VSS/Utils/Array";
import { equals, empty, localeIgnoreCaseComparer } from "VSS/Utils/String";

namespace NavigationKeyConstants {
    export const DefinitionId = "filterDefinitionId";
    export const Status = "filterStatus";
}

export namespace FilterDefaults {
    export const Status = BuildStatus.All;
    export const Order = BuildQueryOrder.QueueTimeDescending;
    export const Empty = empty;
    export const EmptyObject = {};
    export const EmptyArray = [];
    export const DefaultId = -1;
}

export enum BuildOrder {
    Descending,
    Ascending
}

export interface IRepositoryFilterData {
    id: string;
    type: string;
}

export interface IFilterData {
    status: BuildStatus;
    // Obvious, but worth reminding anyway, this is to get next data set, not the current token used to get the data
    continuationToken?: string;
    order: BuildQueryOrder;
    definitionId?: number;

    requestedFor?: string;
    queueId?: string;
    repositoryFilter?: IRepositoryFilterData;
    tags?: string[];
}

export function getFilter(filter: IFilterData): IFilterData {
    return {
        status: filter.status || FilterDefaults.Status,
        continuationToken: filter.continuationToken || FilterDefaults.Empty,
        order: filter.order || FilterDefaults.Order,
        definitionId: filter.definitionId || FilterDefaults.DefaultId,
        queueId: filter.queueId || FilterDefaults.Empty,
        repositoryFilter: filter.repositoryFilter || FilterDefaults.EmptyObject as IRepositoryFilterData,
        requestedFor: filter.requestedFor || FilterDefaults.Empty,
        tags: filter.tags || FilterDefaults.EmptyArray
    };
}

export function isBuildMatch(build: Build, filter: IFilterData) {
    if (!build) {
        return false;
    }

    if (!filter) {
        return true;
    }

    if (filter.status !== BuildStatus.All && build.status !== filter.status) {
        return false;
    }

    if (filter.definitionId > 0
        && build.definition
        && build.definition.id !== filter.definitionId) {
        return false;
    }

    if (!!filter.requestedFor
        && build.requestedFor
        && build.requestedFor.displayName !== filter.requestedFor) {
        return false;
    }

    if (!!filter.queueId
        && build.queue
        && (build.queue.id + "") !== filter.queueId) {
        return false;
    }

    if (!!filter.repositoryFilter && build.repository) {
        if (!!filter.repositoryFilter.id
            && !!build.repository.id
            && !equals(build.repository.id, filter.repositoryFilter.id, true)) {
            return false;
        }
        if (!!filter.repositoryFilter.type
            && !!build.repository.type
            && !equals(build.repository.type, filter.repositoryFilter.type, true)) {
            return false;
        }
    }

    if (filter.tags
        && build.tags
        && filter.tags.length > 0
        && subtract(filter.tags, build.tags, localeIgnoreCaseComparer).length > 0) {
        return false;
    }

    return true;
}

export function getCurrentBuildStatus(status?: string): BuildStatus {
    let statusText = status;
    if (!statusText) {
        const currentState = getHistoryService().getCurrentState();
        statusText = currentState[NavigationKeyConstants.Status];
    }

    statusText = (statusText || "").toLowerCase();

    let statusToConsider = BuildStatus.Completed;
    switch (statusText) {
        case BuildStatus[BuildStatus.Completed].toLowerCase():
            statusToConsider = BuildStatus.Completed;
            break;
        case BuildStatus[BuildStatus.InProgress].toLowerCase():
            statusToConsider = BuildStatus.InProgress;
            break;
        case BuildStatus[BuildStatus.NotStarted].toLowerCase():
            statusToConsider = BuildStatus.NotStarted;
            break;
        default:
            statusToConsider = FilterDefaults.Status;
    }

    return statusToConsider;
}

export function getCurrentDefinitionId(): number {
    const currentState = getHistoryService().getCurrentState();
    return getNumber(currentState[NavigationKeyConstants.DefinitionId]);
}

export function getBuildQueryOrder(status: BuildStatus, order: BuildOrder): BuildQueryOrder {
    order = order || BuildOrder.Descending;
    status = status || FilterDefaults.Status;

    let queryOrder: BuildQueryOrder = null;
    if (status == BuildStatus.Completed) {
        if (order == BuildOrder.Descending) {
            queryOrder = BuildQueryOrder.FinishTimeDescending;
        }
        else {
            queryOrder = BuildQueryOrder.FinishTimeAscending;
        }
    }
    else if (status == BuildStatus.InProgress) {
        if (order == BuildOrder.Descending) {
            queryOrder = BuildQueryOrder.StartTimeDescending;
        }
        else {
            queryOrder = BuildQueryOrder.StartTimeAscending;
        }
    }
    else {
        if (order == BuildOrder.Descending) {
            queryOrder = BuildQueryOrder.QueueTimeDescending;
        }
        else {
            queryOrder = BuildQueryOrder.QueueTimeAscending;
        }
    }

    return queryOrder;
}

export function getBuildOrder(order: BuildQueryOrder): BuildOrder {
    order = order || FilterDefaults.Order;

    switch (order) {
        case BuildQueryOrder.FinishTimeDescending:
        case BuildQueryOrder.QueueTimeDescending:
        case BuildQueryOrder.StartTimeDescending:
            return BuildOrder.Descending;
        case BuildQueryOrder.FinishTimeAscending:
        case BuildQueryOrder.QueueTimeAscending:
        case BuildQueryOrder.StartTimeAscending:
            return BuildOrder.Ascending;
    }
}

export function shouldApplyFilter(filter1: IFilterData, filter2: IFilterData) {
    let areEqual = true;
    if (filter1 && !filter2) {
        areEqual = false;
    }
    else if (filter2 && !filter1) {
        areEqual = false;
    }
    else if (filter1 && filter2) {
        const filter1Data = getFilter(filter1);
        const filter2Data = getFilter(filter2);
        // we are intentionally ignoring continuation token here, applying filter is independent of continuation tokens, so we always empty the continuation token when applying filter
        areEqual = (filter1Data.definitionId === filter2Data.definitionId)
            && filter1Data.order === filter2Data.order
            && filter1Data.status === filter2Data.status
            && filter1Data.requestedFor === filter2Data.requestedFor
            && filter1Data.queueId === filter2Data.queueId
            && areRepositoryFiltersEqual(filter1Data.repositoryFilter, filter2Data.repositoryFilter)
            && areTagsEqual(filter1Data.tags, filter2Data.tags)
    }

    return !areEqual;
}

export function areRepositoryFiltersEqual(filter1: IRepositoryFilterData, filter2: IRepositoryFilterData) {
    let areEqual = true;
    const filter1Data = filter1 || FilterDefaults.EmptyObject as IRepositoryFilterData;
    const filter2Data = filter2 || FilterDefaults.EmptyObject as IRepositoryFilterData;
    if (filter1Data && filter2Data) {
        areEqual = (filter1Data.id === filter2Data.id)
            && (filter1Data.type === filter2Data.type);
    }

    return areEqual;
}

export function areTagsEqual(filter1: string[], filter2: string[]) {
    let areEqual = true;
    const filter1Data = filter1 || FilterDefaults.EmptyArray;
    const filter2Data = filter2 || FilterDefaults.EmptyArray;
    if (filter1Data && filter2Data) {
        areEqual = (filter1Data.length === filter2Data.length)
            && (arrayEquals(filter1Data, filter2Data, (a, b) => equals(a, b, true)));
    }

    return areEqual;
}

export function isAscendingOrder(order: BuildQueryOrder) {
    const buildOrder = getBuildOrder(order);
    return buildOrder == BuildOrder.Ascending;
}

export function updateNavigationStateHistory(filterApplied: IFilterData) {
    const historyService = getHistoryService();
    const currentState = historyService.getCurrentState();
    let data = null;
    if (currentState[NavigationKeyConstants.Status] != BuildStatus[filterApplied.status]) {
        data = data || {};
        data[NavigationKeyConstants.Status] = BuildStatus[filterApplied.status];
    }

    if (getNumber(currentState[NavigationKeyConstants.DefinitionId]) != filterApplied.definitionId) {
        data = data || {};
        data[NavigationKeyConstants.DefinitionId] = filterApplied.definitionId;
    }

    if (!!data) {
        historyService.addHistoryPoint(
            currentState.action, //action
            data, //data
            null, //windowTitle
            true, //suppress navigate
            true); // merge current state;
    }
}

function getNumber(number: string): number {
    let numberResult = parseInt(number);
    return isNaN(numberResult) ? -1 : numberResult;
}