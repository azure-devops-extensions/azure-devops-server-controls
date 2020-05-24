import * as React from "react";
import * as WITOM from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import * as Utils_Core from "VSS/Utils/Core";
import { WorkItemControlComponent, IWorkItemControlProps } from "WorkItemTracking/Scripts/Form/React/Components/WorkItemControlComponent";
import { IWorkItemControlOptions } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl";
import { KeyCode } from "VSS/Utils/UI";

import { getControlClasses } from "WorkItemTracking/Scripts/Form/ControlUtils";

export interface IPlainTextEditComponentProps extends IWorkItemControlProps {
    maxLength: number;
    disallowNewlines: boolean;
    useLargeFont?: boolean;
    autoFocus?: boolean;
}

/**
 * React control for displaying a plain text field.
 */
export class PlainTextEditComponent extends WorkItemControlComponent<IPlainTextEditComponentProps, {}> {

    protected _controlElement: HTMLTextAreaElement;
    protected _resolveControlElement = (element: HTMLTextAreaElement) => this._controlElement = element;

    constructor(props: IPlainTextEditComponentProps, context?: any) {
        super(props, context);
    }

    public render(): JSX.Element {

        let classes = this.getCurrentControlClasses();

        return <textarea
            className={classes}
            placeholder={this.props.controlOptions.emptyText}
            defaultValue={this._formContext.workItem.getFieldValue(this.props.controlOptions.fieldName)}
            maxLength={this.props.maxLength}
            onChange={this._onChanged}
            onKeyDown={this._onKeyDown}
            onPaste={this._onPaste}
            ref={this._resolveControlElement}
        />;
    }

    public componentDidMount() {
        if (this.props.autoFocus) {
            this._controlElement.focus();
        }
    }

    /**
     * @override
     */
    protected _bind(workItem: WITOM.WorkItem): void {
        this.forceUpdate();
    }

    private _flush(): void {
        if (this._formContext && this._formContext.workItem) {

            this._formContext.workItem.setFieldValue(this.props.controlOptions.fieldName, this._getValue());
        }
    }

    private _getValue(): string {
        return this._controlElement.value;
    }

    private _onChanged = (event: React.FormEvent<HTMLTextAreaElement>) => {
        this._flush();

        this._controlElement.className = this.getCurrentControlClasses();
    };

    private _onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (this.props.disallowNewlines && event.keyCode === KeyCode.ENTER) {
            event.preventDefault();
            return false;
        }
    };

    private _onPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {

        if (!this.props.disallowNewlines) {
            return;
        }

        // Wait for a moment then process the pasted text to remove newlines.
        Utils_Core.delay(null, 0, () => {
            var text: string = this._getValue();
            text = text.replace(/(?:\r\n|\r|\n)/g, " ");
            this._controlElement.value = text;
            this._flush();
        });
    };

    private getCurrentControlClasses(): string {
        const largeFontClass = this.props.useLargeFont ? " large-font" : "";
        let classes = "plain-text-control" + largeFontClass;

        if (this._formContext && this._formContext.workItem && this.props.controlOptions) {
            const field = this._formContext.workItem.getField(this.props.controlOptions.fieldName);

            if (field) {
                classes = getControlClasses(classes, field, this.props.controlOptions);
            }
        }

        return classes;
    }
}
