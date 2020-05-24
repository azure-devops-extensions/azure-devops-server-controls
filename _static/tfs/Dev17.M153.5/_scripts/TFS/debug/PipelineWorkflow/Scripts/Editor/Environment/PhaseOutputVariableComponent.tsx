/// <reference types="react-dom" />

import * as Base from "DistributedTaskControls/Common/Components/Base";
import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import * as DeployPhaseTypes from "DistributedTaskControls/Phase/Types";
import * as React from "react";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import * as SDK_Shim from "VSS/SDK/Shim";
import { Accordion } from "DistributedTaskControls/SharedControls/Accordion/Accordion";
import { DeployPipelineConstants } from "PipelineWorkflow/Scripts/Editor/Constants";
import { SharedConstants } from "PipelineWorkflow/Scripts/Shared/Constants";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";
import { IInfoProps } from "DistributedTaskControls/SharedControls/InputControls/Common";

export interface IPhaseOutputVariableProps extends ComponentBase.IProps {
    refName: string;
    disabled: boolean;
    onRefNameChange: (isDirty: boolean, isValid: boolean, phaseOutputVariableInput: IPhaseOutputVariableInput) => void;
}

export interface IPhaseOutputVariableInput {
    refName: string;
}

export class PhaseOutputVariableComponent extends ComponentBase.Component<IPhaseOutputVariableProps, Base.IStateless> {

    constructor(props: IPhaseOutputVariableProps) {
       super(props);

       const refName: string = props.refName || "";
       this._currentState = refName;
       this._originalState = refName;
    }

    public render(): JSX.Element {
        const refNameInfoProps : IInfoProps = {
            calloutContentProps: {
                calloutMarkdown: Resources.PhaseRefNameDescription
            }
        };

        return (
            <div className="fabric-style-overrides task-details-output-group"
            key={DeployPipelineConstants.PipelineConstant_phaseOutputVariables_input}>
                <Accordion
                    label={Resources.OutputVariablesGroupLabel}
                    initiallyExpanded={true}
                    headingLevel={2}
                    addSeparator={false}
                    addSectionHeaderLine={true}>
                    <StringInputComponent
                        label={Resources.ReferenceNameText}
                        value={this._currentState}
                        disabled={this.props.disabled}
                        infoProps={refNameInfoProps}
                        onValueChanged={this._onRefNameChange}/>
                </Accordion>
            </div>
        );
    }

    private _onRefNameChange = (value: string) => {
        this._currentState = value;
        const phaseOutputVariableInput: IPhaseOutputVariableInput = { refName: value };

        if (this.props.onRefNameChange) {
        this.props.onRefNameChange(this.isDirty(), true, phaseOutputVariableInput);
        }
    }

    public isDirty(): boolean {
        return this._originalState !== this._currentState;
      }

    private _originalState: string;
    private _currentState: string;
}

SDK_Shim.registerContent("release-pipeline.phase-output-variables", (context) => {
    const options: DeployPhaseTypes.IContributedInputOptions = context.options;
    const inputName: string = SharedConstants.PipelineConstant_phaseinput_outputVariable;
    const onRefNameChange: any = (isDirty: boolean, isValid: boolean, phaseOutputVariableInput: IPhaseOutputVariableInput) => {
        if (options && options.updateInputStateDelegate) {
            options.updateInputStateDelegate(inputName, {
            name: inputName,
            isDirty: isDirty,
            isValid: isValid,
            value: phaseOutputVariableInput });
        }
    };

    let refName: string = "";
    let disabled: boolean = false;
    if (options) {
        const inputValue: IPhaseOutputVariableInput = options.getInputValue(inputName) as IPhaseOutputVariableInput;
        if (inputValue && inputValue.refName) {
                refName = inputValue.refName;
        }
    }
    if (context.options.disabled) {
        disabled = context.options.disabled;
    }

    return <PhaseOutputVariableComponent
        refName={refName}
        disabled={disabled}
        onRefNameChange={onRefNameChange} />;
});