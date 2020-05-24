/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { IDefinitionVariableGroup, IScope } from "DistributedTaskControls/Variables/Common/Types";
import { VariableGroupUtility } from "DistributedTaskControls/Variables/VariableGroup/VariableGroupUtility";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { VariableGroupActionsCreator } from "DistributedTaskControls/Variables/VariableGroup/Actions/VariableGroupActionsCreator";
import { IUpdateScopePermissionsActionPayload } from "DistributedTaskControls/Variables/ProcessVariables/Actions/Actions";

import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { autobind, css } from "OfficeFabric/Utilities";
import { CommandButton } from "OfficeFabric/Button";
import { IIconProps } from "OfficeFabric/Icon";
import { FocusZone, FocusZoneDirection } from "OfficeFabric/FocusZone";
import { IGroupDividerProps } from "OfficeFabric/DetailsList";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { MoreActionsButton } from "VSSUI/ContextualMenuButton";
import { announce } from "VSS/Utils/Accessibility";
import { SafeLink } from "DistributedTaskControls/Components/SafeLink";

import { VariableGroup } from "TFS/DistributedTask/Contracts";

export interface IVariableGroupListHeaderProps extends Base.IProps {
    groupDividerProps: IGroupDividerProps;
    shouldShowMoreActions?: boolean;
    onGroupExpandStateChange: (props: IGroupDividerProps) => void;
    onDeleteGroup: (variableGroup: VariableGroup) => void;
    onGroupDidMount: (group: VariableGroupListHeader) => void;
    onGroupWillUnmount: (group: VariableGroupListHeader) => void;
}

export interface IVariableGroupListHeaderState {
    isHeaderActive: boolean;
}

export class VariableGroupListHeader extends Base.Component<IVariableGroupListHeaderProps, IVariableGroupListHeaderState> {

    constructor(props: IVariableGroupListHeaderProps) {
        super(props);
        this.state = { isHeaderActive: false };
    }

    public componentWillMount(): void {
        this._vgDeletedAnnounced = false;
        this._actionsCreator = ActionCreatorManager.GetActionCreator<VariableGroupActionsCreator>(VariableGroupActionsCreator);
    }

    public componentDidMount(): void {
        this.props.onGroupDidMount(this);
    }

    public componentWillUnmount(): void {
        this.props.onGroupWillUnmount(this);
    }

    public render(): JSX.Element {

        let chevronIconProps: IIconProps = { className: "dtc-variable-group-toggle-icon", iconName: "ChevronDown" };
        let { groupDividerProps } = this.props;
        let { variableGroup, scopes, permissionsPayload } = groupDividerProps.group.data;

        let groupHeaderTitle: string;
        let groupHeaderDescription: string;
        let groupHeaderCssClass: string = "dtc-variable-group-header-info";

        if (VariableGroupUtility.isDeleted(variableGroup)) {
            groupHeaderTitle = Resources.VariableGroupDeleted;
            groupHeaderDescription = Resources.VariableGroupDeletedMessage;
            groupHeaderCssClass = css(groupHeaderCssClass, "dtc-variable-group-deleted");

        } else if (VariableGroupUtility.isAccessToVariableGroupNotAllowed(variableGroup)) {
            groupHeaderTitle = variableGroup.name;
            groupHeaderDescription = Resources.VariableGroupUnaccessibleMessage;
            groupHeaderCssClass = css(groupHeaderCssClass, "dtc-variable-group-not-accessible");
        } else {
            groupHeaderTitle = `${groupDividerProps.group.name} (${groupDividerProps.group.count})`;
            groupHeaderDescription = variableGroup.description;
        }

        let chevronIconButtonClassName = css("dtc-variable-group-toggle-button",
            groupDividerProps.group.isCollapsed !== true && "dtc-variable-group-expanded");

        let chervronIconButtonAriaLabel = (groupDividerProps.group.isCollapsed !== true) ?
            Resources.VariableGroupHeaderExpandedAriaLabel :
            Resources.VariableGroupHeaderCollapsedAriaLabel;

        let chevronIconButtonAriaExpanded: boolean = (groupDividerProps.group.isCollapsed !== true) ? true : false;

        return (
            <div
                ref={this._resolveRef("_container")}
                onBlur={this._onBlur}
                onFocus={this._onFocus}
                aria-label={groupHeaderTitle}
                aria-describedby="variable-group-describedby"
                className={css("dtc-variable-group-header", { "dtc-vg-header-active": this.state.isHeaderActive })}
                data-is-focusable="true">
                <div className="hidden" id="variable-group-describedby">{groupHeaderDescription}</div>
                <FocusZone
                    ref={this._resolveRef("_focusZone")}
                    direction={FocusZoneDirection.horizontal}
                    className={"dtc-variable-group-header-focus-zone"}>
                    <CommandButton
                        ariaLabel={chervronIconButtonAriaLabel}
                        onClick={() => this.props.onGroupExpandStateChange(groupDividerProps)}
                        className={chevronIconButtonClassName}
                        iconProps={chevronIconProps}
                        aria-expanded={chevronIconButtonAriaExpanded} />
                    <div className={groupHeaderCssClass} style={{ width: "calc(100% - 200px)" }}>
                        {this._getGroupHeaderTitle(groupHeaderTitle, variableGroup)}
                        <div className="dtc-variable-group-description">
                            <TooltipHost
                                overflowMode={TooltipOverflowMode.Parent}
                                content={groupHeaderDescription} >
                                {groupHeaderDescription}
                            </TooltipHost>
                        </div>
                    </div>
                    {this.props.shouldShowMoreActions && this._renderMoreActions(variableGroup, scopes, permissionsPayload)}
                    {this._renderScopes(variableGroup.scopes)}
                    {this._renderUnlinkButton(variableGroup)}
                </FocusZone>
            </div>
        );
    }

    public focus(): void {
        this._focusZone.focus();
    }

    private _getGroupHeaderTitle(title: string, variableGroup: VariableGroup): JSX.Element {

        if (VariableGroupUtility.isDeleted(variableGroup)) {
            //  announce here
            if (!this._vgDeletedAnnounced) {
                announce(title, true);
                this._vgDeletedAnnounced = true;
            }
            return this._getGroupHeaderForDeletedOrUnaccesibleVarriableGroup(title, "dtc-vg-error-icon bowtie-status-error-outline");
        } else if (VariableGroupUtility.isAccessToVariableGroupNotAllowed(variableGroup)) {
            return this._getGroupHeaderForDeletedOrUnaccesibleVarriableGroup(title, "dtc-vg-warning-icon bowtie-status-info-outline");
        } else {
            return (
                <div className="dtc-variable-group-name">
                    <TooltipHost
                        overflowMode={TooltipOverflowMode.Parent}
                        content={title} >
                        <SafeLink
                            target="_blank"
                            className="dtc-variable-group-name-link"
                            href={VariableGroupUtility.getLibraryHubLink(variableGroup)}>
                            {title}
                        </SafeLink>
                    </TooltipHost>
                </div>
            );
        }
    }

    private _getGroupHeaderForDeletedOrUnaccesibleVarriableGroup(title: string, iconClassName?: string): JSX.Element {
        return (
            <div className="dtc-variable-group-name">
                <i className={css("bowtie-icon", "left", iconClassName)} />
                <TooltipHost
                    overflowMode={TooltipOverflowMode.Parent}
                    content={title} >
                    {title}
                </TooltipHost>
            </div>
        );
    }

    private _renderScopes(scopes: IScope[]): JSX.Element {
        if (!scopes || scopes.length === 0) {
            return;
        }

        let fullScopeString = VariableGroupUtility.getFullScopeString(scopes);
        let scopeString = VariableGroupUtility.getShortScopeString(scopes);

        return (
            <div className="dtc-variable-group-scopes">
                {fullScopeString !== scopeString ? (
                    <TooltipHost
                        content={fullScopeString}>
                        {scopeString}
                    </TooltipHost>
                ) : (
                        scopeString
                    )}
            </div>
        );
    }

    private _renderMoreActions(variableGroup: IDefinitionVariableGroup, scopes: IScope[], permissionsPayload: IUpdateScopePermissionsActionPayload) {
        if (!variableGroup.scopes || variableGroup.scopes.length === 0) {
            return;
        }

        return <MoreActionsButton
            className={"dtc-variable-group-more-actions"}
            getItems={() => this._getMoreActionsItems(variableGroup, scopes, permissionsPayload)} />;
    }

    private _getMoreActionsItems(variableGroup: IDefinitionVariableGroup, allScopes: IScope[], permissionsPayload: IUpdateScopePermissionsActionPayload): IContextualMenuItem[] {
        return [
            {
                ariaLabel: Resources.ChangeScopeText,
                name: Resources.ChangeScopeText,
                key: "edit",
                disabled: (!variableGroup.variables || Object.keys(variableGroup.variables).length === 0),
                iconProps: {
                    iconName: "Edit"
                },
                onClick: () => {
                    if (!!variableGroup.scopes) {
                        this._actionsCreator.initializeScopeSelection({
                            scopes: allScopes,
                            selectedScopes: variableGroup.scopes,
                            scopePermissionsPayload: permissionsPayload
                        });
                    }

                    this._actionsCreator.showEditVariableGroupPanel({ show: true, variableGroup: variableGroup });
                },
                className: "dtc-variable-group-edit-action"
            },
            {
                ariaLabel: Resources.UnlinkText,
                name: Resources.UnlinkText,
                key: "unlink",
                iconProps: {
                    iconName: "RemoveLink"
                },
                onClick: () => {
                    this.props.onDeleteGroup(variableGroup);
                },
                className: "dtc-variable-group-remove-action"
            }
        ];
    }

    private _renderUnlinkButton(variableGroup: IDefinitionVariableGroup) {
        // do not render if scopes are available, unlink will be shown in more actions menu
        if (!!variableGroup.scopes && variableGroup.scopes.length !== 0) {
            return;
        }

        return <CommandButton
            ariaLabel={Resources.UnlinkText}
            onClick={() => { this.props.onDeleteGroup(variableGroup); }}
            className="dtc-remove-variable-group-button"
            iconProps={{ iconName: "RemoveLink" }} >
            {Resources.UnlinkText}
        </CommandButton>;
    }

    @autobind
    private _onFocus(ev: React.FocusEvent<HTMLDivElement>) {
        this.setState({ isHeaderActive: true });
    }

    @autobind
    private _onBlur(ev: React.FocusEvent<HTMLDivElement>) {

        // In HTML, only 1 element can have foucs at a time, so with keyboard 
        // when we focus over the child elements (ex. chervron, unlink) the focus goes to them and parent groupHeader div
        // looses the focus. Here we are trying to ensure that when focus goes to child the header is still treated as active
        if (!ev || !ev.relatedTarget || !this._container.contains(ev.relatedTarget as HTMLElement)) {
            this.setState({ isHeaderActive: false });
        }
    }

    private _vgDeletedAnnounced: boolean;
    private _focusZone: FocusZone;
    private _container: HTMLElement;
    private _actionsCreator: VariableGroupActionsCreator;
}