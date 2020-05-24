/// <reference types="react" />
import * as React from "react";

import { ITaskDelegates } from "DistributedTaskControls/SharedControls/InputControls/Common";
import { EditorExtensionButtonComponent, IEditorExtensionButtonComponentProps } from "DistributedTaskControls/SharedControls/InputControls/Components/EditorExtensionButtonComponent";
import { StringInputComponent, IStringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";

import { TaskInputDefinitionBase as TaskInputDefinition } from "TFS/DistributedTaskCommon/Contracts";

import * as Diag from "VSS/Diag";

export interface IStringInputWithEditorExtensionComponentProps extends IStringInputComponent {
    properties: IDictionaryStringTo<string>;
    inputDefinition: TaskInputDefinition;
    taskDelegates: ITaskDelegates;
    getAllInputValues: () => {};
}

/**
 * @brief Implements task's string input control with entry point for extension
 */

export class StringInputWithEditorExtensionComponent extends StringInputComponent {

    constructor(props) {
        super(props);
    }

    protected getControl(): JSX.Element {
        Diag.logVerbose("[StringInputWithEditorExtensionComponent.getControl]: Method called.");

        return (<div className="input-control-with-editor-extension">
            <div className="string-input-component-value" >
                {super.getControl()}
            </div>
            {!this.props.disabled && <EditorExtensionButtonComponent onOkCallback={this.onValueChanged.bind(this)} {...this.props as IEditorExtensionButtonComponentProps} />}
        </div>);
    }

}