/// <reference types="jquery" />
import "VSS/LoaderPlugins/Css!Presentation/FeatureRef/WorkItemStateCellRenderer";

import * as Utils_String from "VSS/Utils/String";
import { WorkItemStateColorsProvider } from "Presentation/Scripts/TFS/FeatureRef/WorkItemStateColorsProvider";

export interface IProcessedStateColor {
    backgroundColor: string;
    borderColor: string;
}

export class WorkItemStateCellRenderer {

    private static CSS_WORKITEM_STATE_CIRCLE = "workitem-state-circle";
    public static STATES_DEFAULT_COLOR = "#5688E0"; // Default blue color to use when state color is not defined

    /**
     * Get workitem state color cell, an empty space is shown if color is not defined
     * @param stateColor color of workitem state
     * @param stateValue workitem state value
     */
    public static getColorCell(stateColor: string, stateValue: string): JQuery {
        let colors = WorkItemStateCellRenderer.getProcessedStateColor(stateColor);
        let colorCell = $("<span/>").addClass(WorkItemStateCellRenderer.CSS_WORKITEM_STATE_CIRCLE)
            .css({ "background-color": colors.backgroundColor, "border-color": colors.borderColor });
        let stateCell = $("<span/>").addClass("workitem-state-value").text(stateValue);
        let result = $("<div/>").addClass("workitem-state-color-cell").append(colorCell.add(stateCell));

        return result;
    }

    /**
     * Get workitem state color cell and render the state color asynchronously
     * @param projectName name of the project
     * @param workItemTypeName work item type name
     * @param stateName work item state value
     */
    public static getAutoUpdatingColorCell(projectName: string, workItemTypeName: string, stateName: string): JQuery {
        if (!projectName || !workItemTypeName || !stateName) {
            return null;
        }

        let colorsProvider = WorkItemStateColorsProvider.getInstance();

        if (colorsProvider.isPopulated(projectName)) {
            let color = colorsProvider.getColor(projectName, workItemTypeName, stateName);
            return WorkItemStateCellRenderer.getColorCell(color, stateName);
        }
        else {
            // Preserve the color cell so that we can repaint the background color later
            let colorCell = WorkItemStateCellRenderer.getColorCell(WorkItemStateColorsProvider.DEFAULT_STATE_COLOR, stateName);

            colorsProvider.getColorAsync(projectName, workItemTypeName, stateName).then(
                (color: string) => { // Success
                    let colorsObj = WorkItemStateCellRenderer.getProcessedStateColor(color);
                    colorCell.find("." + WorkItemStateCellRenderer.CSS_WORKITEM_STATE_CIRCLE)
                        .css({ "background-color": colorsObj.backgroundColor, "border-color": colorsObj.borderColor });
                },
                (error: Error) => { } // No Action.. Already handled by the provider
            );
            return colorCell;
        }
    }

    /**
     * Get processed state color for rendering state and border color
     * @param stateColor
     */
    public static getProcessedStateColor(stateColor: string): IProcessedStateColor {
        const defaultWhiteColor = "#ffffff";
        stateColor = stateColor || defaultWhiteColor;

        if (Utils_String.ignoreCaseComparer(stateColor, defaultWhiteColor) === 0 || Utils_String.ignoreCaseComparer(stateColor, "transparent") === 0) {
            return {
                backgroundColor: stateColor,
                borderColor: WorkItemStateCellRenderer.STATES_DEFAULT_COLOR
            };
        }
        return {
            backgroundColor: stateColor,
            borderColor: stateColor
        };
    }
}
