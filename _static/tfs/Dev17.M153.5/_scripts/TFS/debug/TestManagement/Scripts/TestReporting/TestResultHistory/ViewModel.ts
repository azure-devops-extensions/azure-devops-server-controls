import ko = require("knockout");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import ResultHistoryCommon = require("TestManagement/Scripts/TestReporting/TestResultHistory/Common");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import ValueMap = require("TestManagement/Scripts/TFS.TestManagement.RunsView.ValueMap");

import Contracts = require("TFS/TestManagement/Contracts");

import Diag = require("VSS/Diag");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

let TfsContext = TFS_Host_TfsContext.TfsContext;
let delegate = Utils_Core.delegate;
let WITUtils = TMUtils.WorkItemUtils;
let domElement = Utils_UI.domElem;

export interface IHistogramBarDetailModel {
    state: string;
    outcome: string;
    completedDate: Date;
    source: string;
    duration: number;
    runId: number;
    resultId: number;
}

export class TestResultHistoryPrimaryDataViewModel {

    public constructor(primaryData: Contracts.TestResultHistoryDetailsForGroup, groupBy: string, filterContext?: Contracts.ResultsFilter) {
        this._groupBy = groupBy;
        this._primaryData = primaryData;
        this._populateResultHistoryViewModel();
        this.filterContext = filterContext;
    }

    private _populateResultHistoryViewModel(): void {

        let latestResultWorkflowUrl: string = Utils_String.empty;
        let latestResultWorkflowRef: string = Utils_String.empty;
        let failingSinceWorkflowUrl: string = Utils_String.empty;
        let failingSinceWorkflowRef: string = Utils_String.empty;

        let latestResult: Contracts.TestCaseResult = this._primaryData.latestResult;

        let $url: JQuery;
        if (latestResult.release) {
            latestResultWorkflowRef = Utils_String.format(" #{0}", latestResult.release.name);
            latestResultWorkflowUrl = TMUtils.UrlHelper.getReleaseSummaryTestTabUrl(parseInt(latestResult.release.id));
        }
        else if (latestResult.build) {
            latestResultWorkflowRef = Utils_String.format(" #{0}", latestResult.build.name);
            latestResultWorkflowUrl = TMUtils.UrlHelper.getBuildSummaryTestTabUrl(parseInt(latestResult.build.id));
        }
        else {
            Diag.logError("[TestResultHistoryPrimaryDataViewModel._populateResultHistoryViewModel]: Neither build not release workflow.");
        }

        if (latestResult.failingSince) {
            this.showFailingSince(true);
            if (latestResult.failingSince.release) {
                failingSinceWorkflowRef = Utils_String.format(" #{0}", latestResult.failingSince.release.name);
                failingSinceWorkflowUrl = TMUtils.UrlHelper.getReleaseSummaryTestTabUrl(latestResult.failingSince.release.id);
            }
            else if (latestResult.failingSince.build) {
                failingSinceWorkflowRef = Utils_String.format(" #{0}", latestResult.failingSince.build.number);
                failingSinceWorkflowUrl = TMUtils.UrlHelper.getBuildSummaryTestTabUrl(latestResult.failingSince.build.id);
            }
            else {
                Diag.logError("[TestResultHistoryPrimaryDataViewModel._populateResultHistoryViewModel]: Neither build not release workflow.");
            }
        }

        let outcomeIconClass: string = ValueMap.TestOutcome.getIconClassName(Contracts.TestOutcome[latestResult.outcome]);

        let groupByValueString: string;

        switch (this._groupBy) {
            case ResultHistoryCommon.ResultHistoryGroupPivots.Group_By_Environment:
                let groupByEnvironmentValue = <Contracts.ReleaseReference>this._primaryData.groupByValue;
                groupByValueString = groupByEnvironmentValue.environmentDefinitionName;
                this.groupKey = groupByEnvironmentValue.environmentDefinitionId.toString();
                break;
            case ResultHistoryCommon.ResultHistoryGroupPivots.Group_By_Branch:
                let groupByBranchValue = <string>this._primaryData.groupByValue;
                groupByValueString = groupByBranchValue;
                this.groupKey = groupByBranchValue;
                break;
        }

        this.groupValue(groupByValueString);
        this.latestResultOutcome(latestResult.outcome);
        this.groupIcon(ResultHistoryCommon.ResultHistoryGroupPivots.MapGroupByToGroupIcon[this._groupBy]);
        this.latestResultIcon(outcomeIconClass);
        this.latestResultAgoText(Utils_Date.ago(latestResult.completedDate));
        this.latestResultText(Resources.TestResultHistoryLatestResultText);
        this.failingSinceText(Resources.TestResultHistoryFailingSinceText);
        this.failingSinceWorkflowUrl(failingSinceWorkflowUrl);
        this.failingSinceWorkflowRef(failingSinceWorkflowRef);
        this.latestResultWorkflowUrl(latestResultWorkflowUrl);
        this.latestResultWorkflowRef(latestResultWorkflowRef);
    }

    public _currentResult: Contracts.TestCaseResult;

    public groupKey: string;
    public filterContext: Contracts.ResultsFilter;
    public groupValue: KnockoutObservable<string> = ko.observable(Utils_String.empty);
    public groupIcon: KnockoutObservable<string> = ko.observable(Utils_String.empty);
    public latestResultOutcome: KnockoutObservable<string> = ko.observable(Utils_String.empty);
    public latestResultIcon: KnockoutObservable<string> = ko.observable(Utils_String.empty);
    public latestResultText: KnockoutObservable<string> = ko.observable(Utils_String.empty);
    public failingSinceText: KnockoutObservable<string> = ko.observable(Utils_String.empty);
    public latestResultAgoText: KnockoutObservable<string> = ko.observable(Utils_String.empty);
    public latestResultWorkflowUrl: KnockoutObservable<string> = ko.observable(Utils_String.empty);
    public latestResultWorkflowRef: KnockoutObservable<string> = ko.observable(Utils_String.empty);
    public failingSinceWorkflowUrl: KnockoutObservable<string> = ko.observable(Utils_String.empty);
    public failingSinceWorkflowRef: KnockoutObservable<string> = ko.observable(Utils_String.empty);
    public showFailingSince: KnockoutObservable<boolean> = ko.observable(false);

    private _primaryData: Contracts.TestResultHistoryDetailsForGroup;
    private _groupBy: string;
}

// TFS plug-in model requires this call for each TFS module.
VSS.tfsModuleLoaded("TestResultHistory.ViewModel", exports);
