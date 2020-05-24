import * as _AgileCommon from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import * as Constants from "Search/Scenarios/WorkItem/Constants";
import * as _AreaNodesSource from "Search/Scenarios/WorkItem/Flux/Sources/AreaNodesSource";
import { AggregatedState, getDefaultPath, getOnlyAppliedFilterInCategory } from "Search/Scenarios/WorkItem/Flux/StoresHub";
import { WorkItemSearchRequest, WorkItemSearchResponse } from "Search/Scenarios/WebApi/WorkItem.Contracts";

export interface AreaNodeRetrievalInvokers {
    areaNodeRetrievalFailed: () => void;
    areaNodeRetrieved: (project: string, areaNode: _AgileCommon.INode) => void;
    knownAreaNodeFetched: (project: string, areaNode: _AgileCommon.INode) => void;
    udpateDefaultAreaPath: (path: string) => void;
}

/**
 * Implementation of action creators that retrieve area paths.
 */
export class AreaNodeRetrievalBridge {
    constructor(
        private readonly invokers: AreaNodeRetrievalInvokers,
        private readonly areaNodeSource: _AreaNodesSource.AreaNodesSource,
        private readonly getAggregatedState: () => AggregatedState) {
    }

    public getAreaNode = (query: WorkItemSearchRequest, response: WorkItemSearchResponse): void => {
        const defaultPath = getDefaultPath(query.searchFilters);
        const project = getOnlyAppliedFilterInCategory(response.filterCategories, Constants.FilterKeys.ProjectFiltersKey);

        if (project) {
            const requestedPath = defaultPath || project;
            this.invokers.udpateDefaultAreaPath(requestedPath);

            const { knownAreaNodeState } = this.getAggregatedState();
            const knownAreaNode = knownAreaNodeState.knownNodes[project.toLowerCase()];
            if (knownAreaNode) {
                this.invokers.knownAreaNodeFetched(project, knownAreaNode);
            }
            else {
                this.areaNodeSource
                    .getAreaNode(project)
                    .then((areaNode: _AgileCommon.INode) => {
                        this.invokers.areaNodeRetrieved(project, areaNode);
                    }, reject => {
                        this.invokers.areaNodeRetrievalFailed()
                    });
            }
        }
    }
}
