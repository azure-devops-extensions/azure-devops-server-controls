import * as React from "react";
import { ContextualMenuButton } from "VSSUI/ContextualMenuButton";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { getCommandsInContextMenu, CommandsOptions } from "Search/Scenarios/Code/Components/ItemCommands";
import { CodeResult } from "Search/Scenarios/WebApi/Code.Contracts";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import "VSS/LoaderPlugins/Css!Search/Scenarios/Code/Components/ItemContextualMenu";

export interface ItemRowContextualMenuButtonProps {
    item: CodeResult;

    onMenuItemInvoked?: (item: IContextualMenuItem) => void;
}

export const ItemRowContextualMenuButton: React.StatelessComponent<ItemRowContextualMenuButtonProps> = (props: ItemRowContextualMenuButtonProps) => {
    return (
        <span className="search-ContextMenu--container">
            <ContextualMenuButton
                className="search-ContextMenuButton"
                getItems={() => getCommandsInContextMenu(props as CommandsOptions)}
                iconProps={{ iconName: "More", className: "more-icon" }}
                title={Resources.MoreActionsTooltip} />
        </span>);
}