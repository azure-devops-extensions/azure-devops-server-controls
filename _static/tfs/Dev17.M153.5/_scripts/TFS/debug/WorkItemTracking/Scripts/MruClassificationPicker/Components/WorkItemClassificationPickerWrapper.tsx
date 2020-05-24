import * as React from "react";
import { MruClassificationPicker, IMruClassificationPickerProps } from "WorkItemTracking/Scripts/MruClassificationPicker/Components/MruClassificationPicker";
import { autobind, css } from "OfficeFabric/Utilities";
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { Field, FieldDefinition, WorkItem, IWorkItemChangedArgs } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { IContainedFieldControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/Interfaces";
import { WorkItemChangeType } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { INode } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import { WorkItemControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl";
import { equals } from "VSS/Utils/String";
import { WIFormCIDataHelper } from "WorkItemTracking/Scripts/Utils/WIFormCIDataHelper";

export interface IWorkItemClassificationPickerWrapperProps {
    componentRef?: (ref: IContainedFieldControl) => void;
    allowEmpty?: boolean;
    field: FieldDefinition;
    onChange: () => void;
    workItemControl: WorkItemControl;
}

export interface IWorkItemClassificationPickerWrapperState {
    workItem: WorkItem;
    selectedValue: string;
    tree: INode;
    readOnly?: boolean;
    invalid?: boolean;
}

/**
 * React wrapper for work item classification picker component
 */
export class WorkItemClassificationPickerWrapper extends React.Component<IWorkItemClassificationPickerWrapperProps, IWorkItemClassificationPickerWrapperState> implements IContainedFieldControl {
    private static _itemHeight = 24;
    private static _itemIndentWidth = 10;

    private _classificationPicker: MruClassificationPicker;

    constructor(props: IWorkItemClassificationPickerWrapperProps) {
        super(props);

        this.state = {
            workItem: null,
            selectedValue: "",
            tree: null
        };
    }

    /**
     * When the component receives new props, update the componentRef.
     */
    public componentWillReceiveProps(newProps?: IWorkItemClassificationPickerWrapperProps, newContext?: any): void {
        this._updateComponentRef(this.props, newProps);
    }

    /**
     * When the component has mounted, update the componentRef.
     */
    public componentDidMount(): void {
        this._updateComponentRef(undefined, this.props);
    }

    public render(): JSX.Element {
        if (!this.state.workItem) {
            return null;
        }

        const classNames = css("workitem-classification-picker", { "invalid": this.state.invalid }, { "readonly": this.state.readOnly });
        return <MruClassificationPicker
                    componentRef={this._resolveClassificationPicker}
                    containerClassName={classNames}
                    calloutClassName="workitem-classification-picker-dropdown"
                    dropdownItemHeight={WorkItemClassificationPickerWrapper._itemHeight}
                    dropdownItemIndentWidth={WorkItemClassificationPickerWrapper._itemIndentWidth}
                    fieldRefName={this.props.field.referenceName}
                    aria-label={this.props.field.name}
                    label={this.props.field.name}
                    projectId={this.state.workItem.project.guid}
                    selectedValue={this.state.selectedValue}
                    readOnly={this.state.workItem.isReadOnly() || this.state.readOnly}
                    onValueSelected={this._onValueSelected}
                    showSelectedDate={false}
                    maxLength={Math.min(this.props.workItemControl._options.maxLength || WorkItem.MAX_TITLE_LENGTH, WorkItem.MAX_TITLE_LENGTH)}
                    visibleItemCount={12}
                    updateMruOnSelection={false}
                    selectedInputId={this.props.workItemControl._options.controlId + "_txt"}  // need to set this id because the work item control label's "for" attribute is set to this id.
                    tree={this.state.tree} />;
    }

    @autobind
    private _resolveClassificationPicker(classificationPicker: MruClassificationPicker): void {
        this._classificationPicker = classificationPicker;
    }

    public getValue(): string {
        return this.state.selectedValue;
    }

    public invalidate(flushing: boolean, field: Field): void {
        const witControl = this.props.workItemControl;

        if (field) {
            const invalid = this.props.allowEmpty ? !field.isValidValueOrEmpty() : !field.isValid();
            if (!flushing) {
                const readOnly = witControl.isReadOnly();
                const text = witControl._getFieldTextValue(field);
                this.setValue(text);
                this.setInvalid(invalid);
                this.setEnabled(!readOnly);
            } else {
                this.setInvalid(invalid);
            }
        } else {
            this.clear();
            this.setEnabled(false);
        }
    }

    public clear(): void {
        this.setState({ selectedValue: "" });
    }

    public setInvalid(invalid: boolean): void {
        this.setState({ invalid: invalid });
    }

    public setEnabled(enabled: boolean): void {
        this.setState({ readOnly: !enabled });
    }

    public setValue(value: string): void {
        this.setState({ selectedValue: value || "" });
    }

    public onBind(workItem: WorkItem): void {
        if (!this.state.tree && !workItem.isReadOnly()) {
            this._fetchTree(workItem);
        }
        this.setState({ workItem: workItem });
        workItem.attachWorkItemChanged(this._onWorkItemChanged);
    }

    public onUnbind(): void {
        if (this.state.workItem) {
            this.state.workItem.attachWorkItemChanged(this._onWorkItemChanged);
            this.setState({ workItem: null });
        }
    }

    public confirmEdit(): boolean {
        if (this._classificationPicker) {
            return this._classificationPicker.confirmEdit();
        }

        return false;
    }

    public hideDropdown(): boolean {
        if (this._classificationPicker) {
            return this._classificationPicker.hideDropdown();
        }

        return false;
    }

    public onResize(): void {
        this.hideDropdown();
    }

    @autobind
    private _onWorkItemChanged(workitem: WorkItem, eventData: IWorkItemChangedArgs) {
        if (eventData && eventData.change === WorkItemChangeType.PreSave) {
            this.hideDropdown();
        }
    }

    private _fetchTree(workItem: WorkItem) {
        workItem.project.nodesCacheManager.beginGetNodes().then(() => {
            let tree: INode;
            if (equals(this.props.field.referenceName, CoreFieldRefNames.AreaPath, true)) {
                tree = workItem.project.nodesCacheManager.getAreaNode(true);
            } else {
                tree = workItem.project.nodesCacheManager.getIterationNode(true);
            }

            this.setState({ tree: tree });
        }, () => this.setState({ tree: null }));
    }

    @autobind
    private _onValueSelected(value: string, node?: INode, isSuggestedValue?: boolean) {
        this.setState({ selectedValue: value }, () => {
            this.props.onChange();
        });

        // publish the telemetry
        WIFormCIDataHelper.classificationPickerValueChanged(value, isSuggestedValue, this.props.field.referenceName);
    }

    private _updateComponentRef(currentProps: IWorkItemClassificationPickerWrapperProps, newProps: IWorkItemClassificationPickerWrapperProps): void {
        if ((!currentProps && newProps.componentRef) ||
            (currentProps && currentProps.componentRef !== newProps.componentRef)) {

            if (currentProps && currentProps.componentRef) {
                currentProps.componentRef(null);
            }

            if (newProps.componentRef) {
                newProps.componentRef(this);
            }
        }
    }
}
