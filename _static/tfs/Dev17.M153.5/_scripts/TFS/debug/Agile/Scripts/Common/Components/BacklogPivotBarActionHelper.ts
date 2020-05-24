import * as AgileProductBacklogResources from "Agile/Scripts/Resources/TFS.Resources.AgileProductBacklog";
import { NewWorkItemItemButtonText } from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";
import * as React from "react";
import { IPivotBarAction } from "VSSUI/PivotBar";
import { VssIconType } from "VSSUI/VssIcon";
import * as WorkItemTrackingResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";

export interface IActionOptions {
    /** Delegate for onClick action */
    onClick: (e: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>, item: IPivotBarAction) => void;
    /** Action is disabled if true */
    disabled?: boolean;
    /** Tooltip to add to the command item */
    tooltip?: string;
}

export namespace BacklogPivotBarActionHelper {
    export const NEW_WORKITEM_COMMAND_KEY = "new-work-item";
    export const OPEN_COLUMN_OPTIONS_COMMAND_KEY = "open-column-options";
    export const CREATE_QUERY_COMMAND_KEY = "create-query";
    export const SEND_MAIL_COMMAND_KEY = "send-mail";

    /**
     * Gets Pivot Bar Action for New Item (New Work Item)
     * @param options Options for the pivot bar action
     */
    export function getNewWorkItemPivotBarAction(options: IActionOptions): IPivotBarAction {
        const vssIconProps = {
            iconName: "bowtie-math-plus-light",
            iconType: VssIconType.bowtie
        };

        return {
            key: BacklogPivotBarActionHelper.NEW_WORKITEM_COMMAND_KEY,
            disabled: options.disabled,
            name: NewWorkItemItemButtonText,
            iconProps: vssIconProps,
            important: true,
            onClick: options.onClick,
            title: options.tooltip
        };
    }

    export function getOpenColumnOptionsAction(options: IActionOptions): IPivotBarAction {
        return {
            key: BacklogPivotBarActionHelper.OPEN_COLUMN_OPTIONS_COMMAND_KEY,
            disabled: options.disabled,
            name: WorkItemTrackingResources.ColumnOptionsTitle,
            iconProps: {
                iconName: "Repair"
            },
            onClick: options.onClick,
            title: options.tooltip
        };
    }

    export function getCreateQueryAction(options: IActionOptions): IPivotBarAction {
        const vssIconProps = {
            iconName: "bowtie-query-list",
            iconType: VssIconType.bowtie
        };
        return {
            key: BacklogPivotBarActionHelper.CREATE_QUERY_COMMAND_KEY,
            disabled: options.disabled,
            name: AgileProductBacklogResources.CreateQuery_Toolbar_Text,
            iconProps: vssIconProps,
            onClick: options.onClick,
            title: options.tooltip
        };
    }

    export function getSendEmailAction(options: IActionOptions): IPivotBarAction {
        return {
            key: BacklogPivotBarActionHelper.SEND_MAIL_COMMAND_KEY,
            disabled: options.disabled,
            name: AgileProductBacklogResources.BacklogAction_EmailQueryResult,
            iconProps: {
                iconName: "Mail"
            },
            onClick: options.onClick,
            title: options.tooltip
        };
    }
}
