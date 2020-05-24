

import ko = require("knockout");

import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");

import Contracts = require("TFS/TestManagement/Contracts");

import Histogram = require("VSS/Controls/Histogram");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

let delegate = Utils_Core.delegate;
let WITUtils = TMUtils.WorkItemUtils;
let domElement = Utils_UI.domElem;

export class TestSummaryTrend {
    public testSummaryTrend: KnockoutObservableArray<Contracts.AggregatedDataForResultTrend> = ko.observableArray(<Contracts.AggregatedDataForResultTrend[]>[]);
    constructor(summaryTrend: Contracts.AggregatedDataForResultTrend[]) {
        this.testSummaryTrend(summaryTrend);
    }
}

export interface TraceabilityHistogramOptions extends Histogram.IHistogramOptions {
}

export class TraceabilityHistogram extends Histogram.HistogramO<TraceabilityHistogramOptions> {

    public clear() {
        this._clearBars();
    }

    public updateData(testSummaryTrend: TestSummaryTrend) {

    }

    private _renderError(error) {
        this._clearBars();
        this._element.attr("title", error.message || error);
    }

    private _onHistogramBarClicked(context: Contracts.TestResultsContext): void {
    }
}

// TFS plug-in model requires this call for each TFS module.
VSS.tfsModuleLoaded("TFS.TestManagement.TestResults.Traceability.Histogram", exports);
