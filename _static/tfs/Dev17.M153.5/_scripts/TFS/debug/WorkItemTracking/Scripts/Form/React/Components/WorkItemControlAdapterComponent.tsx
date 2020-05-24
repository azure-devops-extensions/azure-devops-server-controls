import Q = require("q");
import React = require("react");

import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import * as FormLayout from "WorkItemTracking/Scripts/Form/Layout";
import { WorkItemControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl";
import { WorkItemBindableComponent } from "WorkItemTracking/Scripts/Form/React/Components/WorkItemBindableComponent";
import { WorkItemLabel } from "WorkItemTracking/Scripts/Controls/WorkItemForm/LabelControl";
import { beginGetWorkItemControl, IWorkItemControlType, IWorkItemControlTypeReact, RenderType } from "WorkItemTracking/Scripts/ControlRegistration";
import { getService } from "VSS/Events/Services";
import { FormEvents } from "WorkItemTracking/Scripts/Form/Events";

import { autobind, css } from "OfficeFabric/Utilities";

export interface IControlWrapperComponentProps extends React.Props<IControlWrapperComponentProps> {
    isReadonly: boolean;
    isHidden: boolean;
    isValid: boolean;
}

export const ControlWrapperComponent: React.StatelessComponent<IControlWrapperComponentProps> = (props: IControlWrapperComponentProps) => {
    const { isHidden, isReadonly, isValid } = props;

    return <div className={css("control-wrapper", {
        "hidden-control": isHidden
    })}>
        <div className={css("control", {
            "invalid": !isValid,
            "readonly-control": isReadonly
        })}>
            {props.children}
        </div>
    </div>;
};

export interface IWorkItemControlWrapperProps {
    control: FormLayout.ILayoutControl;

    /** Id of the form page this control is placed on */
    pageId: string;
}

/** Work item control wrapper */
export class WorkItemControlAdapterComponent<TProps extends IWorkItemControlWrapperProps = IWorkItemControlWrapperProps> extends WorkItemBindableComponent<TProps, {}> {
    protected _controlElement: HTMLElement;
    protected _resolveControlElement = (element: HTMLElement) => this._controlElement = element;

    protected _labelElement: HTMLElement;
    protected _resolveLabelElement = (element: HTMLElement) => this._labelElement = element;

    protected _labelControl: WorkItemLabel;
    protected _control: WorkItemControl;

    protected _controlType: IWorkItemControlType | IWorkItemControlTypeReact;
    protected _controlRenderType: RenderType | null;

    public componentDidMount() {
        super.componentDidMount();

        this._createWrappedControl();

        getService().attachEvent(FormEvents.LayoutResizedEvent(this._formContext.formViewId), this._layoutResizedHandler);
        getService().attachEvent(FormEvents.PageActivated(this._formContext.formViewId, this.props.pageId), this._pageActivatedHandler);
    }

    public componentWillUnmount() {
        super.componentWillUnmount();

        if (this._control) {
            this._control.dispose();
            this._control = null;
        }

        if (this._labelControl) {
            this._labelControl = null;
        }

        getService().detachEvent(FormEvents.LayoutResizedEvent(this._formContext.formViewId), this._layoutResizedHandler);
        getService().detachEvent(FormEvents.PageActivated(this._formContext.formViewId, this.props.pageId), this._pageActivatedHandler);
    }

    public render(): JSX.Element {
        const control = this._renderReactControl();

        return <ControlWrapperComponent isValid={this._isValid()} isReadonly={this._isReadOnly()} isHidden={this._isHidden()}>
            <div className="workitemcontrol work-item-control" ref={this._resolveControlElement}>
                {control}
            </div>
        </ControlWrapperComponent>;
    }

    @autobind
    private _layoutResizedHandler() {
        if (this._control) {
            this._control.onResize();
        }
    }

    @autobind
    private _pageActivatedHandler() {
        if (this._control) {
            this._control.onResize();
        }
    }

    /** Override to modify the wrapped control creation */
    protected _createWrappedControl() {
        if (!this._controlType) {
            beginGetWorkItemControl(this.props.control.controlType, result => {
                this._controlType = result.controlType;
                this._controlRenderType = result.renderType;

                this._createControl();
                this._createLabelControl();
                this._tryBind();
            });
        }
    }

    protected _renderLabel(): JSX.Element {
        let hideLabel = this.props.control.controlOptions.hideLabel || this.props.control.hideLabel;
        if (!hideLabel) {
            return <div className="workitemlabel label-control" ref={this._resolveLabelElement}></div>;
        }

        return null;
    }

    protected _renderReactControl(additionalProps?: any): JSX.Element {
        if (this._controlRenderType === RenderType.React) {
            const ControlType = this._controlType as IWorkItemControlTypeReact;

            const props = $.extend(
                true,
                {
                    controlOptions: this.props.control.controlOptions
                },
                additionalProps);

            return <ControlType {...props} />;
        }
    }

    protected _createControl(): void {
        if (this._controlRenderType === RenderType.JQuery) {
            this._control = new (this._controlType as IWorkItemControlType)(
                $(this._controlElement),
                $.extend({ fieldName: this.props.control.controlOptions.refName }, this.props.control.controlOptions),
                this._formContext.workItemType);
        }
        else {
            this.forceUpdate();
        }
    }

    /** Create work item label control */
    protected _createLabelControl(extraControlOptions?: any): void {
        if (!this.props.control.controlOptions.hideLabel) {
            let tempTarget;
            this._labelControl = new WorkItemLabel(
                $(this._labelElement),
                $.extend(tempTarget, extraControlOptions, this.props.control.controlOptions),
                this._formContext.workItemType);
        }
    }

    /** @override */
    protected _bind(workItem: WITOM.WorkItem, isDisabledView?: boolean) {
        if (this._control) {
            this._control.bind(workItem, isDisabledView);
        }

        this._subscribeToWorkItemFieldChanges(this.props.control.controlOptions.fieldName);
    }

    /** @override */
    protected _unbind() {
        if (this._control) {
            this._control.unbind();
        }
    }

    protected _isHidden(): boolean {
        return this.props.control.controlOptions.hideWhenReadOnlyAndEmpty && this._isReadOnly() && this._isEmpty();
    }

    protected _isReadOnly(): boolean {
        let isFieldReadonly = false;

        const field = this._getField();
        if (field) {
            isFieldReadonly = field.isReadOnly();
        }

        const isControlReadonly = this.props.control.readonly;

        return isControlReadonly || isFieldReadonly;
    }

    protected _isEmpty(): boolean {
        const field = this._getField();
        if (field) {
            const fieldValue = field.getValue();
            return fieldValue === undefined || fieldValue === null || fieldValue === "";
        }

        return true;
    }

    protected _isValid(): boolean {
        const field = this._getField();
        return !field || field.isValid();
    }

    protected _getFieldName(): string {
        const fieldDef = this._getFieldDefinition();
        return fieldDef ? fieldDef.name : "";
    }

    protected _getFieldDefinition(): WITOM.FieldDefinition {
        if (this._formContext.workItemType && this.props.control.controlOptions && this.props.control.controlOptions.fieldName) {
            return this._formContext.workItemType.getFieldDefinition(this.props.control.controlOptions.fieldName);
        }

        return null;
    }

    protected _getField(): WITOM.Field {
        if (this._formContext.workItem && this.props.control.controlOptions && this.props.control.controlOptions.fieldName) {
            return this._formContext.workItem.getField(this.props.control.controlOptions.fieldName);
        }

        return null;
    }
}
