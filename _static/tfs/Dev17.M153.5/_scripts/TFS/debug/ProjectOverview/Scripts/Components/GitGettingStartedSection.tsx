/// <reference types="react" />

import * as React from "react";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as GitRepositoryContext from "VersionControl/Scripts/GitRepositoryContext";
import { GettingStartedView } from "VersionControl/Scenarios/NewGettingStarted/GettingStartedView";
import { UrlHelper } from "ProjectOverview/Scripts/Utils";
import * as ProjectOverviewResources from "ProjectOverview/Scripts/Resources/TFS.Resources.ProjectOverview";

import "VSS/LoaderPlugins/Css!ProjectOverview/Scripts/Components/GitGettingStartedSection";

export interface GitGettingStartedProps {
    repositoryContext: GitRepositoryContext.GitRepositoryContext;
    sshEnabled: boolean;
    sshUrl: string;
    cloneUrl: string;
    headingLevel: number;
    hasBuildPermission: boolean;
    isPublicAccess: boolean;
}

export class GitGettingStartedSection extends React.Component<GitGettingStartedProps, {}> {
    private static _defaultGettingStartedClass = "project-getting-started";

    public render(): JSX.Element {
        const heading = this.props.isPublicAccess
            ? ProjectOverviewResources.EmptyProject_Heading_PublicAccess
            : ProjectOverviewResources.EmptyProject_Heading_MemberAccess;

        return <div className={GitGettingStartedSection._defaultGettingStartedClass}>
            <GettingStartedView
                tfsContext={this.props.repositoryContext.getTfsContext()}
                repositoryContext={this.props.repositoryContext}
                hasBuildPermission={this.props.hasBuildPermission}
                buildUrl={UrlHelper.getNewBuildDefinitionUrl()}
                isCloneExperience={false}
                sshEnabled={this.props.sshEnabled}
                sshUrl={this.props.sshUrl}
                cloneUrl={this.props.cloneUrl}
                branchName={this.props.repositoryContext.getRepository().defaultBranch}
                isEmptyProject={true}
                heading={heading}
                headingLevel={this.props.headingLevel}
            />
        </div>;
    }
}
