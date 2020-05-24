// Copyright (c) Microsoft Corporation.  All rights reserved.

/// <reference types="react" />
/// <reference types="react-dom" />

import React = require("react");
import ReactDOM = require("react-dom");
import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");
import { KeyCode } from "VSS/Utils/UI";

import { TagPicker, ITag } from "OfficeFabric/components/pickers/TagPicker/TagPicker";
import { IInputProps } from "OfficeFabric/Pickers";
import { css } from "OfficeFabric/Utilities";

import { Component, IProps, IState } from "DistributedTaskControls/Common/Components/Base";
import { TagsSuggestionResolver } from "DistributedTaskControls/Components/TagsSuggestionResolver";
import { KeyboardAccesibleComponent } from "ReleasePipeline/Scripts/Common/Components/KeyboardAccessible";
import Resources = require("ReleasePipeline/Scripts/Resources/TFS.Resources.ReleasePipeline");
import Model = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Model");
import "VSS/LoaderPlugins/Css!RM:ReleasePipeline/Scripts/MachineGroup/Components/TargetTags";

export interface ComponentState extends IState {
    addingTag: boolean;
    itemTags: string[];
    tagKey?: number;
}

export interface ComponentProps extends IProps {
    className?: string;
    onTagUpdated?: (machineId: number, tag: string[]) => void;
    item: Model.Machine;
    tags: string[];
    inputProps?: IInputProps;
    currentTags?: string[];
    /**
    * Flag for disabling the picker.
    * @default false
    */
    disabled?: boolean;
}

export class TagComponent extends Component<ComponentProps, ComponentState> {
    private _picker: TagPicker;
    private _addButtonRef: HTMLElement;
    public render(): JSX.Element {
        let addElement: JSX.Element = null;
        if (!this.state.addingTag && this.state.itemTags.length === 0) {
            this._picker = undefined;
            let addButtonText = Resources.AddTags;
            addElement =
                <a ref={(addButton)=>{this._addButtonRef=addButton}} onClick={this._onAddClick.bind(this)} onKeyDown={this._handleKeyPress.bind(this)}>
                    {addButtonText}
                </a>
        }
        else {
            this._addButtonRef = undefined;
            addElement = (<TagPicker
                ref={(picker) => this._picker = picker}
                className={css(this.props.className, "fabric-style-overrides", "tag-picker")}
                defaultSelectedItems={this.state.itemTags ? this.state.itemTags.map(item => ({ key: item, name: item })) : []}
                onResolveSuggestions={this._getTagSuggestions.bind(this)}
                getTextFromItem={(item: any) => { return item.name; }}
                onChange={this._onChange.bind(this)}
                key={this.state.tagKey}
                disabled={this.props.disabled}
                inputProps={{
                    onBlur: this._handleBlur.bind(this)
                }}
                pickerSuggestionsProps={
                    {
                        suggestionsHeaderText: Resources.TagPickerSuggestedTagsHeader,
                        noResultsFoundText: Resources.TagPickerNoTagsHeader
                    }
                }
                />);
        }
        return <KeyboardAccesibleComponent onClick={this._setFocusOnElement} ariaLabel={Resources.DeploymentMachineTagPickerAriaLabel}>{addElement}</KeyboardAccesibleComponent>;
    }

    private _setFocusOnElement=(): void => {
        if(!!this._picker) {
            this._picker.focus();
        }
        else {
            this._addButtonRef.click();
        }
    }

    private _handleKeyPress = (event: React.KeyboardEvent<HTMLDivElement>): void => {
        if (event.keyCode === KeyCode.SPACE || event.keyCode === KeyCode.ENTER) {
            this._onAddClick(event);
            event.preventDefault();
            event.stopPropagation();
        }
    }

    public componentWillReceiveProps(nextProps: ComponentProps) {
        if (nextProps && nextProps.item && this.state.itemTags && !Utils_Array.shallowEquals(nextProps.item.tags.sort(), this.state.itemTags.sort())) {
            this.setState({
                itemTags: nextProps.currentTags,
                tagKey: this.state.tagKey + 1
            });
        }
    }

    public componentDidUpdate(): void {
        if (this.state.addingTag && this._picker) {
            this._picker.focus();
        }
    }

    private _handleBlur = (ev: React.FocusEvent<HTMLDivElement>) => {
        if (this._picker && this._picker.state && this._picker.state.suggestionsVisible) {
            return;
        }
        this.setState({
            addingTag: false
        });
    }

    public componentWillMount(): void {
        this.setState({
            itemTags: this.props.currentTags,
            tagKey: 0,
            addingTag: false
        });
        super.componentWillUnmount();
    }
    
    private _onAddClick = (ev: any) => {
        this.setState({
            addingTag: true
        });
    }

    private _onChange(tags?: ITag[]) {
        let tagList: string[] = tags.map((item) => item.key);
        this.props.onTagUpdated(this.props.item.id, tagList);
        this.setState({
            itemTags: tagList
        });
    }

    private _getTagSuggestions(userEnteredText: string, selectedTagList: ITag[]) {
        return TagsSuggestionResolver.getSuggestedTags(
            userEnteredText,
            this.props.tags.map(item => ({ key: item, name: item })),
            selectedTagList,
            true,
            this._getTagForText.bind(this)
            );
    }

    private _getTagForText(text: string) {
        return { key: text, name: text };
    }
}