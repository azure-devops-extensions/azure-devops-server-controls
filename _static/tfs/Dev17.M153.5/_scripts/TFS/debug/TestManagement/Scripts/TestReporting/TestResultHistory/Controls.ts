import ko = require("knockout");

import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import ResultHistoryCommon = require("TestManagement/Scripts/TestReporting/TestResultHistory/Common");
import ResultsControls = require("TestManagement/Scripts/TestReporting/TestTabExtension/Controls");

import Navigation = require("VSS/Controls/Navigation");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

let delegate = Utils_Core.delegate;
let domElement = Utils_UI.domElem;

/// <summary>
/// The Group by control to update the result history view based on selection.
/// </summary>
export class ResultHistoryGroupByControl extends ResultsControls.ResultsDropDownControl implements ResultsControls.IDropDownControl {

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "filter test-result-history-groupby-filter",
            text: Resources.GroupByText,
            onPivotChangedDelegate: this.onPivotChanged
        }, options));
    }

    public groupByOption: KnockoutObservable<string> = ko.observable(Utils_String.empty);

    /// <summary>
    /// Delegate method to be called on change of menu item
    /// </summary>
    public onPivotChanged(e?: any, args?: any) {
        let selectedFilter: Navigation.IPivotFilterItem = this._pivotFilter.getSelectedItem();
        this.groupByOption(selectedFilter.id);
    }

    /// <summary>
    /// returns list of group by options
    /// </summary>
    public getDropDownOptions(): Navigation.IPivotFilterItem[] {
        this._groupbyFilterOptions = [
            { id: ResultHistoryCommon.ResultHistoryCommands.GroupByBranch, text: Resources.BranchText, selected: true },
            { id: ResultHistoryCommon.ResultHistoryCommands.GroupByEnvironment, text: Resources.Stage }
        ];

        return this._groupbyFilterOptions;
    }

    public getGroupbyOptionById(id: string): Navigation.IPivotFilterItem {
        let selectedOption: Navigation.IPivotFilterItem = null;
        for (let i = 0, len = this._groupbyFilterOptions.length; i < len; i++) {
            if (Utils_String.equals(id, this._groupbyFilterOptions[i].id, true)) {
                selectedOption = this._groupbyFilterOptions[i];
                break;
            }
        }
        return selectedOption;
    }

    private _groupbyFilterOptions: Navigation.IPivotFilterItem[];
}

// TFS plug-in model requires this call for each TFS module.
VSS.tfsModuleLoaded("TestResultHistory.Controls", exports);
