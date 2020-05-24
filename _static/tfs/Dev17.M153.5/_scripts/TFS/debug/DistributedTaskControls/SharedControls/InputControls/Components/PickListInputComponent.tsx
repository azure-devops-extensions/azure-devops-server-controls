// Adding V2 version of PickListInputComponent which will take items as an array instead of a delimiter separated string.
// NewPicklistDropdown consumers should use PickListV2InputComponent component instead of PickListInputComponent.
// useNewPickListDropdown related code changes should be removed after sprint 143 (Compat Handling) 
// TODO: mdakbar

/// <reference types="react" />

import * as React from "react";
import * as Q from "q";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { InputBase } from "DistributedTaskControls/SharedControls/InputControls/Components/InputComponentBase";
import {
    IInputControlPropsBase,
    IInputControlStateBase,
    InputControlType
} from "DistributedTaskControls/SharedControls/InputControls/Common";
import { PickList } from "DistributedTaskControls/Components/PickList";
import { PickListDropdown } from "DistributedTaskControls/SharedControls/InputControls/Components/PickListDropdown";
import { Component as RequiredIndicator } from "DistributedTaskControls/SharedControls/InputControls/Components/RequiredIndicator";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import * as Common from "DistributedTaskControls/Common/Common";

import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";
import * as Diag from "VSS/Diag";

import { IconButton, CommandButton } from "OfficeFabric/Button";
import { css } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/FabricStyleOverrides";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/ComboBox";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/SharedControls/InputControls/Components/InputComponentBase";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/SharedControls/InputControls/Components/PickListInputComponent";

export interface IPickListInputProps extends IInputControlPropsBase<string> {
    properties: IDictionaryStringTo<string>;
    options: IDictionaryStringTo<string>;
    onOptionsChanged?: (options: IDictionaryStringTo<string>) => void;
    enableRefresh?: boolean;
    onRefresh?: () => IPromise<IDictionaryStringTo<string>>;
    enableManage?: boolean;
    onManageClick?: () => void;
    useNewPickListDropdown?: boolean;
    pickListInputClassName?: string;
    /**
     * Show select all option. This is only applicable 
     * if useNewPickListDropdown is true
     */
    showSelectAll?: boolean;

    /**
     * Optional method to pass if user wants to modify
     * the way picklist items will be shown. This is only applicable
     * if useNewPickListDropdown is true
     */
    getPickListItems?: (options: IDictionaryStringTo<string>) => string[];
}

export interface IPickListInputBaseProps extends IPickListInputProps {
    onChanged: (newOption: string) => void;
    getErrorMessage: () => string | PromiseLike<string>;
}

export interface IPickListInputBaseState {
    optionsMap: IDictionaryStringTo<string>;
    value: string;
    showLoadingIcon?: boolean;
}

export class PickListInputComponent extends InputBase<string, IPickListInputProps, IInputControlStateBase<string>> {

    public getType(): string {
        return InputControlType.INPUT_TYPE_PICK_LIST;
    }

    protected getControl(): JSX.Element {
        Diag.logVerbose("[PickListInputComponent.getControl]: Method called.");

        return (
            <PickListInputBaseComponent
                properties={this.props.properties}
                value={this.state.value}
                label={this.props.label}
                onChanged={this.onValueChanged}
                getErrorMessage={this._getErrorMessage}
                options={this.props.options}
                disabled={this.props.disabled}
                enableRefresh={this.props.enableRefresh}
                onRefresh={this.props.onRefresh}
                enableManage={this.props.enableManage}
                onManageClick={this.props.onManageClick}
                onOptionsChanged={this.props.onOptionsChanged}
                ariaLabelledBy={this.props.ariaLabelledBy || this.getInputFieldLabelElementId()}
                ariaDescribedBy={this.props.ariaDescribedBy || this.getInputFieldDescriptionElementId()}
                ariaLabel={this.props.ariaLabel}
                useNewPickListDropdown={this.props.useNewPickListDropdown}
                pickListInputClassName={this.props.pickListInputClassName}
                required={this.props.required}
                onNotifyValidationResult={this.props.onNotifyValidationResult}
                showSelectAll={this.props.showSelectAll}
                getPickListItems={this.props.getPickListItems} />

        );
    }

    private _getErrorMessage = () => {
        return this.getErrorMessage(this.getInputValue());
    }
}

export class PickListInputBaseComponent extends Base.Component<IPickListInputBaseProps, IPickListInputBaseState> {

    constructor(props: IPickListInputBaseProps) {
        super(props);

        this.state = {
            value: props.value || Utils_String.empty,
            optionsMap: props.options || {},
        };
    }

    public componentDidMount(): void {
        super.componentDidMount();
        this._refreshIfRequired();
    }

    public componentWillReceiveProps(newProps: IPickListInputBaseProps): void {
        this.setState({
            value: newProps.value || Utils_String.empty,
            optionsMap: newProps.options || {}
        });
    }

    public render(): JSX.Element {
        let refreshIconClassName: string = this.state.showLoadingIcon ? "bowtie-icon bowtie-spinner" : "picklist-refresh-icon";
        let refreshButtonIconName: string = css({ "Refresh": !this.state.showLoadingIcon });
        let useNewPicklist: boolean = this._useNewPickListDropdown();
        let picklistContainerClass: string = css("picklist-container", {"legacy-picklist" : !useNewPicklist});
        return (
            <div className= {picklistContainerClass}>
                <div className="picklist-dropdown">
                    <RequiredIndicator value={this.state.value} onGetErrorMessage={this._getErrorMessage} onNotifyValidationResult={this.props.onNotifyValidationResult} >
                        {useNewPicklist ? this._getNewPickListDropdown() : this._getPickList()}
                    </RequiredIndicator>
                </div>
                {
                    <div className="input-control-buttons">
                        {
                            this.props.enableRefresh && !this.props.disabled &&
                            <IconButton
                                disabled={this.props.disabled}
                                onClick={(event: React.MouseEvent<HTMLButtonElement>) => this._onRefreshClick(event)}
                                iconProps={{
                                    iconName: refreshButtonIconName,
                                    className: refreshIconClassName
                                }}
                                className={css("input-control-icon-button", "fabric-style-overrides", "icon-button-override", "disabled-button-fix")}
                                ariaLabel={Resources.Refresh}
                                ariaDescription={Utils_String.localeFormat(Resources.RefreshInputDescription, this.props.label)}
                                aria-disabled={this.props.disabled} />
                        }
                        {
                            this.props.enableManage && this._getManageButton()
                        }
                    </div>
                }
            </div>
        );
    }

    private _getManageButton() {
        let properties = this.props.properties;
        let manageButtonName = properties && properties[Common.INPUT_TYPE_PROPERTY_MANAGE_BUTTON_NAME];
        let manageIcon = properties && properties[Common.INPUT_TYPE_PROPERTY_MANAGE_ICON] || "Settings";
        return (manageButtonName ?
            <CommandButton
                disabled={this.props.disabled}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => this._onManageClick(event)}
                iconProps={{ iconName: manageIcon }}
                className={css("input-control-icon-button", "fabric-style-overrides", "command-button-override")}
                ariaLabel={Resources.Manage}
                ariaDescription={Utils_String.localeFormat(Resources.ManageInputDescription, this.props.label)}
                aria-disabled={this.props.disabled} >
                {manageButtonName}
            </CommandButton>
            :
            <IconButton
                disabled={this.props.disabled}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => this._onManageClick(event)}
                iconProps={{ iconName: manageIcon }}
                className={css("input-control-icon-button", "fabric-style-overrides", "icon-button-override", "disabled-button-fix")}
                ariaLabel={Resources.Manage}
                ariaDescription={Utils_String.localeFormat(Resources.ManageInputDescription, this.props.label)}
                aria-disabled={this.props.disabled} />);
    }

    private _getPickList(): JSX.Element {
        if (!this._pickList) {
            this._pickList = (
                <div className="input-control-dropdown input-field-picklist">
                    <PickList
                        key="pick-list-component"
                        ref={(elem) => {
                            this._pickListControl = elem;
                        }}
                        selectedValues={this.state.value}
                        refreshCallback={this._refreshIfRequired}
                        properties={this.props.properties}
                        onChanged={this._onChanged}
                        enabled={!this.props.disabled}
                        options={this.state.optionsMap}
                        ariaLabel={this.props.ariaLabel}
                        ariaLabelledBy={this.props.ariaLabelledBy}
                        ariaDescribedBy={this.props.ariaDescribedBy}
                        ariaRequired={this.props.required} />
                </div >
            );
        }
        else {
            this._pickListControl.updateSource(this.state.optionsMap, this.state.value, !this.props.disabled);
        }

        return this._pickList;
    }

    private _getNewPickListDropdown(): JSX.Element {

        return (<div className="input-control-dropdown input-field-picklist">
             <PickListDropdown
                selectedValues={this.state.value}
                properties={this.props.properties}
                onChanged={this._onChanged}
                options={this.state.optionsMap}
                cssClass={this.props.pickListInputClassName}
                ariaLabel={this.props.ariaLabel}
                ariaDescribedBy={this.props.ariaDescribedBy}
                showSelectAll={this.props.showSelectAll}
                getPickListItems={this.props.getPickListItems} />
        </div >);
    }

    private _useNewPickListDropdown(): boolean {
        let multiSelectProp = this.props.properties && this.props.properties[Common.INPUT_TYPE_PROPERTY_MULTI_SELECT];
        if (multiSelectProp && multiSelectProp.toLowerCase() === Common.BOOLEAN_TRUE) {
            // New dropdown does not support tree structure yet so use old dropdown only
            return false;
        }
        return !!this.props.useNewPickListDropdown;
    }

    private _onRefreshClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
        this._onRefresh(event);
        Utils_Core.delay(this, 500, () => {
            if (!this._optionsRefreshed) {
                this.setState({ showLoadingIcon: true } as IPickListInputBaseState);
            }
        });
    }

    private _onRefresh = (event: React.MouseEvent<HTMLButtonElement>): void => {
        this._optionsRefreshed = false;
        this.props.onRefresh().then((optionsMap: IDictionaryStringTo<string>) => {
            this._optionsRefreshed = true;
            this.setState({ showLoadingIcon: false } as IPickListInputBaseState);
            if (this.props.onOptionsChanged) {
                this.props.onOptionsChanged(optionsMap);
            }
        }, (error) => {
            this._optionsRefreshed = true;
            this.setState({ showLoadingIcon: false } as IPickListInputBaseState);
        });
    }

    private _onManageClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        if (this.props.onManageClick) {
            this.props.onManageClick();
        }
    }

    private _onChanged = (newOption: string): void => {
        if (this.props.onChanged) {
            this.props.onChanged(newOption);
        }
    }

    private _getErrorMessage = () => {
        if (this.props.getErrorMessage) {
            return this.props.getErrorMessage();
        }
    }

    private _refreshIfRequired = (): IPromise<boolean> => {
        let refreshDeferred = Q.defer<boolean>();

        if (this.props.onRefresh &&
            this.state.optionsMap && Object.keys(this.state.optionsMap).length === 0) {

            this.props.onRefresh().then((optionsMap: IDictionaryStringTo<string>) => {
                if (this.props.onOptionsChanged) {
                    this.props.onOptionsChanged(optionsMap);
                }
                refreshDeferred.resolve(true);

            }, (error) => {
                refreshDeferred.reject(error);
            });
        }
        else {
            refreshDeferred.resolve(true);
        }

        return refreshDeferred.promise;
    }

    private _pickListControl: PickList;
    private _pickList: JSX.Element;
    private _optionsRefreshed: boolean = false;
}