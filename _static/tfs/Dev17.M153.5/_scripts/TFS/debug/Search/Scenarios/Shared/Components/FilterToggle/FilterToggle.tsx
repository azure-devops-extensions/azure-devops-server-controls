import * as React from "react";
import { css } from "OfficeFabric/Utilities";
import { CommandButton } from 'OfficeFabric/Button';
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { TooltipHost } from "VSSUI/Tooltip";
import { FilterToggleProps } from "Search/Scenarios/Shared/Components/FilterToggle/FilterToggle.Props";
import "VSS/LoaderPlugins/Css!Search/Scenarios/Shared/Components/FilterToggle/FilterToggle";

export function getFilterToggleMenuItem(itemKey: string, props: FilterToggleProps): IContextualMenuItem {
    return {
        name: itemKey,
        key: itemKey,
        className: "filter-toggle-button",
        onRender: (item: IContextualMenuItem) => {
            return <FilterToggleButton {...props} />
        }
    };
}

export const FilterToggleButton: React.StatelessComponent<FilterToggleProps> = (props: FilterToggleProps) => {
    if (!props.visible) {
        return null;
    }

    const toggleButtonClass = css("bowtie-icon",
        {
            "bowtie-search-filter-fill": props.fill,
            "bowtie-search-filter": !props.fill
        });

    return (
        <TooltipHost
            content={props.tooltipContent}
            directionalHint={DirectionalHint.topCenter}
            hostClassName={css("filter-toggle-tooltip")}>
            {
                <CommandButton
                    iconProps={{ iconName: undefined, className: toggleButtonClass }}
                    onClick={props.onClick}
                    ariaLabel={props.tooltipContent}>
                </CommandButton>
            }
        </TooltipHost>
    );
}