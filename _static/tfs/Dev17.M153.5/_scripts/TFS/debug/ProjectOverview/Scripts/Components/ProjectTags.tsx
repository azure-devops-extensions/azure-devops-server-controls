/// <reference types="react" />

import * as React from "react";
import * as ReactDOM from "react-dom";

import { IconButton } from "OfficeFabric/Button";

import * as Events_Document from "VSS/Events/Document";
import * as Utils_Array from "VSS/Utils/Array";
import { delay } from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";

import { ProjectOverviewConstants } from "ProjectOverview/Scripts/Generated/Constants";
import * as ProjectOverviewResources from "ProjectOverview/Scripts/Resources/TFS.Resources.ProjectOverview";
import { TagInfo, TagListControlComponent } from "ProjectOverview/Scripts/Shared/Components/TagListControl";
import { ProjectTagSource } from "ProjectOverview/Scripts/Sources/ProjectTagSource";
import { ProjectTagState, ProjectTagStore } from "ProjectOverview/Scripts/Stores/ProjectTagStore";

import "VSS/LoaderPlugins/Css!ProjectOverview/Scripts/Components/ProjectTags";

export interface ProjectTagPaneState {
    shouldFocusSaveButton: boolean;
    editMode: boolean;
    isTagListChanged: boolean;
    invalidTag: string;
}

export interface ProjectTagProps {
    projectTagState: ProjectTagState;
    readonly: boolean;
    onSaveClicked(): void;
    onEditClicked(): void;
    onNewTagsAdded(tags: string[]): void;
    onErrorUpdate(errorMessage: string);

}

export class ProjectTagsPane extends React.Component<ProjectTagProps, ProjectTagPaneState>
    implements Events_Document.RunningDocument {
    private _saveButtonRef: React.Component<any, any>;
    private _documentsEntryForDirtyCheck: Events_Document.RunningDocumentsTableEntry;

    constructor(props: ProjectTagProps) {
        super(props);
        this.state = {
            shouldFocusSaveButton: false,
            editMode: false,
            isTagListChanged: false,
            invalidTag: ""
        };
    }

    public componentDidMount(): void {
        this._documentsEntryForDirtyCheck = Events_Document.getRunningDocumentsTable().add("ProjectTagsPane", this);
    }

    public componentWillUnmount(): void {
        if (this._documentsEntryForDirtyCheck) {
            Events_Document.getRunningDocumentsTable().remove(this._documentsEntryForDirtyCheck);
            this._documentsEntryForDirtyCheck = null;
        }
    }

    public componentDidUpdate(): void {
        if (this.state.shouldFocusSaveButton && this._saveButtonRef) {
            (ReactDOM.findDOMNode(this._saveButtonRef) as HTMLElement).focus();
            this.setState({
                shouldFocusSaveButton: false
            });
        }
    }

    public render(): JSX.Element {
        const onFocus = !this.props.readonly ? this._onEdit : null;
        const onBlur = !this.props.readonly ? this._onBlur : null;
        let autoCompleteSuggestedTagItems: string[] = [];

        let saveIconButton: JSX.Element = null;
        let editIconButton: JSX.Element = null;

        if (this.state.editMode) {
            autoCompleteSuggestedTagItems = Utils_Array.subtract(
                this.props.projectTagState.allProjectTags,
                this.props.projectTagState.currentProjectTags,
                Utils_String.localeIgnoreCaseComparer
            ).sort();
        }

        if (this._isSaveButtonToBeShown()) {
            saveIconButton = (
                <IconButton
                    className="save-button"
                    iconProps={{ className: "bowtie bowtie-icon bowtie-save" }}
                    onClick={this._onSave}
                    onMouseDown={this._onSaveButtonMouseDown}
                    ariaLabel={ProjectOverviewResources.ProjectTags_SaveButtonAriaLabel}
                    ref={(element: IconButton) => (this._saveButtonRef = element)}
                />
            );
        } else if (this._shouldShowEditButton()) {
            editIconButton = (
                <div className="edit-button-component">
                    <IconButton
                        className="edit-button"
                        iconProps={{ className: "bowtie bowtie-icon bowtie-edit" }}
                        onClick={this._onEdit}
                        tabIndex={-1}
                    />
                </div>
            );
        }

        let tags: TagInfo[] = [];

        for (const tag in this.props.projectTagState.currentProjectTags) {
            const tagName = this.props.projectTagState.currentProjectTags[tag];
            const tagInfo: TagInfo = {
                text: tagName,
                tagItemAriaLabel: Utils_String.format(ProjectOverviewResources.Tag_ItemNameAriaLabel, tagName),
                deleteButtonAriaLabel: Utils_String.format(ProjectOverviewResources.Tag_DeleteButtonAriaLabel, tagName),
                isFocusable: !this.props.readonly
            };
            tags.push(tagInfo);
        }
        return (
            <div className={"project-tags"}>
                <TagListControlComponent
                    autoCompleteSuggestedTagItems={autoCompleteSuggestedTagItems}
                    tags={tags}
                    editMode={this.state.editMode}
                    listAriaLabel={ProjectOverviewResources.ProjectTags_AriaLabel}
                    tagListErrorMessage={this.props.projectTagState.errorMessage}
                    onTagListKeyUp={onFocus}
                    onTagListKeyDown={onBlur}
                    onBlur={onBlur}
                    tagListCountLimit={ProjectOverviewConstants.ProjectTags_MaxCount}
                    tagCharacterLimit={ProjectOverviewConstants.ProjectTag_CharacterLimit}
                    tagListCountLimitExceededErrorMessage={Utils_String.format(
                        ProjectOverviewResources.ProjectTags_MaxCountExceeded,
                        ProjectOverviewConstants.ProjectTags_MaxCount
                    )}
                    tagListCountLimitReachedErrorMessage={Utils_String.format(
                        ProjectOverviewResources.ProjectTags_MaxCountReached,
                        ProjectOverviewConstants.ProjectTags_MaxCount
                    )}
                    tagCharacterLimitExceededErrorMessage={Utils_String.format(
                        ProjectOverviewResources.ProjectTags_TagCharacterLimitExceeded,
                        ProjectOverviewConstants.ProjectTag_CharacterLimit
                    )}
                    separators={ProjectOverviewConstants.ProjectTags_Separators}
                    onTagListChanged={this._onTagListChanged}
                    saveComponent={saveIconButton}
                    editComponent={editIconButton}
                />
            </div>
        );
    }

    // Made public for navigate away handling and UTs
    public isDirty(): boolean {
        return this.state.editMode && this.state.isTagListChanged;
    }

    // Made public for UTs
    public _isNotDirtyInEditMode = (): boolean => {
        return this.state.editMode && !this.state.isTagListChanged;
    };

    private _onEdit = (): void => {
        if (!this.state.editMode) {
            // Sometimes due to focus event bubbling up, edit is called. To handle that, we are putting this check.
            // A boolean variable to fetch all tags across projects only once.
            let allProjectTagsFetched = this.props.projectTagState.allProjectTags.length > 0;
            if (!allProjectTagsFetched) {
                this.props.onEditClicked();
            }
            this.setState({
                editMode: true
            });
        }
    }

    /*
    There are multiple components inside this component.
    Controlled blur is done so that click events of child components is triggered.
    */
    private _onBlur = (): void => {
        if (this._isNotDirtyInEditMode()) {
            if (this.props.projectTagState.errorMessage) {
                this.props.onErrorUpdate("");
            }
            this.setState({
                editMode: false
            });
        }
    }

    private _onSave = () : void => {
        if (this.isDirty()) {
            this.props.onSaveClicked();
            // in case there is some error while saving the tags we don"t want to change the component state
            this.setState({
                editMode: false,
                isTagListChanged: false
            });
         }
    }

    private _onSaveButtonMouseDown = (): void => {
        /*
        Due to issue: https://github.com/facebook/react/issues/2291,
        we need to delay so that save action gets executes after tags are present in input box.
        */
        delay(this, 0, () => {
            this._onSave();
        });
    }

    public _isSaveButtonToBeShown(): boolean {
        return (
            !this.state.invalidTag &&
            (!this.props.projectTagState.errorMessage ||
                this.props.projectTagState.currentProjectTags.length <= ProjectOverviewConstants.ProjectTags_MaxCount) &&
            this.isDirty()
        );
    }

    private _shouldShowEditButton(): boolean {
        return !this.props.readonly && !this.state.editMode && this.props.projectTagState.initialProjectTags.length !== 0;
    }

    private _onTagListChanged = (tags: string[], errorMessage: string, invalidTag: string): void => {
        let currentProjectTags: string[] = tags.slice();
        let initialProjectTags: string[] = this.props.projectTagState.initialProjectTags.slice();

        let isTagListChanged: boolean = !Utils_Array.arrayEquals(currentProjectTags.sort(), initialProjectTags.sort(), (a, b) => Utils_String.localeIgnoreCaseComparer(a, b) === 0);

        this.props.onNewTagsAdded(tags);

        if (errorMessage !== this.props.projectTagState.errorMessage) {
            this.props.onErrorUpdate(errorMessage);
        }

        if (isTagListChanged !== this.state.isTagListChanged || invalidTag !== this.state.invalidTag) {
            this.setState({
                isTagListChanged: isTagListChanged,
                invalidTag: invalidTag
            });
        }
    }
}
