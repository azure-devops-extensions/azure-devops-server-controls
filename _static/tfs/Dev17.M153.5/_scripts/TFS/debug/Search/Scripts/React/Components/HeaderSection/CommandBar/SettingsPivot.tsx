/// Copyright (c) Microsoft Corporation. All rights reserved.
/// <reference types="react" />
/// <reference types="react-dom" />

"use strict";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { TooltipHost } from "VSSUI/Tooltip";
import { KeyCode } from "VSS/Utils/UI";
import { ContextualMenu, IContextualMenuItem, ContextualMenuItemType } from "OfficeFabric/ContextualMenu";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { CommandButton, IButtonProps } from 'OfficeFabric/Button';
import { ICalloutProps } from "OfficeFabric/Callout";
import { autobind, getId, css } from 'OfficeFabric/Utilities';
import { ActionCreator } from "Search/Scripts/React/ActionCreator";
import { Icon } from "OfficeFabric/Icon"
import { StoresHub } from "Search/Scripts/React/StoresHub";
import Search_Resources = require("Search/Scripts/Resources/TFS.Resources.Search");
import * as Models from "Search/Scripts/React/Models";
import * as Search_Strings from "Search/Scripts/Resources/TFS.Resources.Search";

import "VSS/LoaderPlugins/Css!Search/React/Components/SettingsPivot";

export interface ISettingsPivotState {
    selection: any,
    hasResults: boolean,
    providersLoaded: boolean
}

export interface ISettingsPivotProps {
    onClick: (evt, settingValue: string) => void,
    currentSetting: string,
    searchEntity: Models.SearchProvider,
    storesHub: StoresHub,
}

interface CommandsOptions {
    onClick: (evt, item: IContextualMenuItem) => void,
    checked: (key: string) => boolean
}

const keys = {
    offPreviewOrientation: "off",
    rightPreviewOrientation: "right",
    bottomPreviewOrientation: "bottom"
}

const displayName = {
    off: Search_Strings.PreviewPaneOff,
    right: Search_Strings.PreviewPaneRightOrientation,
    bottom: Search_Strings.PreviewPaneBottomOrientation
}

export const SettingsPivotMenuItem = (actionCreator: ActionCreator, storesHub: StoresHub): IContextualMenuItem => {
    return {
        name: "",
        key: "settingsPivotStateButton",
        className: "settings-pivot-item",
        onRender: (item: IContextualMenuItem) => {
            return <SettingsPivot
                searchEntity={storesHub.searchProvidersStore.CurrentProvider}
                currentSetting={storesHub.previewOrientationStore.orientation}
                onClick={
                    ((evt, mode: string) => actionCreator.updatePreviewOrientationMode(mode)).bind(this)
                }
                storesHub={storesHub} />
        }
    };
}

interface CommandCreator {
    (options: CommandsOptions, index: number): IContextualMenuItem;
}

export class SettingsPivot extends React.Component<ISettingsPivotProps, ISettingsPivotState> {
    private _viewState: ISettingsPivotState;

    constructor(props) {
        super(props);
        let selection = {}
        Object
            .keys(keys)
            .forEach(k => selection[keys[k]] = keys[k] === this.props.currentSetting);
        this.state = this._viewState = {
            selection: selection,
            hasResults: false,
            providersLoaded: false
        } as ISettingsPivotState;
    }

    public render(): JSX.Element {
        let renderPivotSettings = this.state.hasResults &&
            this.state.providersLoaded &&
            !!this.props.storesHub.previewOrientationStore.orientation;

        if (renderPivotSettings) {
            let id = getId("pivot-"),
                labelDivId = getId("search-SettingText"),
                searchEntity = this.props.searchEntity,
                items = getCommands(searchEntity, {
                    onClick: this._onItemClick,
                    checked: key => this.state.selection[key]
                }),
                selectedItemKey = Object
                    .keys(this.state.selection)
                    .filter(k => this.state.selection[k]),
                settingsLabel = Search_Strings.PreviewOrientationTitle + ": " + displayName[selectedItemKey[0]],
                headerItem: IContextualMenuItem = {
                    itemType: ContextualMenuItemType.Header,
                    name: Search_Resources.PreviewPaneHeader,
                    key: 'PreviewPaneDropdownMenuHeader',
                    className: 'previewpane-header-item'
                };

            return (
                <span>
                    <TooltipHost
                        content={settingsLabel}
                        directionalHint={DirectionalHint.topCenter}
                        hostClassName='settings-pivot-tooltip'>
                        <CommandButton
                            iconProps={{ iconName: undefined, className: css('bowtie-icon', 'bowtie-details-pane') }}
                            text={Search_Strings.ViewOptionsCommandLabel}
                            className="settings-pivot-button"
                            menuProps={{ items: [headerItem].concat(items), directionalHint: DirectionalHint.bottomAutoEdge }}
                            onRenderMenuIcon={(props: IButtonProps): JSX.Element => {
                                return <Icon className={css("bowtie-icon", "bowtie-chevron-down-light", "pivot-button-chevron") } />;
                            } } />
                    </TooltipHost>
                </span>);
        }

        return <div/>;
    }

    public componentWillReceiveProps(newProps: ISettingsPivotProps): void {
        let selection = {};
        if (newProps.currentSetting !== this.props.currentSetting) {
            Object
                .keys(keys)
                .forEach(k => selection[keys[k]] = keys[k] === newProps.currentSetting);
            this._viewState.selection = selection;
            this.setState(this._viewState);
        }
    }

    public componentDidMount(): void {
        this.props.storesHub.filterStore.addChangedListener(this._onFilterStoreUpdated);
        this.props.storesHub.searchProvidersStore.addChangedListener(this._onProvidersUpdated);
    }

    @autobind
    public _onProvidersUpdated(): void {
        let providerTabs: Models.SearchPivotTabItem[] = this.props.storesHub.searchProvidersStore.ProviderTabs;
        if (providerTabs &&
            providerTabs.length) {
            this._viewState.providersLoaded = true;
            this.setState(this._viewState);
        }
    }

    @autobind
    public _onFilterStoreUpdated(): void {
        this._viewState.hasResults = this.props.storesHub.searchResultsStore.fetchedResultsCount !== 0;
        this.setState(this._viewState);
    }

    @autobind
    private _onItemClick(evt, item: IContextualMenuItem): void {
        let selection = {};
        Object
            .keys(this.state.selection)
            .forEach(k => selection[k] = k === item.key);

        this._viewState.selection = selection;
        this.setState(this._viewState);
        this.props.onClick(evt, item.key);
    }
}

function getCommands(searchEntity: Models.SearchProvider, options: CommandsOptions): IContextualMenuItem[] {
    const commands = searchEntity === Models.SearchProvider.code
        ? create(codeSearchSettings, options)
        : create(workItemSearchSetings, options);

    return commands;
}

const creators = {
    offPreviewOrientation: (options: CommandsOptions, index: number): IContextualMenuItem => ({
        key: keys.offPreviewOrientation,
        name: displayName[keys.offPreviewOrientation],
        role: "menuitem",
        canCheck: true,
        checked: options.checked(keys.offPreviewOrientation),
        onClick: options.onClick
    }),
    rightPreviewOrientation: (options: CommandsOptions, index: number): IContextualMenuItem => ({
        key: keys.rightPreviewOrientation,
        name: displayName[keys.rightPreviewOrientation],
        role: "menuitem",
        canCheck: true,
        checked: options.checked(keys.rightPreviewOrientation),
        onClick: options.onClick
    }),
    bottomPreviewOrientation: (options: CommandsOptions, index: number): IContextualMenuItem => ({
        key: keys.bottomPreviewOrientation,
        name: displayName[keys.bottomPreviewOrientation],
        canCheck: true,
        role: "menuitem",
        checked: options.checked(keys.bottomPreviewOrientation),
        onClick: options.onClick
    })
};

const codeSearchSettings: CommandCreator[] = [
    creators.rightPreviewOrientation,
    creators.bottomPreviewOrientation
];

const workItemSearchSetings: CommandCreator[] = [
    creators.offPreviewOrientation,
    creators.rightPreviewOrientation,
    creators.bottomPreviewOrientation
];

function create(creators: CommandCreator[], options: CommandsOptions): IContextualMenuItem[] {
    return creators.map((creator, index) => creator(options, index));
}
