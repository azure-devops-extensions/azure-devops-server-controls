import * as React from "react";

import { autobind, BaseComponent } from "OfficeFabric/Utilities";
import Resources = require("Utilization/Scripts/Resources/TFS.Resources.Utilization");
import { IBaseProps } from "OfficeFabric/Utilities";
import { UsageDataContainer } from "Utilization/Scripts/Components/UsageDataContainer";
import {
    PivotBar, IPivotBarAction, IPivotBarViewAction, PivotRenderingMode, IPivotRenderingModeOptions,
    PivotBarItem, PivotBarViewActionType, PivotBarViewActionArea
} from 'VSSUI/PivotBar';

import {
    PivotTabKeys, isPipelineTab
} from "Utilization/Scripts/UrlStateHelper";

export const PivotTabDataGroupKeys = {
    main: {
        key: 'main',
        name: 'Main'
    },
    topUsage: {
        key : 'topUsage',
        name: 'Top Usage'
    }
};

export interface PivotTabDataObject {
    name: string;
    toolTip: string;
    groupKey: string;
}

export const PivotTabData: { [key: string]: PivotTabDataObject } = {
    browse: {
        name: Resources.Pivot_Browse,
        toolTip: Resources.Pivot_BrowseTooltip,
        groupKey: PivotTabDataGroupKeys.main.key
    },
    pipelines: {
        name: Resources.Pivot_ByPipeline,
        toolTip: Resources.Pivot_ByPipelineToolTip,
        groupKey: PivotTabDataGroupKeys.main.key
    },
    users: {
        name: Resources.Pivot_TopUsers,
        toolTip: Resources.Pivot_TopUsersTooltip,
        groupKey: PivotTabDataGroupKeys.topUsage.key
    },
    useragents: {
        name: Resources.Pivot_TopUserAgents,
        toolTip: Resources.Pivot_TopUserAgentsTooltip,
        groupKey: PivotTabDataGroupKeys.topUsage.key
    },
    topbuildpipelines: {
        name: Resources.Pivot_TopBuildPipelines,
        toolTip: Resources.Pivot_TopBuildPipelinesToolTip,
        groupKey: PivotTabDataGroupKeys.topUsage.key
    },
    topreleasepipelines: {
        name: Resources.Pivot_TopReleasePipelines,
        toolTip: Resources.Pivot_TopReleasePipelinesToolTip,
        groupKey: PivotTabDataGroupKeys.topUsage.key
    },
    commands: {
        name: Resources.Pivot_TopCommands,
        toolTip: Resources.Pivot_TopCommandsTooltip,
        groupKey: PivotTabDataGroupKeys.topUsage.key
    }
}


export const PivotRenderingModeOptions =
     {
        mode: PivotRenderingMode.DropDown,
        props: {
            dropdownWidth: 180,
            groups: [{ key: PivotTabDataGroupKeys.main.key, name: PivotTabDataGroupKeys.main.name}, { key: PivotTabDataGroupKeys.topUsage.key, name: PivotTabDataGroupKeys.topUsage.key }]
        }
    } as IPivotRenderingModeOptions;

export function ShouldShowTabKeyOption(tabKey:string, userIsPCA: boolean, isPipelinesEnabled: boolean): boolean {
    return (userIsPCA || tabKey !== "users") && !(!isPipelinesEnabled && isPipelineTab(tabKey));
}

export function RenderUsagePivotBar(userIsPCA: boolean, usingNormalizedColumns: boolean, isPipelinesEnabled: boolean): JSX.Element[] {
    const consumerId = "F1832F33-A2F0-4804-AFF8-B9423417BE96";

    return PivotTabKeys.filter(tabKey => ShouldShowTabKeyOption(tabKey, userIsPCA, isPipelinesEnabled)).map(tabKey => {
        return <PivotBarItem
            name={PivotTabData[tabKey].name}
            key={tabKey}
            itemKey={tabKey}
            groupKey={PivotTabData[tabKey].groupKey}
        >
            <UsageDataContainer consumerId={consumerId}
                useNormalizedColumns={usingNormalizedColumns}
            />
        </PivotBarItem>;

    })
}