/// <reference types="react" />

import * as React from "react";
import { getStatesStore, StatesStore } from "WorkCustomization/Scripts/Stores/WorkItemType/StatesStore";
import { Component } from "VSS/Flux/Component";
import { autobind } from "OfficeFabric/Utilities";
import { WorkItemStateResultModel } from "TFS/WorkItemTracking/ProcessContracts";
import { IDropdownOption, IDropdownProps, Dropdown } from "OfficeFabric/Dropdown";
import { StateOption, StateTitle } from "WorkCustomization/Scripts/Common/Components/Inputs/StatesDropdown.Components";
import { Props, State } from "VSS/Flux/Component";
import { SelectableOptionMenuItemType } from "OfficeFabric/utilities/selectableOption/SelectableOption.types";
import { getDropdownSelectedKey } from "WorkCustomization/Scripts/Utils/DropdownUtils";
import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");

export interface IStatesDropdownProps extends Props {
    value?: string;
    onValueChange?: (value: string) => void;
    processId: string;
    witRefName: string;
    disabled?: boolean;
}

export interface IStatesDropdownState extends State {
    states: WorkItemStateResultModel[];
    nameToStateDictionary: IDictionaryStringTo<WorkItemStateResultModel>;
}

export class StatesDropdown extends Component<IStatesDropdownProps, IStatesDropdownState>{
    public render(): JSX.Element {
        let dropdownProps: IDropdownProps = this._getDropdownProps();
        return <Dropdown {...dropdownProps} />;
    }

    protected getState(): IStatesDropdownState {
        let store: StatesStore = this.getStore();
        return {
            states: store.getStates(this.props.processId, this.props.witRefName),
            nameToStateDictionary: store.getNameToStateDictionary(this.props.processId, this.props.witRefName)
        };
    }

    protected getStore(): StatesStore {
        return getStatesStore();
    }

    private _getDropdownProps(): IDropdownProps {
        let options: IDropdownOption[] = getStatesDropdownOptions(this.state.states);

        let dropdownProps: IDropdownProps = {
            options: options,
            onChanged: this._onChange,
            required: true,
            id: this.props.disabled + "" + this.props.value,
            placeHolder: Resources.StateDropdownPlaceholder,
            onRenderTitle: this._onRenderTitle,
            onRenderOption: this._onRenderOption,
            disabled: this.props.disabled,
            ariaLabel: Resources.StateDropdownLabel,
            selectedKey: getDropdownSelectedKey(options, this.props.value)
        }

        return dropdownProps;
    }

    @autobind
    private _onRenderTitle(items: IDropdownOption[]): JSX.Element {
        if (items !== null && items.length > 0) {
            let props = this.state.nameToStateDictionary[items[0].text];
            return <StateTitle {...props} />;
        }
        return null;
    }

    @autobind
    private _onRenderOption(item: IDropdownOption): JSX.Element {
        let props = this.state.nameToStateDictionary[item.text];
        return <StateOption {...props} />;
    }

    @autobind
    private _onChange(option: IDropdownOption): void {
        if (this.props.onValueChange) {
            this.props.onValueChange(option.key.toString());
        }
    }
}

export const getStatesDropdownOptions = (states: WorkItemStateResultModel[]): IDropdownOption[] => {
    let options: IDropdownOption[] = states.map((s: WorkItemStateResultModel) => {
        return {
            key: s.name,
            text: s.name,
            itemType: SelectableOptionMenuItemType.Normal
        };
    });

    return options;
}