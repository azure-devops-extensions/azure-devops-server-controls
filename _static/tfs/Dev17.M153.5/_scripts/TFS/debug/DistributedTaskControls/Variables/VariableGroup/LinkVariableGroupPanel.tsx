/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { LinkVariableGroupPanelViewStore, ILinkVariableGroupPanelViewState } from "DistributedTaskControls/Variables/VariableGroup/Store/LinkVariableGroupPanelViewStore";
import { VariableGroupActionsCreator } from "DistributedTaskControls/Variables/VariableGroup/Actions/VariableGroupActionsCreator";
import { ScopePicker } from "DistributedTaskControls/Variables/VariableGroup/ScopePicker";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { LoadingComponent } from "DistributedTaskControls/Components/LoadingComponent";
import { InstanceIds  } from "DistributedTaskControls/Variables/Common/Constants";
import { IScope, IDefinitionVariableGroup } from "DistributedTaskControls/Variables/Common/Types";
import { Status } from "DistributedTaskControls/Variables/VariableGroup/Actions/VariableGroupActions";
import { Component as InfoButton } from "DistributedTaskControls/Components/InfoButton";
import { ICalloutContentProps } from "DistributedTaskControls/Components/CalloutComponent";

import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { PrimaryButton } from "OfficeFabric/Button";
import { Panel, PanelType } from "OfficeFabric/Panel";
import { SearchBox } from "OfficeFabric/SearchBox";
import { List } from "OfficeFabric/List";
import { Check } from "OfficeFabric/Check";
import { SelectionZone, SelectionMode } from "OfficeFabric/Selection";
import { autobind } from "OfficeFabric/Utilities";
import { FocusZone, FocusZoneDirection } from "OfficeFabric/FocusZone";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { css } from "OfficeFabric/Utilities";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";

import { VariableGroup } from "TFS/DistributedTask/Contracts";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Variables/VariableGroup/LinkVariableGroupPanel";

export interface ILinkVariableGroupPanelProps extends Base.IProps {
    supportScopes: boolean;
}

export class LinkVariableGroupPanel extends Base.Component<ILinkVariableGroupPanelProps, ILinkVariableGroupPanelViewState> {

    public componentWillMount(): void {
        this._actionsCreator = ActionCreatorManager.GetActionCreator<VariableGroupActionsCreator>(VariableGroupActionsCreator);

        this._viewStore = StoreManager.GetStore<LinkVariableGroupPanelViewStore>(LinkVariableGroupPanelViewStore);
        this._viewStore.addChangedListener(this._onChange);
        this.setState(this._viewStore.getState());
    }

    public componentWillUnmount(): void {
        this._viewStore.removeChangedListener(this._onChange);
    }

    public render(): JSX.Element {

        return (
            <Panel
                closeButtonAriaLabel={Resources.LinkVGPanelCloseButtonAriaLabel}
                className="dtc-link-vg-panel"
                isOpen={this.state.isPanelOpen}
                type={PanelType.medium}
                onDismiss={this._onClosePanel}
                onRenderHeader={this._onRenderHeader}
                onRenderFooterContent={this._onRenderFooterContent} >
                {this._getPanelContent()}
            </Panel>
        );
    }

    @autobind
    private _onRenderHeader(): JSX.Element {
        return (
            <div className="dtc-link-vg-header">
                <span className="dtc-link-vg-header-text">
                    {Resources.LinkVariableGroupPanelHeader}
                </span>
                {this._getInfoMessage(Resources.LinkVariableGroupPanelHeader)}
                <SearchBox
                    placeholder={Resources.SearchLabel}
                    className="dtc-link-vg-searchbox"
                    onChange={this._onSearchTextChanged} />
            </div>
        );
    }

    @autobind
    private _onRenderFooterContent() {
        return (
            <div className="dtc-link-vg-panel-buttons" >
                <PrimaryButton
                    ariaLabel={Resources.LinkLabel}
                    onClick={this._onLinkVariableGroup}
                    className="dtc-link-vg-panel-button"
                    disabled={this._isLinkVariableGroupDisabled()} >
                    {Resources.LinkLabel}
                </PrimaryButton>
            </div>
        );
    }

    @autobind
    private _onRenderListItem(variableGroup: VariableGroup, index: number) {
        let selectedVariableGroup = this._viewStore.getState().selectedVariableGroup;
        const isSelected = (selectedVariableGroup && selectedVariableGroup.id) === variableGroup.id;

        let className = css("dtc-link-vg-list-item", { "is-selected": isSelected });
        let count = variableGroup.variables ? Object.keys(variableGroup.variables).length : 0;
        let title = Utils_String.format(Resources.VariableGroupNameFormat, variableGroup.name, count);

        return (
            <div className={className} role="checkbox" data-selection-index={index} data-is-focusable="true" aria-label={variableGroup.name} aria-checked={isSelected}>
                <div className="dtc-link-vg-list-item-select" data-selection-toggle={true} >
                    <Check checked={isSelected} />
                </div>
                <div className="dtc-link-vg-list-item-info">
                    <div className="dtc-variable-group-name">
                        <TooltipHost
                            content={title}
                            overflowMode={TooltipOverflowMode.Parent}>
                            {title}
                        </TooltipHost>
                    </div>
                    <div className="dtc-variable-group-description">
                        <TooltipHost
                            content={variableGroup.description}
                            overflowMode={TooltipOverflowMode.Parent}>
                            {variableGroup.description}
                        </TooltipHost>
                    </div>
                </div>
            </div>
        );
    }

    private _getPanelContent(): JSX.Element {

        const status = this.state.status;
        if (status.status === Status.InProgress) {
            return <LoadingComponent label={Resources.Loading} />;
        }
        else if (status.status === Status.Failure) {
            return (
                <MessageBar messageBarType={MessageBarType.error} >
                    {status.message}
                </MessageBar>
            );
        }

        let scopePicker = this.props.supportScopes ? <ScopePicker instanceId={InstanceIds.VariableGroupLinkPanelScopePickerInstanceId} /> : null;

        return (
            <div>
                <FocusZone
                    direction={FocusZoneDirection.vertical} >
                    <SelectionZone
                        selectionPreservedOnEmptyClick={true}
                        selectionMode={SelectionMode.single}
                        selection={this.state.selection}>
                        <div
                            className="dtc-link-vg-list">
                            {this._getListContent()}
                        </div>
                    </SelectionZone>
                </FocusZone>
                {scopePicker}
            </div>
        );

    }

    private _getInfoMessage(infoFor: string): JSX.Element {

        const calloutContentProps: ICalloutContentProps = {
            calloutMarkdown: Utils_String.localeFormat(Resources.LinkVariableGroupPanelInfoText, LinkVariableGroupPanel.VARIABLE_GROUPS_LEARN_MORE_LINK),
            calloutContentAriaLabel: Utils_String.localeFormat(Resources.InfoCalloutAriaLabel, infoFor)
        };

        return (
            <InfoButton
                isIconFocusable={true}
                cssClass="dtc-link-vg-info-button"
                calloutContent={calloutContentProps} />
        );
    }

    private _getListContent(): JSX.Element {

        let { filteredVariableGroups } = this.state;
        if (filteredVariableGroups && filteredVariableGroups.length > 0) {
            return (
                <List
                    onRenderCell={this._onRenderListItem}
                    items={Utils_Array.clone(this.state.filteredVariableGroups)} />
            );
        }
        else {
            return (<div className="dtc-link-vg-list-no-result">
                {Resources.VariableGroupNoResult}
            </div>);
        }
    }

    @autobind
    private _onChange() {
        this.setState(this._viewStore.getState());
    }

    @autobind
    private _onClosePanel() {
        this._actionsCreator.showLinkVariableGroupPanel(false);
    }

    @autobind
    private _onLinkVariableGroup() {
        this._actionsCreator.addVariableGroups([{
            scopes: this.state.selectedScopes,
            ...this.state.selectedVariableGroup
        } as IDefinitionVariableGroup]);
    }

    @autobind
    private _isLinkVariableGroupDisabled(): boolean {
        // if scopes are supported atleast one scope should be selected
        return !this.state.selectedVariableGroup || (this.props.supportScopes && (!this.state.selectedScopes || this.state.selectedScopes.length === 0));
    }

    @autobind
    private _onSearchTextChanged(searchText: string) {
        this._actionsCreator.filterVariableGroups(searchText);
    }

    private _viewStore: LinkVariableGroupPanelViewStore;
    private _actionsCreator: VariableGroupActionsCreator;

    private static readonly VARIABLE_GROUPS_LEARN_MORE_LINK = "https://go.microsoft.com/fwlink/?LinkId=832652";
}