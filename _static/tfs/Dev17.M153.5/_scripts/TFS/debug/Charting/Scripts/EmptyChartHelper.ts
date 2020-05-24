/// <reference types="jquery" />

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Resources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import ChartingResources = require("Charting/Scripts/Resources/TFS.Resources.Charting");
import Chart_Contracts = require("Charts/Contracts");
import * as StringUtils from "VSS/Utils/String";

/**
 * Contains policy for rendering Empty Chart Experiences.
 */
export class EmptyChartHelper {
    public static NumberOfAvailableZeroResultImage: number = 7;

    /**
     * Given a container, paint in a randomly selected image
     * @param container - The container that we are using to fill the zero result images
     * @param selection - A large random, positive integer which will be modulo'd in relation to an available set of images
     * @param altTextExtraDescription - Additional contextual description appended to ChartingResources.EmptyChart_AltTextFormat when showing empty chart
     * @param onClick - Optional parameter to specify a click handler
     */
    public static showEmptyChartMessage(container: JQuery, selection: number, altTextExtraDescription:string, onClick?: (openInNewWindow: boolean) => void): void {
        var resourceFileName = EmptyChartHelper.getEmptyChartResourceFileName(EmptyChartHelper.NumberOfAvailableZeroResultImage);
        
        var $messageContainer;
        if (onClick) {
            $messageContainer = $("<a>")
                .attr("tabindex", 0)
                .attr("href", "#") // This is bad practice. We're adding this to use hyperlink colors in high contrast mode since placeholder links (no href) aren't styled like hyperlinks.
                //NOTE: FireFox and Edge do not fire middle-clicks in this case. Using mouseup is an option here for Edge, but FireFox will still block popups in that scenario
                .click((e: MouseEvent) => {
                    var openInNewWindow = e.ctrlKey || e.which == 2;
                    onClick(openInNewWindow);
                })
                .keypress((e: KeyboardEvent) => {
                    // Chrome sends a keycode of 10 for ctrl+enter
                    if (e.which == $.ui.keyCode.ENTER || e.which == 10) {
                        var openInNewWindow = e.ctrlKey || e.which == 10;
                        onClick(openInNewWindow);
                    }
                });
        } else {
            $messageContainer = $("<div>");
        }
        $messageContainer.addClass("chart-empty-dataset")

        var $messageHeader = $("<div/>").addClass("message-header").text(Resources.ChartMessage_NoDataToDisplay_Header);
        var $messageBody = $("<div/>").addClass("message-body").text(Resources.ChartMessage_NoDataToDisplay_Body);
        var $image = $("<img/>")
            .attr("src", resourceFileName)
            .attr("alt", StringUtils.format(ChartingResources.EmptyChart_AltTextFormat, altTextExtraDescription));

        $messageContainer.append($messageHeader)
            .append($messageBody)
            .append($image);
        container.append($messageContainer);
    }

    public static getEmptyChartResourceFileName(selection?: number): string {
        var TfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        var imageSelection: number;
        if (selection) {
            imageSelection = Math.abs(selection) % EmptyChartHelper.NumberOfAvailableZeroResultImage;
        } else {
            var imageSelection = Math.floor(Math.random() * EmptyChartHelper.NumberOfAvailableZeroResultImage);
        }

        return TfsContext.configuration.getResourcesFile("chart-noresult-" + imageSelection + ".png");
    }
}
