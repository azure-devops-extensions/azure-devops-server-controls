import * as React from "react";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { TooltipHost } from "VSSUI/Tooltip";
import { css } from "OfficeFabric/Utilities";

import * as Utils_String from "VSS/Utils/String";

import { KeyboardAccesibleComponent } from "Presentation/Scripts/TFS/Components/KeyboardAccessible";

import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";

import { ProjectOverviewConstants } from "ProjectOverview/Scripts/Generated/Constants";
import * as ProjectOverviewResources from "ProjectOverview/Scripts/Resources/TFS.Resources.ProjectOverview";
import { getTfvcRepositoryName } from "ProjectOverview/Scripts/Utils";
import { isGit as isGitRepository } from "ProjectOverview/Scripts/Shared/Components/ReadmeSection/ReadmeUtils";
import { DisplayFileSelectorState, ReadmeFile } from "ProjectOverview/Scripts/Shared/Components/ReadmeSection/ReadmeInterfaces";

export interface ReadmeToolbarProps {
    isDisplayContentPresent: boolean;

    // Edit content button props.
    isEditEnabled: boolean;
    readmeFile?: ReadmeFile;
    onEditingStart(): void;

    // Change content source button props
    displayFileSelectorState?: DisplayFileSelectorState;
    isRepositoryScope: boolean;
    isChangeReadmeRepositoryEnabled: boolean;
    isRepositoryChangeInProgress: boolean;
    onChangeReadmeClicked(): void;
}

export const ReadmeToolbar: React.StatelessComponent<ReadmeToolbarProps> = (props: ReadmeToolbarProps): JSX.Element => {
    const readmeToolbarMessageCSSClass = "readme-toolbar-message";
    const shouldShowEditOption = props.isDisplayContentPresent && props.isEditEnabled && !props.isRepositoryChangeInProgress;

    return <div className="rendered-readme-toolbar">
        {
            props.isRepositoryScope || props.isChangeReadmeRepositoryEnabled
                ? <ToolbarMessage {...toToolbarMessageProps(props, readmeToolbarMessageCSSClass) } />
                : <TooltipHost
                    id={this._tooltipId}
                    content={ProjectOverviewResources.Readme_RepoChange_NonAdmin_Tooltip_Content}
                    directionalHint={DirectionalHint.bottomCenter}>
                    <ToolbarMessage {...toToolbarMessageProps(props, readmeToolbarMessageCSSClass) } />
                </TooltipHost>
        }
        <div className="readme-toolbar-buttons-on-right">
            {
                shouldShowEditOption &&
                <KeyboardAccesibleComponent
                    className="edit-readme-cta cta"
                    onClick={props.onEditingStart}>
                    <span className="bowtie-icon bowtie-edit edit-readme-cta-icon" />
                    {props.displayFileSelectorState && props.displayFileSelectorState.isCurrentlySetToWikiHomePage
                        ? ProjectOverviewResources.ReadmeCTA_EditInWikiLabel
                        : ProjectOverviewResources.ReadmeCTA_EditLabel}
                </KeyboardAccesibleComponent>
            }
            {
                props.isChangeReadmeRepositoryEnabled &&
                <KeyboardAccesibleComponent
                    className="change-readme-cta cta"
                    onClick={props.onChangeReadmeClicked}>
                    <span className="bowtie-icon bowtie-settings-wrench change-readme-cta-icon" />
                    {ProjectOverviewResources.ReadmeCTA_ChangeLabel}
                </KeyboardAccesibleComponent>
            }
        </div>
    </div>;
}

interface ToolbarMessageProps {
    className: string;
    messageBeforeIcon: string;
    messageAfterIcon: string;
    iconCssClass: string;
}

const ToolbarMessage: React.StatelessComponent<ToolbarMessageProps> = (props: ToolbarMessageProps): JSX.Element => {
    return (
        <span className={props.className}>
            {props.messageBeforeIcon}
            <span className={props.iconCssClass} />
            {props.messageAfterIcon}
        </span>
    );
};

function toToolbarMessageProps(props: ReadmeToolbarProps, messageCssClass: string): ToolbarMessageProps {
    let iconCssClass: string;
    let className: string; 
    let messageBeforeIcon: string;
    let messageAfterIcon: string;
    const isRepoPresent = (props.displayFileSelectorState && props.displayFileSelectorState.isDefaultRepoPresent)
        || props.isRepositoryScope
        || props.isRepositoryChangeInProgress;

    if (props.displayFileSelectorState && props.displayFileSelectorState.isCurrentlySetToWikiHomePage) {
        const repositoryContext = props.displayFileSelectorState.currentWikiPage.repositoryContext;
        const wikiPageName = props.displayFileSelectorState.currentWikiPage.wikiHomePagePath
            ? props.displayFileSelectorState.currentWikiPage.wikiHomePagePath.substring(1)
            : ProjectOverviewResources.WikiHomePageNotFoundText;
        const wikiPageTitle = Utils_String.format(ProjectOverviewResources.WikiPageTitleText, wikiPageName);

        iconCssClass = "bowtie-icon icon bowtie-home only-padding";
        messageBeforeIcon = null;
        messageAfterIcon = wikiPageTitle;
    }
    else {
        // If display file selector is not present. Use readme file.
        const repositoryContext = props.displayFileSelectorState
            ? props.displayFileSelectorState.currentReadmeFile.repositoryContext
            : props.readmeFile.repositoryContext;
        const repositoryName = isGitRepository(repositoryContext)
            ? repositoryContext.getRepository().name
            : getTfvcRepositoryName(repositoryContext.getTfsContext());

        iconCssClass = css("bowtie-icon icon", isRepoPresent && repositoryContext.getRepositoryClass());

        if (props.isDisplayContentPresent) {
            if (props.isRepositoryScope) {
                messageAfterIcon = ProjectOverviewConstants.ReadmeFileName;
                iconCssClass = "";
            }
            else {
                messageAfterIcon = Utils_String.format(ProjectOverviewResources.ReadmeFileTitleText, repositoryName, ProjectOverviewConstants.ReadmeFileName);
                iconCssClass = css(iconCssClass, "only-padding");
            }
        }
        else {
            if (isRepoPresent) {
                messageBeforeIcon = ProjectOverviewResources.ReadmeToolbar_NoReadme;
                messageAfterIcon = repositoryName;
            }
            else {
                messageBeforeIcon = Utils_String.format(ProjectOverviewResources.ReadmeRepoNotFoundText, ProjectOverviewConstants.ReadmeFileName);
                messageAfterIcon = "";
            }
        }
    }

    return {
        iconCssClass,
        className: messageCssClass,
        messageBeforeIcon,
        messageAfterIcon,
    };
}
