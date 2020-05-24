/// <reference types="react" />
/// <reference types="react-dom" />

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!WorkCustomization/Views/WorkItemTypes/Components/WorkItemTypesPivot";

import * as React from "react";
import { WorkItemTypesGrid } from "WorkCustomization/Scripts/Views/WorkItemTypes/Components/WorkItemTypesGrid";
import { getProcessesDataStore } from "WorkCustomization/Scripts/Stores/ProcessesDataStore";
import { UrlUtils } from "WorkCustomization/Scripts/Utils/UrlUtils";
import { CommandBar, ICommandBarProps } from "OfficeFabric/CommandBar";
import { IContextualMenuItem } from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";
import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");
import * as DialogActions from "WorkCustomization/Scripts/Dialogs/Actions/DialogActions";
import { contextualMenuIcon } from "VSSPreview/OfficeFabric/Helpers";
import { IProcess } from "WorkCustomization/Scripts/Contracts/Process";

export interface IWorkItemTypesPivotProps {
    initialSelectedWorkItemTypeId?: string;
}

export class WorkItemTypesPivot extends React.Component<IWorkItemTypesPivotProps, {}> {
    render(): JSX.Element {
        let processName: string = UrlUtils.getCurrentProcessNameFromUrl();
        let process: IProcess = getProcessesDataStore().getProcessByName(processName);
        let processId: string = process.templateTypeId;
        let canCreateNewWorkItemType: boolean = process.isInheritedTemplate;
        let canEditProcess: boolean = process.editPermission; // this permission needed to create or edit work item type

        let commandBar: JSX.Element = null;

        if (canCreateNewWorkItemType) {
            let items: IContextualMenuItem[] = [];

            items.push({
                key: "NEW_WORK_ITEM_TYPE",
                name: Resources.NewWorkItemTypeButtonText,
                iconProps: contextualMenuIcon("bowtie-math-plus-light"),
                disabled: !canCreateNewWorkItemType,
                onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {
                    DialogActions.setDialogAction.invoke({
                        dialogType: DialogActions.DialogType.CreateWorkItemType,
                        data: {
                            processTypeId: processId,
                            isInputDisabled: !canEditProcess,
                            upfrontErrorMessage: canEditProcess ? null : Resources.CreateWorkItemTypePermissionError
                        }
                    });
                }
            });

            commandBar = <CommandBar items={items} />;
        }

        return (
            <div className="work-item-types-pivot ">
                {commandBar}
                <WorkItemTypesGrid processId={processId} initialSelectedWorkItemTypeId={this.props.initialSelectedWorkItemTypeId} canEditProcess={canEditProcess} />
            </div>
        );
    }
}