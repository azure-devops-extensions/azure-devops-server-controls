import ko = require("knockout");

import ResultHistoryVM = require("TestManagement/Scripts/TestReporting/TestResultHistory/ViewModel");
import ResultHistoryCommon = require("TestManagement/Scripts/TestReporting/TestResultHistory/Common");
import TRACommonControls = require("TestManagement/Scripts/TFS.TestManagement.RunsView.Common.Controls");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import TestsOM = require("TestManagement/Scripts/TFS.TestManagement");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");

import Contracts = require("TFS/TestManagement/Contracts");

import Adapters_Knockout = require("VSS/Adapters/Knockout");
import Controls = require("VSS/Controls");
import Histogram = require("VSS/Controls/Histogram");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_Date = require("VSS/Utils/Date");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

let delegate = Utils_Core.delegate;
let WITUtils = TMUtils.WorkItemUtils;
let domElement = Utils_UI.domElem;

export class ResultTrend {
    public results: KnockoutObservableArray<Contracts.TestCaseResult> = ko.observableArray(<Contracts.TestCaseResult[]>[]);
    constructor(testCaseResults: Contracts.TestCaseResult[]) {
        this.results(testCaseResults);
    }
}

export class ResultHistoryHistogramViewModel extends Adapters_Knockout.TemplateViewModel {

    constructor(resultTrend: ResultTrend, groupKey: string, filterContext?: Contracts.ResultsFilter) {
        super();
        this.resultTrend(resultTrend);
        this._groupKey = groupKey;
        this.filterContext = filterContext;
    }

    public getGroupKey(): string {
        return this._groupKey;
    }

    public resultTrend: KnockoutObservable<ResultTrend> = ko.observable(null);
    public filterContext: Contracts.ResultsFilter;

    private _groupKey: string;
}

export class ResultHistoryHistogramControl extends Adapters_Knockout.TemplateControl<ResultHistoryHistogramViewModel> {

    constructor(viewModel: ResultHistoryHistogramViewModel) {
        super(viewModel);
    }

    initialize(): void {
        let histogramElement = $("<div />").appendTo(this.getElement());
        
        //A template control takes a viewModel and subscribes to update itself on change of this viewModel.

        this._histogram = <ResultHistoryHistogram>Controls.BaseControl.createIn(ResultHistoryHistogram, histogramElement, {
            cssClass: "result-history-histogram definition-histogram",
            barCount: 50,
            barWidth: 6,
            barHeight: 35,
            barSpacing: 2,
            selectedState: "selected",
            hoverState: "hover",
        });

        this.subscribe(this.getViewModel().resultTrend, (newValue: ResultTrend) => {
            if (newValue) {
                this._histogram.updateData(newValue);
            }
        });
    }

    public dispose(): void {
        if (this._histogram) {
            this._histogram.dispose();
            this._histogram = null;
        }

        super.dispose();
    }

    protected _histogram: ResultHistoryHistogram;
}

export interface ResultHistoryHistogramOptions extends Histogram.IHistogramOptions {
}

export class ResultHistoryHistogram extends Histogram.HistogramO<ResultHistoryHistogramOptions> {

    public clear() {
        this._clearBars();
    }

    public updateData(resultTrend: ResultTrend) {
        let histogramBars: ResultHistoryVM.IHistogramBarDetailModel[] = [];

        for (let i = 0, len = resultTrend.results().length; i < len; i++) {

            let state: string;

            switch (resultTrend.results()[i].outcome) {
                case Contracts.TestOutcome[Contracts.TestOutcome.Passed]:
                    state = ResultHistoryCommon.ResultHistoryContants.Passed;
                    break;
                case Contracts.TestOutcome[Contracts.TestOutcome.Failed]:
                    state = ResultHistoryCommon.ResultHistoryContants.Failed;
                    break;
                case Contracts.TestOutcome[Contracts.TestOutcome.Aborted]:
                    state = ResultHistoryCommon.ResultHistoryContants.Canceled; // For Black colour using Canceled state for Aborted Run
                    break;
                default:
                    state = ResultHistoryCommon.ResultHistoryContants.OtherState;
                    break;
            }

            let result = resultTrend.results()[i];

            histogramBars.unshift({
                state: state,
                outcome: result.outcome,
                completedDate: result.completedDate,
                source: result.releaseReference.id !== 0 ? result.releaseReference.name : result.buildReference.number,
                duration: result.durationInMs ? result.durationInMs : 0,
                runId: parseInt(result.testRun.id),
                resultId: result.id
            });
        }

        let maxDuration: number = 0;
        let items = histogramBars.map((histogramBar: ResultHistoryVM.IHistogramBarDetailModel): Histogram.HistogramBarData => {

            maxDuration = Math.max(maxDuration, histogramBar.duration);
            let resultIdentifier: TestsOM.TestCaseResultIdentifier = new TestsOM.TestCaseResultIdentifier(histogramBar.runId, histogramBar.resultId);

            return {
                value: histogramBar.duration,
                state: histogramBar.state,
                action: (resultIdentifier: TestsOM.TestCaseResultIdentifier) => {
                    this._openResultsSummaryPage(resultIdentifier);
                },
                actionArgs: resultIdentifier,
                title: Utils_String.format(Resources.ResultHistoryHistogramBarTitleText, histogramBar.outcome, Utils_Date.ago(histogramBar.completedDate), histogramBar.source, TRACommonControls.TRAHelper.ConvertMilliSecondsToReadableFormatForResultSummary(histogramBar.duration))
            };
        });

        items.forEach((item) => {
            if (item.state === ResultHistoryCommon.ResultHistoryContants.Canceled) {
                item.value = 1;
            } else {
                // if duration is zero for all tests, we want all histogram bars to have the max heights
                item.value = maxDuration != 0 ? (100 * item.value) / maxDuration : 100;
            }
        });

        this.refresh(items);
    }

    private _renderError(error) {
        this._clearBars();
        RichContentTooltip.add(error.message || error, this._element, { setAriaDescribedBy: true });
    }

    private _openResultsSummaryPage(resultIdentifier: TestsOM.TestCaseResultIdentifier): void {
        let actionUrl = TMUtils.UrlHelper.getRunsUrl("resultSummary", [
            {
                parameter: "runId",
                value: resultIdentifier.testRunId.toString()
            },
            {
                parameter: "resultId",
                value: resultIdentifier.testResultId.toString()
            }]);
        window.open(actionUrl, "_blank");
    }
}

// TFS plug-in model requires this call for each TFS module.
VSS.tfsModuleLoaded("TestResultHistory.Histogram", exports);
