/// <reference types="react" />

import "VSS/LoaderPlugins/Css!Agile/Scripts/Backlog/ContextMenu/Components/ChangeParentDialog";

import VSS = require("VSS/VSS");
import React = require("react");
import { Fabric } from "OfficeFabric/Fabric";
import * as Dialog from "OfficeFabric/Dialog";
import * as Button from "OfficeFabric/Button";
import * as Dropdown from "OfficeFabric/Dropdown";
import * as Tooltip from "VSSUI/Tooltip";
import * as Utils_String from "VSS/Utils/String";
import * as Dialogs from "VSS/Controls/Dialogs";
import * as VSS_Resources_Common from "VSS/Resources/VSS.Resources.Common";
import * as AgileProductBacklogResources from "Agile/Scripts/Resources/TFS.Resources.AgileProductBacklog";
import * as AgileResources from "Agile/Scripts/Resources/TFS.Resources.Agile";
import * as WorkItemTypeIconControl from "Presentation/Scripts/TFS/Components/WorkItemTypeIcon";

export interface IWorkItemInfo {
    id: number;
    title: string;
    workitemType: string;
    projectName: string;
}

export interface ITeamInfo {
    tfid: string;
    name: string;
}

export interface IChangeParentDialogProps {
    selectedWorkItemIds: number[];
    onDismiss: () => void;
    saveHandler: (parentId: number) => void;
    teamsMru: ITeamInfo[];
    initialSuggestedWorkItems: IDictionaryStringTo<IWorkItemInfo>;
    getSuggestedWorkItems?: (team: string) => IPromise<IDictionaryStringTo<IWorkItemInfo>>,
}

export interface IChangeParentDialogState {
    isDirty: boolean;
    selectedTeam: string;
    selectedParentId: number;
    suggestedWorkItems: IDictionaryStringTo<IWorkItemInfo>;
    teamsMru: ITeamInfo[];
}

export class ChangeParentDialog extends React.Component<IChangeParentDialogProps, IChangeParentDialogState> {

    private static CSS_Change_Parent_Dialog_Container = "change-parent-dialog";
    private static CSS_Browse_Teams_Dialog_Container = "browse-all-dialog-container";

    private _parentPickerDropdown: Dropdown.Dropdown;

    constructor(props: IChangeParentDialogProps) {
        super(props);
        this.state = {
            isDirty: false,
            selectedTeam: this.props.teamsMru[0].tfid || null,
            selectedParentId: null,
            suggestedWorkItems: this.props.initialSuggestedWorkItems,
            teamsMru: this.props.teamsMru,
        } as IChangeParentDialogState;
    }

    /**
     * Render change parent dialog
     */
    public render(): JSX.Element {
        const dialogProps: Dialog.IDialogProps = {
            type: Dialog.DialogType.close,
            containerClassName: ChangeParentDialog.CSS_Change_Parent_Dialog_Container,
            title: AgileProductBacklogResources.BacklogsChangeParentDialogTitle,
            onDismiss: this.props.onDismiss,
            isBlocking: true,
            isOpen: true
        };

        return (
            <Fabric>
                <Dialog.Dialog {...dialogProps}>
                    <div className={ChangeParentDialog.CSS_Browse_Teams_Dialog_Container}></div>
                    <div className="change-parent-dialog-content">
                        <p>{Utils_String.format(AgileProductBacklogResources.BacklogsChangeParentDialogDescription, this.props.selectedWorkItemIds.length)}</p>
                        {this._renderTeamPicker()}
                        {this._renderParentPicker()}
                    </div>
                    {this._renderDialogFooter()}
                </Dialog.Dialog>
            </Fabric>
        );
    }

    public componentDidMount() {
        if (this._parentPickerDropdown) {
            // On dialog open, focus parent-picker-control 
            this._parentPickerDropdown.focus();
        }
    }

    /**
     * Render team picker component
     */
    private _renderTeamPicker(): JSX.Element {
        const renderTeamName = (name: string): JSX.Element => {
            return <div className="change-parent-team-picker-title">
                <Tooltip.TooltipHost
                    overflowMode={Tooltip.TooltipOverflowMode.Parent}
                    content={name}>
                    {name}
                </Tooltip.TooltipHost>
            </div>;
        }
        let props: Dropdown.IDropdownProps = {
            label: <span className="ms-font-m ms-fontColor-neutralSecondary ms-fontWeight-semibold">
                {AgileProductBacklogResources.ChangeParentDialogTeamPickerLabel}</span> as any,
            onRenderTitle: (option: Dropdown.IDropdownOption): JSX.Element => {
                let title = option.text;
                if (this.state.selectedTeam) {
                    title = this.state.teamsMru.filter(t => Utils_String.equals(t.tfid, this.state.selectedTeam, true))[0].name;
                }
                return renderTeamName(title);
            },
            onRenderOption: (option: Dropdown.IDropdownOption): JSX.Element => {
                return renderTeamName(option.text);
            },
            onChanged: (option: Dropdown.IDropdownOption, index?: number) => {
                this._handleTeamChange(option.key as string);
            },
            disabled: false
        };

        if (this.props.selectedWorkItemIds.length > 0) {
            props.options = this.state.teamsMru.map(t => {
                return {
                    key: t.tfid,
                    text: t.name,
                    selected: Utils_String.equals(t.tfid, this.state.selectedTeam, true)
                } as Dropdown.IDropdownOption
            });
        }
        else {
            props.disabled = true;
        }

        const buttonProps: Button.IButtonProps = {
            disabled: false,
            onClick: () => {
                const selectedTeam = this.state.selectedTeam;
                VSS.using(['Admin/Scripts/TFS.Admin.Dialogs', 'Admin/Scripts/TFS.Admin.Controls'], (AdminDialogs, AdminControls) => {
                    Dialogs.show(AdminDialogs.TeamPickerDialog, {
                        okCallback: (team: ITeamInfo) => {
                            this._handleNewTeamAdded(team);
                        },
                        selectedTeam: selectedTeam,
                        dialogClass: "change-parent-team-picker-dialog",
                        appendTo: `.${ChangeParentDialog.CSS_Browse_Teams_Dialog_Container}`
                    });
                });
            }
        };

        return (
            <div className="team-picker-container">
                <div className="dropdown-container">
                    <Dropdown.Dropdown
                        {...props}
                        ariaLabel={AgileProductBacklogResources.ChangeParentDialogTeamPickerLabel}
                    />
                </div>
                <div className="browse-all-container">
                    <Tooltip.TooltipHost content={VSS_Resources_Common.BrowseAllTeams}>
                        <Button.DefaultButton
                            {...buttonProps}
                            className={"browse-all"}
                            ariaLabel={VSS_Resources_Common.BrowseAllTeams}
                        >
                            {"..."}
                        </Button.DefaultButton>
                    </Tooltip.TooltipHost>
                </div>
            </div>
        );
    }

    /**
     * Handle new team added action
     * @param team
     */
    private _handleNewTeamAdded(team: ITeamInfo) {
        let teamsMru = this.state.teamsMru;
        if (!teamsMru.some(t => Utils_String.equals(t.tfid, team.tfid, true))) {
            teamsMru = teamsMru.concat(team);
            this.setState({
                isDirty: false,
                selectedParentId: null,
                selectedTeam: team.tfid,
                suggestedWorkItems: this.state.suggestedWorkItems,
                teamsMru: teamsMru
            });
        }

        this._handleTeamChange(team.tfid);
    }

    /**
     * Handle team change action
     * @param newTeamId
     */
    private _handleTeamChange(newTeamId: string) {
        const setState = (items: IDictionaryStringTo<IWorkItemInfo>) => {
            this.setState({
                isDirty: false,
                selectedTeam: newTeamId,
                suggestedWorkItems: items,
                selectedParentId: null,
                teamsMru: this.state.teamsMru
            } as IChangeParentDialogState);
        };
        this.props.getSuggestedWorkItems(newTeamId).then(
            (items: IDictionaryStringTo<IWorkItemInfo>) => {
                setState(items);
            },
            (error: Error) => {
                setState(null);
            }
        );
    }

    /**
     * Renders 'new parent' dropdown control
     */
    private _renderParentPicker(): JSX.Element {
        let props: Dropdown.IDropdownProps = {
            label: (
                <span
                    className="ms-font-m ms-fontColor-neutralSecondary ms-fontWeight-semibold"
                >
                    {AgileProductBacklogResources.ChangeParentDialogWorkItemPickerLabel}
                </span> as any
            ),
            onChanged: (option: Dropdown.IDropdownOption, index?: number) => {
                this.setState({
                    isDirty: this._isDirty(option.key.toString(), this.state.suggestedWorkItems),
                    selectedParentId: option.key,
                    selectedTeam: this.state.selectedTeam,
                    suggestedWorkItems: this.state.suggestedWorkItems,
                    teamsMru: this.state.teamsMru,
                    isParentPickerDisabled: false
                } as IChangeParentDialogState);
            },
            onRenderTitle: (option: Dropdown.IDropdownOption): JSX.Element => {
                if (this.state.selectedParentId) {
                    const info = this.state.suggestedWorkItems[this.state.selectedParentId];
                    if (info) {
                        return this._renderWorkItem(info, "selection-title");
                    }
                }

                const workItemsAvailable = this.state.suggestedWorkItems && Object.keys(this.state.suggestedWorkItems).length > 0;
                if (workItemsAvailable) {
                    return <div>{AgileProductBacklogResources.ChangeParentDialogWorkItemPickerHelpText}</div>;
                } else {
                    return <div>{AgileProductBacklogResources.ChangeParentDialogWorkItemPickerDisabledText}</div>;
                }
            },
            onRenderOption: (option: Dropdown.IDropdownOption): JSX.Element => {
                const info = this.state.suggestedWorkItems[option.key as string];
                return this._renderWorkItem(info, "dropdown-title");
            },
            disabled: false,
            ariaLabel: AgileProductBacklogResources.ChangeParentDialogWorkItemPickerLabel
        };

        const workItemIds = Object.keys(this.state.suggestedWorkItems);
        if (workItemIds.length > 0) { // There are atleast one selected workitems
            props.options = workItemIds.map(id => {
                const wi = this.state.suggestedWorkItems[id];
                return { key: wi.id, selected: wi.id === this.state.selectedParentId } as Dropdown.IDropdownOption
            });
        }
        else {
            props.disabled = true;
        }

        return (
            <div className="parent-work-item-picker">
                <Dropdown.Dropdown
                    {...props}
                    ref={(dropdown) => {
                        this._parentPickerDropdown = dropdown;
                    }}
                />
            </div>
        );
    }

    /**
     * Workitem renderer
     * @param info
     */
    private _renderWorkItem(info: IWorkItemInfo, parentClass?: string): JSX.Element {
        return <div className={`change-parent-workitem-picker ${parentClass || ""}`}>
            <WorkItemTypeIconControl.WorkItemTypeIcon workItemTypeName={info.workitemType} projectName={info.projectName} />
            <Tooltip.TooltipHost
                overflowMode={Tooltip.TooltipOverflowMode.Parent}
                content={info.title}>
                <div className="work-item-id">{`${info.id}:`}</div>
                {info.title}
            </Tooltip.TooltipHost>
        </div>;
    }

    /**
     * Renders change parent dialog footer
     */
    private _renderDialogFooter(): JSX.Element {
        return <Dialog.DialogFooter>
            <Button.PrimaryButton
                disabled={!this.state.isDirty}
                onClick={() => this.props.saveHandler(this.state.selectedParentId)}>
                {AgileProductBacklogResources.BacklogsChangeParentDialogFooterOk}
            </Button.PrimaryButton>
            <Button.DefaultButton
                disabled={false}
                onClick={() => this.props.onDismiss()}>
                {AgileProductBacklogResources.BacklogsChangeParentDialogFooterCancel}
            </Button.DefaultButton>
        </Dialog.DialogFooter>;
    }

    private _isDirty(parentId: string, suggestedWorkItems: IDictionaryStringTo<IWorkItemInfo>) {
        return parentId && Object.keys(suggestedWorkItems || {}).some(id => Utils_String.equals(id, parentId, true));
    }
}

export interface ISimpleMessageDialogProps {
    title: string;
    message: string;
    onDismiss: () => void;
    link?: ISimpleMessageLink; // Link to be appended to message
}

export interface ISimpleMessageLink {
    linkText: string;
    url: string;
}

export class SimpleMessageDialog extends React.Component<ISimpleMessageDialogProps, null> {
    public render(): JSX.Element {
        const dialogProps: Dialog.IDialogProps = {
            isOpen: true,
            type: Dialog.DialogType.close,
            isBlocking: true,
            title: this.props.title,
            containerClassName: "change-parent-simple-message-dialog",
            onDismiss: () => this.props.onDismiss()
        };

        return (
            <Fabric>
                <Dialog.Dialog {...dialogProps}>
                    {this.props.message}
                    {this.props.link ? <a href={this.props.link.url}>{this.props.link.linkText}</a> : null}
                    <Dialog.DialogFooter>
                        <Button.PrimaryButton onClick={() => this.props.onDismiss()}>{AgileResources.Close}</Button.PrimaryButton>
                    </Dialog.DialogFooter>
                </Dialog.Dialog>
            </Fabric>
        );
    }
}