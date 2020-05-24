/// <reference types="react" />

import * as React from "react";
import { FocusZone } from "OfficeFabric/FocusZone";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { format } from "VSS/Utils/String";
import { IdentityRef } from "VSS/WebApi/Contracts";
import { IdentityDetailsProvider } from "VSSPreview/Providers/IdentityDetailsProvider";
import { VssPersona } from "VSSUI/VssPersona";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ProjectMember } from "ProjectOverview/Scripts/Components/ProjectMember";
import * as ProjectOverviewResources from "ProjectOverview/Scripts/Resources/TFS.Resources.ProjectOverview";
import { ProjectMembersState } from "ProjectOverview/Scripts/Stores/ProjectMembersStore";
import { MemberInfo } from "ProjectOverview/Scripts/Generated/Contracts";

import "VSS/LoaderPlugins/Css!ProjectOverview/Scripts/Components/ProjectMembersSection";

export interface ProjectMembersSectionProps {
    state: ProjectMembersState;
    onAddMemberButtonClicked: (maxMembersToDisplay: number) => void;
    headingLevel: number;
}

const maxMembersToDisplay: number = 8;

export class ProjectMembersSection extends React.Component<ProjectMembersSectionProps, {}> {
    public render(): JSX.Element {
        let membersToDisplay: MemberInfo[] = this._getMembersToDisplay();
        let membersPaneSubTitle = "";

        if (this.props.state.membersCount > 0) {
            membersPaneSubTitle = format("({0}{1})", this.props.state.membersCount, (this.props.state.hasMore ? "+" : ""));
        }

        return (
            <div>
                <TitleBar
                    title={ProjectOverviewResources.ProjectMembers_Title}
                    subTitle={membersPaneSubTitle}
                    headingLevel={this.props.headingLevel} />
                {
                    this.props.state.errorMessage
                        ? <MessageBar
                            messageBarType={MessageBarType.error}>
                            {this.props.state.errorMessage}
                        </MessageBar>
                        : <div className="members-container">
                            <FocusZone className="members-list">
                            {
                                membersToDisplay.map((member: MemberInfo): JSX.Element => {
                                    return (
                                        <ProjectMember
                                            key={member.id}
                                            member={member} />
                                    );
                                })
                            }
                            </FocusZone>
                            {
                                this.props.state.isUserAdmin &&
                                <AddMemberButton onAddMemberButtonClicked={this._onAddMemberButtonClicked} />
                            }
                        </div>
                }
            </div>
        );
    }

    private _onAddMemberButtonClicked = (): void => {
        this.props.onAddMemberButtonClicked(maxMembersToDisplay);
    }

    private _getMembersToDisplay = (): MemberInfo[] => {
        // Admin user has the ability to add members to team, to do that 'Add Member' button is displayed for user
        // 'Add Member' the plus button shows up whether team has only admin user or both admin & non-admin users
        // This will be next to last member displayed in the section
        // Non-admin users will not see this button and in case where there are 8 members, non-admin user will see all 8 members 
        // but admin user will see 7 members and 'Add Member' button, so that's why -1
        return this.props.state.isUserAdmin
            ? this.props.state.membersToDisplay.slice(0, maxMembersToDisplay - 1)
            : this.props.state.membersToDisplay.slice(0, maxMembersToDisplay);
    }
}

const TitleBar = (props: {
    title: string,
    subTitle: string,
    headingLevel: number,
}): JSX.Element => {
    return (
        <div
            className="members-title-div"
            role="heading"
            aria-level={props.headingLevel}>
            <div className="title">{props.title}</div>
            <div className="sub-title">{props.subTitle}</div>
        </div>
    );
}

const AddMemberButton = (props: { onAddMemberButtonClicked: () => void }): JSX.Element => {
    return (
        <button
            className="add-member-container btn-cta"
            type="button"
            aria-label={ProjectOverviewResources.ProjectMembers_ManageTeamMembers}
            onClick={props.onAddMemberButtonClicked}>
            <i className="bowtie-icon bowtie-math-plus-heavy"></i>
        </button>
    );
}
