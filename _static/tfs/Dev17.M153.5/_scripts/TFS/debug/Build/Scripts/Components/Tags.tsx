/// <reference types="react" />

import React = require("react");

import { Autocomplete } from "VSSPreview/Flux/Components/Autocomplete";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import { QueryResult } from "Build/Scripts/QueryResult";
import { triggerEnterOrSpaceKeyHandler } from "Build/Scripts/ReactHandlers";
import { TagActionHub } from "Build/Scripts/Actions/Tags";
import { AllTagsStore, SelectedTagsStore } from "Build/Scripts/Stores/Tags";

import * as PresentationResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";

import { Action } from "VSS/Flux/Action";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import * as VSS_Events from "VSS/Events/Services";

import "VSS/LoaderPlugins/Css!Build/Tags";

export interface ComponentState {
    addingTag: boolean;
}

export interface ComponentProps {
    allTags: string[];
    className?: string;
    selectedTags?: string[];
    readonly?: boolean;
    addButtonAriaLabel?: string;
    announceMessageOnKeyDownWithValue?: string;
    comparer?: (a: string, b: string) => number;
    onTagAdded: (tag: string) => void;
    onTagRemoved: (tag: string) => void;
}

export class Component extends React.Component<ComponentProps, ComponentState> {
    private _allTags: string[];
    private _comparer: (a: string, b: string) => number;

    constructor(props: ComponentProps, context?: any) {
        super(props, context);

        this._comparer = props.comparer || Utils_String.localeComparer;
        this._allTags = (props.allTags || []).sort(this._comparer);

        this.state = {
            addingTag: false
        };
    }

    public render(): JSX.Element {
        let readonly: boolean = !!this.props.readonly;

        let addElement: JSX.Element = null;
        const label = this.props.addButtonAriaLabel || BuildResources.AddTagText;

        if (!readonly) {
            if (!this.state.addingTag) {
                addElement = <li className="tags-add-button tag-item-delete-experience">
                    <span role="button" tabIndex={0} className="tag-container tag-container-selectable" aria-label={label} onKeyDown={this._onKeyDown} onClick={this._onAddClick} >
                        <span className="tag-box tag-box-selectable">
                            <span className="bowtie-icon bowtie-math-plus-light" />
                        </span>
                    </span>
                </li>;
            }
            else {
                addElement = <li className="tags-input">
                    <Autocomplete initialValue="" focus={true} blurWhenEmpty={true} items={this._allTags} onValueSelected={this._onInputValueSelected} comparer={this._comparer} announceMessageOnKeyDownWithValue={this.props.announceMessageOnKeyDownWithValue} />
                </li>;
            }
        }

        return <div className={this.props.className}>
            <div className="tags-items-container">
                <ul className="tags-list">
                    {
                        this.props.selectedTags.map((tag: string) => {
                            return <TagItemComponent key={tag} tag={tag} readonly={readonly} onDeleteClick={this._onTagDeleted} />
                        })
                    }
                    {addElement}
                </ul>
            </div>
        </div>;
    }

    public shouldComponentUpdate(nextProps: ComponentProps, nextState: ComponentState): boolean {
        return this.props.className !== nextProps.className
            || this.props.readonly !== nextProps.readonly
            || this.props.addButtonAriaLabel !== nextProps.addButtonAriaLabel
            || this.state.addingTag !== nextState.addingTag
            || !Utils_Array.arrayEquals(this.props.selectedTags, nextProps.selectedTags, (a, b) => this._comparer(a, b) === 0)
            || !Utils_Array.arrayEquals(this.props.allTags, nextProps.allTags, (a, b) => this._comparer(a, b) === 0);
    }

    public componentWillReceiveProps(nextProps: ComponentProps): void {
        this._comparer = nextProps.comparer || Utils_String.localeComparer;
        this._allTags = (nextProps.allTags || []).sort(this._comparer);
    }

    private _onAddClick = (): void => {
        this.setState({
            addingTag: true
        });
    };

    private _onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
        triggerEnterOrSpaceKeyHandler(event, this._onAddClick);
    }

    private _onInputValueSelected = (value: string, event: React.SyntheticEvent<HTMLElement>): void => {
        let tagAdded: boolean = !!value && !Utils_Array.contains(this.props.selectedTags, value, this._comparer);
        let addingTag: boolean = false;

        // if the tag was added with the Tab key, start adding another tag
        // preventDefault() prevents the focus from moving to another UI element
        if (tagAdded && event.type === "keydown") {
            let keyboardEvent = event as React.KeyboardEvent<HTMLElement>;
            if (keyboardEvent.key === "Tab") {
                addingTag = true;
                event.preventDefault();
            }
        }

        this.setState({
            addingTag: addingTag
        });

        if (tagAdded) {
            this.props.onTagAdded(value);
        }
    }

    private _onTagDeleted = (value: string) => {
        this.props.onTagRemoved(value);
    };
}

interface TagItemState {
}

interface TagItemProps {
    tag: string;
    readonly: boolean;
    onDeleteClick: (tag: string) => void;
}

class TagItemComponent extends React.Component<TagItemProps, TagItemState> {
    public render(): JSX.Element {
        let itemClasName = "tag-item";
        let boxClassName = "tag-box";
        let containerClassName = "tag-container";
        let deleteButton: JSX.Element = null;

        if (!this.props.readonly) {
            itemClasName += " tag-item-delete-experience";
            boxClassName += " tag-box-delete-experience";
            containerClassName += " tag-container-delete-experience";
            deleteButton = <span role="button" aria-label={BuildResources.DeleteTagText} tabIndex={0} className="tag-delete tag-box-delete-experience" onKeyDown={this._onKeyDown} onClick={this._onClick}><span className="bowtie-icon bowtie-math-multiply-light" /></span>
        }

        return <li className={itemClasName} title={this.props.tag}>
            <span className={containerClassName}>
                <span className={boxClassName}>{this.props.tag}</span>
                {deleteButton}
            </span>
        </li>;
    }

    public shouldComponentUpdate(nextProps: TagItemProps, nextState: TagItemState): boolean {
        return this.props.tag !== nextProps.tag
            || this.props.readonly !== nextProps.readonly;
    }

    private _onClick = () => {
        this.props.onDeleteClick(this.props.tag);
    }

    private _onKeyDown = (event) => {
        triggerEnterOrSpaceKeyHandler(event, this._onClick);
    }
}

export interface ControllerViewState {
    allTags: string[];
    selectedTags: string[];
}

export interface ControllerViewProps {
    hub: TagActionHub;
    allTagsStore: AllTagsStore;
    selectedTagsStore: SelectedTagsStore;
    className?: string;
    readonly?: boolean;
    addButtonAriaLabel?: string;
    announceMessageOnKeyDownWithValue?: string;
}

export class ControllerView extends React.Component<ControllerViewProps, ControllerViewState> {
    private _hub: TagActionHub;
    private _allTagsStore: AllTagsStore;
    private _selectedTagsStore: SelectedTagsStore;

    constructor(props: ControllerViewProps) {
        super(props);

        this._hub = props.hub;
        this._allTagsStore = props.allTagsStore;
        this._selectedTagsStore = props.selectedTagsStore;

        this.state = {
            allTags: this._allTagsStore.getAllTags(),
            selectedTags: this._selectedTagsStore.getSelectedTags()
        };
    }

    public render(): JSX.Element {
        return <div className="build-tags-picker">
            <span className="tags-label">{BuildResources.TagFilterLabel}</span>
            <Component className={this.props.className} readonly={this.props.readonly}
                allTags={this.state.allTags} selectedTags={this.state.selectedTags}
                comparer={this._selectedTagsStore.getComparer()}
                onTagAdded={this.onTagAdded} onTagRemoved={this.onTagRemoved}
                addButtonAriaLabel={this.props.addButtonAriaLabel}
                announceMessageOnKeyDownWithValue={this.props.announceMessageOnKeyDownWithValue}/>
        </div>;
    }

    public componentDidMount() {
        // add changed listeners
        this._allTagsStore.addChangedListener(this._onStoresUpdated);
        this._selectedTagsStore.addChangedListener(this._onStoresUpdated);
    }

    public componentWillUnmount() {
        // remove changed listeners
        this._allTagsStore.removeChangedListener(this._onStoresUpdated);
        this._selectedTagsStore.removeChangedListener(this._onStoresUpdated);
    }

    public componentWillReceiveProps(nextProps : ControllerViewProps) {
        this._allTagsStore.removeChangedListener(this._onStoresUpdated);
        this._selectedTagsStore.removeChangedListener(this._onStoresUpdated);

        this._hub = nextProps.hub;
        this._allTagsStore = nextProps.allTagsStore;
        this._selectedTagsStore = nextProps.selectedTagsStore;

        this._allTagsStore.addChangedListener(this._onStoresUpdated);
        this._selectedTagsStore.addChangedListener(this._onStoresUpdated);

        this.setState({
            allTags: this._allTagsStore.getAllTags(),
            selectedTags: this._selectedTagsStore.getSelectedTags()
        });
    }

    protected onTagAdded = (tag: string): void => {
        this._hub.tagAdded.invoke({ tag: tag });
    }

    protected onTagRemoved = (tag: string): void => {
        this._hub.tagRemoved.invoke({ tag: tag });
    }

    private _onStoresUpdated = (): void => {
        this.setState({
            allTags: this._allTagsStore.getAllTags(),
            selectedTags: this._selectedTagsStore.getSelectedTags()
        });
    }
}
