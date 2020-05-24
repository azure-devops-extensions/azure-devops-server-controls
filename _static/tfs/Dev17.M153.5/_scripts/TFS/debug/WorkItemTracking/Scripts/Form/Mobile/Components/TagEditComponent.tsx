///<reference types="react-addons-css-transition-group" />

import "VSS/LoaderPlugins/Css!WorkItemTracking/Form/Mobile/Components/TagEditComponent";
import "VSS/LoaderPlugins/Css!WorkItemTracking/Form/Mobile/Components/WorkItemFieldComponent";

import * as Q from "q";
import * as React from "react";
import { CSSTransitionGroup } from "react-transition-group";
import * as WITOM from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import * as WorkItemTrackingResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";

import { handleError } from "VSS/VSS";
import { delay } from "VSS/Utils/Core";
import { findIndex } from "VSS/Utils/Array";
import { startsWith, localeIgnoreCaseComparer, format } from "VSS/Utils/String";
import { autobind } from "OfficeFabric/Utilities";
import { WorkItemBindableComponent } from "WorkItemTracking/Scripts/Form/React/Components/WorkItemBindableComponent";
import { IDataSource, IItem, PickerMode, Picker, PickerValidationResult } from "WorkItemTracking/Scripts/Form/React/Components/Picker";
import { ZeroDataComponent } from "WorkItemTracking/Scripts/Form/React/Components/ZeroDataComponent";

import { TagUtils } from "WorkItemTracking/Scripts/Utils/TagUtils";
import * as TFS_OM_Common from "Presentation/Scripts/TFS/TFS.OM.Common";
import * as TFS_TagService from "Presentation/Scripts/TFS/FeatureRef/TFS.TagService";
import { IWorkItemFormComponentContext } from "WorkItemTracking/Scripts/Form/React/FormContext";

const MAX_MATCHING_TAGS = 200;
const INVALID_CHARACTERS_REGEX = /[;,]/g;

export class TagsDataSource implements IDataSource<IItem> {
    private _tags: string[];
    private _tagsPromise: IPromise<void>;

    private _filter: string;

    private _previousTags: string[];
    private _previousFilter: string;

    constructor(private _projectGuid: string) {
        this._tagsPromise = this._getTagsAsync().then<void>(tags => {
            this._tags = tags;
        }).then<void, void>(null, handleError);
    }

    protected _getTagsAsync(): IPromise<string[]> {
        let tagService = TFS_OM_Common.ProjectCollection.getConnection().getService(TFS_TagService.TagService) as TFS_TagService.TagService;

        return Q.Promise<string[]>((resolve, reject) => tagService.beginQueryTagNames(
            [TFS_TagService.TagService.WORK_ITEM_ARTIFACT_KIND],
            this._projectGuid,
            resolve,
            reject));
    }

    public setFilter(text: string): void {
        this._filter = text.replace(INVALID_CHARACTERS_REGEX, "");
    }

    public getFilter(): string {
        return this._filter;
    }

    public clearFilter(): void {
        this._filter = null;
    }

    public getItems(): IPromise<IItem[]> | IItem[] {
        if (!this._tags) {
            return this._tagsPromise.then(() => this._getMatchingTags());
        }

        return this._getMatchingTags();
    }

    private _getMatchingTags(): IItem[] {
        if (!this._filter) {
            // Return up to max number of tags if no filter is given
            return this._tags.slice(0, MAX_MATCHING_TAGS).map(this._mapTagToItem);
        }

        let sourceTags = this._tags;

        const previousFilterIsPrefixOfCurrent = this._previousFilter && startsWith(this._filter, this._previousFilter, localeIgnoreCaseComparer);
        if (previousFilterIsPrefixOfCurrent) {
            sourceTags = this._previousTags;
        } else {
            this._previousFilter = null;
            this._previousTags = null;
        }

        let filteredTags: string[] = [];
        let reachedMaxNumberOfResults = false;

        // Prevent against user input
        const escapedFilter = this._filter.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
        const matcher = new RegExp(`^${escapedFilter}`, "i");
        for (let tag of sourceTags) {
            if (matcher.test(tag)) {
                filteredTags.push(tag);

                if (filteredTags.length >= MAX_MATCHING_TAGS) {
                    reachedMaxNumberOfResults = true;
                    break;
                }
            } else if (filteredTags.length > 0) {
                // Since the tags are sorted, we had a match before, we are performing a prefix search, and now
                // we don't match anymore, we can short-circuit, and exit.
                break;
            }
        }

        // Store result for next iteration only if we did not hit the max number of results:
        //  If we assume max number would be 2, and our dataset is [a, aa, ab, ac, ad]. When the
        //  first filter operation for "a" returns "a", and "aa" (and nothing else because of the limit), and then
        //  the user enters "d" for "ad", we wouldn't find the match, if we took the previous result set of "a", and "aa"
        //  as source.
        if (!reachedMaxNumberOfResults) {
            this._previousFilter = this._filter;
            this._previousTags = filteredTags;
        }

        let result = filteredTags.map(this._mapTagToItem);

        // If the current filter input does not match any existing tag, add the filter input as virtual tag
        // in the beginning.
        if (result.length === 0 || localeIgnoreCaseComparer(result[0].value, this._filter) !== 0) {
            result.unshift(this._mapTagToItem(this._filter));
        }

        return result;
    }

    private _mapTagToItem(tag: string): IItem {
        return {
            value: tag
        };
    }
}

export enum TagEditMode {
    View,
    Edit
}

export interface ITagEditComponentState {
    mode?: TagEditMode;

    /** Keep track of tag being added right now for animating it */
    tagBeingAdded?: string;
}

type TagPicker = new () => Picker<IItem, TagsDataSource>;
const TagPicker = Picker as TagPicker;

/**
 * React control for displaying and editing(TODO) tags.
 */
export class TagEditComponent extends WorkItemBindableComponent<{}, ITagEditComponentState> {
    private _picker: Picker<IItem, TagsDataSource>;
    private _resolvePicker = (picker: Picker<IItem, TagsDataSource>) => { this._picker = picker; };
    private _dataSource: TagsDataSource;

    constructor(props: {}, context: IWorkItemFormComponentContext) {
        super(props, context);

        this._dataSource = new TagsDataSource(this._formContext.workItemType.project.guid);

        this.state = {
            mode: TagEditMode.View
        };
    }

    public render(): JSX.Element {
        let separatorText: string = null;
        if (this.state.mode === TagEditMode.Edit) {
            separatorText = WorkItemTrackingResources.TagEdit_Separator;
        }

        return <TagPicker
            dataSource={this._dataSource}
            pickerMode={PickerMode.Filter}
            onRenderList={this._renderList}
            listWrapperClassName="tag-list"
            separatorText={separatorText}
            itemHeight={45}
            className="field-control-picker tag-picker"
            inputClassName="field-control-input"
            separatorClassName="field-control-separator"
            itemClassName="field-control-item"
            onSelect={this._onTagSelect}
            onFilterChange={this._onFilterChange}
            filterPlaceholder={WorkItemTrackingResources.TagEdit_FilterWatermark}
            filterIcon="bowtie-math-plus-light"
            selectedValue={this.state.tagBeingAdded || ""}
            ref={this._resolvePicker}
        />;
    }

    @autobind
    private _renderList(items: IItem[], defaultRenderList: () => JSX.Element) {
        if (this.state.mode === TagEditMode.View) {
            // In view mode we ignore anything the picker gives us, and just render the list of tags currently
            // set on the work item.
            if (this._formContext && this._formContext.workItem) {
                let tags = this._formContext.workItem.getTagNames();

                const tagsList = tags.map(tag =>
                    <li key={tag} className="tag-item">
                        <div className="tag-label">
                            {tag}
                        </div>
                        <div className="tag-actions">
                            <button className="tag-item-delete"
                                aria-label={format(WorkItemTrackingResources.TagsDeleteButton_AriaLabel, tag)}
                                onClick={() => this._removeTagFromWorkItem(tag)}>
                                <span className="bowtie-icon bowtie-edit-remove"></span>
                            </button>
                        </div>
                    </li>);

                let zeroData: JSX.Element;
                if (tags.length === 0) {
                    zeroData = this._renderZeroData();
                }

                return <div className="tag-list-wrapper">
                    {zeroData}

                    <CSSTransitionGroup
                        component="ul"
                        className="tag-list"
                        transitionName="tag-item"
                        transitionEnter={false}
                        transitionLeaveTimeout={450}>
                        {tagsList}
                    </CSSTransitionGroup>
                </div>;
            }

            // Show nothing if there are no tags
            return null;
        }

        // In edit mode, render default picker list
        return defaultRenderList();
    }

    private _renderZeroData() {
        return <ZeroDataComponent
            className="tag-zero-data"
            label={WorkItemTrackingResources.TagEdit_ZeroData}
            iconClassName="bowtie-tag"
        />;
    }

    private _onTagSelect = (item: IItem) => {
        const tag = item.value;

        // Re-render component to trigger selection animation
        this.setState({
            tagBeingAdded: tag
        }, () => {
            this._addTagToWorkItem(tag);

            // Reset input and use view mode after selection animation is finished
            delay(null, 450, () => {
                this._dataSource.clearFilter();
                this._ensureMode(TagEditMode.View);
            });
        });
    }

    private _addTagToWorkItem(tag: string) {
        let tags = this._formContext.workItem.getTagNames();

        let idx = findIndex(tags, t => localeIgnoreCaseComparer(tag, t) === 0);
        if (idx === -1) {
            // Always add new tags to the start of the list for visibility
            tags.unshift(tag);
        }

        this._formContext.workItem.setFieldValue(CoreFieldRefNames.Tags, TagUtils.formatTags(tags));
    }

    private _removeTagFromWorkItem(tag: string) {
        let tags = this._formContext.workItem.getTagNames();
        tags = tags.filter(t => localeIgnoreCaseComparer(t, tag) !== 0);
        this._formContext.workItem.setFieldValue(CoreFieldRefNames.Tags, TagUtils.formatTags(tags));

        this.forceUpdate();
    }

    private _onFilterChange = (text: string): PickerValidationResult => {
        // Determine view mode of control
        let newMode = TagEditMode.View;
        if (!!text) {
            newMode = TagEditMode.Edit;
        }

        this._ensureMode(newMode);

        return true;
    }

    private _ensureMode(mode: TagEditMode, callback?: () => void) {
        if (this.state.mode !== mode) {
            this.setState({
                mode: mode,
                tagBeingAdded: null
            }, callback);
        }
    }

    /**
     * @override
     */
    protected _bind(workItem: WITOM.WorkItem): void {
        this.forceUpdate();
    }
}
