import TFS_Dashboards_Contracts = require("TFS/Dashboards/Contracts");
import TFS_Dashboards_PushToDashboardConstants = require("Dashboards/Scripts/Pinning.PushToDashboardConstants");

/**
* A Class to hold the widget related data needed to create a widget for the purposes of pinning it to a dashboard
* An object of this class will be created by the Host that wants to add the pinning feature
*/
export class WidgetDataForPinning {
    public size: TFS_Dashboards_Contracts.WidgetSize;
    public name: string;
    public contributionId: string;
    public settings: any;
    public settingsVersion: TFS_Dashboards_Contracts.SemanticVersion;

    constructor(widgetName: string, contributionId: string, widgetSettings: string, settingsVersion?: TFS_Dashboards_Contracts.SemanticVersion, size?: TFS_Dashboards_Contracts.WidgetSize) {
        this.settings = widgetSettings;
        this.name = widgetName;
        this.contributionId = contributionId;
        this.settingsVersion = settingsVersion;

        if (typeof size === "undefined" || size === null) {
            // Define the size of the widget when we pinning to the dashboard
            switch (contributionId) {
                case TFS_Dashboards_PushToDashboardConstants.WITChart_WidgetTypeID:
                case TFS_Dashboards_PushToDashboardConstants.TCMChart_WidgetTypeID:
                    this.size = { columnSpan: 2, rowSpan: 2 }
                    break;
                case TFS_Dashboards_PushToDashboardConstants.Markdown_WidgetTypeID:
                    this.size = { columnSpan: 2, rowSpan: 3 }
                    break;
                case TFS_Dashboards_PushToDashboardConstants.BuildChart_WidgetTypeID:
                    this.size = { columnSpan: 2, rowSpan: 1 }
                    break;
                case TFS_Dashboards_PushToDashboardConstants.TestResults_FailureTrend_WidgetTypeId:
                case TFS_Dashboards_PushToDashboardConstants.TestResults_DurationTrend_WidgetTypeId:
                case TFS_Dashboards_PushToDashboardConstants.TestResults_Trend_WidgetTypeId:
                    this.size = { columnSpan: 2, rowSpan: 2 };
                    break;
                default:
                    this.size = { rowSpan: 1, columnSpan: 1 }
            }
        }
        else {
            this.size = size;
        }
    }

    public static fromWidget(widgetData: TFS_Dashboards_Contracts.Widget): WidgetDataForPinning {
        return new WidgetDataForPinning(
            widgetData.name,
            widgetData.contributionId,
            widgetData.settings,
            widgetData.settingsVersion,
            widgetData.size
        );
    }
}

