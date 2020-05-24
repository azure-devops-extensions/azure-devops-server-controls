/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { TagsSuggestionResolver } from "DistributedTaskControls/Components/TagsSuggestionResolver";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { IInputProps, ITag, TagPicker } from "OfficeFabric/Pickers";
import { css } from "OfficeFabric/Utilities";
import { BaseAutoFill } from "OfficeFabric/Pickers";

export interface IProps {
    className?: string;
    selectedItems?: ITag[];
    items?: ITag[];
    onChange?: (items?: ITag[]) => void;

    /**
     * Setting to indicate if user entered text needs to be included in the suggested tags
     */
    includeUserEnteredTextInSuggestedTags?: boolean;

    /**
     * Used in conjunction with includeUserEnteredTextInSuggestedTags to get the tag for the text
     * entered by the user.
     */
    getTagForText?: (string) => ITag;

    /**
     * Flag for disabling the picker.
     * @default false
     */
    disabled?: boolean;

    /**
     * AutoFill input native props
     * @default undefined
     */
    inputProps?: IInputProps;

    /**
     * A callback for when the user moves the focus away from the picker
     */
    onBlur?: React.FocusEventHandler<HTMLInputElement | BaseAutoFill>;
}

export class TagPickerComponent extends React.Component<IProps, Base.IStateless> {

    public render() {
        return (
            <TagPicker
                className={css(this.props.className, "fabric-style-overrides", "tag-picker")}
                selectedItems={this.props.selectedItems ? this.props.selectedItems : []}
                onResolveSuggestions={this._getTagSuggestions}
                getTextFromItem={(item: any) => { return item.name; }}
                onChange={this._onChange}
                disabled={this.props.disabled}
                inputProps={this.props.inputProps}
                onBlur={this.props.onBlur}
                pickerSuggestionsProps={
                    {
                        suggestionsHeaderText: Resources.TagPickerSuggestedTagsHeader,
                        noResultsFoundText: Resources.TagPickerNoTagsHeader
                    }
                }
            />
        );
    }

    private _onChange = (items?: ITag[]) => {
        if (this.props.onChange) {
            this.props.onChange(items);
        }
    }

    private _getTagSuggestions = (userEnteredText: string, selectedTagList: ITag[]) => {
        return TagsSuggestionResolver.getSuggestedTags(
            userEnteredText,
            this.props.items,
            selectedTagList,
            this.props.includeUserEnteredTextInSuggestedTags,
            this.props.getTagForText);
    }
}