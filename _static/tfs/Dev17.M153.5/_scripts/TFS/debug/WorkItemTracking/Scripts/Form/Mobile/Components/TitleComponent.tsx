import * as React from "react";
import * as WITConstants from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import * as WITOM from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import * as WorkItemTrackingResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { WorkItemBindableComponent } from "WorkItemTracking/Scripts/Form/React/Components/WorkItemBindableComponent";
import { FormContextItems, IOpenFullScreen } from "WorkItemTracking/Scripts/Form/Mobile/Interfaces";
import { IWorkItemControlOptions } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl";
import { PlainTextEditComponent } from "WorkItemTracking/Scripts/Form/React/Components/PlainTextEditComponent";
import { getControlClasses } from "WorkItemTracking/Scripts/Form/ControlUtils";

export class TitleComponent extends WorkItemBindableComponent<{}, {}> {

    constructor(props, context) {
        super(props, context);

        this._subscribeToWorkItemFieldChanges(WITConstants.CoreFieldRefNames.Title);
    }

    protected _workItemFieldChanged() {
        this.forceUpdate();
    }

    public render(): JSX.Element {

        if (this._formContext && this._formContext.workItem) {
            const field = this._formContext.workItem.getField(WITConstants.CoreField.Title);
            const classes = getControlClasses("work-item-form-title", field, null);
            const titleText = this._formContext.workItem.getFieldValue(WITConstants.CoreField.Title);
            const friendlyName = field.fieldDefinition.name || field.fieldDefinition.referenceName;
            // Prepend the field name to the value since Title doesn't have any visible label with field name and use it as aria-label for screen readers
            const titleLabel = friendlyName + " " + titleText;
            return <button className="work-item-title-button" onClick={this._onClick} aria-label={titleLabel} >
                <span className={classes}>
                    {titleText}
                </span>
            </button >;
        }

        return null;
    }

    private _onClick = (event: React.MouseEvent<HTMLElement>) => {
        event.preventDefault();

        if (!this._formContext || !this._formContext.workItem) {
            return;
        }

        const fsInvoke: IOpenFullScreen = this._formContext.items[FormContextItems.FullScreenInvoke];

        if (fsInvoke) {

            const controlOptions: IWorkItemControlOptions = {
                fieldName: WITConstants.CoreFieldRefNames.Title,
                emptyText: WorkItemTrackingResources.TitleEmptyText,
            };

            const field = this._formContext.workItem.getField(WITConstants.CoreField.Title);
            const fieldName = field.fieldDefinition.name;

            fsInvoke(
                fieldName,
                (closeFullscreen: () => void, $container: JQuery): JSX.Element => {
                    return <PlainTextEditComponent
                        maxLength={255}
                        disallowNewlines={true}
                        useLargeFont={true}
                        autoFocus={true}
                        controlOptions={controlOptions}
                        />;
                },
                ()=>{});
        }
    }
}
