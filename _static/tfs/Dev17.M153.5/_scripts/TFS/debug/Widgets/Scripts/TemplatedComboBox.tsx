import * as React from "react";

import * as ArrayUtils from "VSS/Utils/Array";
import { IComboBoxOption, IComboBoxProps, ComboBox, IComboBox } from "OfficeFabric/ComboBox";
import { BaseComponent, IBaseProps, autobind } from "OfficeFabric/Utilities";

import { LoaderAdornment } from 'Analytics/Scripts/Controls/LoaderAdornment';

/**
 * Templated Combo Box is for use with flat-lists of artifacts supplied from Analytics or Op-store
 */
export interface ITemplatedComboBoxProps<T> extends IBaseProps<IComboBox> {
    className: string;
    itemsLoaded: boolean;
    items: T[];
    /**
     * Describes the items being passed in. 
     */
    itemToComboBoxOption: (item: T) => IComboBoxOption;
    
    /**
     * An instance from the items list specifying which, if any item is selected.
     */
    selectedItem?: T;

    errorMessage?: string;
    disabled?: boolean;
    onChanged: (projectId: string) => void;
    
    label?: string;
    ariaLabel?: string;
    placeholder?: string;
}

/**
 * A simplified flat-list Fabric combo-box geared for routine use in Analytics/Widget Config scenarios.
 */
export class TemplatedComboBox<T> extends BaseComponent<ITemplatedComboBoxProps<T>> {

    @autobind
    private onSelectionChanged(option: IComboBoxOption, index: number, value: string) {
        const key: string = (option != null) ? option.key as string : undefined;
        if (this.props.onChanged)
            this.props.onChanged(key);
    }

    render(): JSX.Element {
        const options: IComboBoxOption[] = this.props.items ? this.props.items.map((item) => { return this.props.itemToComboBoxOption(item); }) : [];

        const comboProps: IComboBoxProps = {
            className: this.props.className,
            componentRef: this.props.componentRef,
            allowFreeform: false,
            autoComplete: "on",
            options: options,
            errorMessage: this.props.errorMessage,
            disabled: this.props.disabled || !this.props.itemsLoaded,
            onChanged: this.onSelectionChanged,
            useComboBoxAsMenuWidth: true,
            ariaLabel: this.props.ariaLabel,
            label: this.props.ariaLabel
        } as IComboBoxProps;


        if (this.props.selectedItem != null && this.props.itemsLoaded) {
            let selectedItemKey = this.props.itemToComboBoxOption(this.props.selectedItem).key;
            if (selectedItemKey != null) {
                comboProps.selectedKey = selectedItemKey;
            }
        }

        return (
            <LoaderAdornment className={this.props.className} isLoading={!this.props.itemsLoaded}>
                <ComboBox {...comboProps} />
            </LoaderAdornment>
        );
    }
}
