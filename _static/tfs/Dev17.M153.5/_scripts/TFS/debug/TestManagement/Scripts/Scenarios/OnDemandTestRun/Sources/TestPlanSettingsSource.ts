import  * as q from "q";
import  * as VSS from "VSS/VSS";
import  * as Utils_String from "VSS/Utils/String";

import * as BuildClientContracts from "Build.Common/Scripts/ClientContracts";
import * as BuildClientServices from "Build.Common/Scripts/Api2.2/ClientServices";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as TFS_OM_Common from "Presentation/Scripts/TFS/TFS.OM.Common";
import * as RMContracts from "ReleaseManagement/Core/Contracts";
import * as BuildContracts from "TFS/Build/Contracts";
import * as TCMContracts from "TFS/TestManagement/Contracts";

import  { TestOutcomePropagationHelper } from "TestManagement/Scripts/TestHubLite/TFS.TestManagement.TestOutcomePropagationHelper";
import  * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import  * as TFS_RMService_LAZY_LOAD from "TestManagement/Scripts/Services/TFS.ReleaseManagement.Service";
import  * as Services_LAZY_LOAD from "TestManagement/Scripts/Services/Services.Common";
import  * as TMService from "TestManagement/Scripts/TFS.TestManagement.Service";
import  * as ReleaseDataHelper from "TestManagement/Scripts/Utils/TFS.TestManagement.ReleaseDataHelper";

export class TestPlanSettingsSource {
    constructor() {
        this._buildClient = TFS_OM_Common.ProjectCollection
            .getConnection(TfsContext.getDefault())
            .getService<BuildClientServices.BuildClientService>(BuildClientServices.BuildClientService);
        this._cachedBuilds = {};
        this._releaseDataHelper = new ReleaseDataHelper.ReleaseDataHelper();
    }

    public fetchBuildDefinitions(): IPromise<IKeyValuePair<number, string>[]> {

        let defer = q.defer<IKeyValuePair<number, string>[]>();
        this.getBuildClient().beginGetDefinitions().then((buildDefs: BuildContracts.DefinitionReference[]) => {
            const builddefsKeyValPairs: IKeyValuePair<number, string>[] = buildDefs.sort((b1, b2) => {
                return Utils_String.localeIgnoreCaseComparer(b1.name, b2.name);
            }).map((builddef) => {
                return {
                    key: builddef.id,
                    value: builddef.name
                } as IKeyValuePair<number, string>;
            });
            defer.resolve(builddefsKeyValPairs);
        }, (error) => {
            defer.reject(error);
        });
        return defer.promise;
    }


    public fetchBuilds(buildDefId: number): IPromise<IKeyValuePair<number, string>[]> {
        if (this._cachedBuilds.hasOwnProperty(buildDefId.toString())) {
            return q.resolve(this._cachedBuilds[buildDefId]);
        } else {
            const defer = q.defer<IKeyValuePair<number, string>[]>();
            const buildFilter: BuildClientContracts.IBuildFilter = {};
            buildFilter.definitions = buildDefId.toString();
            buildFilter.resultFilter = (BuildContracts.BuildResult.Succeeded | BuildContracts.BuildResult.PartiallySucceeded);

            // TODO: Use Batching and check if we can use the build client service
            this.getBuildClient().getBuilds(buildFilter).then((buildResults: BuildClientContracts.GetBuildsResult) => {
                let buildsKeyValPairs: IKeyValuePair<number, string>[] = [];
                if (buildResults) {
                    buildsKeyValPairs = buildResults.builds.map((build) => {
                        return {
                            key: build.id,
                            value: build.buildNumber
                        } as IKeyValuePair<number, string>;
                    });
                }
                this._cachedBuilds[buildDefId] = buildsKeyValPairs;
                defer.resolve(buildsKeyValPairs);
            }, (error) => {
                defer.reject(error);
            });
            return defer.promise;
        }
    }

    public fetchAssociatedReleaseDefinitions(buildDefId: number, forceRefresh: boolean): IPromise<IKeyValuePair<number, string>[]> {
        return this._releaseDataHelper.fetchAssociatedReleaseDefinitions(buildDefId, forceRefresh);
    }

    public fetchAssociatedReleaseEnvDefinitions(releaseDefId: number): IPromise<IKeyValuePair<number, string>[]> {
        return this._releaseDataHelper.fetchAssociatedReleaseEnvDefinitions(releaseDefId);
    }

    public associateReleaseDefinitionToTestPlan(
        testPlanId: number, buildDefId: number, buildId: number, releaseDefId: number, releaseEnvDefId: number
    ): IPromise<TCMContracts.TestPlan> {
        const defer = q.defer<TCMContracts.TestPlan>();
        // below can be undefined if user only selects BuildDefinition and no release
        releaseDefId = !!releaseDefId ? releaseDefId : 0;
        releaseEnvDefId = !!releaseEnvDefId ? releaseEnvDefId : 0;
        const planUpdateModel: TCMContracts.PlanUpdateModel = {
            buildDefinition: { id: buildDefId.toString() } as TCMContracts.ShallowReference,
            build: { id: buildId.toString() } as TCMContracts.ShallowReference,
            releaseEnvironmentDefinition: {
                definitionId: releaseDefId ,
                environmentDefinitionId: releaseEnvDefId
            }
        } as TCMContracts.PlanUpdateModel;

        TMService.ServiceManager.instance().testPlanningService().updateTestPlan(planUpdateModel, testPlanId).then((testPlan: TCMContracts.TestPlan) => {
            if (testPlan &&
                testPlan.id === testPlanId &&
                testPlan.buildDefinition.id === buildDefId.toString() &&
                testPlan.releaseEnvironmentDefinition.definitionId === releaseDefId &&
                testPlan.releaseEnvironmentDefinition.environmentDefinitionId === releaseEnvDefId) {
                defer.resolve(testPlan);
            } else {
                defer.resolve(null);
            }
        }, (error) => {
            defer.reject(error);
        });
        return defer.promise;
    }

    public getTestOutcomeSettingsForTestPlan(planId: number): IPromise<boolean> {
        return TestOutcomePropagationHelper.beginGetTestOutcomeSettings(planId);
    }

    public saveTestOutcomeSettingsForTestPlan(planId: number, outcome: boolean): IPromise<any> {
        return TestOutcomePropagationHelper.beginSetTestOutcomeSettings(planId, outcome);
    }

    public getBuildClient() {
        return this._buildClient;
    }

    private _buildClient: BuildClientServices.BuildClientService;
    private _cachedBuilds: IDictionaryNumberTo<IKeyValuePair<number, string>[]>;
    private _releaseDataHelper: ReleaseDataHelper.ReleaseDataHelper;
}
