import ko = require("knockout");
import Q = require("q");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import WIT_Contracts = require("TFS/WorkItemTracking/Contracts");
import WIT_WebApi = require("TFS/WorkItemTracking/RestClient");
import TCM_Contracts = require("TFS/TestManagement/Contracts");
import TCM_WebApi = require("TFS/TestManagement/RestClient");
import VSS_Common_Contracts = require("VSS/WebApi/Contracts");

import Contracts = require("Agile/Scripts/Card/CardsAnnotationsTestAnnotationContracts");
import WebApi = require("Agile/Scripts/Card/CardsAnnotationsTestAnnotationWebApi");
import Telemetry = require("Agile/Scripts/Card/CardsAnnotationsTestAnnotationTelemetry");
import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");
import Utils_String = require("VSS/Utils/String");

TFS_Knockout.overrideDefaultBindings()

var parentTestedByLinkName = "Microsoft.VSTS.Common.TestedBy-Reverse";

export interface ITestSuiteModel {
    testSuiteId: number;
    testPlanId: number;
    testPoints: KnockoutObservableArray<ITestPointModel>;
    refresh: (teamId: string, requirementId: number) => IPromise<number>;
    updateTestCasesOrder: (testCasesOrder: TCM_Contracts.SuiteEntryUpdateModel[]) => IPromise<TCM_Contracts.SuiteEntryUpdateModel[]>;
}

export class TestSuiteModel implements ITestSuiteModel {
    public testSuiteId = 0;
    public testPlanId = 0;
    public testPoints: KnockoutObservableArray<ITestPointModel> = ko.observableArray([]);

    constructor(suite?: Contracts.ITestSuite) {
        if (suite) {
            this._populate(suite);
        }
    }

    public refresh(teamId: string, requirementId: number): IPromise<number> {
        return WebApi.getClient().beginRefreshSuite(teamId, requirementId, this.testPlanId, this.testSuiteId)
            .then((suite: Contracts.ITestSuite) => {
                this._populate(suite);
                return this.testSuiteId;
            });
    }

    public updateTestCasesOrder(testCasesOrder: TCM_Contracts.SuiteEntryUpdateModel[]): IPromise<TCM_Contracts.SuiteEntryUpdateModel[]> {
        var tcmClient = TCM_WebApi.getClient();
        var project = TFS_Host_TfsContext.TfsContext.getDefault().contextData.project.name;
        return tcmClient.reorderSuiteEntries(testCasesOrder, project, this.testSuiteId);
    }

    private _populate(suite: Contracts.ITestSuite) {
        this.testSuiteId = suite.testSuiteId;
        this.testPlanId = suite.testPlanId;
        var points: ITestPointModel[] = [];
        if (suite.testPoints) {
            $.each(suite.testPoints, (i, testPoint: Contracts.ITestPoint) => {
                points.push(new TestPointModel(testPoint));
            });
        }
        this.testPoints(points);
    }
}

export interface ITestPointModel {
    id: KnockoutObservable<number>;
    testCase: KnockoutObservable<ITestCaseModel>;
    outcome: KnockoutObservable<Contracts.TestOutcome>;
    //TODO: Move errorMessage and isErrorOccured in TestPointViewModel
    isErrorOccured: KnockoutComputed<boolean>;
    errorMessage: KnockoutObservable<string>;
    sequenceNumber: KnockoutObservable<number>;
    setOutcome: (teamId: string, suiteId: number, planId: number, outcome: Contracts.TestOutcome) => IPromise<void>;
}

export class TestPointModel implements ITestPointModel {
    private static MaxSequenceNumber: number = 99999999;

    public id: KnockoutObservable<number> = ko.observable(0);
    public testCase: KnockoutObservable<ITestCaseModel>;
    public isErrorOccured: KnockoutComputed<boolean>;
    public errorMessage: KnockoutObservable<string> = ko.observable("");
    public sequenceNumber: KnockoutObservable<number> = ko.observable(TestPointModel.MaxSequenceNumber);
    public outcome: KnockoutObservable<Contracts.TestOutcome> = ko.observable(Contracts.TestOutcome.Active);

    constructor(testPoint?: Contracts.ITestPoint) {
        this.testCase = ko.observable(new TestCaseModel());
        if (testPoint) {
            this._populate(testPoint);
        }
        this.isErrorOccured = ko.computed(() => {
            if (this.errorMessage()) {
                return this.errorMessage() !== "";
            }
            return false;
        });
    }

    public setOutcome(teamId: string, suiteId: number, planId: number, outcome: Contracts.TestOutcome): IPromise<any> {
        if (outcome === this.outcome()) {
            return Q(undefined);
        }

        this.outcome(outcome);

        Telemetry.TelemeteryHelper.publishFeatureTelemetry(Telemetry.FeatureScenarios.SetOutcome, { "Outcome": Contracts.TestOutcome[outcome] });

        return WebApi.getClient().beginSetOutcome(teamId, suiteId, planId, this.id(), outcome);
    }

    private _populate(testPoint: Contracts.ITestPoint) {
        this.id(testPoint.testPointId);
        var testCase: ITestCaseModel = new TestCaseModel(testPoint);
        this.testCase = ko.observable(testCase);
        this.sequenceNumber = ko.observable(testPoint.sequenceNumber);
        this.outcome = ko.observable(Contracts.TestOutcomeHelper.fromString(testPoint.outcome));
    }
}

export interface IRequirementModel {
    id: number,
    areaPath: string,
    iterationPath: string
}

export interface ITestCaseModel {
    id: number;
    name: KnockoutObservable<string>;
    beginCreate: (requirement: IRequirementModel, testCaseWorkItemType: string) => IPromise<WIT_Contracts.WorkItem>;
    beginUpdate: () => IPromise<WIT_Contracts.WorkItem>;
    beginUpdateRequirementId: (newRequirementId: number, oldRequirementId: number, removeExistingLink: boolean) => IPromise<WIT_Contracts.WorkItem>;
    beginRemove: (requirementId: number) => IPromise<WIT_Contracts.WorkItem>;
}


export class TestCaseModel implements ITestCaseModel {
    public id = 0;
    public name: KnockoutObservable<string> = ko.observable("");

    constructor(testPoint?: Contracts.ITestPoint) {
        if (testPoint) {
            this.id = testPoint.testCaseId;
            this.name(testPoint.testCaseTitle);
        }
    }

    public beginCreate(requirement: IRequirementModel, testCaseWorkItemType: string): IPromise<WIT_Contracts.WorkItem> {
        var witClient = WIT_WebApi.getClient();
        var project = TFS_Host_TfsContext.TfsContext.getDefault().contextData.project.name;

        return witClient.createWorkItem(TestCaseHelper.getCreatePatchDocument(this.name(), requirement), project, testCaseWorkItemType)
            .then((wit: WIT_Contracts.WorkItem) => {
                this.id = wit.id;
                return wit;
            });
    }

    public beginUpdate(): IPromise<WIT_Contracts.WorkItem> {
        var witClient = WIT_WebApi.getClient();
        return witClient.updateWorkItem(TestCaseHelper.getUpdatePatchDocument(this.name()), this.id);
    }

    public beginUpdateRequirementId(newRequirementId: number, oldRequirementId: number, removeExistingLink: boolean): IPromise<WIT_Contracts.WorkItem> {
        return this._beginGet().then((workItem: WIT_Contracts.WorkItem) => {
            var witClient = WIT_WebApi.getClient();

            if (removeExistingLink) {
                var indexOfLink: number = this._getIndexOfTestCaseInRequirement(workItem, oldRequirementId);

                if (indexOfLink < 0) {
                    removeExistingLink = false;
                }
            }

            return witClient.updateWorkItem(TestCaseHelper.getUpdateTestedByLinkPatchDocument(newRequirementId, indexOfLink, removeExistingLink), this.id);
        });
    }

    /**
     *  Remove the requirement link from test case 
     * @param requirementId
     */
    public beginRemove(requirementId: number): IPromise<WIT_Contracts.WorkItem> {
        return this._beginGet().then((workItem: WIT_Contracts.WorkItem) => {

            var indexOfLink: number = this._getIndexOfTestCaseInRequirement(workItem, requirementId);
            if (indexOfLink >= 0) {
                var witClient = WIT_WebApi.getClient();
                return witClient.updateWorkItem(TestCaseHelper.getRemoveTestCasePatchDocument(indexOfLink), this.id);
            } else {
                return Q(undefined);
            }
        });
    }

    private _getIndexOfTestCaseInRequirement(workItem: WIT_Contracts.WorkItem, requirementId: number): number {
        var indexOfLink: number = -1;
        let collectionUrl: string = TestCaseHelper.getCollectionUrl();
        if (workItem && workItem.relations) {
            $.each(workItem.relations, (index: number, relation: any) => {
                if (TestCaseHelper.compareRelationUrlWithWorkItemUrl(collectionUrl, requirementId, relation.url)) {
                    indexOfLink = index;
                    return false;
                }
            });
        }
        return indexOfLink;
    }

    private _beginGet(): IPromise<WIT_Contracts.WorkItem> {
        var witClient = WIT_WebApi.getClient();

        return witClient.getWorkItem(this.id, null, null, WIT_Contracts.WorkItemExpand.Relations);
    }
}

export class TestCaseHelper {
    public static getCreatePatchDocument(name: string, requirement: IRequirementModel): VSS_Common_Contracts.JsonPatchDocument {
        var postData: VSS_Common_Contracts.JsonPatchDocument[] = [
            {
                "op": "add",
                "path": "/fields/System.Title",
                "value": name
            },
            {
                "op": "add",
                "path": "/fields/System.IterationPath",
                "value": requirement.iterationPath
            },
            {
                "op": "add",
                "path": "/relations/-",
                "value": {
                    "rel": parentTestedByLinkName,
                    "url": TestCaseHelper.getWorkItemApiUrl(requirement.id),
                    "attributes": {
                        "comment": ""
                    }
                }
            }
        ];

        if (requirement.areaPath) {
            postData.push({
                "op": "add",
                "path": "/fields/System.AreaPath",
                "value": requirement.areaPath
            });
        }
        return postData as VSS_Common_Contracts.JsonPatchDocument;
    }

    public static getUpdatePatchDocument(name: string): VSS_Common_Contracts.JsonPatchDocument {
        var postData: VSS_Common_Contracts.JsonPatchDocument = [
            {
                "op": "replace",
                "path": "/fields/System.Title",
                "value": name
            }
        ];

        return postData;
    }

    public static getUpdateTestedByLinkPatchDocument(requirementId: number, index: number, removeExistingLink: boolean) {
        var postData = [];
        if (removeExistingLink) {
            postData.push({
                "op": "remove",
                "path": "/relations/" + index,

            });
        }

        postData.push({
            "op": "add",
            "path": "/relations/-",
            "value": {
                "rel": parentTestedByLinkName,
                "url": TestCaseHelper.getWorkItemApiUrl(requirementId),
                "attributes": {
                    "comment": ""
                }
            }
        });

        return postData;
    }

    public static getRemoveTestCasePatchDocument(index: number) {
        var postData = [];
        postData.push({
            "op": "remove",
            "path": "/relations/" + index,
        });
        return postData;
    }

    public static getWorkItemApiUrl(workItemId: number): string {
        var collectionUrl = TestCaseHelper.getCollectionUrl();
        // build url
        var wiUrl = collectionUrl
            + "_apis/wit/workItems/"
            + workItemId;
        wiUrl = encodeURI(wiUrl);

        return wiUrl;
    }

    public static getCollectionUrl(): string {
        let tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        let webContext = tfsContext.contextData;
        return webContext.collection.uri;
    }
    public static compareRelationUrlWithWorkItemUrl(collectionUrl: string, workItemId: number, relationUrl: string): boolean {
        let endsWithString = "_apis/wit/workItems/" + workItemId;
        relationUrl = relationUrl ? relationUrl : "";
        return Utils_String.startsWith(relationUrl, collectionUrl, Utils_String.ignoreCaseComparer)
            && Utils_String.endsWith(relationUrl, endsWithString, Utils_String.ignoreCaseComparer);
    }
}

export interface ITestStore {
    getSuite: (requirementId: number) => ITestSuiteModel;
    setSuite: (requirementId: number, suite: ITestSuiteModel) => void;
    refreshSuite: (requirementId: number) => IPromise<any>;
    removeSuite: (requirementId: number) => void;
    beginFetchSuites: (requirementIds: number[]) => IPromise<number[]>;
    dispose: () => void;
}

export class TestStore implements ITestStore {
    private _suiteCache: { [requirementId: number]: ITestSuiteModel } = {};
    private _teamId: string;

    constructor(teamId: string) {
        this._teamId = teamId;
    }

    /**
    * Refresh the suite corresponding to requirement
    *
    * @param requirementId requirementId of requirement
    * @return refeshed testSuiteModel
    */
    public refreshSuite(requirementId: number): IPromise<any> {
        if (requirementId <= 0) {
            return Q(undefined);
        }

        var suite = this.getSuite(requirementId);

        if (suite) {
            return suite.refresh(this._teamId, requirementId);
        }
        else {
            var suiteModel: TestSuiteModel = new TestSuiteModel();
            return suiteModel.refresh(this._teamId, requirementId).then(() => {
                this.setSuite(requirementId, suiteModel);
            });
        }
    }

    public beginFetchSuites(requirementIds: number[]): IPromise<number[]> {

        if (!requirementIds || requirementIds.length === 0) {
            return Q([]);
        }

        $.each(requirementIds, (i, requirementId) => {
            this.removeSuite(requirementId);
        });

        return WebApi.getClient().beginGetSuites(this._teamId, requirementIds)
            .then((suites: Contracts.ITestSuite[]) => {

                var requirements: number[] = [];

                // convert to model and store in cache
                $.each(suites, (i, suite: Contracts.ITestSuite) => {
                    var suiteModel = new TestSuiteModel(suite);
                    this._suiteCache[suite.requirementId] = suiteModel;
                    requirements.push(suite.requirementId);
                });

                return requirements;

            });
    }

    public getSuite(requirementId: number): ITestSuiteModel {
        return this._suiteCache[requirementId];
    }

    public setSuite(requirementId: number, suite: ITestSuiteModel): void {
        this._suiteCache[requirementId] = suite;
    }

    public removeSuite(requirementId: number): void {
        this._suiteCache[requirementId] = null;
    }

    public dispose() {
        this._suiteCache = null;
    }

}
