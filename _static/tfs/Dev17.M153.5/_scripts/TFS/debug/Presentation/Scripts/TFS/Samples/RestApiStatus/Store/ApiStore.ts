import ApiDocs from "Presentation/Scripts/TFS/Samples/RestApiStatus/Data/apidocs";
import ApiReviews from "Presentation/Scripts/TFS/Samples/RestApiStatus/Data/apireviews";
import * as BuildContracts from "TFS/Build/Contracts";
import * as BuildClient from "TFS/Build/RestClient";
import * as VSS_Ajax from "VSS/Ajax";
import { getDefaultWebContext } from "VSS/Context";
import { getClient } from "VSS/Service";
import * as FileContainerClient from "VSS/FileContainer/RestClient";
import FallbackApis_Async from "Presentation/Scripts/TFS/Samples/RestApiStatus/Data/FallbackApis";
import { IGroup } from "OfficeFabric/GroupedList";
import { IFilter, IFilterState, FILTER_CHANGE_EVENT } from "VSSUI/Utilities/Filter";
import { ObservableValue } from "VSS/Core/Observable";
import { IViewOptions, VIEW_OPTIONS_CHANGE_EVENT, IViewOptionsValues } from "VSSUI/Utilities/ViewOptions";
import { autobind } from "OfficeFabric/Utilities";

export interface ApiSet {
    version: string;
    apis: Api[];
}

export interface Api {
    area: string;
    resource: string;

    version: string;
    minVersion: string;
    released: boolean;
    internalUseOnly: boolean;
    nonBrowsable: boolean;

    httpMethod: string;
    methodName: string;
    routeTemplate: string;
    locationId: string;

    privateScopes: string[];
    publicScopes: string[];
    //deprecatedScopes: string;

    clients: string[];

    latestReview: ApiReview;
    doc: ApiDoc;
}

export interface ApiReview {
    area: string;
    resources?: string[];
    date?: string;
}

export interface ApiDoc {
    area: string;
    resource: string;
    url?: string;
}

export type HttpMethod = "Get" | "Put" | "Patch" | "Delete" | "Post";
export type ApiStatus = "Reviewed" | "Not reviewed" | "Documented" | "Undocumented" | "Preview" | "Out of preview";

export interface RestApiFilterData {
    area?: string;
    keywords?: string;
    httpMethods?: HttpMethod[];
    statuses?: ApiStatus[];
}

export class ApiStore {
    private _allApis: Api[];
    private _apis: ObservableValue<Api[]>;
    private _loading: boolean;
    private _apiReviews: ApiReview[];

    private _filterValue: RestApiFilterData;
    private _groupMap: {[key: string]: IGroup};
    private _selectedGroup: ObservableValue<IGroup | null>;

    public get apis(): ObservableValue<Api[]> {
        return this._apis;
    }

    public get allApis(): Api[] {
        return this._allApis || [];
    }
    public get selectedGroup(): ObservableValue<IGroup | null> {
        return this._selectedGroup;
    }
    
    constructor(private _filter: IFilter, private _viewOptions: IViewOptions) {
        this._apis = new ObservableValue([]);
        this._selectedGroup = new ObservableValue(null);
        this._loading = true;

        // Ensure we heed pre-existing state, such as the URL
        this._viewOptions.subscribe(this._onFilterCriteriaChanged, VIEW_OPTIONS_CHANGE_EVENT);
        this._filter.subscribe(this._onFilterCriteriaChanged, FILTER_CHANGE_EVENT);

        this._load();
    }

    @autobind
    private _onFilterCriteriaChanged() {
        const filterState = this._filter.getState();
        const keyword = filterState["keyword"];
        const httpMethods = filterState["httpMethod"];
        const statuses = filterState["other"];
        const area = filterState["area"];
        this.setFilterValue({
            keywords: keyword && (keyword.value as string),
            httpMethods: httpMethods && (httpMethods.value as HttpMethod[]),
            statuses: statuses && (statuses.value as ApiStatus[]),
            area: area && area.value,
            ...this._viewOptions.getViewOptions(),
        });
        this._selectedGroup.value = this.getGroup(this._viewOptions.getViewOption("area"));
    }

    private getApis(): void {
        let result: Api[];
        if (this._loading) {
            result = [];
        } else {
            if (this._filterValue) {
                const area = (this._filterValue.area || "").trim().toLocaleLowerCase();
                const keyword = (this._filterValue.keywords || "").trim().toLocaleLowerCase();
                const httpMethods = (this._filterValue.httpMethods || []).map(m => m.trim().toLocaleLowerCase());
                const statuses = (this._filterValue.statuses || []).map(m => m.trim().toLowerCase());
                if (area === "" && keyword === "" && httpMethods.length === 0 && statuses.length === 0) {
                    result = this._allApis || [];
                } else {
                    result = this._allApis.filter(api => {
                        if (this._filterValue.area) {
                            if (api.area.toLocaleLowerCase() !== area) {
                                return false;
                            }
                        }
                        if (this._filterValue.keywords) {
                            if (keyword) {
                                if (
                                    api.area.toLocaleLowerCase().indexOf(keyword) === -1 &&
                                    api.resource.toLocaleLowerCase().indexOf(keyword) === -1
                                ) {
                                    return false;
                                }
                            }
                        }
                        if (this._filterValue.httpMethods) {
                            if (httpMethods.length > 0) {
                                if (httpMethods.indexOf(api.httpMethod.toLocaleLowerCase()) === -1) {
                                    return false;
                                }
                            }
                        }
                        if (this._filterValue.statuses) {
                            if (statuses.length > 0) {
                                if (statuses.indexOf("reviewed") >= 0 && !api.latestReview) {
                                    return false;
                                } else if (statuses.indexOf("not reviewed") >= 0 && api.latestReview) {
                                    return false;
                                } else if (statuses.indexOf("documented") >= 0 && !api.doc) {
                                    return false;
                                } else if (statuses.indexOf("undocumented") >= 0 && api.doc) {
                                    return false;
                                } else if (statuses.indexOf("preview") >= 0 && api.released) {
                                    return false;
                                } else if (statuses.indexOf("out of preview") >= 0 && !api.released) {
                                    return false;
                                }
                            }
                        }
                        return true;
                    });
                }
            } else {
                result = this._allApis;
            }
        }
        this._apis.value = result;
    }

    public getGroup(name: string) {
        if (!this._groupMap) {
            return null;
        }
        return this._groupMap[name];
    }

    /**
     * Get list of groups for the given APIs.
     * @param apis To get groups for. Otherwise use all apis.
     */
    public getGroups(apis?: Api[]): IGroup[] {
        const items: Api[] = apis || this._allApis || [];

        // Note: this method borrowed from Fabric's grouped details list example
        const groups: IGroup[] = items.reduce<IGroup[]>((currentGroups, currentItem: Api, index) => {
            const lastGroup = currentGroups[currentGroups.length - 1];
            const area = currentItem.area;

            if (!lastGroup || lastGroup.name !== area) {
                currentGroups.push({
                    key: "group" + area + index,
                    name: area,
                    startIndex: index,
                    level: 0,
                    count: 0,
                    isCollapsed: true,
                });
            }

            if (lastGroup) {
                lastGroup.count = index - lastGroup.startIndex;
            }

            return currentGroups;
        }, []);

        // Fix last group count
        const lastGroup = groups[groups.length - 1];

        if (lastGroup) {
            lastGroup.count = items.length - lastGroup.startIndex;
        }

        // Only group things if there is more than one group.
        if (groups.length > 1) {
            return groups;
        }
        return null;
    }

    public setFilterValue(data: RestApiFilterData) {
        this._filterValue = data;
        this.getApis();
    }

    private async _loadApisFromBuild(
        projectId: string,
        buildDefinitionId: number,
        branchName: string = "master",
        dropName: string = "drop",
    ): Promise<ApiSet> {
        const buildClient = getClient(BuildClient.BuildHttpClient4_1);
        const fileContainerClient = getClient(FileContainerClient.FileContainerHttpClient4_1);

        const builds = await buildClient.getBuilds(
            projectId,
            [buildDefinitionId],
            null,
            null,
            null,
            null,
            null,
            null,
            BuildContracts.BuildStatus.Completed,
            BuildContracts.BuildResult.Succeeded,
            null,
            null,
            10,
        );

        const masterBuilds = builds.filter(b => b.sourceBranch === "refs/heads/" + branchName);
        if (masterBuilds.length === 0) {
            return null;
        }

        const build = masterBuilds[0];
        const artifact = await buildClient.getArtifact(build.id, "drop", build.project.id);
        const containerId = Number(artifact.resource.data.match(/(\d)+/)[0]);
        const files = await fileContainerClient.getItems(containerId, null, "drop/apis.json", true);

        const results = await VSS_Ajax.issueRequest(files[0].contentLocation, {});
        const apiSet = JSON.parse(results) as ApiSet;
        return apiSet;
    }

    private async _load() {
        this._loading = true;
        const context = getDefaultWebContext();
        const apiSet =
            (await this._loadApisFromBuild(context.project.name, 1208, "master", "drop")) ||
            (await new Promise<{ default: ApiSet }>((resolve, reject) => {
                require(["Presentation/Scripts/TFS/Samples/RestApiStatus/Data/FallbackApis"], resolve);
            })).default;
        this._loading = false;
        this._initStore(apiSet, ApiReviews, ApiDocs);
        this.getApis();
    }

    private _initStore(apiSet: ApiSet, apiReviews: ApiReview[], apiDocs: ApiDoc[]) {
        for (const api of apiSet.apis) {
            api.area = api.area.toLowerCase();
            api.resource = api.resource.toLowerCase();
        }

        // Sort APIs by area and resource
        const methodOrder = ["get", "post", "put", "patch", "delete"];
        apiSet.apis.sort((a: Api, b: Api): number => {
            // Sort by area
            const areaCompare = a.area.toLocaleLowerCase().localeCompare(b.area.toLocaleLowerCase());
            if (areaCompare !== 0) {
                return areaCompare;
            }

            // Then by resource
            const resourceCompare = a.resource.toLocaleLowerCase().localeCompare(b.resource.toLocaleLowerCase());
            if (resourceCompare !== 0) {
                return resourceCompare;
            }

            // Then by HTTP Method
            return methodOrder.indexOf(a.httpMethod.toLowerCase()) - methodOrder.indexOf(b.httpMethod.toLowerCase());
        });

        const apiReviewsByArea: { [id: string]: ApiReview[] } = {};

        // Build up reviews dictionary
        for (const apiReview of apiReviews) {
            apiReview.area = apiReview.area.toLowerCase();
            if (apiReview.resources) {
                apiReview.resources.map(r => r.toLowerCase());
            }

            if (!apiReviewsByArea[apiReview.area]) {
                apiReviewsByArea[apiReview.area] = [];
            }

            apiReviewsByArea[apiReview.area].push(apiReview);
        }

        // Normalize docs array
        for (const apiDoc of apiDocs) {
            apiDoc.area = apiDoc.area.toLowerCase();
            apiDoc.resource = apiDoc.resource.toLowerCase();
        }

        for (const api of apiSet.apis) {
            // Apply default API version to APIs without a version
            if (!api.version && apiSet.version) {
                api.version = apiSet.version;
            }

            // Attach reviews
            const reviews = apiReviewsByArea[api.area];
            if (reviews) {
                for (const apiReview of reviews) {
                    if (!apiReview.resources || apiReview.resources.indexOf(api.resource) >= 0) {
                        api.latestReview = apiReview;
                    }
                }
            }

            // Attach docs
            const docs = apiDocs.filter(apiDoc => {
                return apiDoc.area === api.area && apiDoc.resource === api.resource;
            });

            if (docs && docs.length > 0) {
                api.doc = docs[0];
            }
        }
        this._allApis = apiSet.apis;

        const groups = this.getGroups();
        this._groupMap = {};
        for (const group of groups) {
            this._groupMap[group.name] = group;
        }
    }
}
