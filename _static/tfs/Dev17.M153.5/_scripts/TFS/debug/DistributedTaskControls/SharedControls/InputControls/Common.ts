/**
 *  Common types and interfaces for Input Controls
 */

import { IProps, IState } from "DistributedTaskControls/Common/Components/Base";
import { ICalloutContentProps } from "DistributedTaskControls/Components/CalloutComponent";

/**
 * @brief Supported input control types
 */
export namespace InputControlType {
    /**
     * IMPORTANT: Please keep all values in lowercase
     */
    export const INPUT_TYPE_FILE_PATH: string = "filepath";
    export const INPUT_TYPE_ARTIFACT_PATH: string = "artifactpath";
    export const INPUT_TYPE_BOOLEAN: string = "boolean";
    export const INPUT_TYPE_AZURE_CONNECTION: string = "azureconnection";
    export const INPUT_TYPE_RADIO: string = "radio";
    export const INPUT_TYPE_PICK_LIST: string = "picklist";
    export const INPUT_TYPE_PICK_LIST_V2: string = "picklistV2";
    export const INPUT_TYPE_MULTI_LINE: string = "multiline";
    export const INPUT_TYPE_STRING_LIST: string = "stringlist";
    export const INPUT_TYPE_STRING: string = "string";
    export const INPUT_TYPE_AZURE_RESOURCE_MANAGER: string = "azureresourcemanager";
    export const INPUT_TYPE_CONNECTED_SERVICE: string = "connectedservice";
    export const INPUT_TYPE_COMBO_BOX: string = "combobox";
    export const INPUT_TYPE_SEARCHABLE_COMBO_BOX: string = "searchablecombobox";
    export const INPUT_TYPE_DEPLOYMENT_GROUP: string = "deploymentgroup";
    export const INPUT_TYPE_IDENTITIES: string = "identities";
    export const INPUT_TYPE_TOGGLE: string = "toggle";
    export const INPUT_TYPE_DROPDOWN: string = "dropdown";
    export const INPUT_TYPE_SECURE_FILE: string = "securefile";
    export const INPUT_TYPE_QUERY_CONTROL: string = "querycontrol";
    export const INPUT_TYPE_DURATION_CONTROL: string = "durationcontrol";

    export const INPUT_CONTROL_EDITOR_EXTENSION: string = "editorExtension";
}

export interface IInfoProps {
    calloutContentProps: ICalloutContentProps;
    iconName?: string;
    linkToProcessParameterDelegate?: () => void;
    unlinkToProcessParameterDelegate?: () => void;
    iconAriaLabel?: string;
}

export enum InputValidationType {
    Expression,
    Input
}

export interface InputValidationData {
    expression: string;
    reason: string;
}

export interface IAsyncInputValidator {
    type: InputValidationType;
    data?: InputValidationData; // required for Input type
}

export interface IInputControlPropsBase<T> extends IProps {
    value?: T;
    onValueChanged?: (value: T) => void;
    label?: string;
    ariaLevel?: number;
    required?: boolean;
    readOnly?: boolean;         // make readOnly = true if wish the tab to stop
    disabled?: boolean;         // not required if read-only is true
    infoProps?: IInfoProps;
    forceUpdate?: boolean;      // true if value is to be forcefully updated, e.g. revert definition
    getErrorMessage?: (value: T) => string | PromiseLike<string>;
    ariaLabel?: string;         // not required if label is passed
    ariaLabelledBy?: string;    // not required if ariaLabel is passed
    ariaDescription?: string;
    ariaDescribedBy?: string;   // not required if ariaDescription is passed
    deferredValidationTime?: number;
    getFooterElement?: (inputHasFocus: boolean, footerDescriptionElementId: string) => JSX.Element;        // footer delegate to pass footer element
    inputOptions?: IDictionaryStringTo<T>;
    onOptionsChanged?: (value: IDictionaryStringTo<T>) => void;
    asyncValidator?: IAsyncInputValidator; // optional validator

    /** This won't triggered during mounting, only further validations are captured */
    onNotifyValidationResult?: (errorMessage: string, value: string) => void;
    deferredOnChangeTimeInMs?: number;
}

export interface IInputControlStateBase<T> extends IState {
    value: T;    
}

export interface IInputDefinitionBase {
    defaultValue: string;
    groupName: string;
    helpMarkDown: string;
    label: string;
    name: string;
    options: {
        [key: string]: string;
    };
    properties: {
        [key: string]: string;
    };
    required: boolean;
    type: string;
    visibleRule: string;
}

export interface IEditorExtensionInstance {
    onCloseDialog: () => any;
    onOkClicked: () => any;
}

export interface ITaskDelegates {
    filePathPickerDelegate: (initialValue: string, callback: (selectedValue: any) => void) => void;
    fileContentProviderDelegate: (filePath: string, callback: (content: string) => void, errorCallback: (error: any) => void) => void;
}