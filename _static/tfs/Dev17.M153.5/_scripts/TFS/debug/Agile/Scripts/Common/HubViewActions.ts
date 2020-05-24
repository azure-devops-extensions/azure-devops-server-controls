import { Common_Setting_Config_Menu_Tooltip, Common_Setting_Filter_Command } from "Agile/Scripts/Resources/TFS.Resources.AgileControls";
import { IPivotBarViewAction, PivotBarViewActionArea, PivotBarViewActionType } from "VSSUI/PivotBar";
import { VssIconType } from "VSSUI/VssIcon";

export namespace HubViewActions {
    export function getCommonSettings(onClick: React.MouseEventHandler<HTMLElement>): IPivotBarViewAction {
        return {
            key: "common-settings",
            iconProps: { iconName: "settings", iconType: VssIconType.fabric },
            important: true,
            onClick: onClick,
            ariaLabel: Common_Setting_Config_Menu_Tooltip,
            title: Common_Setting_Config_Menu_Tooltip,
            viewActionRenderArea: PivotBarViewActionArea.farRight
        };
    }

    export function getFilterAction(onClick: React.MouseEventHandler<HTMLElement>, filtered: boolean): IPivotBarViewAction {
        return {
            key: "work-item-filter-bar",
            actionType: PivotBarViewActionType.Command,
            ariaLabel: Common_Setting_Filter_Command,
            title: Common_Setting_Filter_Command,
            iconProps: { iconName: filtered ? "FilterSolid" : "Filter", iconType: VssIconType.fabric },
            important: true,
            onClick
        };
    }
}