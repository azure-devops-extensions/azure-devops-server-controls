/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";
import { Component, Props, State } from "VSS/Flux/Component";

import { IProcess } from "WorkCustomization/Scripts/Contracts/Process";
import { IProcessLayoutViewOptions } from "Admin/Scripts/TFS.Admin.Process.Layout";
import { IMenuItemSpec } from "VSS/Controls/Menus";
import { LegacyProcessLayoutView, ILegacyProcessLayoutViewProps, ILegacyProcessLayoutViewState }
    from "WorkCustomization/Scripts/Views/Layout/Components/LegacyProcessLayoutView";
import { getWorkItemTypesStore, WorkItemTypesStore, IWorkItemTypeData }
    from "WorkCustomization/Scripts/Stores/Process/WorkItemTypesStore";
import { UrlUtils } from "WorkCustomization/Scripts/Utils/UrlUtils";
import { WorkItemFieldsActionCreator } from "WorkCustomization/Scripts/Actions/WorkItemFieldsActions";
import { CollectionFieldsActionCreator } from "WorkCustomization/Scripts/Actions/CollectionFieldsActions";
import { WorkItemTypesActionCreator } from "WorkCustomization/Scripts/Actions/WorkItemTypesActions";
import { AddFieldDialogActionCreator } from  "WorkCustomization/Scripts/Actions/AddFieldDialogActions";
import { Spinner, SpinnerType } from "OfficeFabric/Spinner";
import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");

import AdminProcessCommon = require("Admin/Scripts/TFS.Admin.Process.Common");
import AdminProcessContracts = require("Admin/Scripts/Contracts/TFS.Admin.Process.Contracts");
import ProcessContracts = require("TFS/WorkItemTracking/ProcessContracts");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import { BaseProcessAdminComponent }
    from "WorkCustomization/Scripts/Common/Components/BaseProcessAdminComponent";
import { getCollectionService } from "VSS/Service";
import { PageDataService } from "WorkCustomization/Scripts/WebApi/PageDataService";

import Utils_String = require("VSS/Utils/String");
import { CommonUtils } from "WorkCustomization/Scripts/Utils/CommonUtils";

export interface IWorkItemTypeFormLayoutProps extends Props {
    headMenuItems?: IMenuItemSpec[];
    endMenuItems?: IMenuItemSpec[];
}

export class WorkItemTypeFormLayout extends BaseProcessAdminComponent<IWorkItemTypeFormLayoutProps, State> {

    public render(): JSX.Element {
        return (
            <div className="work-item-type-form-layout">
                {this._createLegacyProcessLayoutView()}
            </div>
        );
    }

    public getState() {
        return {};
    }

    private _createLegacyProcessLayoutView(): JSX.Element {
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

        const options: IProcessLayoutViewOptions = {
            dataProvider: {
                beginGetBehaviors: CommonUtils.NullFunction, // layout control doesn't deal with behaviors
                beginGetFieldUsage: (processId: string, callback: AdminProcessCommon.IProcessFieldUsageDataCallback, waitTarget: JQuery) => {
                    WorkItemFieldsActionCreator.beginGetWorkItemFieldUsageData(currentProcess.templateTypeId)
                        .then(fieldUsageData => callback(fieldUsageData));
                },
                invalidateCache: processId => {
                    WorkItemTypesActionCreator.beginGetWorkItemType(currentProcess.templateTypeId, workItemType.workItemType.referenceName);
                    CollectionFieldsActionCreator.beginReloadCache();
                }
            } as AdminProcessCommon.IProcessDataProvider,
            process: this._toProcessDescriptorViewModel(currentProcess),
            workItemType: workItemType.workItemType,
            addHistoryPoint: (data) => {
                if (data.type != null) {
                    // legacy layout control already loaded the new type
                    this._lastLoadedWitId = data.type;
                    UrlUtils.replaceCurrentWorkItemTypeId(data.type);

                    // make sure our store gets the new derived work item type
                    WorkItemTypesActionCreator.beginGetWorkItemType(currentProcess.templateTypeId, data.type);
                }
            },
            headMenuItems: this.props.headMenuItems,
            endMenuItems: this.props.endMenuItems,
            controlContributionInputLimit: getCollectionService(PageDataService).getControlContributionInputLimit(),
            showEditControlExtensionField: true,
            hideRefreshToolbarItem: false,
            preventDeleteNonEmptyPage: true,
            alsoRemoveFromWorkItemType: true,
            beginAddFieldToWorkItemType: AddFieldDialogActionCreator.beginAddFieldToWorkItemType,

            // these are not used by layout control:
            allBehaviors: null,
            allProcessFields: null,
            hasManagePermission: currentProcess.editPermission,
            view: null,
            workItemTypesViewMode: null
        };

        return <LegacyProcessLayoutView options={options} />;
    }
}