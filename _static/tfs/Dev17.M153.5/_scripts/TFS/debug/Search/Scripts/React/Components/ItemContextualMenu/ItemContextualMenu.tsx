/// <reference types="react" />

import * as React from "react";
import {autobind} from "OfficeFabric/Utilities";
import { ActionCreator } from  "Search/Scripts/React/ActionCreator";
import { StoresHub } from  "Search/Scripts/React/StoresHub";
import { events } from  "Search/Scripts/React/ActionsHub";
import { ContextualMenuButton } from 'VSSUI/ContextualMenuButton';
import { getCommandsInContextMenu, CommandsOptions } from  "Search/Scripts/React/Components/ItemCommands";
import SearchResources = require("Search/Scripts/Resources/TFS.Resources.Search");

import "VSS/LoaderPlugins/Css!Search/React/Components/ItemContextualMenu";

export interface ItemContextualMenuButtonProps {
    item: any;
    index: number;
    actionCreator: ActionCreator;
    storesHub: StoresHub;
}

export interface ItemContextualMenuButtonState {
    isOpen: boolean;
}

export class ItemContextualMenuButton extends React.Component<ItemContextualMenuButtonProps, ItemContextualMenuButtonState> {
    constructor(props: ItemContextualMenuButtonProps) {
        super(props);
        this.state = {
            isOpen: false
        };
    }

    public render(): JSX.Element {
        return (
            <span className="search-ContextMenu--container">
                <ContextualMenuButton
                    className="search-ContextMenuButton"
                    getItems={() => getCommandsInContextMenu(this.props as CommandsOptions) }
                    isOpen={this.state.isOpen}
                    onDismiss={this._onDismiss}
                    iconProps={{ iconName: "More", className:"more-icon" }}
                    title={ SearchResources.MoreActionsText } />
            </span>);
    }

    public componentDidMount(): void {
        this.props
            .storesHub
            .searchResultsActionStore
            .addListener(
                events.TOGGLE_RESULT_ITEM_CONTEXT_MENU,
                this._onToggleContextMenu);
    }

    @autobind
    private _onToggleContextMenu(): void {
        let rowIndexUnderAction = this.props.storesHub.searchResultsActionStore.index;
        if (rowIndexUnderAction === this.props.index) {
            this.setState({
                isOpen: !this.state.isOpen
            });
        }
    }

    @autobind
    private _onDismiss(event?: React.SyntheticEvent<HTMLElement>): void {
        this.setState({ isOpen: false });
    }
}
