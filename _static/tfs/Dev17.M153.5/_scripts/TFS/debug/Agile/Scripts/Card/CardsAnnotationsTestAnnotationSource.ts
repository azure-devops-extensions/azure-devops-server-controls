import Agile_Boards = require("Agile/Scripts/TFS.Agile.Boards");
import Q = require("q");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { ILinkInfo } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";
import WIT_WebApi = require("TFS/WorkItemTracking/RestClient");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import Utils_Core = require("VSS/Utils/Core");

import Models = require("Agile/Scripts/Card/CardsAnnotationsTestAnnotationModels");
import Telemetry = require("Agile/Scripts/Card/CardsAnnotationsTestAnnotationTelemetry");

// Annotation Source
export class TestSuiteSource extends Agile_Boards.AnnotationItemSource {
    private _testStore: Models.ITestStore;

    // These are public for UTs
    public testCaseWorkItemType: string;
    public testedByParentLinkTypeId: number;
    public testedByChildLinkTypeId: number;
    public teamId: string;
    public static sourceType: string = "testSuite";
    public getDefaultTestCaseWorkItemType: () => IPromise<string>;

    constructor(parentSource: Agile_Boards.ItemSource, teamId: string) {
        super(parentSource, teamId);
        this._testStore = new Models.TestStore(teamId);
        this.teamId = teamId;
        this._initializeTestedByLinkIds();
        this.getDefaultTestCaseWorkItemType = Utils_Core.delegate(this, this._getDefaultTestCaseWorkItemType);
    }

    public type(): string {
        return TestSuiteSource.sourceType;
    }

    public addItem(id: number, suiteModel: Models.ITestSuiteModel) {
        this._testStore.setSuite(id, suiteModel);
    }

    public getItem(id: number): Models.ITestSuiteModel {
        return this._testStore.getSuite(id);
    }

    public refreshItem(id: number) {
        return this._testStore.refreshSuite(id);
    }

    public getItems(ids: number[]): Models.ITestSuiteModel[] {
        var suites: Models.ITestSuiteModel[] = [];
        $.each(ids, (index, requirementId: number) => {
            var suite = this._testStore.getSuite(requirementId);
            if (suite) {
                suites.push(suite);
            }
        });

        return suites;
    }

    public beginGetItem(id: number, args?: Agile_Boards.WorkItemChangeEventArgs): IPromise<Models.ITestSuiteModel> {
        return this.beginGetItems([id], args)
            .then((suites: Models.ITestSuiteModel[]) => {
                if (suites && suites.length > 0) {
                    return suites[0];
                }
                return null;
            });
    }

    public beginGetItems(ids: number[], args?: Agile_Boards.WorkItemChangeEventArgs): IPromise<Models.ITestSuiteModel[]> {

        if (args && !this._handleLinkChanges(args.links)) {
            return Q(undefined);
        }

        Telemetry.TelemeteryHelper.startPerfScenario(Telemetry.PerfScenarios.GetTestSuites);

        return this._testStore.beginFetchSuites(ids)
            .then((requirementIds: number[]) => {

                var fetchedSuites: Models.ITestSuiteModel[] = [];

                $.each(requirementIds, (i, requirementId: number) => {
                    var suite = this._testStore.getSuite(requirementId);
                    if (suite) {
                        fetchedSuites.push(suite);
                    }
                });

                this.parentSource.raiseEventForAnnotationItemSource(requirementIds, this);

                Telemetry.TelemeteryHelper.endPerfScenario(Telemetry.PerfScenarios.GetTestSuites);
                Telemetry.TelemeteryHelper.publishFeatureTelemetry(Telemetry.FeatureScenarios.GetTestSuites, { "Count": requirementIds.length });

                return fetchedSuites;
            });
    }

    public dispose() {
        this._testStore.dispose();
    }

    private _getDefaultTestCaseWorkItemType(): IPromise<string> {
        if (!this.testCaseWorkItemType) {
            var witClient = WIT_WebApi.getClient();
            var project = TFS_Host_TfsContext.TfsContext.getDefault().contextData.project.name;
            return witClient.getWorkItemTypeCategory(project, "Microsoft.TestCaseCategory")
                .then((workItemTypeCategory) => {
                    this.testCaseWorkItemType = workItemTypeCategory.defaultWorkItemType.name;
                    return this.testCaseWorkItemType;
                });
        }

        return Q.resolve(this.testCaseWorkItemType);
    }

    private _handleLinkChanges(links: ILinkInfo[]): boolean {
        if (links) {
            for (var i = 0, len = links.length; i < len; i++) {
                if (links[i].linkData) {
                    if (links[i].linkData.LinkType === this.testedByParentLinkTypeId) { // This item is the child
                        this.beginGetItem(links[i].targetId);
                        return false;
                    }
                    else if (links[i].linkData.LinkType === this.testedByChildLinkTypeId) { // This item is the parent
                        return true;
                    }
                }
            }
        }
        return false;
    }

    private _initializeTestedByLinkIds() {
        var witStore = TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
        if (witStore) {
            witStore.beginGetLinkTypes(() => {
                var testedByReverseLink = witStore.findLinkTypeEnd("Microsoft.VSTS.Common.TestedBy-Reverse");
                if (testedByReverseLink) {
                    this.testedByParentLinkTypeId = testedByReverseLink.id;
                }

                var testedByForwardLink = witStore.findLinkTypeEnd("Microsoft.VSTS.Common.TestedBy-Forward");
                if (testedByForwardLink) {
                    this.testedByChildLinkTypeId = testedByForwardLink.id;
                }
            });
        }
    }
}



