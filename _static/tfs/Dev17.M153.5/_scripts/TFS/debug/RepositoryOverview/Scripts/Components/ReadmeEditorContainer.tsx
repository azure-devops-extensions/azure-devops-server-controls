import * as React from "react";

import * as CommitPromptStore from "VersionControl/Scenarios/Shared/Committing/CommitPromptStore";

import { ReadmeToolbar } from "ProjectOverview/Scripts/Shared/Components/ReadmeSection/ReadmeToolbar";
import { ReadmeMessageBar } from "ProjectOverview/Scripts/Shared/Components/ReadmeSection/ReadmeMessageBar";
import { ReadmeEditorState, ReadmeNotificationState } from "ProjectOverview/Scripts/Shared/Components/ReadmeSection/ReadmeInterfaces";
import { ReadmeEditorActionCreator } from "ProjectOverview/Scripts/Shared/ReadmeEditorActionCreator";
import { AsyncReadmeEditorContainer } from "ProjectOverview/Scripts/Shared/Components/ReadmeSection/ReadmeEditorAsync";
import { ReadmeFileRenderer } from "ProjectOverview/Scripts/Shared/Components/ReadmeSection/ReadmeFileRenderer";
import { ReadmeUpsell } from "ProjectOverview/Scripts/Shared/Components/ReadmeSection/ReadmeUpsell";

import * as RepositoryOverviewResources from "RepositoryOverview/Scripts/Resources/TFS.Resources.RepositoryOverview";
import "VSS/LoaderPlugins/Css!RepositoryOverview/Scripts/Components/ReadmeEditorContainer";

export interface ReadmeEditorContainerProps {
    notificationState: ReadmeNotificationState;
    commitPromptState: CommitPromptStore.CommitPromptState;
    readmeEditorState: ReadmeEditorState;
    readmeEditorActionCreator: ReadmeEditorActionCreator;
    hasReadmeEditPermissions: boolean,
}

/**
 * Note: Child component ReadmeFileContainer is stateful and makes async calls as it wraps the JQuery FileViewer control.
 * As a result we can't remove the component on context switch. That's why css is used to hide the FileViewer component. Instead
 * of destroying it.
 */
export const ReadmeEditorContainer = (props: ReadmeEditorContainerProps): JSX.Element => {
    const isDisplayContentPresent = !!props.readmeEditorState.readmeFile.content;

    return (
        <div
            className="ro-readme-editor-container"
            role="region"
            aria-label={RepositoryOverviewResources.ReadmeRegion_Label}>
            <ReadmeMessageBar
                notificationState={props.notificationState}
                onNotificationDismiss={props.readmeEditorActionCreator.dismissNotification}/>
            {!props.readmeEditorState.isEditing &&
                <div>
                    <ReadmeToolbar
                        isDisplayContentPresent={isDisplayContentPresent}
                        isEditEnabled={props.hasReadmeEditPermissions}
                        readmeFile={props.readmeEditorState.readmeFile}
                        onEditingStart={props.readmeEditorActionCreator.startReadmeEditing}
                        isRepositoryScope={true}
                        isChangeReadmeRepositoryEnabled={false}
                        isRepositoryChangeInProgress={false}
                        onChangeReadmeClicked={() => { }}/>
                    <div className={"ro-readme-content"}>
                        {isDisplayContentPresent
                            ? <ReadmeFileRenderer {...props.readmeEditorState.readmeFile} content={props.readmeEditorState.readmeFile.content} />
                            : <ReadmeUpsell
                                description={RepositoryOverviewResources.RepositoryUpsell_Description}
                                headingLevel={1}
                                isCreateReadmeEnabled={true}
                                onCreateReadmeClick={() => props.readmeEditorActionCreator.startReadmeEditing(true)} />
                        }
                    </div>
                </div>
            }
            <AsyncReadmeEditorContainer
                isDisplayContentPresent={isDisplayContentPresent}
                readmeEditorState={props.readmeEditorState}
                commitPromptState={props.commitPromptState}
                readmeEditorActionCreator={props.readmeEditorActionCreator} />
        </div>
    );
};