/// <reference types="knockout" />



import RMContracts = require("ReleaseManagement/Core/Contracts");

import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import ResultsControls = require("TestManagement/Scripts/TestReporting/TestTabExtension/Controls");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");

import Diag = require("VSS/Diag");
import Navigation = require("VSS/Controls/Navigation");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");

let delegate = Utils_Core.delegate;
let TelemetryService = TCMTelemetry.TelemetryService;

export interface IPayload {
    release: any;
    environment: any;
}

export interface IEnvironmentInfo {
    id: number;
    name: string;
    payload: IPayload;
}

export interface IEnvironmentSelectorOptions {
    onSelectedEnvironmentChanged: (release: any, environment: any) => void;
}

export class EnvironmentSelector extends ResultsControls.ResultsDropDownControl implements ResultsControls.IDropDownControl {

    public initializeOptions(options: IEnvironmentSelectorOptions) {
        super.initializeOptions($.extend({
            text: Resources.Stage,
            onPivotChangedDelegate: this.onPivotChanged
        }, options));
    }

    public updateEnvironments(items: IEnvironmentInfo[]): void {
        // Validate that the drop down options have changed before updating
        if (this._haveDropDownOptionsChanged(items)) {
            this._dropDownOptions = null;
            let allEnvironmentStatus = RMContracts.EnvironmentStatus.NotStarted;
            this._dropDownOptions = $.map(items, (item: IEnvironmentInfo) => {

                // Check if at least one of the environment deployment has completed
                allEnvironmentStatus = (allEnvironmentStatus === RMContracts.EnvironmentStatus.Succeeded ||
                    item.payload.environment.status === RMContracts.EnvironmentStatus.Succeeded ||
                    item.payload.environment.status === RMContracts.EnvironmentStatus.Rejected ||
                    item.payload.environment.status === RMContracts.EnvironmentStatus.Canceled) ? RMContracts.EnvironmentStatus.Succeeded : RMContracts.EnvironmentStatus.NotStarted;

                return <Navigation.IPivotFilterItem>{
                    id: item.id.toString(),
                    text: item.name,
                    value: item.payload
                };
            });

            // Add the "All" option
            this._dropDownOptions.unshift(<Navigation.IPivotFilterItem>{
                id: "All",
                text: Resources.AllText,
                value: <IPayload>{
                    release: items[0].payload.release,
                    environment: {
                        id: 0,
                        status: allEnvironmentStatus
                    }
                }
            });

            this.updateDropDownItems(this._dropDownOptions);
        }
    }

    /// <summary>
    /// returns list of filter options
    /// </summary>
    public getDropDownOptions(): Navigation.IPivotFilterItem[] {
        return this._dropDownOptions;
    }

    /// <summary>
    /// Delegate method to be called on change of menu item
    /// </summary>
    public onPivotChanged(e?: any, args?: any) {
        let selectedEnvironmentInfo = this.getSelectedEnvironmentInfo();
        TelemetryService.publishEvent(TelemetryService.featureTestTabInReleaseSummary_EnvironmentChanged, TelemetryService.dropDownSelected,
            {
                [TelemetryService.eventAllEnvironments]: Utils_String.equals(selectedEnvironmentInfo.name, Resources.AllText, true) ? "Yes" : "No"
            }
        );
        (<IEnvironmentSelectorOptions>this._options).onSelectedEnvironmentChanged(selectedEnvironmentInfo.payload.release, selectedEnvironmentInfo.payload.environment);
        Diag.logTracePoint("TestResults_SelectedEnvironmentChanged");
    }

    public getSelectedEnvironmentInfo(): IEnvironmentInfo {
        let selectedItem: Navigation.IPivotFilterItem = this._pivotFilter.getSelectedItem();
        return {
            id: parseInt(selectedItem.id),
            name: selectedItem.text,
            payload: selectedItem.value
        };
    }

    public selectEnvironment(environmentId: string): void {
        let selectedItem = this._dropDownOptions.filter((item: Navigation.IPivotFilterItem) => {
            return (item.value.environment.id.toString() === environmentId);
        });

        if (selectedItem && selectedItem[0]) {
            this._pivotFilter.setSelectedItem(selectedItem[0]);
        }
    }

    private _haveDropDownOptionsChanged(items: IEnvironmentInfo[]): boolean {
        let returnValue = false;
        // Drop-down option has "All" as the last option, hence comparing the environment length for length - 1
        if (items.length === this._dropDownOptions.length - 1) {
            items.forEach((item, i) => {
                if (items[i].id !== parseInt(this._dropDownOptions[i].id)
                    || !Utils_String.equals(items[i].name, this._dropDownOptions[i].text, true)
                    || items[i].payload.environment.status !== this._dropDownOptions[i].value.environment.status) {
                    returnValue = true;
                    return false;
                }
            });
        } else {
            returnValue = true;
        }

        return returnValue;
    }

    private _dropDownOptions: Navigation.IPivotFilterItem[] = [];
}

// TFS plug-in model requires this call for each TFS module.
VSS.tfsModuleLoaded("TestTabExtension/EnvironmentSelectorControl", exports);
