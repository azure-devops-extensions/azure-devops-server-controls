/// <reference types="react" />

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { TooltipIfOverflow } from "DistributedTaskControls/Components/TooltipIfOverflow";
import { List } from "OfficeFabric/List";
import { css } from "OfficeFabric/Utilities";
import * as React from "react";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/TagsListComponent";

export interface ITagsListComponentProps extends Base.IProps {
    tags: string[];
}

/**
 * @deprecated
 * Use TagList instead
 */

export class TagsListComponent extends React.Component<ITagsListComponentProps, Base.IStateless> {

    public render() {
        if (this.props.tags && this.props.tags.length > 0) {
            return (
                <div className={css(this.props.cssClass, "tags-list-container")}>
                    <List
                        className="tag-list-component-tags-list"
                        onShouldVirtualize={() => { return false; }}
                        items={this.props.tags}
                        onRenderCell={this._onRenderTagItem}
                    />
                </div>
            );
        } else {
            return null;
        }
    }

    private _onRenderTagItem(tagName: string): JSX.Element {
        const tagItemClassName: string = "tag-list-component-tag-item";
        return (
            <TooltipIfOverflow tooltip={tagName} targetElementClassName={tagItemClassName} >
                <span className={tagItemClassName}>{tagName}</span>
            </TooltipIfOverflow>
        );
    }
}
