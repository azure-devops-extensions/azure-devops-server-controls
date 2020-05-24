import "VSS/LoaderPlugins/Css!MruClassificationPicker/Components/FieldsFilterClassificationPickerWrapper";

import * as React from "react";
import { MruClassificationPicker, IMruClassificationPickerProps } from "WorkItemTracking/Scripts/MruClassificationPicker/Components/MruClassificationPicker";
import { autobind, css } from "OfficeFabric/Utilities";
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { Field, FieldDefinition } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { INode } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import { equals } from "VSS/Utils/String";

export interface IFieldsFilterClassificationPickerWrapperProps {
    componentRef?: (ref: FieldsFilterClassificationPickerWrapper) => void;
    field: FieldDefinition;
    onChange: () => void;
    projectId: string;
    inputAriaLabel?: string;
    skipPathTruncation?: boolean;
}

export interface IFieldsFilterClassificationPickerWrapperState {
    selectedValue: string;
    tree: INode | INode[];
    disabled?: boolean;
    invalid?: boolean;
    isInputFocused?: boolean;
}

/**
 * React wrapper for work item classification picker component
 */
export class FieldsFilterClassificationPickerWrapper extends React.Component<IFieldsFilterClassificationPickerWrapperProps, IFieldsFilterClassificationPickerWrapperState> {
    private static readonly _itemHeight = 24;
    private static readonly _itemIndentWidth = 10;

    private _classificationPicker: MruClassificationPicker;

    constructor(props: IFieldsFilterClassificationPickerWrapperProps) {
        super(props);

        this.state = {
            selectedValue: "",
            tree: null,
            isInputFocused: false
        };        
    }

    /**
     * When the component receives new props, update the componentRef.
     */
    public componentWillReceiveProps(newProps?: IFieldsFilterClassificationPickerWrapperProps, newContext?: any): void {
        this._updateComponentRef(this.props, newProps);
    }

    /**
     * When the component has mounted, update the componentRef.
     */
    public componentDidMount(): void {
        this._updateComponentRef(undefined, this.props);
    }

    public render(): JSX.Element {        
        if (!this.state.tree) {
            return null;
        }

        const classNames = css("fields-filter-classification-picker", this.state.invalid ? "invalid" : "");
        const { projectId, field, inputAriaLabel } = this.props;

        return <div className="fields-filter-classification-picker-container">
            <MruClassificationPicker
                componentRef={this._resolveClassificationPicker}
                containerClassName={classNames}
                calloutClassName="fields-filter-classification-picker-dropdown"
                dropdownItemHeight={FieldsFilterClassificationPickerWrapper._itemHeight}
                dropdownItemIndentWidth={FieldsFilterClassificationPickerWrapper._itemIndentWidth}
                fieldRefName={field.referenceName}
                projectId={projectId}
                selectedValue={this.state.selectedValue}
                disabled={this.state.disabled}
                showSelectedDate={false}
                onValueSelected={this._onValueSelected}
                visibleItemCount={12}
                updateMruOnSelection={false}
                aria-label={inputAriaLabel}
                tree={this.state.tree} 
                skipPathTruncation={this.props.skipPathTruncation}/>
            </div>;
    }

    @autobind
    private _resolveClassificationPicker(classificationPicker: MruClassificationPicker): void {
        this._classificationPicker = classificationPicker;
    }

    public getValue(): string {
        return this.state.selectedValue;
    }

    public setInvalid(invalid: boolean): void {
        this.setState({ invalid: invalid });
    }

    public setEnabled(enabled: boolean): void {
        this.setState({ disabled: !enabled });
    }

    public setValue(value: string): void {
        this.setState({ selectedValue: value || "" });
    }

    public hideDropdown(): boolean {
        if (this._classificationPicker) {
            return this._classificationPicker.hideDropdown();
        } 

        return false;
    }

    public confirmEdit(): boolean {
        if (this._classificationPicker) {
            return this._classificationPicker.confirmEdit();
        }

        return false;
    }

    public onResize(): void {
        this.hideDropdown();       
    }

    public setTree(tree: INode | INode[]) {
        this.setState({ tree: tree });
    }

    @autobind
    private _onValueSelected(value: string, node?: INode, isSuggestedValue?: boolean) {
        this.setState({ selectedValue: value }, () => {
            this.props.onChange();
        });
    }

    private _updateComponentRef(currentProps: IFieldsFilterClassificationPickerWrapperProps, newProps: IFieldsFilterClassificationPickerWrapperProps): void {
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