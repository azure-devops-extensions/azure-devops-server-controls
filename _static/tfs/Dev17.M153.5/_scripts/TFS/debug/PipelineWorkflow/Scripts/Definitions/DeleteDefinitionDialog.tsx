import * as React from "react";

import { DialogWithMultiLineTextInput } from "DistributedTaskControls/Components/DialogWithMultiLineTextInput";
import { BooleanInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/BooleanInputComponent";
import * as DTCResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as Component_Base from "VSS/Flux/Component";
import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Definitions/AllDefinitionsContent";

export interface IDeleteDefinitionDialogProps extends Component_Base.Props{
    definitionName: string;
    onCancelButtonClick?: () => void;
    onOkButtonClick: (comment: string, forceDelete: boolean) => void;
}

export class DeleteDefinitionDialog extends Component_Base.Component<IDeleteDefinitionDialogProps, Component_Base.State> {
    public render(): JSX.Element {
        return (
            <DialogWithMultiLineTextInput
                titleText={Resources.DeleteDefinitionDialogTitle}
                onOkButtonClick={(comment: string) => {
                    this.props.onOkButtonClick(comment, this._forceDelete);
                }}
                multiLineInputLabel={DTCResources.CommentText}
                additionalCssClass={"releases2-delete-rd-dialog"}
                showDialog={true}
                onCancelButtonClick={() => {
                    this.props.onCancelButtonClick();
                }}>
                <div className={"releases2-delete-rd-text"}>{Utils_String.localeFormat(Resources.DeleteDefinitionConfirmationMessage, this.props.definitionName)}</div>
                {this._getDeleteDefinitionDialogCheckbox()}
            </DialogWithMultiLineTextInput>
        );
    }

    private _getDeleteDefinitionDialogCheckbox(): JSX.Element {
		const infoProps = {
			calloutContentProps: {
				calloutDescription: Resources.ForceDeleteReleaseDefinitionTooltip
			}
		};
		return <BooleanInputComponent
			key={"delete-definition-dialog-checkbox"}
			value={this._forceDelete}
			onValueChanged={(newValue: boolean) => { this._onDeleteRdCheckboxToggle(newValue); }}
			infoProps={infoProps}
			label={Resources.ForceDeleteReleaseDefinition}
		/>;
	}

    private _onDeleteRdCheckboxToggle = (value: boolean): void => {
		this._forceDelete = value;
	}

    private _forceDelete: boolean = false;
}


