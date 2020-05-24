/// <reference types="react" />
/// <reference types="react-dom" />

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!WorkCustomization/Views/Layout/Components/WorkItemTypeLayoutPivot";

import * as React from "react";
import { Component, Props, State } from "VSS/Flux/Component";
import { WorkItemTypeFormLayout } from "WorkCustomization/Scripts/Views/Layout/Components/WorkItemTypeFormLayout";
import { getWorkItemTypesStore, WorkItemTypesStore }
    from "WorkCustomization/Scripts/Stores/Process/WorkItemTypesStore";
import { WorkItemTypesActionCreator } from "WorkCustomization/Scripts/Actions/WorkItemTypesActions";
import { IProcess } from "WorkCustomization/Scripts/Contracts/Process";
import { Spinner, SpinnerType } from "OfficeFabric/Spinner";

export class WorkItemTypeLayoutPivot extends Component<Props, State> {
    public static EditWorkItemTypeMenuItemId = "edit-work-item-type-toolbar-item";

    public render(): JSX.Element {
        let store: WorkItemTypesStore = getWorkItemTypesStore();
        let currentProcess: IProcess = store.getCurrentProcess();
        let processId = currentProcess.templateTypeId;
        if (currentProcess != null && store.getWorkItemTypes(processId) == null) {
            WorkItemTypesActionCreator.beginGetWorkItemTypes(processId);
        }

        return (
            <div className="work-item-type-details">
                <div className="work-item-type-form-container">
                    <WorkItemTypeFormLayout />
                </div>
            </div>
        );
    }
}
