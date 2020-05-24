import * as React from "react";
import * as ReactDOM from "react-dom";

import * as Context from "VSS/Context";
import { registerLWPComponent } from "VSS/LWP";
import * as SDK_Shim from "VSS/SDK/Shim";
import * as Core_RestClient from "TFS/Core/RestClient";

import {
    IContributedComponent,
    IInviteUserToProjectDialogState,
    InviteUserToProjectDialogContainerIdType,
    IUserManagementService,
    userManagementServiceContributionId,
} from "Aex/MemberEntitlementManagement/Services";
import {
    TeamRef
} from "Aex/MemberEntitlementManagement/Contracts";

export interface AddUserDialogComponentProps {
    showAddUsersDialog: boolean;
    onAddUsersActionComplete?(): void;
    onAddUserDialogLoadStarted?(): void;
    onAddUserDialogLoadCompleted?(): void;
    onAddUserDialogDismiss?(): void;
}

export class AddUserDialogComponent extends React.Component<AddUserDialogComponentProps, {}> {
    private _isAddUserDialogLoaded: boolean;
    private _addUserDialogContainer?: HTMLDivElement;
    private _messageBarContainer?: HTMLDivElement;
    private _addUserDialogComponent?: IContributedComponent<IInviteUserToProjectDialogState, InviteUserToProjectDialogContainerIdType>;

    public render(): JSX.Element {
        return (
            <>
                <div ref={(c) => { this._messageBarContainer = c; }} />
                <div ref={(c) => { this._addUserDialogContainer = c; }} />
            </>);
    }

    public componentDidMount(): void {
        this._loadAddUserDialog();
    }

    public componentDidUpdate(prevProps: AddUserDialogComponentProps): void {
        if (this.props.showAddUsersDialog !== prevProps.showAddUsersDialog) {
            if (this.props.showAddUsersDialog && !this._isAddUserDialogLoaded) {
                this._loadAddUserDialog();
            }

            if (this._addUserDialogComponent) {
                this._addUserDialogComponent.setState({
                    hidden: !this.props.showAddUsersDialog,
                });
            }
        }
    }

    public componentWillUnmount(): void {
        if (this._addUserDialogContainer) {
            ReactDOM.unmountComponentAtNode(ReactDOM.findDOMNode(this._addUserDialogContainer) as Element);
            this._addUserDialogContainer = undefined;
        }

        if (this._messageBarContainer) {
            ReactDOM.unmountComponentAtNode(ReactDOM.findDOMNode(this._messageBarContainer) as Element);
            this._addUserDialogContainer = undefined;
        }
    }

    private async _loadAddUserDialog(): Promise<void> {
        if (this.props.onAddUserDialogLoadStarted) {
            this.props.onAddUserDialogLoadStarted();
        }

        const umServicePromise = SDK_Shim.VSS.getService<IUserManagementService>(userManagementServiceContributionId);
        const umService = umServicePromise && await umServicePromise;
        if (!umService) {
            return;
        }

        const teamContext = await this.getDefaultTeamInTeamContext();
        this._addUserDialogComponent = umService.getAddUsersToProjectDialogComponent({
            hidden: !this.props.showAddUsersDialog,
            onDismiss: this.props.onAddUserDialogDismiss,
            onActionComplete: this.props.onAddUsersActionComplete,
            teamOptionsPromise: this.getTeamRefs(),
            teamContext: teamContext,
        });

        if (this._addUserDialogContainer) {
            const domNode: HTMLElement = ReactDOM.findDOMNode(this._addUserDialogContainer) as HTMLElement;
            this._addUserDialogComponent.renderInContainer(domNode, "dialog");
        }

        if (this._messageBarContainer) {
            const domNode: HTMLElement = ReactDOM.findDOMNode(this._messageBarContainer) as HTMLElement;
            this._addUserDialogComponent.renderInContainer(domNode, "message-bar");
        }

        this._isAddUserDialogLoaded = true;
        if (this.props.onAddUserDialogLoadCompleted) {
            this.props.onAddUserDialogLoadCompleted();
        }
    }

    private async getTeamRefs(): Promise<TeamRef[]> {
        const webContext = Context.getDefaultWebContext();
        const projectId = webContext.project ? webContext.project.id : undefined;

        if (projectId) {
            const client = Core_RestClient.getClient();
            const webApiTeams = await client.getTeams(projectId);
            const teamRefs = webApiTeams.map((team) => { return { id: team.id, name: team.name } as TeamRef; });
            return teamRefs;
        }

        return [];
    }

    private async getDefaultTeamInTeamContext(): Promise<TeamContext> {
        const project = await Core_RestClient.getClient().getProject(Context.getDefaultWebContext().project.id);
        if (project && project.defaultTeam) {
            return { id: project.defaultTeam.id, name: project.defaultTeam.name } as TeamContext;
        }

        return undefined;
    }
}

registerLWPComponent("TFS.ProjectOverview.AddUserDialog", AddUserDialogComponent);
