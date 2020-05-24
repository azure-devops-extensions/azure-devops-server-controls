/// <reference types="react" />

import * as ReactDOM from "react-dom";
import * as React from "react";

import * as Q from "q";

import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import * as Common from "DistributedTaskControls/Common/Common";
import { ComboLoadingComponent, ComboLoadingHelper } from "DistributedTaskControls/Components/ComboLoadingComponent";
import { FetchingCombo } from "DistributedTaskControls/Components/FetchingCombo";
import { PickListInputUtility } from "DistributedTaskControls/SharedControls/InputControls/Components/PickListInputUtility";

import { getRTLSafeKeyCode, KeyCodes } from "OfficeFabric/Utilities";

import { BaseControl } from "VSS/Controls";
import * as ComboControls from "VSS/Controls/Combos";
import * as Controls_TreeView from "VSS/Controls/TreeView";
import * as Platform_Component from "VSS/Flux/PlatformComponent";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";

export interface IPickListProps {
    selectedValues: string;
    options: IDictionaryStringTo<string>;
    onChanged: (newOption: string) => void;
    properties: IDictionaryStringTo<string>;
    enabled: boolean;
    refreshCallback?: () => IPromise<boolean>;
    ariaLabel?: string;
    ariaLabelledBy?: string;
    ariaDescribedBy?: string;
    ariaRequired?: boolean;
}

export class PickList extends Platform_Component.Component<FetchingCombo, IPickListProps, Platform_Component.State> {

    public componentWillMount() {
        let properties = this.props.properties;
        this._multiSelectType = PickListInputUtility.getMultiSelectType(properties);

        if (properties) {
            if (properties[Common.INPUT_TYPE_PROPERTY_MULTI_SELECT] &&
                properties[Common.INPUT_TYPE_PROPERTY_MULTI_SELECT].toLowerCase() === Common.BOOLEAN_TRUE) {
                this._type = Controls_TreeView.ComboTreeMultivalueBehaviorName;
            } else if (properties[Common.INPUT_TYPE_PROPERTY_MULTI_SELECT_FLATLIST]
                && properties[Common.INPUT_TYPE_PROPERTY_MULTI_SELECT_FLATLIST].toLowerCase() === Common.BOOLEAN_TRUE) {
                this._type = ComboControls.ComboTypeOptionsConstants.MultiValueType;
            }

            if (properties[Common.INPUT_TYPE_PROPERTY_EDITABLE_OPTIONS]
                && properties[Common.INPUT_TYPE_PROPERTY_EDITABLE_OPTIONS].toLowerCase() === Common.BOOLEAN_TRUE) {
                this._editable = true;
            }
        }
    }

    public componentDidMount(): void {
        super.componentDidMount();
        this._updateAriaAttributes();
        if (this.props.options) {
            this.updateSource(this.props.options, this.props.selectedValues, this.props.enabled);
        }
    }

    protected createControl(element: JQuery): FetchingCombo {
        if (!this._control) {
            const pickList = BaseControl.createIn(
                FetchingCombo,
                element,
                {
                    change: (e: JQueryEventObject) => {
                        switch (this._multiSelectType) {
                            case Common.PICKLIST_MULTI_SELECT_TREE_TYPE:
                                let selectedValues: string[] = this._control.getText().split(Common.SemiColonWithSpace) || [];
                                this._setValue((PickListInputUtility.findIds(selectedValues, this._data) || []).join(Common.CommaSeparator));
                                this.props.onChanged(this._getValue());
                                break;
                            case Common.PICKLIST_MULTI_SELECT_FLAT_LIST_TYPE:
                                let selectedKeys: string[] = [];
                                let values: string[] = this._control.getText().split(Common.CommaSeparatorWithSpace) || [];
                                values.forEach((value) => {
                                    let selectedKey: string;
                                    for (let key in this._options) {
                                        if (this._options.hasOwnProperty(key)) {
                                            if (this._options[key] === value.trim()) {
                                                selectedKey = key;
                                                selectedKeys.push(selectedKey);
                                                break;
                                            }
                                        }
                                    }
                                    /* 
                                        If picklist is editable and key is not found, value is inserted as key only if :
                                        - It is not an empty string
                                        - It doesnt end with comma 
                                    */
                                    if (this._editable && (selectedKey === null || selectedKey === undefined) && value.trim() !== Utils_String.empty && value[value.length - 1] !== Common.CommaSeparator) {
                                        selectedKeys.push(value);
                                    }
                                });
                                /*
                                    If picklist is uneditable or we can find keys for all typed in values, we update control with selected keys and fire change event with updated value.
                                    else, we update control with the typed in text and fire change event with empty string (hence showing error)
                                */
                                if (!this._editable || values.length === selectedKeys.length) {
                                    this._setValue(selectedKeys.join(Common.CommaSeparator));
                                    this.props.onChanged(this._getValue());
                                }
                                else {
                                    let selectedValue: string = this._control.getText();
                                    this._setValue(selectedValue);
                                    this.props.onChanged("");
                                }
                                break;
                            default:
                                let selectedValue: string = this._control.getText();
                                let selectedKey: string;
                                for (let key in this._options) {
                                    if (this._options[key] === selectedValue) {
                                        selectedKey = key;
                                    }
                                }
                                if (selectedKey !== null && selectedKey !== undefined) {
                                    this._setValue(selectedKey);
                                }
                                else {
                                    this._setValue(selectedValue);
                                }
                                this.props.onChanged(this._getValue());
                                break;
                        }
                    },
                    type: this._type,
                    refreshData: () => {
                        return this._refreshDataSource();
                    },
                    hasNoResultsSection: true,
                    enabled: this.props.enabled,
                    allowEdit: this._editable,
                    ariaAttributes: {
                        label: this.props.ariaLabel,
                        labelledby: this.props.ariaLabelledBy,
                        describedby: this.props.ariaDescribedBy,
                        required: this.props.ariaRequired
                    },
                    maxAutoExpandDropWidth: 300
                }) as FetchingCombo;

            this._setValue(this.props.selectedValues || Utils_String.empty);
            return pickList;
        }
    }

    public updateSource(options: IDictionaryStringTo<string>, value: string, enabled: boolean): void {
        if (!this._control.isDisposed()) {
            this._data = [];
            this._options = options;

            this._setValue(value);
            this._control.setEnabled(enabled);

            switch (this._multiSelectType) {
                case Common.PICKLIST_MULTI_SELECT_TREE_TYPE:
                    for (let key in options) {
                        if (options.hasOwnProperty(key)) {
                            this._data.push(PickListInputUtility.tryParseJSON(options[key]).jsonObject);
                        }
                    }

                    this._control.setSource(this._data);

                    let selectedValues: string[] = (this._value || this._value === Utils_String.empty) ? this._getValue().split(Common.CommaSeparator) : (this.props.selectedValues.split(Common.CommaSeparator) || []);
                    this._control.setText(PickListInputUtility.findItems(selectedValues, this._data).join(Common.SemiColonWithSpace));
                    break;
                case Common.PICKLIST_MULTI_SELECT_FLAT_LIST_TYPE:
                    let data: string[] = [];
                    for (let key in options) {
                        if (options.hasOwnProperty(key)) {
                            data.push(options[key]);
                        }
                    }
                    data = data.sort(Utils_String.ignoreCaseComparer);
                    this._control.setSource(data);

                    let selectedKeys: string[] = (this._value || this._value === Utils_String.empty) ? this._getValue().split(Common.CommaSeparator) : (this.props.selectedValues.split(Common.CommaSeparator) || []);
                    let values: string[] = [];
                    if (selectedKeys) {
                        selectedKeys.forEach((key) => {
                            if (options.hasOwnProperty(key)) {
                                values.push(options[key]);
                            }
                            // If Picklist is editable, key is pushed as value only if it is not an empty string
                            else if (key !== Utils_String.empty && this._editable) {
                                values.push(key);
                            }
                        });
                    }
                    if (!this._editable || selectedKeys.length === values.length) {
                        this._control.setText(values.join(Common.CommaSeparatorWithSpace));
                    }
                    break;
                default:
                    let dataSource: string[] = [];
                    for (let key in options) {
                        if (options.hasOwnProperty(key)) {
                            dataSource.push(options[key]);
                        }
                    }

                    this._control.setSource(dataSource);

                    let selectedValue: string = (this._value || this._value === Utils_String.empty) ? this._getValue() : (this.props.selectedValues || Utils_String.empty);
                    if (options[selectedValue]) {
                        this._control.setText(options[selectedValue]);
                    }
                    else {
                        this._control.setText(selectedValue);
                    }
                    break;
            }
        }
    }

    private _updateAriaAttributes(): void {
        if (this._control) {
            this._control.getInput().attr({
                "aria-describedby": this.props.ariaDescribedBy
            });
        }
    }

    private _getValue(): string {
        let value = this._value;
        return value ? value : Utils_String.empty;
    }

    private _refreshDataSource(): Q.Promise<boolean> {
        let refreshDeferred = Q.defer<boolean>();
        if (!this.props.refreshCallback) {
            refreshDeferred.resolve(false);
        }
        else {
            let refreshPromise = this.props.refreshCallback();
            if (refreshPromise) {
                refreshPromise.then(() => {
                    refreshDeferred.resolve(true);
                }, (error) => {
                    refreshDeferred.reject(error);
                });
            }
            else {
                refreshDeferred.resolve(true);
            }
        }
        return refreshDeferred.promise;
    }

    private _setValue(value: string) {
        this._value = value;
    }

    private _value: string;
    private _data: Object[] = [];
    private _type: string = ComboControls.ComboTypeOptionsConstants.ListType;
    private _multiSelectType: string;
    private _editable: boolean = false;
    private _options: IDictionaryStringTo<string>;
}