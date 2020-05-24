import * as React from "react";
import * as ReactDOM from "react-dom";
import { ZeroData, Props, IZeroDataButtonProps } from "Presentation/Scripts/TFS/Components/ZeroData";
import { WorkIllustrationUrlUtils, WorkZeroDataIllustrationPaths, GeneralZeroDataIllustrationPaths } from "Presentation/Scripts/TFS/TFS.IllustrationUrlUtils";
import * as WitZeroDataResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking.ZeroData";
import * as WITResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";

export enum ZeroDataChartType {
    NewChart,
    UnsavedChart,
    NotSupportedChart
}

/**
 * Render zero data experience for charts
 * @param referenceElement - Reference element to mount the zero data view
 * @param zerodataChartType - Type of the charts, it could be New/Unsaved or not supported
 * @param onClick - onlick handler for the infobutton
 */
export function renderZeroDataCharts(referenceElement: HTMLElement, zerodataChartType: ZeroDataChartType, onClick?: Function) {
    if (!referenceElement) {
        return;
    }

    let zeroDataElement: JSX.Element = null;
    switch (zerodataChartType) {
        case ZeroDataChartType.NewChart:
            zeroDataElement = zeroDataForNewChart(onClick);
            break;
        case ZeroDataChartType.UnsavedChart:
            zeroDataElement = zeroDataForUnsavedChart();
            break;
        case ZeroDataChartType.NotSupportedChart:
            zeroDataElement = zeroDataForNotSupportedChart();
            break;
    }

    ReactDOM.render(zeroDataElement, referenceElement);
}

export function unmountZeroDataComponent(referenceElement: HTMLElement) {
    ReactDOM.unmountComponentAtNode(referenceElement);
}

/**
 * 
 * @param referenceElement - Reference element to mount the zero data view
 */
export function renderZeroDataQueryResult(referenceElement: HTMLElement, isNewQuery: boolean) {
    if (!referenceElement) {
        return;
    }
    const zeroDataProps: Props = {
        primaryText: isNewQuery ? WITResources.QueryResultsNewQueryGridStatusText : WitZeroDataResources.ZeroData_QueryResult_PrimaryText,
        imageUrl: WorkIllustrationUrlUtils.getIllustrationImageUrl(WorkZeroDataIllustrationPaths.QueryNoResultFound),
        imageAltText: WitZeroDataResources.ZeroData_QueryResult_PrimaryText
    };

    ReactDOM.render(<ZeroData {...zeroDataProps} />, referenceElement);
}

/**
 * Creates ZeroData component instance for new chart.
 * @param onClick - onlick handler for the infobutton
 */
export function zeroDataForNewChart(onClick: Function): JSX.Element {
    const zeroDataProps: Props = {
        primaryText: WitZeroDataResources.ZeroData_Charts_NewChartPrimaryText,
        secondaryText: WitZeroDataResources.ZeroData_Charts_NewChartSecondaryText,
        imageUrl: WorkIllustrationUrlUtils.getIllustrationImageUrl(WorkZeroDataIllustrationPaths.NoCharts),
        imageAltText: WitZeroDataResources.ZeroData_QueryResult_PrimaryText,
        infoButton: {
            text: WITResources.NewChartText,
            onClick: onClick,
            isPrimaryButton: true
        } as IZeroDataButtonProps
    };

    return <ZeroData {...zeroDataProps} />;
}

/**
 * Creates ZeroData component instance for unsaved chart.
 */
export function zeroDataForUnsavedChart(): JSX.Element {
    const zeroDataProps: Props = {
        primaryText: WitZeroDataResources.ZeroData_Charts_UnsavedPrimaryText,
        secondaryText: WitZeroDataResources.ZeroData_Charts_UnsavedSecondaryText,
        imageUrl: WorkIllustrationUrlUtils.getIllustrationImageUrl(WorkZeroDataIllustrationPaths.UnsavedQuery),
        imageAltText: WitZeroDataResources.ZeroData_Charts_UnsavedPrimaryText
    };

    return <ZeroData {...zeroDataProps} />;
}

/**
 * Creates ZeroData component instance for not supported chart.
 */
export function zeroDataForNotSupportedChart(): JSX.Element {
    const zeroDataProps: Props = {
        primaryText: WitZeroDataResources.ZeroData_Charts_LinkQueryPrimaryText,
        secondaryText: WitZeroDataResources.ZeroData_Charts_LinkQuerySecondaryText,
        imageUrl: WorkIllustrationUrlUtils.getIllustrationImageUrl(WorkZeroDataIllustrationPaths.ChartingNotSupported),
        imageAltText: WitZeroDataResources.ZeroData_Charts_LinkQueryPrimaryText
    };

    return <ZeroData {...zeroDataProps} />;
}