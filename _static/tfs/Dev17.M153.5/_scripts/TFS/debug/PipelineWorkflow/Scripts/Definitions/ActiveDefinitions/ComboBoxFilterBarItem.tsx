import * as React from "react";

import { ISelectableOption } from "OfficeFabric/Utilities/selectableOption/SelectableOption.types";
import { autobind, IRenderFunction } from "OfficeFabric/Utilities";
import { IComboBox, ComboBox, IComboBoxOption, IComboBoxProps } from "OfficeFabric/ComboBox";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import { FilterBarItem, IFilterBarItemState, IFilterBarItemProps } from "VSSUI/FilterBarItem";

import { ComboBoxInputComponent, ComboBoxType } from "DistributedTaskControls/SharedControls/InputControls/Components/ComboBoxInputComponent";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

export interface IComboBoxFilterBarItemProps extends IFilterBarItemProps {
    options: IComboBoxOption[];

    defaultSelectedKey?: string | number;

    selectedKey?: string | number;

    onMenuOpen?: () => void;

    onResolveOptions?: (options: IComboBoxOption[]) => IComboBoxOption[] | PromiseLike<IComboBoxOption[]>;

    onRenderOption?: IRenderFunction<ISelectableOption>;

    allowFreeform?: boolean;

    autoComplete?: "on" | "off";

    value?: string;

    useComboBoxAsMenuWidth?: boolean;

    label?: string;

    className?: string;

    ariaLabel?: string;

    disabled?: boolean;

    required?: boolean;

    errorMessage?: string;
}

export interface IComboBoxFilterBarItemState extends IFilterBarItemState<IComboBoxOption> {
}

export class ComboBoxFilterBarItem extends FilterBarItem<IComboBoxOption, IComboBoxFilterBarItemProps, IComboBoxFilterBarItemState> {

    public constructor(props) {
        super(props);
    }

    public focus(): void {
        if (this._comboBox.current) {
            this._comboBox.current.focus();
        }
    }

    public render(): JSX.Element {
        let selectedKey = (this.state.value && this.state.value.key) || this.props.defaultSelectedKey;

        const comboProps: IComboBoxProps = {
            options: this.props.options,
            selectedKey: selectedKey,
            onChanged: this._onSelectionChanged,
            onMenuOpen: this.props.onMenuOpen,
            onResolveOptions: this.props.onResolveOptions,
            onRenderOption: this.props.onRenderOption,
            allowFreeform: this.props.allowFreeform,
            autoComplete: this.props.autoComplete,
            useComboBoxAsMenuWidth: this.props.useComboBoxAsMenuWidth,
            label: this.props.label,
            className: this.props.className,
            ariaLabel: this.props.ariaLabel,
            disabled: this.props.disabled,
            required: this.props.required,
            errorMessage: this.props.errorMessage
        };

        return <ComboBox
            ref={this._comboBox}
            {...comboProps}
        />;
    }

    // When 'allowFreeform' is 'true' and the text entered doesn't match any entries in the dropdown,
    // 'option' will be undefined and the text entered value be part of 'value'
    @autobind
    private _onSelectionChanged(option?: IComboBoxOption, index?: number, value?: string) {
        let selectedOption: IComboBoxOption = option || { key: undefined, text: value } as IComboBoxOption;
        if (option.key !== this.props.defaultSelectedKey) {
            this.setFilterValue({ value: option });
        }
        else {
            this.setFilterValue({ value: null });
        }
    }

    private _comboBox = React.createRef<ComboBox>();
}
