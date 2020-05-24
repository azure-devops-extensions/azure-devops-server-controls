import Context = require("VSS/Context");
import Artifacts_Services = require("VSS/Artifacts/Services");
import Utils_Array = require("VSS/Utils/Array");
import TFS_Core_Utils = require("Presentation/Scripts/TFS/TFS.Core.Utils");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import TFS_Build_Contracts = require("TFS/Build/Contracts");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import BuildClient = require("Build.Common/Scripts/ClientServices");
import BuildClientContracts = require("Build.Common/Scripts/ClientContracts");

export class BuildWidgetConstants {
    static MAX_BUILDS_PER_DEFINITION: number = 10;
    static TOP_BUILD_DEFINITIONS: number = 5;
    static DEFAULT_COLLECTION_NAME = "DefaultCollection";
}

export interface IBuildData {
    id: number;
    buildNumber: string;
    status: TFS_Build_Contracts.BuildStatus;
    result: TFS_Build_Contracts.BuildResult;
    startTime: Date;
    finishTime: Date;
    definition: TFS_Build_Contracts.DefinitionReference;
}

export interface IBuildDefinitionData {
    buildDefinitionId: number;
    buildDefinitionTitle: string;
    lastNBuilds: IBuildData[];
}

export interface IMyBuildDefinitionResults {
    buildDefinitions: IBuildDefinitionData[];
    totalBuildDefinitionsCount: number;
}

export class Utils {
    public static getProjectTfsContext(projectName: string, projectId: string): TFS_Host_TfsContext.TfsContext {
        var webContext: Contracts_Platform.WebContext = <Contracts_Platform.WebContext> $.extend(true, {}, Context.getDefaultWebContext(), {
            collection: Utils.createCollectionHostContext(BuildWidgetConstants.DEFAULT_COLLECTION_NAME, TFS_Core_Utils.GUIDUtils.newGuid()),
            host: Utils.createExtendedHostContextExtension(BuildWidgetConstants.DEFAULT_COLLECTION_NAME, Contracts_Platform.ContextHostType.ProjectCollection),
            project: { id: projectId, name: projectName },
        });
        return new TFS_Host_TfsContext.TfsContext(webContext);
    }

    public static createCollectionHostContext(collectionName: string, uri: string = ""): Contracts_Platform.HostContext {
        return {
            id: "",
            name: collectionName,
            relativeUri: "/" + collectionName + "/",
            uri: uri
        };
    }

    public static createExtendedHostContextExtension(name: string, type: Contracts_Platform.ContextHostType): any {
        return {
            name: name,
            hostType: type,
            relativeUri: type === Contracts_Platform.ContextHostType.ProjectCollection ? "/" + name + "/" : ""
        };
    }
}

export class BuildManager {
    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _buildClient: BuildClient.BuildHttpClient;

    constructor(tfsContext: TFS_Host_TfsContext.TfsContext) {
        if (!tfsContext) {
            throw new Error("tfsContext is required");
        }
        this._tfsContext = tfsContext;
    }

    public beginGetFavoriteBuilds(projectName: string, projectId: string): JQueryPromise<IMyBuildDefinitionResults> {
        this._tfsContext = Utils.getProjectTfsContext(projectName, projectId);

        var deferred = jQuery.Deferred<IMyBuildDefinitionResults>();
        var buildDefinitionResults: IMyBuildDefinitionResults;
        this._buildClient = this._getBuildClient(this._tfsContext);
        
        $.when(this._beginGetMyFavorite())
            .done((myFavoriteItems: TFS_OM_Common.FavoriteItem[]) => {
            var favoriteBuildsUri: string[] = [];
            favoriteBuildsUri = $.map(myFavoriteItems, (item) => { return item.data });
            var totalBuildDefinitionsCount = favoriteBuildsUri.length;
            //no favorite build
            if (totalBuildDefinitionsCount === 0) {
                deferred.resolve({
                    buildDefinitions: [],
                    totalBuildDefinitionsCount: totalBuildDefinitionsCount
                });
            } else {//for now we only query top N build defintion by deault order
                var favoriteBuildsId: string[] = $.map(favoriteBuildsUri.slice(0, BuildWidgetConstants.TOP_BUILD_DEFINITIONS),
                    (uri) => {
                        var buildArtifactData = Artifacts_Services.LinkingUtilities.decodeUri(uri);
                        return buildArtifactData.id;
                    });

                var buildFilter: BuildClientContracts.IBuildFilter = {
                    project: projectId,
                    definitions: favoriteBuildsId.join(","),
                    statusFilter: TFS_Build_Contracts.BuildStatus.Completed | TFS_Build_Contracts.BuildStatus.InProgress,
                    maxBuildsPerDefinition: BuildWidgetConstants.MAX_BUILDS_PER_DEFINITION,
                    $top: BuildWidgetConstants.TOP_BUILD_DEFINITIONS * BuildWidgetConstants.MAX_BUILDS_PER_DEFINITION
                }

                this._getBuildDefinitionData(favoriteBuildsId, buildFilter).done((buildDefinitionDataList) => {
                    buildDefinitionResults = {
                        buildDefinitions: buildDefinitionDataList,
                        totalBuildDefinitionsCount: totalBuildDefinitionsCount
                    };
                    deferred.resolve(buildDefinitionResults);
                }).fail((error: any) => {
                        deferred.reject(error);
                    })
            }}).fail((error: any) => {
                deferred.reject(error);
            })
        return deferred.promise();
    }

    private _getBuildClient(tfsContext: TFS_Host_TfsContext.TfsContext): BuildClient.BuildHttpClient {
        var connection = TFS_OM_Common.ProjectCollection.getConnection(tfsContext);
        return connection.getHttpClient<BuildClient.BuildHttpClient>(BuildClient.BuildHttpClient);
    }
    private _getBuildDefinitionData(favoriteBuildsId: string[], buildFilter: BuildClientContracts.IBuildFilter): JQueryPromise<IBuildDefinitionData[]> {
        var deferred = $.Deferred<IBuildDefinitionData[]>();
        var projectId = this._tfsContext.contextData.project.id;
        var buildDefinitionDataList: IBuildDefinitionData[] = [];

        this._buildClient.getBuilds2(projectId, buildFilter).then((buildsResult: BuildClientContracts.GetBuildsResult) => {
            if (buildsResult.builds.length > 0) {
                    //group all builds by build definition
                    var buildDifintionData = {};
                    favoriteBuildsId.forEach((buildDefinitionId) => {
                        buildDifintionData[buildDefinitionId] = [];
                    });
                    buildsResult.builds.forEach((build) => {
                        var buildDefinitionId = build.definition.id;
                        if (buildDefinitionId in buildDifintionData) {
                            var buildData: IBuildData = {
                                id: build.id,
                                buildNumber: build.buildNumber,
                                status: build.status,
                                result: build.result,
                                startTime: build.startTime,
                                finishTime: build.finishTime,
                                definition: build.definition
                            }
                            buildDifintionData[buildDefinitionId].push(buildData);
                        }
                    });
                    //generate IBuildDefinitionData, don't show empty build definition on build widget
                    for (var buildDefinitionId in buildDifintionData) {
                        var buildDataList = buildDifintionData[buildDefinitionId];
                        if (buildDataList.length > 0) {
                            var lastBuild = buildDataList[0];
                            buildDefinitionDataList.push({
                                buildDefinitionId: lastBuild.definition.id,
                                buildDefinitionTitle: lastBuild.definition.name,
                                lastNBuilds: buildDataList
                            });
                        }
                    }
                }
                deferred.resolve(buildDefinitionDataList);
            },
            (error: any) => {
                deferred.reject(error);
            });

        return deferred.promise();
    }

    private _beginGetMyFavorite(): JQueryPromise<TFS_OM_Common.FavoriteItem[]> {
        var deferred = $.Deferred<TFS_OM_Common.FavoriteItem[]>();
        TFS_OM_Common.FavoriteStore.beginGetFavoriteStore(
            this._tfsContext,
            TFS_Host_TfsContext.NavigationContextLevels.Project,
            null,
            TFS_OM_Common.FavoriteStore.FAVORITE_STORE_SCOPE_FAVORITE_BUILD_DEFINITIONS,
            "My Favorites",
            false,
            (favStore) => { deferred.resolve(favStore.children); },
            (error: any) => { deferred.reject(error); });

        return deferred.promise();
    }

        public __test() {
        var that = this;
        return {
            tfsContext: that._tfsContext,
        }
    }
}
