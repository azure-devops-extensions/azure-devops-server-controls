import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { Component as InfoButton } from "DistributedTaskControls/Components/InfoButton";
import { TooltipIfOverflow } from "DistributedTaskControls/Components/TooltipIfOverflow";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { List } from "OfficeFabric/List";
import { css } from "OfficeFabric/Utilities";
import { Label } from "OfficeFabric/Label";

import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/TagList";

export interface ITagListProps extends Base.IProps {
    tags: string[];
    headerLabel?: string;
    ariaLevel?: number;
    infoContent?: string;
    headerLabelClassName?: string;
    tagItemClassName?: string;
}

export class TagList extends Base.Component<ITagListProps, Base.IStateless> {

    public render(): JSX.Element {

        if (this.props.tags && this.props.tags.length > 0) {
            return (
                <div className="tag-list-container" >
                    { this.props.headerLabel && this._getHeaderElement() }
                    { this._getTagListElement() }
                </div>
            );
        }
        else {
            return null;
        }
    }

    private _getHeaderElement(): JSX.Element {
        return (
            <div className={"tag-list-header"}>
                <Label 
                    className={this.props.headerLabelClassName}
                    {...this.props.ariaLevel ?
                        { 
                            role: "heading",
                            "aria-level": this.props.ariaLevel
                        } : {}
                    } >
                    { this.props.headerLabel } 
                </Label>
                { this.props.infoContent && this._getInfoButton() }
            </div>
        );
    }

    private _getInfoButton(): JSX.Element {
        return (
            <InfoButton
                cssClass={"dtc-tag-list-info-button"}
                isIconFocusable={true}
                iconAriaLabel={Utils_String.format(Resources.MoreInformationForInputLabel, this.props.headerLabel)}
                calloutContent={{
                    calloutMarkdown: this.props.infoContent,
                    calloutContentAriaLabel: this.props.infoContent
                }} />
        );
    }

    private _getTagListElement(): JSX.Element {
        return (
            <List
                className="dtc-tags-list"
                items={this.props.tags}
                onRenderCell={this._onRenderTagItem}
                getItemCountForPage={this._getItemCountForPage}
                onShouldVirtualize={() => { return false; }}
                getPageStyle={this._getPageStyle}
            />
        );
    }

    private _getPageStyle = () => {
        return {display: "inline-flex", "flex-wrap": "wrap"};
    }

    private _onRenderTagItem = (tagName: string): JSX.Element => {
        const tagItemClassName: string = "dtc-tag-item";
        return (
                <TooltipIfOverflow tooltip={tagName} targetElementClassName={tagItemClassName} >
                    <span className={ css(tagItemClassName, this.props.tagItemClassName) }>{tagName}</span>
                </TooltipIfOverflow>
        );
    }

    private _getItemCountForPage = () => {
        return this.props.tags.length;
    }
}