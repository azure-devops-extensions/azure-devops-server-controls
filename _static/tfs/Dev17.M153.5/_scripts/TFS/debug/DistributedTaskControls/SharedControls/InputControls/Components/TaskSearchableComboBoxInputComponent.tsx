/// <reference types="react" />

import * as React from "react";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { ISearchableComboBoxInputProps, SearchableComboBoxInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/SearchableComboBoxInputComponent";
import { InputControlType } from "DistributedTaskControls/SharedControls/InputControls/Common";
import {
    ComboBox,
    ComboBoxInputComponent,
    ComboBoxType,
    IComboBoxDropOptions,
    IProps
} from "DistributedTaskControls/SharedControls/InputControls/Components/ComboBoxInputComponent";

import * as Diag from "VSS/Diag";

import { IInputControlPropsBase } from "DistributedTaskControls/SharedControls/InputControls/Common";
import { TaskInputDefinitionBase as TaskInputDefinition } from "TFS/DistributedTaskCommon/Contracts";

import { Component } from "DistributedTaskControls/Common/Components/Base";
import * as Q from "q";
import { PickListInputUtility, IPickListRefreshOptions } from "DistributedTaskControls/SharedControls/InputControls/Components/PickListInputUtility";
import * as Utils_String from "VSS/Utils/String";

export interface ITaskSearchableComboBoxInputProps extends ISearchableComboBoxInputProps {
    sourceItems: IDictionaryStringTo<string>;
    onDropdownValueChanged?: (newValue: string) => void;
    onOptionsChanged?: (options: IDictionaryStringTo<string>) => void;
    getRefreshOptions?: () => IPickListRefreshOptions;
    inputDefinition: TaskInputDefinition;
    inputControlProps: IInputControlPropsBase<string>;
}

interface ITaskSearchableComboBoxInputStateBase extends Base.IState {
    items: IDictionaryStringTo<string>;
    searchText: string;
}

export class SearchableComboBoxSearchState {
    isMoreDataAvailable: boolean;
}

export class TaskSearchableComboBoxInputComponent extends Component<ITaskSearchableComboBoxInputProps, ITaskSearchableComboBoxInputStateBase> {

    constructor(props: ITaskSearchableComboBoxInputProps) {
        super(props);
    }

    public getType(): string {
        return InputControlType.INPUT_TYPE_PICK_LIST;
    }

    public render(): JSX.Element {
        Diag.logVerbose("[TaskSearchableComboBoxInputComponent.getControl]: Method called.");
        return (
            <SearchableComboBoxInputComponent
                onSearch={this._onCustomSearch}
                onRefresh={this._onRefresh}
                onDropdownOpened={this._onCustomDropdownOpened}
                onCustomValueChanged={this._onCustomValueChanged}
                getSearchButtonState={this._getSearchButtonState}
                updateSelectedValue={this._getSelectedValueDisplayValue}
                {...this.props} />
        );
    }

    private _onRefresh = (): void => {
        if (!!this.props.getRefreshOptions) {
            PickListInputUtility.searchableComboboxOnRefresh(this.props.inputDefinition, this.props.getRefreshOptions(), this._searchState)
                .then((result) => {
                    this.setState({
                        items: result
                    });

                    if (!!this.props.onOptionsChanged) {
                        this.props.onOptionsChanged(result);
                    }
                });
        }
    }

    private _getSelectedValueDisplayValue = (): string => {
        let result = Utils_String.empty;
        if (!!this.state && !!this.state.items) {
            let values = this.state.items;
            if (!!values) {
                for (let key in values) {
                    if (key === this.props.value) {
                        result = values[key].toString();
                    }
                }
            }

            if (!result) {
                result = this.props.value;
            }
        }

        return result;
    }

    private _onCustomSearch = (searchText: string): IPromise<any[]> => {
        let output: string[] = [];
        let q = Q.defer<string[]>();

        if (!!this.props.getRefreshOptions) {
            PickListInputUtility.onSearch(this.props.inputDefinition, this.props.getRefreshOptions(), searchText).then((result) => {
                this._appendItems(result);

                if (!!result) {
                    for (let key in Object.keys(result)) {
                        output.push(result[key]);
                    }
                }

                output.sort((inputOptionA: string, inputOptionB: string) => {
                    return Utils_String.localeIgnoreCaseComparer(inputOptionA, inputOptionB);
                });
                q.resolve(output);
            }, (error) => {
                q.reject(error);
            });
        }

        return q.promise;
    }

    private _onCustomDropdownOpened = (): IPromise<any[]> => {
        let output: string[] = [];
        let q = Q.defer<string[]>();
        //let refreshOptionsUpdated: boolean = JSON.stringify(this.taskInputToValueMap) !== JSON.stringify(!!this.props.getRefreshOptions && this.props.getRefreshOptions().taskInputToValueMap);
        let refreshOptionsUpdated: boolean = !!this.dependentInputs && !!this.dependentInputs["project"] && this.dependentInputs["project"] !== this.props.getRefreshOptions().taskInputToValueMap["project"];
        if (!!this.props.getRefreshOptions && (!this.state.items || Object.keys(this.state.items).length === 0 || refreshOptionsUpdated)) {
            let refreshOptions = this.props.getRefreshOptions();

            if (!this.dependentInputs) {
                this.dependentInputs = {};
            }

            this.dependentInputs["project"] = refreshOptions.taskInputToValueMap["project"];
            PickListInputUtility.searchableComboboxOnRefresh(this.props.inputDefinition, refreshOptions, this._searchState)
                .then((result) => {
                    this.setState({
                        items: result
                    });

                    if (!!result) {
                        for (let key in result) {
                            output.push(result[key].toString());
                        }
                    }

                    output.sort((inputOptionA: string, inputOptionB: string) => {
                        return Utils_String.localeIgnoreCaseComparer(inputOptionA, inputOptionB);
                    });
                    q.resolve(output);
                }, (error) => {
                    q.reject(error);
                });
        }
        else {
            for (let key in this.state.items) {
                output.push(this.state.items[key].toString());
            }

            q.resolve(output);
        }

        return q.promise;
    }

    private _onCustomValueChanged = (newValue: string) => {
        let result = Utils_String.empty;

        if (!!this.state.items) {
            for (let key in this.state.items) {
                if (this.state.items[key] === newValue) {
                    result = key;
                }
            }
        }

        if (!!result && !!this.props.onDropdownValueChanged) {
            this.props.onDropdownValueChanged(result);
        }
    }

    private _getSearchButtonState = (): SearchableComboBoxSearchState => {
        return this._searchState;
    }

    private _appendItems(newItems: IDictionaryStringTo<string>): void {

        if (!newItems) {
            return;
        }

        let updatedItems: IDictionaryStringTo<string> = this.state.items;

        for (let key in newItems) {
            if (!updatedItems.hasOwnProperty(key)) {
                updatedItems[key] = newItems[key];
            }
        }

        this.setState({
            items: updatedItems
        });
    }

    private clone(obj) {
        let copy;
        if (null == obj || "object" !== typeof obj) {
            return obj;
        }

        if (obj instanceof Object) {
            copy = {};
            for (let attr in obj) {
                if (obj.hasOwnProperty(attr)) {
                    copy[attr] = this.clone(obj[attr]);
                }
            }
            return copy;
        }

        throw new Error("Unable to copy obj! Its type isn't supported.");
    }

    private dependentInputs: {};
    private _searchState: SearchableComboBoxSearchState = { isMoreDataAvailable: false };
}