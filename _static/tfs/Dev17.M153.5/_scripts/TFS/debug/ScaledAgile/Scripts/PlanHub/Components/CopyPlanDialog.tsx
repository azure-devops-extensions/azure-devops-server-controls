import * as React from "react";
import * as ReactDom from "react-dom";
import { autobind } from "OfficeFabric/Utilities";
import { Dialog, DialogType, DialogFooter } from "OfficeFabric/Dialog";
import { Label } from "OfficeFabric/Label";
import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { TextField } from "OfficeFabric/TextField";
import { WizardBusinessLogic } from "ScaledAgile/Scripts/Views/Wizard/Models/WizardBusinessLogic";
import { ValidationState } from "ScaledAgile/Scripts/Shared/Models/IModelWithValidation";

import * as ScaledAgileResources from "ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile";
import "VSS/LoaderPlugins/Css!ScaledAgile/Scripts/PlanHub/Components/CopyPlanDialog";

export interface ICopyPlanDialogProps {
    planName: string;
    onSave: (planName: string) => void;
}

export interface ICopyPlanDialogState {
    planName: string;
    isValid: boolean;
}

export class CopyPlanDialog {
    private static dialogNode: HTMLElement;

    public static show(options: ICopyPlanDialogProps) {
        CopyPlanDialog.dialogNode = document.createElement("div");
        ReactDom.render(<CopyPlanDialogInternal {...options} />, CopyPlanDialog.dialogNode);
    }

    public static close() {
        ReactDom.unmountComponentAtNode(CopyPlanDialog.dialogNode);
        CopyPlanDialog.dialogNode.remove();
    }
}

class CopyPlanDialogInternal extends React.Component<ICopyPlanDialogProps, ICopyPlanDialogState> {
    private _textFieldRef: TextField;

    constructor(props: ICopyPlanDialogProps) {
        super(props);
        this.state = {
            planName: this.props.planName + " - " + ScaledAgileResources.CopyPlanDialog_CopiedNameSuffix,
            isValid: true
        };
    }

    public componentDidMount() {
        this._textFieldRef.select();
        this._textFieldRef.focus();
    }

    public render(): JSX.Element {
        return (
            <Dialog
                isOpen={true}
                title={ScaledAgileResources.CopyPlanDialog_Title}
                type={DialogType.close}
                onDismiss={this.close}
                isBlocking={true}
                containerClassName={"copy-plan-dialog"}
                closeButtonAriaLabel={ScaledAgileResources.CopyPlanDialog_CancelButton}>
                <Label className="copy-dialog-description-label">
                    {ScaledAgileResources.CopyPlanDialog_Description}
                </Label>
                <TextField
                    ref={(element) => { this._textFieldRef = element; }}
                    maxLength={WizardBusinessLogic.MAX_NAME_LENGTH}
                    required={true}
                    label={ScaledAgileResources.CopyPlanDialog_NameLabel}
                    value={this.state.planName}
                    onChanged={this.onNameChange}
                />
                <DialogFooter>
                    <PrimaryButton
                        onClick={this.onSave}
                        disabled={!this.state.isValid}
                    >
                        {ScaledAgileResources.CopyPlanDialog_CopyButton}
                    </PrimaryButton>
                    <DefaultButton
                        onClick={this.close}>
                        {ScaledAgileResources.CopyPlanDialog_CancelButton}
                    </DefaultButton>
                </DialogFooter>
            </Dialog>);
    }

    private close() {
        CopyPlanDialog.close();
    }

    @autobind
    private onNameChange(planName: string): void {
        const result = WizardBusinessLogic.validatePlanName(planName);

        this.setState({
            planName: planName,
            isValid: result.validationState === ValidationState.Success,
        } as ICopyPlanDialogState);
    }

    @autobind
    private onSave() {
        this.props.onSave(this.state.planName.trim());
        this.close();
    }
}

