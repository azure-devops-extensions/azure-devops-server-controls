import "VSS/LoaderPlugins/Css!WorkItemTracking/Form/React/Components/TagComponent";

import * as React from "react";
import * as WITConstants from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import * as WorkItemTrackingResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import * as Utils_String from "VSS/Utils/String";
import { WorkItemBindableComponent } from "WorkItemTracking/Scripts/Form/React/Components/WorkItemBindableComponent";
import { FormContextItems, IOpenFullScreen } from "WorkItemTracking/Scripts/Form/Mobile/Interfaces";
import { TagEditComponent } from "WorkItemTracking/Scripts/Form/Mobile/Components/TagEditComponent";

const AddTagComponent: React.StatelessComponent<{}> = (): JSX.Element => {
    return <li className="tag-item">
        {WorkItemTrackingResources.AddTagText}
    </li>;
};

export class TagComponent extends WorkItemBindableComponent<{}, {}> {
    constructor(props: {}, context?: any) {
        super(props, context, {
            eventThrottlingInMs: 200
        });

        this._subscribeToWorkItemFieldChanges(WITConstants.CoreFieldRefNames.Tags);
    }

    protected _workItemFieldChanged() {
        this.forceUpdate();
    }

    public render(): JSX.Element {
        if (this._formContext && this._formContext.workItem) {
            const tags = this._formContext.workItem.getTagNames();
            const tagCount = tags.length;
            const tagList = tags.map((tag: string, index: number) => {
                const ariaLabel = Utils_String.format(WorkItemTrackingResources.TagAriaLabel, (index + 1), tagCount, tag);
                return <li key={tag} role="text" className="tag-item" aria-label={ariaLabel} tabIndex={0}>
                    {tag}
                </li>;
            });

            let content: JSX.Element | JSX.Element[];
            if (tags.length > 0) {
                content = tagList;
            } else {
                content = <AddTagComponent />
            }

            const field = this._formContext.workItem.getField(WITConstants.CoreField.Tags);
            const friendlyName = field.fieldDefinition.name || field.fieldDefinition.referenceName;
            const countAriaLabel = Utils_String.format(WorkItemTrackingResources.TagCountAriaLabel, friendlyName, tags.length);
            const editTagsAriaLabel = Utils_String.format(WorkItemTrackingResources.EditTagsAriaLabel, friendlyName);

            return <div className="tags">
                <button className="tags-button" onClick={this._onClick} aria-label={editTagsAriaLabel} />
                <div role="text" className="tags-count-container" aria-label={countAriaLabel} tabIndex={0}>
                    <span className="icon bowtie-icon bowtie-tag" />
                    <span className="tag-count">{tags.length}</span>
                </div>
                <ul className="tags-list" role="list">
                    {content}
                </ul>
            </div>;
        }

        return null;
    }

    private _onClick = (event: React.MouseEvent<HTMLElement>) => {
        if (!this._formContext || !this._formContext.workItem) {
            return;
        }

        const field = this._formContext.workItem.getField(WITConstants.CoreField.Tags);
        const friendlyName = field.fieldDefinition.name || field.fieldDefinition.referenceName;

        const fsInvoke: IOpenFullScreen = this._formContext.items[FormContextItems.FullScreenInvoke];
        if (fsInvoke) {
            fsInvoke(
                friendlyName,
                (closeFullscreen: () => void, $container: JQuery): JSX.Element => {
                    return <TagEditComponent />;
                });
        }
    }
}
