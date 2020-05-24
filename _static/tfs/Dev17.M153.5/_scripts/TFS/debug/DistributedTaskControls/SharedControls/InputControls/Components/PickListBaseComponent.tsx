/// <reference types="react" />

import * as React from "react";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import * as Common from "DistributedTaskControls/Common/Common";
import { IPickListInputProps, PickListInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/PickListInputComponent";
import { TaskStoreUtility } from "DistributedTaskControls/Components/Task/TaskStoreUtility";
import { TaskSearchableComboBoxInputComponent, ITaskSearchableComboBoxInputProps } from "DistributedTaskControls/SharedControls/InputControls/Components/TaskSearchableComboBoxInputComponent";
import { InputControlType } from "DistributedTaskControls/SharedControls/InputControls/Common";
import {
    ComboBoxType,
    IComboBoxDropOptions
} from "DistributedTaskControls/SharedControls/InputControls/Components/ComboBoxInputComponent";

import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { Component } from "DistributedTaskControls/Common/Components/Base";
import { IGetInputControlArgument } from "DistributedTaskControls/Components/Task/TaskInputControlFactory";

import { PickListInputUtility, IPickListRefreshOptions } from "DistributedTaskControls/SharedControls/InputControls/Components/PickListInputUtility";
import * as Utils_String from "VSS/Utils/String";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import * as Diag from "VSS/Diag";

import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import * as Utils_UI from "VSS/Utils/UI";

export interface IPickListBaseProps extends Base.IProps {
    args: IGetInputControlArgument;
}

export class PickListBaseComponent extends Component<IPickListBaseProps, Base.IState> {
    constructor(props: IPickListBaseProps) {
        super(props);
    }

    public render(): JSX.Element {
        Diag.logVerbose("[PickListBaseComponent.getControl]: Method called.");
        let isSearchable = DtcUtils.isTaskInputSearchable(this.props.args.inputDefinition);
        let isSearchFeatureEnabled = FeatureAvailabilityService.isFeatureEnabled(Common.FeatureFlag_PickListSearchEnabled, false);
        let inputControl: JSX.Element = null;

        if (isSearchFeatureEnabled && isSearchable) {
            let inputControlProps: ITaskSearchableComboBoxInputProps = this._getSearchableDropdownProps(this.props.args);
            inputControl = (<TaskSearchableComboBoxInputComponent key={this.props.args.inputDefinition.name} aria-label={this.props.args.inputControlProps.label} {...inputControlProps} />);
        } else {
            let pickListInputControlProps: IPickListInputProps = this._getPickListInputControlProps(this.props.args);
            return inputControl = (<PickListInputComponent key={this.props.args.inputDefinition.name} {...pickListInputControlProps} />);
        }

        return inputControl;
    }

    private _getPickListInputControlProps(args: IGetInputControlArgument): IPickListInputProps {
        return JQueryWrapper.extend(args.inputControlProps, {
            options: args.inputControlProps.inputOptions,
            properties: args.inputDefinition.properties,
            enableRefresh: PickListInputUtility.enableRefresh(args.inputDefinition, args.controllerStore.getDataSourceBindings(), args.controllerStore.getSourceDefinitions()),
            onRefresh: () => { return PickListInputUtility.onRefresh(args.inputDefinition, TaskStoreUtility.getPickListRefreshOptions(args.inputDefinition, args.controllerStore)); },
            enableManage: PickListInputUtility.enableManageLink(args.inputDefinition, args.controllerStore.getDataSourceBindings(), args.controllerStore.getSourceDefinitions()),
            onManageClick: () => { return PickListInputUtility.onManageLink(args.inputDefinition, args.controllerStore.getDataSourceBindings(), args.controllerStore.getSourceDefinitions()); }
        });
    }

    private _getSearchableDropdownProps(args: IGetInputControlArgument): ITaskSearchableComboBoxInputProps {
        let comboDropOptions: IComboBoxDropOptions = { maxRowCount: Utils_UI.BrowserCheckUtils.isEdge() && window.screen.availHeight <= 640 ? 5 : undefined };
        let comboBoxType: ComboBoxType = ComboBoxType.Editable;
        let props: ITaskSearchableComboBoxInputProps = JQueryWrapper.extend(args.inputControlProps, {
            label: args.inputControlProps.label,
            infoProps: args.inputControlProps.infoProps,
            maxAutoExpandDropWidth: this._maxDropdownWidth,
            value: args.inputControlProps.value,
            allowEdit: true,
            comboBoxType: comboBoxType,
            compareInputToItem: (key: any, compareText: any, matchPartial: boolean): number => {
                //compareInputToItem is called in two cases:
                if (matchPartial) {
                    //1. To compare the searchText with dropdown options, with matchPartial set true, in this case we should return caseInsensitiveContains
                    if (Utils_String.caseInsensitiveContains(key, compareText)) {
                        return 0;
                    }
                    return -1;
                }
                else {
                    //2. To fetch the selected index, with matchPartial undefined, in this case we should return localeIgnoreCaseComparer
                    return Utils_String.localeIgnoreCaseComparer(key, compareText);
                }
            },
            enabled: !args.inputControlProps.disabled,
            errorMessage: args.inputControlProps.getErrorMessage(args.inputControlProps.value),
            required: args.inputControlProps.required,
            hideErrorMessage: args.inputControlProps.disabled,
            comboBoxDropOptions: comboDropOptions,
            source: [],
            inputDefinition: args.inputDefinition,
            inputControlProps: args.inputControlProps,
            getRefreshOptions: () => { return TaskStoreUtility.getPickListRefreshOptions(args.inputDefinition, args.controllerStore); },
            onDropdownValueChanged: (selectedValue: string) => { args.inputControlProps.onValueChanged(selectedValue); }
        });

        return props;
    }

    private _maxDropdownWidth: number = 588;
}