/// <reference types="react" />

import * as React from "react";

import { ServiceEndpointType } from "DistributedTasksCommon/ServiceEndpoints/ServiceEndpoint.Common";
import { TaskSearchableComboBoxInputComponent, ITaskSearchableComboBoxInputProps } from "DistributedTaskControls/SharedControls/InputControls/Components/TaskSearchableComboBoxInputComponent";
import { PickListBaseComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/PickListBaseComponent";
import * as Common from "DistributedTaskControls/Common/Common";
import { Singleton } from "DistributedTaskControls/Common/Factory";
import { IdentityUtils } from "DistributedTaskControls/Common/IdentityUtils";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { IInputControllerStore } from "DistributedTaskControls/Common/Types";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { TaskStoreUtility } from "DistributedTaskControls/Components/Task/TaskStoreUtility";
import { InputControlType, IInputControlPropsBase } from "DistributedTaskControls/SharedControls/InputControls/Common";
import { IAzureConnectionInputControlProps, AzureConnectionInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/AzureConnectionInputComponent";
import { IAzureResourceManagerInputProps, AzureResourceManagerInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/AzureResourceManagerInputComponent";
import { BooleanInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/BooleanInputComponent";
import { IConnectedServiceInputProps, ConnectedServiceInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/ConnectedServiceInputComponent";
import { MultilineInputWithEditorExtensionComponent, ITaskMultilineInputProps } from "DistributedTaskControls/SharedControls/InputControls/Components/MultilineInputWithEditorExtensionComponent";
import { IPickListInputProps, PickListInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/PickListInputComponent";
import { IRadioInputControlProp, RadioInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/RadioInputComponent";
import { StringListInputComponent, IStringListInputComponentProps } from "DistributedTaskControls/SharedControls/InputControls/Components/StringListInputComponent";
import { StringInputWithEditorExtensionComponent, IStringInputWithEditorExtensionComponentProps } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputWithEditorExtensionComponent";
import { ConnectedServiceComponentUtility } from "DistributedTaskControls/SharedControls/InputControls/Components/ConnectedServiceComponentUtility";
import { IFilePathInputComponentProps, FilePathInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/FilePathInputComponent";
import { IdentityPickerInputComponent, IIdentitityPickerProps } from "DistributedTaskControls/SharedControls/InputControls/Components/IdentityPickerInputComponent";
import { PickListInputUtility } from "DistributedTaskControls/SharedControls/InputControls/Components/PickListInputUtility";
import { SecureFileInputComponent, ISecureFileInputProps } from "DistributedTaskControls/SharedControls/InputControls/Components/SecureFileInputComponent";
import { DeploymentGroupInputComponent } from "DistributedTaskControls/Phase/Components/DeploymentGroupInputComponent";
import { QueryControlInputComponent, IQueryControlProps } from "DistributedTaskControls/SharedControls/InputControls/Components/QueryControlInputComponent";

import { IComboBoxDropOptions, ComboBoxType, IProps } from "DistributedTaskControls/SharedControls/InputControls/Components/ComboBoxInputComponent";

import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { TaskInputDefinitionBase as TaskInputDefinition } from "TFS/DistributedTaskCommon/Contracts";

import { IChoiceGroupOption } from "OfficeFabric/ChoiceGroup";

import * as Context from "VSS/Context";
import * as Diag from "VSS/Diag";
import { IEntity } from "VSS/Identities/Picker/RestClient";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_UI from "VSS/Utils/UI";

export interface IGetInputControlArgument {
    inputDefinition: TaskInputDefinition;
    inputControlProps: IInputControlPropsBase<string>;
    controllerStore: IInputControllerStore;
}

export class TaskInputControlFactory extends Singleton {

    public static instance(): TaskInputControlFactory {
        return super.getInstance<TaskInputControlFactory>(TaskInputControlFactory);
    }

    public getInputControl(args: IGetInputControlArgument): JSX.Element {
        let inputControl: JSX.Element = null;

        let inputType = DtcUtils.getTaskInputType(args.inputDefinition);

        switch (inputType) {
            case InputControlType.INPUT_TYPE_FILE_PATH.toLowerCase():
            case InputControlType.INPUT_TYPE_ARTIFACT_PATH.toLowerCase():
                let filePathInputControlProps = this._getFilePathInputControlProps(args);
                inputControl = (<FilePathInputComponent key={args.inputDefinition.name} {...filePathInputControlProps} />);
                break;

            case InputControlType.INPUT_TYPE_BOOLEAN.toLowerCase():
                let booleanInputControlProps: IInputControlPropsBase<boolean> = JQueryWrapper.extend({}, args.inputControlProps);
                booleanInputControlProps.value = DtcUtils.getBoolValue(args.inputControlProps.value);
                booleanInputControlProps.onValueChanged = (newValue: boolean) => {
                    args.inputControlProps.onValueChanged(newValue.toString());
                };

                inputControl = (<BooleanInputComponent key={args.inputDefinition.name} {...booleanInputControlProps} />);
                break;

            case InputControlType.INPUT_TYPE_AZURE_CONNECTION.toLowerCase():
                let azureConnectionInputControlProps: IAzureConnectionInputControlProps = this._getAzureConnectionInputControlProps(args);
                inputControl = (<AzureConnectionInputComponent key={args.inputDefinition.name} {...azureConnectionInputControlProps} />);
                break;

            case InputControlType.INPUT_TYPE_CONNECTED_SERVICE.toLowerCase():
                inputControl = this._getConnectedServiceComponent(args);
                break;

            case InputControlType.INPUT_TYPE_RADIO.toLowerCase():
                let radioInputControlProps: IRadioInputControlProp = JQueryWrapper.extend({}, this._getRadioInputControlProps(args));
                radioInputControlProps.onValueChanged = (newValue: IChoiceGroupOption) => {
                    args.inputControlProps.onValueChanged(newValue.key);
                };

                inputControl = (<RadioInputComponent key={args.inputDefinition.name} {...radioInputControlProps} />);
                break;

            case InputControlType.INPUT_TYPE_PICK_LIST.toLowerCase():
                inputControl = (<PickListBaseComponent key={args.inputDefinition.name} args={args} />);
                break;

            case InputControlType.INPUT_TYPE_MULTI_LINE.toLowerCase():
                let multilineInputControlProps = this._getStringOrMultilineInputControlProps(args);
                inputControl = (<MultilineInputWithEditorExtensionComponent key={args.inputDefinition.name} {...multilineInputControlProps as ITaskMultilineInputProps} />);
                break;

            case InputControlType.INPUT_TYPE_SECURE_FILE.toLowerCase():
                let secureFileInputProps: ISecureFileInputProps = this._getSecureFileInputProps(args);
                inputControl = <SecureFileInputComponent key={args.inputDefinition.name} {...secureFileInputProps} />;
                break;

            case InputControlType.INPUT_TYPE_STRING_LIST.toLowerCase():
                let stringListInputComponentProps: IStringListInputComponentProps = this._getStringListInputComponentProps(args);
                inputControl = (<StringListInputComponent key={args.inputDefinition.name} {...stringListInputComponentProps} />);
                break;

            case InputControlType.INPUT_TYPE_IDENTITIES.toLowerCase():
                let identityPickerComponentProps: IIdentitityPickerProps = this._getIdentityPickerComponentProps(args);
                inputControl = (<IdentityPickerInputComponent key={args.inputDefinition.name} {...identityPickerComponentProps} />);
                break;

            case InputControlType.INPUT_TYPE_DEPLOYMENT_GROUP.toLowerCase():
                let deploymentGroupInputControlProps = this._getDeploymentGroupInputControlProps(args);
                inputControl = (<DeploymentGroupInputComponent key={args.inputDefinition.name} {...deploymentGroupInputControlProps} />);
                break;

            case InputControlType.INPUT_TYPE_QUERY_CONTROL.toLowerCase():
                let queryControlComponentProps: IQueryControlProps = this._getQueryControlComponentProps(args);
                inputControl = (<QueryControlInputComponent key={args.inputDefinition.name} {...queryControlComponentProps} />);
                break;

            default:
                let stringInputControlProps = this._getStringOrMultilineInputControlProps(args);
                inputControl = (<StringInputWithEditorExtensionComponent key={args.inputDefinition.name} {...stringInputControlProps as IStringInputWithEditorExtensionComponentProps} isMultilineExpandable={true} rows={1} />);
                break;
        }

        return inputControl;
    }

    private _getConnectedServiceComponent(args: IGetInputControlArgument) {
        let type = ConnectedServiceComponentUtility.getConnectedServiceType(args.inputDefinition);

        if (Utils_String.ignoreCaseComparer(type, ServiceEndpointType.AzureRM) === 0
            && Context.getPageContext().webAccessConfiguration.isHosted) {

            let azureResourceManagerInputControlProps: IAzureResourceManagerInputProps = this._getAzureResourceManagerInputControlProps(args);
            return (<AzureResourceManagerInputComponent key={args.inputDefinition.name} {...azureResourceManagerInputControlProps} />);
        }
        else {
            let connectedServiceInputControlProps: IConnectedServiceInputProps = this._getConnectedServiceInputControlProps(args);
            return (<ConnectedServiceInputComponent key={args.inputDefinition.name} {...connectedServiceInputControlProps} />);
        }
    }

    private _getSecureFileInputProps(args: IGetInputControlArgument): ISecureFileInputProps {
        return args.inputControlProps as ISecureFileInputProps;
    }

    private _getIdentityPickerComponentProps(args: IGetInputControlArgument): IIdentitityPickerProps {
        return JQueryWrapper.extend(args.inputControlProps, {
            multiIdentitySearch: true,
            onSelectedIdentitiesChanged: (users: IEntity[]) => {
                args.inputControlProps.onValueChanged(IdentityUtils.getUserIdsAsJSONString(users));
            },
            value: IdentityUtils.convertJsonArrayIdentitiesStringToSemicolonSeperatedString(args.inputControlProps.value)
        }) as IIdentitityPickerProps;
    }

    private _getQueryControlComponentProps(args: IGetInputControlArgument): IQueryControlProps {
        return JQueryWrapper.extend(args.inputControlProps, {
            onSelectedQueryChanged: (value: string) => {
                args.inputControlProps.onValueChanged(value);
            },
            value: args.inputControlProps.value
        }) as IQueryControlProps;
    }

    private _getFilePathInputControlProps(argument: IGetInputControlArgument): IFilePathInputComponentProps {
        const taskContext = argument.controllerStore.getTaskContext();
        let filePathProviderDelegate = null;
        if (taskContext.taskDelegates) {
            filePathProviderDelegate = taskContext.taskDelegates.filePathPickerDelegate;
        }

        return JQueryWrapper.extend(argument.inputControlProps, {
            isFileSystemBrowsable: taskContext.isFileSystemBrowsable,
            filePathProviderDelegate: filePathProviderDelegate
        }) as IFilePathInputComponentProps;
    }

    private _getAzureConnectionInputControlProps(args: IGetInputControlArgument): IAzureConnectionInputControlProps {
        return JQueryWrapper.extend(args.inputControlProps, {
            options: args.inputDefinition.options,
            onOptionsChanged: (newOptions: IDictionaryStringTo<string>) => {
                args.inputControlProps.onOptionsChanged(newOptions);
            },
            instanceId: this._getInstanceId(args)
        });
    }

    private _getAzureResourceManagerInputControlProps(args: IGetInputControlArgument): IAzureResourceManagerInputProps {

        if (!args.inputControlProps.infoProps) {
            args.inputControlProps.infoProps = { calloutContentProps: {} };
        }
        //Making a custom note for the Azure RM Task input 
        args.inputControlProps.infoProps.calloutContentProps.calloutMarkdown =
            this._prepareMarkdownWithNote(args.inputControlProps.infoProps.calloutContentProps.calloutMarkdown, Resources.AzureRMInputComponentNote);

        return JQueryWrapper.extend(args.inputControlProps, {
            properties: args.inputDefinition.properties,
            authSchemes: ConnectedServiceComponentUtility.getConnectedServiceAuthSchemes(args.inputDefinition),
            instanceId: this._getInstanceId(args)
        });
    }

    /* Brief:
    ** This function concats Task Input Markdown with a Custom Note
    */
    private _prepareMarkdownWithNote(markdown: string, note: string): string {
        return markdown ? markdown.concat("<br /> <br />", note) : Utils_String.empty;
    }

    private _getConnectedServiceInputControlProps(args: IGetInputControlArgument): IConnectedServiceInputProps {
        return JQueryWrapper.extend(args.inputControlProps, {
            options: args.inputControlProps.inputOptions,
            properties: args.inputDefinition.properties,
            connectedServiceType: ConnectedServiceComponentUtility.getConnectedServiceType(args.inputDefinition),
            authSchemes: ConnectedServiceComponentUtility.getConnectedServiceAuthSchemes(args.inputDefinition),
            instanceId: this._getInstanceId(args)
        });
    }

    private _getStringOrMultilineInputControlProps(args: IGetInputControlArgument) {
        return JQueryWrapper.extend(args.inputControlProps, {
            properties: args.inputDefinition.properties,
            inputDefinition: args.inputDefinition,
            getAllInputValues: () => {
                Diag.Debug.assertIsNotUndefined(args.controllerStore.getInputToResolvedValueMap, "Function should be implemented by controller store.");
                return args.controllerStore.getInputToResolvedValueMap ? args.controllerStore.getInputToResolvedValueMap() : null;
            },
            taskDelegates: args.controllerStore.getTaskContext().taskDelegates,
            disabled: this._isDisabled(args)
        });
    }

    private _isDisabled(args: IGetInputControlArgument): boolean {
        let properties = args.inputDefinition.properties;
        if (!args.inputControlProps.disabled && (properties && properties[Common.INPUT_TYPE_PROPERTY_DISABLED] && properties[Common.INPUT_TYPE_PROPERTY_DISABLED].toLowerCase() === Common.BOOLEAN_TRUE)) {
            return true;
        }
        return args.inputControlProps.disabled;
    }

    private _getDeploymentGroupInputControlProps(args: IGetInputControlArgument) {
        return JQueryWrapper.extend(args.inputControlProps, {
            properties: args.inputDefinition.properties
        });
    }

    private _getRadioInputControlProps(args: IGetInputControlArgument): IRadioInputControlProp {
        let options: IChoiceGroupOption[] = [];

        for (let optionKey in args.inputDefinition.options) {
            if (args.inputDefinition.options.hasOwnProperty(optionKey)) {
                options.push({
                    key: optionKey,
                    text: args.inputDefinition.options[optionKey],
                    checked: (Utils_String.ignoreCaseComparer(optionKey, args.inputControlProps.value) === 0),
                    disabled: args.inputControlProps.disabled
                } as IChoiceGroupOption);
            }
        }

        return JQueryWrapper.extend(args.inputControlProps, {
            options: options
        });
    }

    private _getStringListInputComponentProps(args: IGetInputControlArgument): IStringListInputComponentProps {
        return JQueryWrapper.extend(args.inputControlProps, {
            disallowResetDelimitedString: () => { return args.controllerStore.isDirty(); }
        });
    }

    private _getInstanceId(args: IGetInputControlArgument): string {
        return Utils_String.format("{0}-{1}", args.inputControlProps.instanceId, args.inputDefinition.name);
    }
}
