/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";
import { Component, Props, State } from "VSS/Flux/Component";
import { IProcess } from "WorkCustomization/Scripts/Contracts/Process";
import { LegacyWorkItemTypeStatesView } from "WorkCustomization/Scripts/Views/States/Components/LegacyWorkItemTypeStatesView";
import { BaseProcessAdminComponent } from "WorkCustomization/Scripts/Common/Components/BaseProcessAdminComponent";
import { getWorkItemTypesStore, WorkItemTypesStore, IWorkItemTypeData } from "WorkCustomization/Scripts/Stores/Process/WorkItemTypesStore";
import { WorkItemFieldsActionCreator } from "WorkCustomization/Scripts/Actions/WorkItemFieldsActions";
import { WorkItemTypesActionCreator } from "WorkCustomization/Scripts/Actions/WorkItemTypesActions";
import { Spinner, SpinnerType } from "OfficeFabric/Spinner";
import { StatesActionCreator } from "WorkCustomization/Scripts/Actions/StatesActions";
import { AddFieldDialogActionCreator } from "WorkCustomization/Scripts/Actions/AddFieldDialogActions";
import { UrlUtils } from "WorkCustomization/Scripts/Utils/UrlUtils";
import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");
import AdminProcessCommon = require("Admin/Scripts/TFS.Admin.Process.Common");
import { ProcessStatesViewOptions } from "Admin/Scripts/TFS.Admin.Process.States";
import { ProcessStatesView } from "Admin/Scripts/TFS.Admin.Process.States";
import AdminProcessContracts = require("Admin/Scripts/Contracts/TFS.Admin.Process.Contracts");
import ProcessContracts = require("TFS/WorkItemTracking/ProcessContracts");
import { CommonUtils } from "WorkCustomization/Scripts/Utils/CommonUtils";

export interface IWorkItemTypeStatesComponentProps extends Props {
    onErrorMessage?: (string) => void;
}

export class WorkItemTypeStatesComponent extends BaseProcessAdminComponent<IWorkItemTypeStatesComponentProps, State> {

    public render(): JSX.Element {
        return (
            <div className="work-item-type-states-container" id= "work-item-type-states-container-element">
                {this._createLegacyStatesView()}
            </div>
        );
    }

    public getState() {
        return {};
    }

    private _createLegacyStatesView(): JSX.Element {
        let store: WorkItemTypesStore = this.getStore();
        let currentProcess: IProcess = store.getCurrentProcess();

        let workItemType: IWorkItemTypeData = store.getCurrentWorkItemType();
        if (workItemType == null) {
            return <Spinner type={SpinnerType.large} />;
        }
        if (!workItemType.hasFullData) {
            WorkItemTypesActionCreator.beginGetWorkItemType(currentProcess.templateTypeId, workItemType.workItemType.referenceName);
            return <Spinner type={SpinnerType.large} />;
        }

        const options: ProcessStatesViewOptions = {
            dataProvider: {
                beginGetBehaviors: CommonUtils.NullFunction, // layout control doesn't deal with behaviors
                beginGetFieldUsage: (processId: string, callback: AdminProcessCommon.IProcessFieldUsageDataCallback, waitTarget: JQuery) => {
                    WorkItemFieldsActionCreator.beginGetWorkItemFieldUsageData(currentProcess.templateTypeId)
                        .then(fieldUsageData => callback(fieldUsageData));
                },
                invalidateCache: processId => { }
            } as AdminProcessCommon.IProcessDataProvider,
            process: this._toProcessDescriptorViewModel(currentProcess),
            workItemType: workItemType.workItemType,
            addHistoryPoint: (data) => {
                if (data.id != null) {
                    UrlUtils.replaceCurrentWorkItemTypeId(data.id);

                    // make sure our store gets the new derived work item type
                    WorkItemTypesActionCreator.beginGetWorkItemType(currentProcess.templateTypeId, data.id);
                }
            },
            allBehaviors: null,
            allProcessFields: null,
            hasManagePermission: currentProcess.editPermission,
            onErrorMessage: this.props.onErrorMessage,
            beginAddFieldToWorkItemType: AddFieldDialogActionCreator.beginAddFieldToWorkItemType,
            beginCreateStateDefinition: StatesActionCreator.beginCreateStateDefinition,
            beginUpdateStateDefinition: StatesActionCreator.beginUpdateStateDefinition,
            beginDeleteStateDefinition: StatesActionCreator.beginDeleteStateDefinition,
            beginHideStateDefinition: StatesActionCreator.beginHideStateDefinition
        };

        return <LegacyWorkItemTypeStatesView options={options} />;
    }
}