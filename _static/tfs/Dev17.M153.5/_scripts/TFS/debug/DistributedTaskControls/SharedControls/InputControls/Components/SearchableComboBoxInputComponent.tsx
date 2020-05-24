/// <reference types="react" />

import * as React from "react";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { InputBase } from "DistributedTaskControls/SharedControls/InputControls/Components/InputComponentBase";
import {
    IInputControlPropsBase,
    IInputControlStateBase,
    InputControlType
} from "DistributedTaskControls/SharedControls/InputControls/Common";
import {
    ComboBox,
    ComboBoxInputComponent,
    ComboBoxType,
    IComboBoxDropOptions,
    IProps
} from "DistributedTaskControls/SharedControls/InputControls/Components/ComboBoxInputComponent";

import { SearchableComboBoxSearchState } from "DistributedTaskControls/SharedControls/InputControls/Components/TaskSearchableComboBoxInputComponent";
import { IconButton, CommandButton, IButton } from "OfficeFabric/Button";
import { Icon } from "OfficeFabric/Icon";
import { Async, css } from "OfficeFabric/Utilities";

import { Combo as ComboControl, IComboOptions, IComboDropOptions, BaseComboBehavior } from "VSS/Controls/Combos";
import * as Diag from "VSS/Diag";
import * as Platform_Component from "VSS/Flux/PlatformComponent";
import * as Controls from "VSS/Controls";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_UI from "VSS/Utils/UI";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/SharedControls/InputControls/Components/SearchableComboBoxInputComponent";

export interface ISearchableComboBoxInputProps extends IProps {
    showSearchButton?: boolean;
    onSearch: (searchText: string) => IPromise<boolean | any[]>;
    onDropdownOpened?: () => IPromise<any[]>;
    getSearchButtonState?: () => SearchableComboBoxSearchState;
    onCustomValueChanged?: (selectedValue: string) => void;
    updateSelectedValue?: () => string;
    onRefresh?: () => void;
}

export class SearchableComboBoxInputComponent extends InputBase<string, ISearchableComboBoxInputProps, IInputControlStateBase<string>> {

    public getType(): string {
        return InputControlType.INPUT_TYPE_SEARCHABLE_COMBO_BOX;
    }

    protected getControl(): JSX.Element {
        Diag.logVerbose("[SearchableComboBoxInputComponent.getControl]: Method called.");

        return (
            <SearchableComboBoxInputComponentBase
                ref={this._resolveRef("_searchableComboBox")}
                ariaDescribedBy={this.props.ariaDescribedBy || this.getInputFieldDescriptionElementId()}
                {...this.props} />
        );
    }

    public getBehavior(): BaseComboBehavior {
        return this._searchableComboBox.getBehavior();
    }

    public getDropButton(): JQuery {
        return this._searchableComboBox.getDropButton();
    }

    private _searchableComboBox: SearchableComboBoxInputComponentBase;
}

export interface ISearchableComboBoxInputStateBase extends Base.IState {
    items: any[];
    loadInProgress: boolean;
    searchEnabled: boolean;
    searchInProgress: boolean;
    errorMessage: string;
    searchText: string;
    text: string;
    showErrorMessage: boolean;
}

export class SearchableComboBoxInputComponentBase extends Base.Component<ISearchableComboBoxInputProps, ISearchableComboBoxInputStateBase> {

    constructor(props: ISearchableComboBoxInputProps) {
        super(props);

        this.state = {
            items: this.props.source.slice(),
            loadInProgress: false,
            searchEnabled: false,
            searchInProgress: false,
            errorMessage: this.props.errorMessage,
            searchText: Utils_String.empty,
            text: this.props.value,
            showErrorMessage: false
        };
    }

    public componentDidMount() {
        this._mounted = true;
        this._refreshIfRequired();
    }

    public componentWillUnmount(): void {
        this._mounted = false;
    }

    public componentWillReceiveProps(newProps: ISearchableComboBoxInputProps) {
        if (this._mounted) {
            this.setState({
                items: (!newProps.source || newProps.source.length === 0) ? this.state.items : newProps.source.slice(),
                errorMessage: !!newProps.errorMessage ? newProps.errorMessage : Resources.SearchableComboGuidance,
                text: !!this.props.updateSelectedValue ? this.props.updateSelectedValue() : newProps.value
            });
        }
    }

    public render(): JSX.Element {
        let searchIconClassName: string = this.state.searchInProgress ? "bowtie-icon bowtie-spinner" : "searchable-comboBox-search-icon";
        let searchButtonIconName: string = css({ "Search": !this.state.searchInProgress });
        return (
            <div>
                <div className="searchable-comboBox-container">
                    <div className="searchable-comboBox-dropdown">
                        <ComboBoxInternal
                            ref={this._resolveRef("_comboBox")}
                            label={this.props.label}
                            infoProps={this.props.infoProps}
                            key={this.props.key}
                            maxAutoExpandDropWidth={this.props.maxAutoExpandDropWidth}
                            value={this.state.text}
                            allowEdit={this.props.allowEdit}
                            comboBoxType={this.props.comboBoxType}
                            compareInputToItem={this.props.compareInputToItem}
                            enabled={this.props.enabled}
                            required={this.props.required}
                            hideErrorMessage={!this.state.showErrorMessage}
                            source={this.state.items}
                            onValueChanged={this._onValueChanged}
                            errorMessage={this.state.errorMessage}
                            aria-label={this.props.ariaLabel}
                            isCaseSensitive={this.props.isCaseSensitive}
                            comboBoxDropOptions={this.props.comboBoxDropOptions}
                            onValidation={this.props.onValidation}
                            dropShow={this._onDropShow} />
                    </div>
                    <div className="input-control-buttons">
                        {
                            (this.props.showSearchButton !== false) &&
                            <IconButton
                                disabled={!this.state.searchEnabled}
                                onClick={this._onSearchClick}
                                iconProps={{
                                    iconName: searchButtonIconName,
                                    className: searchIconClassName
                                }}
                                className={css("input-control-icon-button", "fabric-style-overrides", "icon-button-override")}
                                ariaLabel={Resources.SearchInputText}
                                ariaDescription={Utils_String.localeFormat(Resources.SearchInputDescription, this.props.label)}
                                aria-disabled={!this.props.enabled} />
                        }
                    </div>
                </div>
            </div>
        );
                    }

    private _refreshIfRequired = (): void => {
        if (!!this.props.onRefresh) {
            this.props.onRefresh();
        }
    }

    public getBehavior(): BaseComboBehavior {
        return this._comboBox.getBehavior();
    }

    public getDropButton(): JQuery {
        return this._comboBox.getDropButton();
    }

    private _onValueChanged = (value: string): void => {
        let enableSearch: boolean = !!value;
        let hideErrorMessage: boolean;
        let errMsg: string = Utils_String.empty;
        hideErrorMessage = this.state.items.some((item) => {
            return Utils_String.equals(item, value);
        });

        if (!hideErrorMessage) {
            errMsg = this.props.getSearchButtonState().isMoreDataAvailable ? Resources.SearchableComboGuidance : Resources.RequiredInputErrorMessage ;
        }

        this.setState({
            text: value,
            searchEnabled: this.props.getSearchButtonState().isMoreDataAvailable && enableSearch,
            showErrorMessage: !hideErrorMessage,
            errorMessage: !!errMsg ? errMsg : this.state.errorMessage
        }, () => {
            if (!!this.props.onCustomValueChanged) {
                this.props.onCustomValueChanged(value);
            }
            else if (!!this.props.onValueChanged) {
                this.props.onValueChanged(value);
            }
        });
    }

    private _onSearchClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
        let searchText = this.state.text;
        if (this._mounted) {
            this.setState({
                searchInProgress: true,
                searchText: searchText
            });
        }

        this.props.onSearch(searchText).then((results: boolean | any[]) => {
            if (typeof results === "boolean") {
                this._handleSearchCompletion(results);
            }
            else {
                let found: boolean = !!results && results.length > 0;
                if (found) {
                    this._appendItems(results);
                }
                else {
                    this._handleSearchCompletion(found);
                }
            }
        }, (error) => {
            this._handleSearchCompletion(false);
        });
    }

    private _onDropShow = (popup: any): void => {
        if (!this.state.loadInProgress && !!this.props.onDropdownOpened) {
            this.setState({
                loadInProgress: true
            });

            this.props.onDropdownOpened().then((results: any[]) => {
                if (!!results) {
                    this.setState({
                        items: results.slice()
                    }, () => this.getBehavior().showDropPopup());

                    let enableSearch = !!this.props.getSearchButtonState && this.props.getSearchButtonState().isMoreDataAvailable;
                    this.setState({
                        loadInProgress: false,
                        searchEnabled: enableSearch
                    });
                }
            });
        }
    }

    private _handleSearchCompletion(found: boolean): void {
        if (this._mounted) {
            let errMsg: string = Utils_String.empty;
            let text: string = this.state.searchText;

            if (found) {
                if (!this.state.searchText) {
                    errMsg = !!this.props.errorMessage ? this.props.errorMessage : Resources.SearchableComboGuidance;
                }
            }
            else {
                errMsg = Utils_String.localeFormat(Resources.SearchableComboSearchFailed, this.state.searchText);
            }

            this.setState({
                searchInProgress: false,
                errorMessage: errMsg,
                text: text
            });

            this.getDropButton().click();
        }
    }

    private _appendItems(newItems: any[]): void {
        let updatedItems: any[] = this.state.items.slice();
        newItems.forEach((newItem: any) => {
            if (!Utils_Array.first(this.state.items, item => this.props.compareInputToItem(item, newItem, false) === 0)) {
                updatedItems.push(newItem);
            }
        });

        this.setState({
            items: updatedItems
        }, () => { this._handleSearchCompletion(true); });
    }

    private _comboBox: ComboBoxInternal;
    private _mounted: boolean;
}

class ComboBoxInternal extends ComboBox {
    constructor(props: IProps) {
        super(props);
    }

    public reapplyFilter(newValue: string): void {
        if (!!newValue) {
            this._control.getInput().trigger(jQuery.Event("keyup", { keyCode: newValue.charCodeAt(0) }));
        }
    }
}