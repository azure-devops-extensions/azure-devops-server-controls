import * as React from "react";
import * as ReactDOM from "react-dom";

import { Callout } from "OfficeFabric/Callout";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { FocusZone, FocusZoneDirection, IFocusZone } from "OfficeFabric/FocusZone";
import { IconButton } from "OfficeFabric/Button";
import { css, KeyCodes } from "OfficeFabric/Utilities";

import { registerLWPComponent } from "VSS/LWP";
import * as Utils_Accessibility from "VSS/Utils/Accessibility";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import { BrowserCheckUtils } from "VSS/Utils/UI";
import { TooltipHost } from "VSSUI/Tooltip";
import { Autocomplete } from "VSSPreview/Flux/Components/Autocomplete";

import { ErrorComponent } from "DistributedTaskControls/SharedControls/ErrorComponent/ErrorComponent";

import { ProjectOverviewConstants } from "ProjectOverview/Scripts/Generated/Constants";
import * as ProjectOverviewResources from "ProjectOverview/Scripts/Resources/TFS.Resources.ProjectOverview";
import * as TelemetryClient from "ProjectOverview/Scripts/TelemetryClient";

import "VSS/LoaderPlugins/Css!ProjectOverview/Scripts/Shared/Components/TagListControl";

const DATA_IS_FOCUSABLE = "data-is-focusable";
const TRUE_STRING_VALUE = "true";

export enum TagListControlMode {
    View,
    AddTagsPlaceHolder,
    EditWithoutAddition,
    EditWithAddition
}

export enum TagElementToFocus {
    None = 1,
    AddButton = 2,
    FirstTag = 3,
    InvalidTag = 4,
    LastTag = 5,
    PlaceHolderButton = 6
}

export interface TagInfo {
    text: string;
    isFocusable: boolean;
    tooltipText?: string;
    tagItemAriaLabel?: string;
    deleteButtonAriaLabel?: string;
}

interface InvalidTag {
    text: string;
    errorMessage: string;
}

export interface TagListState {
    tagElementToFocus: TagElementToFocus;
    tagAdditionMode: boolean;
    invalidTag: InvalidTag;
}

interface FocusableTagData {
    tag: string;
    shouldFocusNextElementToTag: boolean;
}

interface TagItemProps {
    itemBoxClassName: string;
    textBoxClassName: string;
    tag: TagInfo;
    canDelete?: boolean;
}

const TagItem: React.StatelessComponent<TagItemProps> = (props: TagItemProps): JSX.Element => {
    return (
        <div
            className={props.itemBoxClassName}
            data-is-focusable={props.tag.isFocusable && !props.canDelete} // when component is in editmode then the focus should be on delete button
            aria-label={props.tag.tagItemAriaLabel}
        >
            <span className={props.textBoxClassName}>{props.tag.text}</span>
        </div>
    );
}

interface TagDeleteButtonProps {
    onClick: () => void;
    ariaLabel: string
}

const TagDeleteButton: React.StatelessComponent<TagDeleteButtonProps> = (props: TagDeleteButtonProps): JSX.Element => {
    return (
        <IconButton 
            className="tag-delete" 
            ariaLabel={props.ariaLabel} 
            data-is-focusable={true} 
            onClick={props.onClick} 
            iconProps={{iconName: "Cancel", className: "delete-button"}}
        />
    );
}

interface SingleTagComponentProps {
    tag: TagInfo;
    canDelete: boolean;
    onDeleteClicked: (tag: string) => void;
    errorMessage: string;
}

class SingleTagComponent extends React.Component<SingleTagComponentProps, {}> {
    private _tagItemControl: HTMLElement;

    public render(): JSX.Element {
        const canDelete = this.props.canDelete;
        const itemBoxClassName: string = css(
            "tag-item-box",
            canDelete ? "editing tag-item-delete-experience" : "readonly"
        );

        const tagItemComponent = <TagItem
            itemBoxClassName={itemBoxClassName}
            textBoxClassName={"tag-text-box"}
            tag={this.props.tag}
            canDelete={canDelete}
        />;

        return (
            <li
                ref={(element) => {
                    this._tagItemControl = element;
                }}
                className={"tag-item"}
            >
                {this.props.tag.tooltipText ? (
                    <TooltipHost
                        content={this.props.tag.tooltipText}
                        directionalHint={DirectionalHint.bottomCenter}
                        key={this.props.tag.text}
                    >
                        {tagItemComponent}
                    </TooltipHost>
                ) : tagItemComponent}
                {this.props.canDelete && (
                    <TagDeleteButton onClick={this._onDeleteClicked} ariaLabel={this.props.tag.deleteButtonAriaLabel} />
                )}
                {this.props.errorMessage && (
                    <Callout
                        className="tag-list-error-message-callout"
                        target={this._tagItemControl}
                        directionalHint={DirectionalHint.bottomLeftEdge}
                        gapSpace={0}
                        beakWidth={5}
                        doNotLayer={true}
                        setInitialFocus={true}
                    >
                        <div className="callout-content">
                            <span className="text">{this.props.errorMessage}</span>
                        </div>
                    </Callout>
                )}
            </li>
        );
    }

    public componentDidUpdate(): void {
        if (this.props.errorMessage) {
            Utils_Accessibility.announce(this.props.errorMessage);
        }
    }

    private _onDeleteClicked = (): void => {
        this.props.onDeleteClicked(this.props.tag.text);
    }
}

interface AddTagsPlusButtonProps {
    onClick(): void;
}

class AddTagsPlusButton extends React.Component<AddTagsPlusButtonProps, {}> {
    public render(): JSX.Element {
        return (
            <IconButton 
                className="add-button" 
                ariaLabel={ProjectOverviewResources.Tag_AddButtonAriaLabel} 
                data-is-focusable={true} 
                onClick={this.props.onClick} 
                iconProps={{iconName: "Add", className: "plus-icon"}}
            />
        );
    }
}


interface AddTagsPlaceholderProps {
    onAddTagsPlaceholderClick?(): void;
}

class AddTagsPlaceholder extends React.Component<AddTagsPlaceholderProps, {}> {
    public render(): JSX.Element {
        return (
            <button
                className="taglist-placeholder tag-box add-tags"
                data-is-focusable={true}
                onClick={this.props.onAddTagsPlaceholderClick}
            >
                {ProjectOverviewResources.ProjectTags_AdminPlaceholder}
            </button>
        );
    }
}

export interface TagListProps {
    tags: TagInfo[];
    editMode: boolean;
    isCaseSensitive?: boolean;
    autoCompleteSuggestedTagItems?: string[];
    listAriaLabel?: string;
    tagListErrorMessage?: string;
    tagListCountLimit?: number;
    tagCharacterLimit?: number;
    tagCharacterLimitExceededErrorMessage?: string;
    tagListCountLimitReachedErrorMessage?: string;
    tagListCountLimitExceededErrorMessage?: string;
    separators?: string[];
    onTagListKeyDown?(): void;
    onTagListKeyUp?(): void;
    onBlur?(): void;
    className?: string;
    onTagListChanged?(tags: string[], errorMessage: string, invalidTag: string): void;
    editComponent?: JSX.Element;
    saveComponent?: JSX.Element;
}

export class TagListControlComponent extends React.Component<TagListProps, TagListState> {
    private _tagListRefs: React.Component<any, any>[] = [];
    private _focusZone: IFocusZone;
    private _tagListControl: HTMLElement;
    private _addTagsPlaceholder: AddTagsPlaceholder;
    private _invalidTags: InvalidTag[];

    constructor(props: TagListProps) {
        super(props);

        this.state = {
            tagElementToFocus: null,
            tagAdditionMode: false,
            invalidTag: { text: "", errorMessage: "" }
        };
        this._invalidTags = [];
    }

    public render(): JSX.Element {
        this._tagListRefs = [];
        const mode = this._getTagControlMode(this.props);

        const showAddTagsPlaceholder = (mode === TagListControlMode.AddTagsPlaceHolder);
        const errorMessage = this.props.tagListErrorMessage;
        const showAddTagsPlusButton =
            !errorMessage && !this.state.invalidTag.errorMessage && mode === TagListControlMode.EditWithoutAddition;
        const showTagsAutocompleteInput =
            !errorMessage && !this.state.invalidTag.errorMessage && mode === TagListControlMode.EditWithAddition;

        /*
        There are two kind of errors we are showing: one beaking to invalid tags and one below taglist.
        This check is for one below the taglist, as we’re only showing single error at a time.
        */
        const showTagListErrorMessage = errorMessage && !this.state.invalidTag.errorMessage;

        return (
            <div
                ref={(element: HTMLElement) => {
                    this._tagListControl = element;
                }}
                onBlur={this.props.editMode ? this._onBlur : null}
                className={css(this.props.className, "tag-list-control-component")}
                aria-label={this.props.listAriaLabel}
            >
                <FocusZone
                    className={"tags-focus-zone"}
                    direction={FocusZoneDirection.horizontal}
                    isCircularNavigation={true}
                    ref={(element: FocusZone) => {
                        this._focusZone = element;
                    }}
                >
                    {showAddTagsPlaceholder ? (
                        <AddTagsPlaceholder
                            ref={(addTagsPlaceholder: AddTagsPlaceholder) => {
                                this._addTagsPlaceholder = addTagsPlaceholder;
                            }}
                            onAddTagsPlaceholderClick={this._onAddTagPlaceholderClicked}
                        />
                    ) : (
                            <div
                                className="tags-items-container tag-list-container"
                                onKeyUp={this._onTagListKeyUp}
                                onKeyDown={this._onTagListKeyDown}
                            >
                                <ul className="tag-list-control">
                                    {this.props.tags.map((tag: TagInfo) => {
                                        return (
                                            <SingleTagComponent
                                                key={tag.text}
                                                tag={tag}
                                                ref={(element: SingleTagComponent) => {
                                                    this._tagListRefs.push(element);
                                                }}
                                                canDelete={mode === TagListControlMode.View ? false : true}
                                                onDeleteClicked={this._onDeleteClicked}
                                                errorMessage={
                                                    tag.text === this.state.invalidTag.text ? (
                                                        this.state.invalidTag.errorMessage
                                                    ) : (
                                                            ""
                                                        )
                                                }
                                            />
                                        );
                                    })}
                                    {showAddTagsPlusButton && (
                                        <li>
                                            <AddTagsPlusButton
                                                key={ProjectOverviewResources.ProjectTags_AdminPlaceholder}
                                                ref={(element: AddTagsPlusButton) => {
                                                    this._tagListRefs.push(element);
                                                }}
                                                onClick={this._onAddTagClicked}
                                            />
                                        </li>
                                    )}
                                    {showTagsAutocompleteInput && (
                                        <div className="tags-input">
                                            <Autocomplete
                                                menuClassName="taglist-autocomplete-menu"
                                                data-is-focusable="true"
                                                initialValue=""
                                                maxSuggestions={this.props.autoCompleteSuggestedTagItems.length}
                                                focus={true}
                                                items={this.props.autoCompleteSuggestedTagItems}
                                                onValueSelected={this._onInput}
                                                ref={(element: Autocomplete) => {
                                                    this._tagListRefs.push(element);
                                                }}
                                                className={"tags-autocomplete"}
                                            />
                                        </div>
                                    )}
                                </ul>
                            </div>
                        )}
                </FocusZone>
                {this.props.editComponent}
                {this.props.saveComponent}
                {showTagListErrorMessage &&
                    <div className={"taglist-error-component"}>
                        <div role={"region"} className={"screenreader"} aria-live={"assertive"}>
                            {errorMessage}
                        </div>
                        <ErrorComponent cssClass={"tags-error-message"} errorMessage={errorMessage} />
                    </div>
                }
            </div>
        );
    }

    public componentDidUpdate(previousProps?: TagListProps, previousState?: TagListState): void {
        const mode = this._getTagControlMode(this.props);
        const previousMode = this._getTagControlMode(previousProps);
        const isReadOnlyMode = previousProps.editMode && !this.props.editMode;
        const tagAdditionMode = isReadOnlyMode ? false : this.state.tagAdditionMode;
        const tagAdditionModeChanged = !this.state.tagAdditionMode && previousState.tagAdditionMode;

        let elementToFocus: TagElementToFocus = this.state.tagElementToFocus;

        if (previousMode === TagListControlMode.View && mode !== previousMode) {
            elementToFocus = TagElementToFocus.FirstTag;
        } else if (
            mode === TagListControlMode.AddTagsPlaceHolder &&
            this._addTagsPlaceholder &&
            (tagAdditionModeChanged || previousProps.tags.length > 0)
        ) {
            elementToFocus = TagElementToFocus.PlaceHolderButton;
        }

        if (
            elementToFocus !== this.state.tagElementToFocus ||
            tagAdditionMode !== this.state.tagAdditionMode
        ) {
            this.setState({
                tagElementToFocus: elementToFocus,
                tagAdditionMode: tagAdditionMode
            });
        } else if (this.state.tagElementToFocus !== TagElementToFocus.None) {
            if (this.state.tagElementToFocus === TagElementToFocus.PlaceHolderButton) {
                this._focusZone.focusElement(ReactDOM.findDOMNode(this._addTagsPlaceholder) as HTMLElement);
                this.setState({ tagElementToFocus: TagElementToFocus.None });
            } else if (this.state.tagElementToFocus) {
                let focusableTagData: FocusableTagData = this._findElementToFocus();
                this._focusOnElementInTheList(focusableTagData.tag, focusableTagData.shouldFocusNextElementToTag);
            }
        }
    }

    private _onInput = (value: string, event: React.SyntheticEvent<HTMLElement>): void => {
        if (value) {
            const { tags } = this.props;

            let tagsList: string[] = [];

            for (let tag in tags) {
                tagsList.push(tags[tag].text);
            }

            let inputTags: string[] = value ? value.split(new RegExp(this.props.separators.join("|"), "g")) : [];
            let newTags: string[] = [];

            inputTags.forEach((inputTag: string) => {
                if (!Utils_Array.contains(tagsList, inputTag, !this.props.isCaseSensitive ? Utils_String.localeIgnoreCaseComparer : null)) {
                    newTags.push(inputTag);
                }
            });

            if (newTags.length > 0) {
                this._onTagsAdded(newTags);
                event.stopPropagation();
            } else {
                this._dismissInputBoxAndFocusOnAddButton(event);
            }
        }
    }

    private _onDeleteClicked = (tag: string): void => {
        this._onTagRemoved(tag);
        this._focusOnElementInTheList(tag, true);
    }

    private _findElementToFocus(): FocusableTagData {
        const { tags } = this.props;

        let tag: string = "";
        let shouldFocusOnNextElementToTag = false;
        const mode = this._getTagControlMode(this.props);

        switch (this.state.tagElementToFocus) {
            case TagElementToFocus.AddButton: {
                if (mode === TagListControlMode.EditWithoutAddition) {
                    tag = tags.length !== 0 ? tags[tags.length - 1].text : "";
                    if (tag) {
                        shouldFocusOnNextElementToTag = true;
                    }
                }
                break;
            }
            case TagElementToFocus.FirstTag: {
                tag = tags.length !== 0 ? tags[0].text : "";
                break;
            }
            case TagElementToFocus.InvalidTag: {
                tag = this.state.invalidTag.text;
                break;
            }
            case TagElementToFocus.LastTag: {
                tag = tags.length !== 0 ? tags[tags.length - 1].text : "";
                break;
            }
        }

        return { tag: tag, shouldFocusNextElementToTag: shouldFocusOnNextElementToTag };
    }

    private _focusOnElementInTheList(tag: string, isNextElementToBeFocussed?: boolean): void {
        let componentRefIndex: number = -1;

        if (!!this._tagListRefs) {
            for (let i = 0; i < this._tagListRefs.length; i++) {
                const tagListComponentItem: React.Component<any, any> = this._tagListRefs[i];
                if (
                    (!!tag && tagListComponentItem && !!tagListComponentItem.props.tag && tagListComponentItem.props.tag.text === tag) ||
                    (!tag && tagListComponentItem)
                ) {
                    componentRefIndex = i;
                    break;
                }
            }
        }

        componentRefIndex = isNextElementToBeFocussed ? componentRefIndex + 1 : componentRefIndex;

        if (componentRefIndex !== -1) {
            const parentFocusableElement: HTMLElement = ReactDOM.findDOMNode(this._tagListRefs[componentRefIndex]) as HTMLElement;
            let focusableElement: HTMLElement = null;
            if (parentFocusableElement) {
                if (parentFocusableElement.getAttribute(DATA_IS_FOCUSABLE) === TRUE_STRING_VALUE) {
                    focusableElement = parentFocusableElement;
                } else {
                    let firstChildElement: HTMLElement = parentFocusableElement.firstChild as HTMLElement;
                    if (firstChildElement.getAttribute(DATA_IS_FOCUSABLE) === TRUE_STRING_VALUE) {
                        focusableElement = firstChildElement;
                    } else if (
                        firstChildElement.nextSibling &&
                        (firstChildElement.nextSibling as HTMLElement).getAttribute(DATA_IS_FOCUSABLE) ===
                        TRUE_STRING_VALUE
                    ) {
                        focusableElement = firstChildElement.nextSibling as HTMLElement;
                    }
                }
            }
            if (focusableElement) {
                this._focusZone.focusElement(focusableElement);
                this.setState({
                    tagElementToFocus: TagElementToFocus.None
                });
            }
        }
    }

    private _onTagListKeyUp = (event: React.KeyboardEvent<HTMLDivElement>): void => {
        const { onTagListKeyUp } = this.props;

        if (event.which === KeyCodes.tab) {
            if (onTagListKeyUp) {
                onTagListKeyUp();
            }
        }
    }

    private _onTagListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
        const { onTagListKeyDown } = this.props;
        const mode = this._getTagControlMode(this.props);

        if ((event.shiftKey && event.which === KeyCodes.tab)) {
            if (mode === TagListControlMode.EditWithAddition) {
                this._handleShiftTabAndEscapeEventOnInputBox(event);
            }
        }
        else if (event.which === KeyCodes.tab) {
            if (mode === TagListControlMode.EditWithAddition) {
                this._handleShiftTabAndEscapeEventOnInputBox(event);
            } else if (mode === TagListControlMode.EditWithoutAddition) {
                if (onTagListKeyDown) {
                    onTagListKeyDown();
                    this._focusNextElementForIEAndEdge(event.currentTarget);
                }
                event.stopPropagation();
            }
        } else if (event.which === KeyCodes.escape) {
            // This is done to remove input box on Escape
            this._handleShiftTabAndEscapeEventOnInputBox(event);
        }
    }

    private _handleShiftTabAndEscapeEventOnInputBox(event: React.SyntheticEvent<HTMLElement>): void {
        const { onTagListKeyDown, tags } = this.props;

        if (tags.length === 0 && onTagListKeyDown) {
            onTagListKeyDown();
        }
        this._dismissInputBoxAndFocusOnAddButton(event);
    }

    private _dismissInputBoxAndFocusOnAddButton(event: React.SyntheticEvent<HTMLElement>): void {
        this.setState({
            tagAdditionMode: false,
            tagElementToFocus: TagElementToFocus.AddButton
        });
    }

    private _onBlur = (event: React.FocusEvent<HTMLButtonElement | HTMLDivElement>): void => {
        const { onBlur } = this.props;
        const relatedTarget = event.relatedTarget || document.activeElement;
        if (this._tagListControl && !this._tagListControl.contains(relatedTarget as Node)) {
            if (onBlur) {
                onBlur();
            }

            if (this.state.tagAdditionMode) {
                this._dismissInputBoxAndFocusOnAddButton(event);
            }
        }
    }

    private _focusNextElementForIEAndEdge(currentTarget: HTMLElement): void {
        if (BrowserCheckUtils.isIE() || BrowserCheckUtils.isEdge()) {
            const tabables = $(":focusable");
            const index = tabables.index($(currentTarget).find(":focusable").last());
            const indexToFocus = index + 1;
            if (index !== -1 && tabables.length > indexToFocus) {
                const elementToFocus = tabables.eq(indexToFocus);
                // Edge and IE by default sets focus to first element when some component is replaced in a page.
                // We need to schedule manual focus after default one executes. Hence, using setTimeout.
                setTimeout(() => elementToFocus.focus(), 0);
            }
        }
    }

    private _onAddTagClicked = (): void => {
        if (this.props.tags.length == this.props.tagListCountLimit) {
            this.setState({
                tagElementToFocus: TagElementToFocus.LastTag
            });
            this.props.onTagListChanged(
                this.props.tags.map((value) => value.text),
                this.props.tagListCountLimitReachedErrorMessage,
                ""
            );
            TelemetryClient.publishProjectTagsAddButtonClickedAfterMaxCountReached();
        } else {
            this.setState({
                tagAdditionMode: true
            });
        }
        TelemetryClient.publishProjectTagsAddTagButtonClicked();
    }

    private _onAddTagPlaceholderClicked = (): void => {
        if (this.props.onTagListKeyUp) {
            this.props.onTagListKeyUp();
        }
        this._onAddTagClicked();
    }

    private _onTagsAdded(tags: string[]): void {
        const { onTagListChanged } = this.props;


        let trimmedTags: string[] = [];
        let tagsWithCharactersLimitExceeded: string[] = [];
        let tagsWithInvalidCharacters: string[] = [];
        let tagsWithInvalidLastCharacters: string[] = [];
        let currentTags: string[] = this.props.tags.map((tagInfo) => tagInfo.text);
        let errorMessage: string = "";
        let invalidTagText: string = "";
        let invalidTagErrorMessage: string = "";
        const invalidCharacterRegex = new RegExp(ProjectOverviewConstants.ProjectTags_InvalidCharacters.join("|"));
        const invalidLastCharacterRegex = new RegExp(ProjectOverviewConstants.ProjectTags_InvalidLastCharactersRegex);

        tags.forEach((tag: string) => {
            // Empty strings are ignored
            tag = tag.trim();
            if (tag.match(invalidCharacterRegex)) {
                tagsWithInvalidCharacters.push(tag);
            }

            if (tag.match(invalidLastCharacterRegex)) {
                tagsWithInvalidLastCharacters.push(tag);
            }

            if (tag.length > this.props.tagCharacterLimit) {
                tagsWithCharactersLimitExceeded.push(tag);
            }

            if (tag) {
                trimmedTags.push(tag);
            }
        });

        trimmedTags = Utils_Array.unique(trimmedTags, !this.props.isCaseSensitive ? Utils_String.localeIgnoreCaseComparer : null);

        currentTags = currentTags.concat(trimmedTags);
        if (tagsWithCharactersLimitExceeded.length > 0 || tagsWithInvalidCharacters.length > 0 || tagsWithInvalidLastCharacters.length > 0) {
            if (tagsWithCharactersLimitExceeded.length > 0) {
                tagsWithCharactersLimitExceeded.forEach((tag: string) => {
                    this._invalidTags.push({ text: tag, errorMessage: this.props.tagCharacterLimitExceededErrorMessage });
                });
                TelemetryClient.publishProjecTagsCharacterLimitValidationFailed();
            }

            if (tagsWithInvalidCharacters.length > 0) {
                const errorMessage = Utils_String.format(
                    ProjectOverviewResources.ProjectTags_CharactersNotAllowedAdded,
                    ProjectOverviewConstants.ProjectTags_InvalidCharacters.join(','));
                tagsWithInvalidCharacters.forEach((tag: string) => {
                    this._invalidTags.push({ text: tag, errorMessage });
                });
                TelemetryClient.publishProjecTagsAllowedCharactersValidationFailed();
            }

            if (tagsWithInvalidLastCharacters.length > 0) {
                const errorMessage = Utils_String.format(
                    ProjectOverviewResources.ProjectTags_LastCharactersNotAllowedAdded,
                    ProjectOverviewConstants.ProjectTags_InvalidLastCharacters.join(','));
                tagsWithInvalidLastCharacters.forEach((tag: string) => {
                    this._invalidTags.push({ text: tag, errorMessage });
                });
                TelemetryClient.publishProjecTagsAllowedCharactersValidationFailed();
            }
        } else if (currentTags.length > this.props.tagListCountLimit) {
            errorMessage = this.props.tagListCountLimitExceededErrorMessage;
            TelemetryClient.publishProjectTagsMaximumNumberofTagsValidationFailed();
        }

        if (this._invalidTags.length !== 0) {
            /*
            If tag contains invalid characters
            or
            tag exceeds character limit we treat that as invalid tags.  
            */
            invalidTagText = this._invalidTags[0].text;
            invalidTagErrorMessage = this._invalidTags[0].errorMessage;
        }

        if (onTagListChanged) {
            this.props.onTagListChanged(currentTags, invalidTagErrorMessage || errorMessage, invalidTagText);
            let tagElementToFocus = this.state.tagElementToFocus;

            if (!errorMessage && !invalidTagErrorMessage) {
                tagElementToFocus = TagElementToFocus.AddButton;
            } else {
                tagElementToFocus = invalidTagText ? TagElementToFocus.InvalidTag : TagElementToFocus.LastTag;
            }

            this.setState({
                tagElementToFocus: tagElementToFocus,
                invalidTag: { text: invalidTagText, errorMessage: invalidTagErrorMessage },
                tagAdditionMode: false
            });
        }
    }

    private _onTagRemoved = (tag: string): void => {
        const { onTagListChanged, tagListCountLimit, tags } = this.props;

        let currentTags: string[] = tags.map((tagInfo) => tagInfo.text);
        currentTags = currentTags.filter((e) => e !== tag);
        this._invalidTags = this._invalidTags.filter((e) => e.text !== tag);
        let invalidTagText: string = "";
        let invalidTagErrorMessage: string = "";
        let errorMessage: string = "";
        if (this._invalidTags && this._invalidTags.length !== 0) {
            invalidTagText = this._invalidTags[0].text;
            invalidTagErrorMessage = this._invalidTags[0].errorMessage;
        } else if (currentTags.length > this.props.tagListCountLimit) {
            errorMessage = this.props.tagListCountLimitExceededErrorMessage;
        }

        if (onTagListChanged) {
            onTagListChanged(currentTags, invalidTagErrorMessage || errorMessage, invalidTagText);

            let elementToFocus: TagElementToFocus = null;
            if (tag === tags[tags.length - 1].text) {
                elementToFocus = TagElementToFocus.AddButton;
            }
            if (currentTags.length >= tagListCountLimit) {
                elementToFocus = TagElementToFocus.LastTag;
            }


            if (
                elementToFocus !== this.state.tagElementToFocus ||
                invalidTagText !== this.state.invalidTag.text
            ) {
                this.setState({
                    tagElementToFocus: elementToFocus,
                    invalidTag: { text: invalidTagText, errorMessage: invalidTagErrorMessage }
                });
            }
        }
    }

    private _getTagControlMode(props: TagListProps): TagListControlMode {
        if (!this.state.tagAdditionMode && props.tags.length === 0) {
            return TagListControlMode.AddTagsPlaceHolder;
        } else if (props.editMode) {
            return this.state.tagAdditionMode
                ? TagListControlMode.EditWithAddition
                : TagListControlMode.EditWithoutAddition;
        }

        return TagListControlMode.View;
    }
}

registerLWPComponent("TFS.ProjectOverview.TagListControl", TagListControlComponent);
