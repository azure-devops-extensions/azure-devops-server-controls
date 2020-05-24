/// <reference types="react" />

import * as React from "react";

import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { VariableGroupViewStore, IVariableGroupViewState } from "DistributedTaskControls/Variables/VariableGroup/Store/VariableGroupViewStore";
import { VariableGroupColumnKeys, VariableGroupFieldNameKeys } from "DistributedTaskControls/Variables/Common/Constants";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { VariableGroupActionsCreator } from "DistributedTaskControls/Variables/VariableGroup/Actions/VariableGroupActionsCreator";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { IVariableGroupOptions, IPublishTelemetryArg, VariablesTelemetryFeatureType } from "DistributedTaskControls/Variables/Common/Types";
import { VariablesUtils } from "DistributedTaskControls/Variables/Common/VariableUtils";
import { OpenLinkVariableGroupPanelButton } from "DistributedTaskControls/Variables/VariableGroup/OpenLinkVariableGroupPanelButton";
import { LinkVariableGroupPanel } from "DistributedTaskControls/Variables/VariableGroup/LinkVariableGroupPanel";
import { EditVariableGroupPanel } from "DistributedTaskControls/Variables/VariableGroup/EditVariableGroupPanel";
import { Status } from "DistributedTaskControls/Variables/VariableGroup/Actions/VariableGroupActions";
import { LoadingComponent } from "DistributedTaskControls/Components/LoadingComponent";
import { ExternalLink } from "DistributedTaskControls/Components/ExternalLink";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { VariableGroupListHeader } from "DistributedTaskControls/Variables/VariableGroup/VariableGroupListHeader";
import { VariableGroupUtility } from "DistributedTaskControls/Variables/VariableGroup/VariableGroupUtility";

import { VssDetailsList } from "VSSUI/VssDetailsList";

import {
    IColumn,
    CheckboxVisibility,
    DetailsListLayoutMode,
    ConstrainMode,
    IGroupDividerProps,
    SelectionMode
} from "OfficeFabric/DetailsList";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { Async } from "OfficeFabric/Utilities";

import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { VariableGroup } from "TFS/DistributedTask/Contracts";

export interface IVariableGroupControllerViewProps extends Base.IProps {
    options: IVariableGroupOptions;
}

export class VariableGroupControllerView extends React.Component<IVariableGroupControllerViewProps, IVariableGroupViewState> {

    constructor(props: IVariableGroupControllerViewProps) {
        super(props);

        this._groupHeaders = {};
        this._async = new Async();
    }

    public componentWillMount(): void {
        this._actionsCreator = ActionCreatorManager.GetActionCreator<VariableGroupActionsCreator>(VariableGroupActionsCreator);

        this._viewStore = StoreManager.GetStore<VariableGroupViewStore>(VariableGroupViewStore);
        this._viewStore.addChangedListener(this._onChange);
        this.setState(this._viewStore.getState());
    }

    public componentDidMount(): void {
        if (this.props.options.onPublishTelemetry) {
            this.props.options.onPublishTelemetry({ variablesTelemetryFeatureType: VariablesTelemetryFeatureType.VariablesItem, variablesItemType: VariablesUtils.VariablesGroupItem });
        }
    }

    public componentWillUnmount(): void {
        this._viewStore.removeChangedListener(this._onChange);
        this._async.dispose();
    }

    public componentDidUpdate(): void {

        let { groupIndexToFocus } = this._viewStore.getState();

        if (groupIndexToFocus > Object.keys(this._groupHeaders).length - 1) {

            this._async.setTimeout(() => {
                this._openLinkVariableGroupPanelButton.focus();
            }, 0);
        }
    }

    public render(): JSX.Element {

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

        return (
            <div>
                {this._getContent()}
                {!this.state.variableGroupsDisabledMode && this._getFooterContent()}
                <LinkVariableGroupPanel supportScopes={this.props.options.supportScopes} />
                <EditVariableGroupPanel />
            </div>
        );
    }

    private _onRenderGroupHeader = (props: IGroupDividerProps): JSX.Element => {
        return (
            <VariableGroupListHeader
                onGroupDidMount={this._onGroupDidMount}
                onGroupWillUnmount={this._onGroupWillUnmount}
                groupDividerProps={props}
                onGroupExpandStateChange={this._onGroupExpandStateChange}
                onDeleteGroup={this._deleteVariableGroup}
                shouldShowMoreActions={!this.state.variableGroupsDisabledMode} />
        );
    }

    private _onGroupExpandStateChange = (props: IGroupDividerProps): void => {
        if (props.group.isCollapsed) {
            this._actionsCreator.expandVariableGroup(props.group.key);
        }
        else {
            this._actionsCreator.collapseVariableGroup(props.group.key);
        }
    }

    private _getColumns(): IColumn[] {
        return [
            {
                fieldName: VariableGroupFieldNameKeys.NameFieldKey,
                key: VariableGroupColumnKeys.NameColumnKey,
                name: Resources.VariableGroupNameColumn,
                minWidth: 300,
                maxWidth: 500,
                headerClassName: "dtc-vg-header vg-name",
                className: "vg-column-cell variable-name",
                isResizable: true
            },
            {
                fieldName: VariableGroupFieldNameKeys.ValueFieldKey,
                key: VariableGroupColumnKeys.ValueColumnKey,
                name: Resources.VariableGroupValueColumn,
                minWidth: 500,
                maxWidth: 700,
                headerClassName: "dtc-vg-header vg-description",
                className: "vg-column-cell variable-value",
                isResizable: true
            }
        ];
    }

    private _getContent(): JSX.Element {

        if (!this.state.groups || Object.keys(this.state.groups).length === 0) {
            return (
                <div className="dtc-vg-view-no-vg-message">
                    {Resources.NoVariableGroupMessage}
                    <ExternalLink
                        className="dtc-vg-view-learn-more-link"
                        href={VariableGroupUtility.VARIABLE_GROUPS_LEARN_MORE_LINK}
                        text={Resources.LearnMoreVariableGroupsLinkText}
                        newTab={true}
                    />
                </div>
            );
        }
        else {
            return (
                <div>
                    <VssDetailsList
                        checkboxVisibility={CheckboxVisibility.hidden}
                        layoutMode={DetailsListLayoutMode.justified}
                        constrainMode={ConstrainMode.unconstrained}
                        selectionMode={SelectionMode.single}
                        columns={this._getColumns()}
                        groups={this.state.groups}
                        groupProps={{
                            isAllGroupsCollapsed: true,
                            onRenderHeader: this._onRenderGroupHeader
                        }}
                        items={this.state.items} />
                </div>
            );
        }
    }

    private _getFooterContent(): JSX.Element {
        return (
            <div className="dtc-vg-view-footer">
                <OpenLinkVariableGroupPanelButton
                    ref={(element: OpenLinkVariableGroupPanelButton) => {
                        this._openLinkVariableGroupPanelButton = element;
                    }}
                    onClick={this._onOpenLinkVariableGroupPanel} />
                <span className="dtc-vg-view-spacer">|</span>
                <div className="dtc-vg-view-manage-vg-link">
                    <ExternalLink
                        text={Resources.ManageVariableGroups}
                        href={DtcUtils.getUrlForExtension(VariableGroupUtility.LIBRARY_HUB)}
                        newTab={true} />
                </div>
            </div>
        );
    }

    private _deleteVariableGroup = (variableGroup: VariableGroup): void => {
        this._actionsCreator.deleteVariableGroup(variableGroup.id);
    }

    private _onChange = () => {
        this.setState(this._viewStore.getState());
    }

    private _onOpenLinkVariableGroupPanel = (): void => {
        if (this.props.options.supportScopes) {
            this._actionsCreator.initializeScopeSelection({
                scopes: this._viewStore.getState().scopes,
                scopePermissionsPayload: this._viewStore.getScopePermissionsPayload()
            });
        }

        this._actionsCreator.fetchLinkableVariableGroups();
        this._actionsCreator.showLinkVariableGroupPanel(true);
    }

    private _onGroupWillUnmount = (group: VariableGroupListHeader): void => {
        let index = group.props.groupDividerProps.groupIndex;
        delete this._groupHeaders[index];
    }

    private _onGroupDidMount = (group: VariableGroupListHeader): void => {
        let index = group.props.groupDividerProps.groupIndex;
        this._groupHeaders[index] = group;

        let { groupIndexToFocus } = this._viewStore.getState();

        if (groupIndexToFocus === index && this._groupHeaders[index]) {

            this._async.setTimeout(() => {
                this._groupHeaders[index].focus();
            }, 0);
        }
    }

    private _viewStore: VariableGroupViewStore;
    private _actionsCreator: VariableGroupActionsCreator;

    private _openLinkVariableGroupPanelButton: OpenLinkVariableGroupPanelButton;
    private _groupHeaders: IDictionaryNumberTo<VariableGroupListHeader>;
    private _async: Async;
}

