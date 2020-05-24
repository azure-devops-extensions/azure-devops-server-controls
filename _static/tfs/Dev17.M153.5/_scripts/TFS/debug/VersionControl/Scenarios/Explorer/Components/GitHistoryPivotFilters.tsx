import * as React from "react";

import { GraphToggleCallout, GraphToggleCalloutProps } from "VersionControl/Scenarios/History/GitHistory/GitGraph/GraphToggleCallout";
import { FilterPanelToggleButton, FilterPanelToggleButtonProps } from "Presentation/Scripts/TFS/Controls/Filters/FilterPanelToggleButton";

export interface GitHistoryPivotFiltersProps extends GraphToggleCalloutProps, FilterPanelToggleButtonProps {
    isGraphEnabled: boolean;
}

export const GitHistoryPivotFilters = (props: GitHistoryPivotFiltersProps) =>
    <div className={"explorer-history-pivot-filters"}>
        <FilterPanelToggleButton {...props} />
        {
            props.isGraphEnabled &&
            <GraphToggleCallout {...props} />
        }
    </div>;
