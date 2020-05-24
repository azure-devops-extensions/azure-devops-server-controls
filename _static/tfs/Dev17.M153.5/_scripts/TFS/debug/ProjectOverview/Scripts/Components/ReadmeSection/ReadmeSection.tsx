import * as React from "react";
import { CommandBar } from "OfficeFabric/CommandBar";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";

import { VersionSpec, GitBranchVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { VersionControlActionIds } from "VersionControl/Scripts/Controls/ControlsCommon";
import { ItemModel } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { NewCommitDescriptor } from "VersionControl/Scenarios/Explorer/ActionCreator";
import { CommitPromptState } from "VersionControl/Scenarios/Shared/Committing/CommitPromptStore";
import { CreatePullRequestSuggestionBanner } from "VersionControl/Scenarios/Shared/Notifications/CreatePullRequestSuggestionBanner";

import { Upsell } from "ProjectOverview/Scripts/Components/Upsell";
import { ReadmeState, ReadmeFileState, ReadmeEditState, WikiPageState } from "ProjectOverview/Scripts/Stores/ReadmeStore";
import { ReadmeActionCreator } from "ProjectOverview/Scripts/ActionCreators/ReadmeActionCreator";
import { ReadmeEditorActionCreator } from "ProjectOverview/Scripts/Shared/ReadmeEditorActionCreator";
import { CommandsOptions } from "ProjectOverview/Scripts/Shared/Components/ReadmeSection/EditModeToolbar";
import { AsyncReadmeEditorContainer } from "ProjectOverview/Scripts/Shared/Components/ReadmeSection/ReadmeEditorAsync";
import * as ReadmeFileRenderer_Async from "ProjectOverview/Scripts/Shared/Components/ReadmeSection/ReadmeFileRenderer";
import { ReadmeToolbar } from "ProjectOverview/Scripts/Shared/Components/ReadmeSection/ReadmeToolbar";
import { ReadmeMessageBar } from "ProjectOverview/Scripts/Shared/Components/ReadmeSection/ReadmeMessageBar";
import { WikiPageNotFoundError } from "ProjectOverview/Scripts/Components/ReadmeSection/WikiPageNotFoundError";
import { 
    ReadmeFile, 
    ReadmeEditorState,
    DisplayFileSelectorState,
    WikiPage,
    ReadmeNotificationState
} from "ProjectOverview/Scripts/Shared/Components/ReadmeSection/ReadmeInterfaces";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import * as WikiPageRenderer_Async from "ProjectOverview/Scripts/Components/ReadmeSection/WikiPageRenderer";
import * as ProjectOverviewResources from "ProjectOverview/Scripts/Resources/TFS.Resources.ProjectOverview";
import * as ChangeDisplayFileDialog_Async from "ProjectOverview/Scripts/Components/ReadmeSection/ChangeDisplayFileDialog";
import { toNewReadmeEditorState } from "ProjectOverview/Scripts/Utils";
import { ReadmeUpsell } from "ProjectOverview/Scripts/Shared/Components/ReadmeSection/ReadmeUpsell";

import "VSS/LoaderPlugins/Css!ProjectOverview/Scripts/Components/ReadmeSection/ReadmeSection";
import "VSS/LoaderPlugins/Css!ProjectOverview/Scripts/Shared/Components/ReadmeSection/ReadmeEditor";

export interface ReadmeSectionContainerProps {
    readmeState: ReadmeState;
    commitPromptState: CommitPromptState;
    supportsTfvc: boolean;
    isStakeHolder: boolean;
    isUserAdmin: boolean;
    isEditEnabled: boolean;
    headingLevel: number;
    readmeActionCreator: ReadmeActionCreator;
    readmeEditorActionCreator: ReadmeEditorActionCreator;
    onContentEditingStart: (isCreated?: boolean) => void;
}

export class ReadmeSectionContainer extends React.Component<ReadmeSectionContainerProps, {}> {
    public render(): JSX.Element {
        return <ReadmeSection {...ReadmeSectionContainer.toReadmeSectionProps(this.props) } />;
    }

    public static toReadmeSectionProps(props: ReadmeSectionContainerProps): ReadmeSectionProps {
        // Workaround for handling deletion of default repository.
        // Currently we return fallback content in case default repository is deleted.
        // then the content property of readme state will contain this fallback content.
        let avoidDefaultRepoPresenceCheck = props.readmeState.isChangeReadmeDialogOpen && !props.readmeState.isDefaultRepoPresent;
        let isDisplayContentPresent = props.readmeState.content != null && (props.readmeState.isDefaultRepoPresent || avoidDefaultRepoPresenceCheck);
        let isRepositoryChangeInProgress = avoidDefaultRepoPresenceCheck
            || props.readmeState.defaultRepositoryContext.getRepositoryId() !== props.readmeState.currentRepositoryContext.getRepositoryId();

        return {
            notificationState: props.readmeState.readmeNotificationState,
            supportsTfvc: props.supportsTfvc,
            isDisplayContentPresent,
            isEditEnabled: props.isEditEnabled,
            isRepositoryChangeInProgress,
            isChangeReadmeRepositoryEnabled: props.isUserAdmin,
            errorMessage: props.readmeState.errorMessage,
            onWikiHomePageSelected: props.readmeActionCreator.fetchWikiHomePage,
            onReadmeFileSeleted: props.readmeActionCreator.changeToReadmeFileLocally,
            onLocalRepositoryChange: props.readmeActionCreator.changeDisplayFileLocally,
            onSaveRepositoryChangesClicked: props.readmeActionCreator.saveReadmeRepositoryChanges,
            onChangeReadmeClicked: props.readmeActionCreator.promptChangeReadmeRepositoryDialog,
            onChangeReadmeDialogDismiss: props.readmeActionCreator.onDismissChangeReadmeDialog,
            onContentEditingStart: props.onContentEditingStart,
            headingLevel: props.headingLevel,
            commitPromptState: props.commitPromptState,
            onNotificationDismiss: props.readmeEditorActionCreator.dismissNotification,
            readmeEditorActionCreator: props.readmeEditorActionCreator,
            displayFileSelectorState: toNewDisplayFileSelectorState(props.readmeState),
            readmeEditorState: toNewReadmeEditorState(props.readmeState)
        };
    }
}

export interface ReadmeSectionProps {
    errorMessage: string;
    notificationState: ReadmeNotificationState;
    onNotificationDismiss: () => void;

    // readme editing props
    isEditEnabled: boolean;
    isDisplayContentPresent: boolean;
    commitPromptState: CommitPromptState;
    readmeEditorState: ReadmeEditorState;
    readmeEditorActionCreator: ReadmeEditorActionCreator;

    // repository selector
    displayFileSelectorState: DisplayFileSelectorState;
    isRepositoryChangeInProgress: boolean;
    isChangeReadmeRepositoryEnabled: boolean;
    supportsTfvc: boolean;
    onWikiHomePageSelected(): void;
    onReadmeFileSeleted(repositoryContext: RepositoryContext): void;
    onLocalRepositoryChange: (repositoryContext: RepositoryContext) => void;
    onSaveRepositoryChangesClicked: () => void;
    onChangeReadmeDialogDismiss(): void;
    onChangeReadmeClicked(): void;

    // create readme upsell
    onContentEditingStart: (isCreated?: boolean) => void;
    headingLevel: number;
}

/**
 * Note: Child component ReadmeFileContainer is stateful and makes async calls as it wraps the JQuery FileViewer control.
 * As a result we can't remove the component on context switch. That's why css is used to hide the FileViewer component. Instead
 * of destroying it.
 */
const ReadmeSection = (props: ReadmeSectionProps): JSX.Element => {
    const isRepoPresent: boolean = (props.displayFileSelectorState.isDefaultRepoPresent || props.isRepositoryChangeInProgress);
    let showReadmeUpsell: boolean = props.isEditEnabled;
    let currentRepositoryContext: RepositoryContext;
    let content: string;

    if (props.displayFileSelectorState.isCurrentlySetToWikiHomePage) {
        currentRepositoryContext = props.displayFileSelectorState.currentWikiPage.repositoryContext;
        content = props.displayFileSelectorState.currentWikiPage.content;
        showReadmeUpsell = false;
    }
    else {
        currentRepositoryContext = props.displayFileSelectorState.currentReadmeFile.repositoryContext;
        content = props.displayFileSelectorState.currentReadmeFile.content;
    }

    if (!isRepoPresent) {
        content = "";
        showReadmeUpsell = false;
    }

    return (
        <div
            className="readme-section"
            role="region"
            aria-label={ProjectOverviewResources.ReadmeRegion_Label}>
            <ReadmeMessageBar
                hideNotification={props.displayFileSelectorState.isChangeReadmeDialogOpen}
                notificationState={props.notificationState}
                errorMessage={props.errorMessage}
                onNotificationDismiss={props.onNotificationDismiss}
                childMessage={props.displayFileSelectorState.currentWikiPage.showWikiPageNotFoundError && <WikiPageNotFoundError />}/>
            {!props.readmeEditorState.isEditing &&
                <div>
                    <ReadmeToolbar
                        {...props}
                        onEditingStart={props.onContentEditingStart}
                        displayFileSelectorState={props.displayFileSelectorState}
                        isRepositoryScope={false}
                        isChangeReadmeRepositoryEnabled={props.isChangeReadmeRepositoryEnabled}
                        isRepositoryChangeInProgress={props.isRepositoryChangeInProgress}
                        onChangeReadmeClicked={props.onChangeReadmeClicked}/>
                    {
                        props.displayFileSelectorState.isChangeReadmeDialogOpen &&
                        <AsyncChangeDisplayFileDialog
                            currentRepositoryContext={currentRepositoryContext}
                            defaultRepositoryContext={props.displayFileSelectorState.defaultRepositoryContext}
                            isOpen={props.displayFileSelectorState.isChangeReadmeDialogOpen}
                            errorMessage={props.errorMessage}
                            isDefaultSetToWikiHomePage={props.displayFileSelectorState.isCurrentlySetToWikiHomePage}
                            showWikiPageNotFoundError={props.displayFileSelectorState.currentWikiPage.showWikiPageNotFoundError}
                            supportsTfvc={props.supportsTfvc}
                            isRepositoryChangeInProgress={props.isRepositoryChangeInProgress}

                            onWikiHomePageSelected={props.onWikiHomePageSelected}
                            onLocalRepositoryChange={props.onLocalRepositoryChange}
                            onDismiss={props.onChangeReadmeDialogDismiss}
                            onReadmeFileSeleted={props.onReadmeFileSeleted}
                            onSaveRepositoryChangesClicked={props.onSaveRepositoryChangesClicked}
                        />
                    }
                    <div className={"readme-content"}>
                        {props.isDisplayContentPresent
                            ? props.displayFileSelectorState.isCurrentlySetToWikiHomePage
                                ? <AsyncWikiPageRenderer
                                    repositoryContext={props.displayFileSelectorState.currentWikiPage.repositoryContext}
                                    pagePath={props.displayFileSelectorState.currentWikiPage.wikiHomePagePath}
                                    content={content} />
                                : <AsyncReadmeFileRenderer {...props.displayFileSelectorState.currentReadmeFile} content={content}/>
                            : showReadmeUpsell &&
                            <ReadmeUpsell
                                {...props}
                                isCreateReadmeEnabled={props.isEditEnabled}
                                onCreateReadmeClick={() => props.onContentEditingStart(true)}
                                description={ProjectOverviewResources.ReadmeCTA_Description}/>
                        }
                    </div>
                </div>
            }
            <AsyncReadmeEditorContainer
                isDisplayContentPresent={props.isDisplayContentPresent}
                readmeEditorState={props.readmeEditorState}
                commitPromptState={props.commitPromptState}
                readmeEditorActionCreator={props.readmeEditorActionCreator} />
        </div>
    );
};

function toNewDisplayFileSelectorState(readmeState: ReadmeState): DisplayFileSelectorState {
    const wikiPageState = readmeState.wikiPageState || {} as WikiPageState;

    return {
        isDefaultRepoPresent: readmeState.isDefaultRepoPresent,
        defaultRepositoryContext: readmeState.defaultRepositoryContext,
        isCurrentlySetToWikiHomePage: readmeState.wikiPageState.isDefaultSetToWikiHomePage,
        isChangeReadmeDialogOpen: readmeState.isChangeReadmeDialogOpen,
        errorMessage: readmeState.errorMessage,
        currentWikiPage: {
            repositoryContext: readmeState.currentRepositoryContext as GitRepositoryContext,
            wikiHomePagePath: wikiPageState.wikiHomePagePath,
            showWikiPageNotFoundError: wikiPageState.showWikiPageNotFoundError,
            content: readmeState.content,
        },
        currentReadmeFile: {
            itemModel: readmeState.readmeFileState.itemModel,
            isItemModelComplete: readmeState.readmeFileState.isItemModelComplete,
            renderer: readmeState.readmeFileState.renderer,
            repositoryContext: readmeState.currentRepositoryContext,
            content: readmeState.content,
        }
    };
}

const AsyncReadmeFileRenderer = getAsyncLoadedComponent(
    ["ProjectOverview/Scripts/Shared/Components/ReadmeSection/ReadmeFileRenderer"],
    (module: typeof ReadmeFileRenderer_Async) => module.ReadmeFileRenderer);

const AsyncWikiPageRenderer = getAsyncLoadedComponent(
    ["ProjectOverview/Scripts/Components/ReadmeSection/WikiPageRenderer"],
    (module: typeof WikiPageRenderer_Async) => module.WikiPageRenderer);

const AsyncChangeDisplayFileDialog = getAsyncLoadedComponent(
    ["ProjectOverview/Scripts/Components/ReadmeSection/ChangeDisplayFileDialog"],
    (module: typeof ChangeDisplayFileDialog_Async) => module.ChangeDisplayFileDialog);
