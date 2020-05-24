/// <reference types="react" />

import React = require("react");
import * as String_Utils from "VSS/Utils/String";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import "VSS/LoaderPlugins/Css!VersionControl/TagControl";

export enum TagStyle {
    Light,
    Dark
}
export interface ITagControlProps extends React.Props<void> {
    tagName: string;
    tagStyle?: TagStyle; // defaults to TagStyle.Light
    showToolTip?: boolean;
}

module TagControlStyles {
    export const tagContainerLightClass = "vc-tag-container light-theme";
    export const tagContainerDarkClass = "vc-tag-container dark-theme";
    export const tagIconLightClass = "tag-icon bowtie-icon bowtie-tag-fill";
    export const tagiconDarkClass = "tag-icon bowtie-icon bowtie-tag";
    export const tagTextLightClass = "tag-text dark";
    export const tagTextDarkClass = "tag-text light";
}

/**
 * Renders tag control.
 */
export class TagControl extends React.Component<ITagControlProps, {}> {
    private _tagContainerClass: string;
    private _tagIconClass: string;
    private _tagTextClass: string;
    private _toolTipText: string = "";

    public render(): JSX.Element {
        if (this.props.tagName) {
            // populating the private attributes of the object
            this._populateTagControlAttributes();

            return (
                <div className={this._tagContainerClass}>
                    <div className='tag-content' title={this._toolTipText}>
                        <span className={this._tagIconClass}/>
                        <span className={this._tagTextClass}>{this.props.tagName}</span>
                    </div>
                </div>);
        } else {
            return <div/>;
        }
    }

    private _populateTagControlAttributes(): void {
        if (this.props.showToolTip) {
            this._toolTipText = String_Utils.format(VCResources.TagControlToolTipText, this.props.tagName);
        }

        let tagStyle: TagStyle = this.props.tagStyle || TagStyle.Light; 

        // populating tag container class
        this._tagContainerClass = tagStyle === TagStyle.Light ? TagControlStyles.tagContainerLightClass : TagControlStyles.tagContainerDarkClass;

        // populating tag icon class
        this._tagIconClass = tagStyle === TagStyle.Light ? TagControlStyles.tagIconLightClass : TagControlStyles.tagiconDarkClass;

        // populating tag text class
        this._tagTextClass = tagStyle === TagStyle.Light ? TagControlStyles.tagTextLightClass : TagControlStyles.tagTextDarkClass;
    }
}
