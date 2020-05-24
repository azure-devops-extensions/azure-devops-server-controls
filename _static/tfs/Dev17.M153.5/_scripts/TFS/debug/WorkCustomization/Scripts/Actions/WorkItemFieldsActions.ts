import { showErrorAction, clearErrorAction } from "WorkCustomization/Scripts/Common/Actions/MessageBarActions";
import { WebAccessHttpClient, IWebAccessHttpClient } from "WorkCustomization/Scripts/WebApi/WebAccessHttpClient";
import { getCollectionService } from "VSS/Service";
import { ProcessFieldUsageData, ProcessDefinitionFieldUsageData, ProcessWorkItemType } from "Admin/Scripts/Contracts/TFS.Admin.Process.Contracts";
import * as ProcessContracts from "TFS/WorkItemTracking/ProcessContracts";

export namespace WorkItemFieldsActionCreator {
    export function beginGetWorkItemFieldUsageData(processId: string): IPromise<ProcessDefinitionFieldUsageData> {
        let httpClient: IWebAccessHttpClient = getCollectionService(WebAccessHttpClient);

        return httpClient.beginGetProcessFieldUsageData(processId)
            .then<ProcessDefinitionFieldUsageData>(
            (fieldUsageData: ProcessFieldUsageData) => {
                clearErrorAction.invoke(null);

                // convert from mvc to webapi
                return ProcessFieldUsageConverter.toProcessDefinitionFieldUsageData(fieldUsageData);
            },
            error => showErrorAction.invoke({ errorMessage: error.message }));
    }
}

export namespace ProcessFieldUsageConverter {
    export function toProcessDefinitionFieldUsageData(fieldUsageData: ProcessFieldUsageData): ProcessDefinitionFieldUsageData {
        const workItemTypes: ProcessContracts.ProcessWorkItemType[] = fieldUsageData.WorkItemTypes.map((workItemType) => {
            return _toProcessWorkItemTypeModel(workItemType);
        });

        return {
            Fields: fieldUsageData.Fields,
            WorkItemTypes: workItemTypes
        };
    }

    function _toProcessWorkItemTypeModel(workItemType: ProcessWorkItemType): ProcessContracts.ProcessWorkItemType {
        const customization = _toCustomizationType(workItemType);
        // MVC populates ParentWorkItemTypeId for both Custom and Derived classes, but WebApi
        // only sets inherits if Derived.
        const inherits = customization === ProcessContracts.CustomizationType.Inherited ? workItemType.ParentWorkItemTypeId : null;

        return {
            referenceName: workItemType.Id,
            name: workItemType.Name,
            description: workItemType.Description,
            color: workItemType.Color,
            customization: customization,
            inherits: inherits,
            isDisabled: workItemType.IsDisabled,
            layout: workItemType.Layout,
            behaviors: null,
            icon: null,
            states: null,
            url: null
        };
    }

    function _toCustomizationType(workItemType: ProcessWorkItemType): ProcessContracts.CustomizationType {
        if (workItemType.IsCustomType) {
            return ProcessContracts.CustomizationType.Custom;
        }
        else if (workItemType.ParentWorkItemTypeId) {
            return ProcessContracts.CustomizationType.Inherited;
        }
        else {
            return ProcessContracts.CustomizationType.System;
        }
    }
}
