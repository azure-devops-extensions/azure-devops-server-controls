/// <reference types="react" />

import "VSS/LoaderPlugins/Css!WorkCustomization/Common/Components/NewWorkItemTypeButton";

import * as React from "react";
import { PageLearnMoreLink } from "WorkCustomization/Scripts/Common/Components/LearnMoreLink";
import { autobind } from "OfficeFabric/Utilities";
import { PrimaryButton } from "OfficeFabric/Button";
import { Icon } from "OfficeFabric/Icon";
import * as DialogActions from "WorkCustomization/Scripts/Dialogs/Actions/DialogActions";
import { getWorkItemTypesStore, WorkItemTypesStore } from "WorkCustomization/Scripts/Stores/Process/WorkItemTypesStore";
import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");
import { IProcess } from "WorkCustomization/Scripts/Contracts/Process";

export class NewWorkItemTypeButton extends React.Component<{}, {}>{
    render(): JSX.Element {
        return (
            <div className="new-work-item-type-container">
                <PrimaryButton
                    className="new-work-item-type-button"
                    disabled={this._isDisabled()}
                    onClick={this._onClick}>
                    <Icon iconName="Add" />
                    {Resources.NewWorkItemTypeButtonText}
                </PrimaryButton>

                <PageLearnMoreLink href={Resources.NewWorkItemTypeFwLink} />
            </div>
        );
    }

    private _isDisabled(): boolean {
        return !this._getCurrentProcess().isInheritedTemplate;
    }

    @autobind
    private _onClick(): void {
        DialogActions.setDialogAction.invoke({
            dialogType: DialogActions.DialogType.CreateWorkItemType,
            data: {
                processTypeId: this._getCurrentProcess().templateTypeId
            }
        });
    }

    private _getCurrentProcess(): IProcess {
        return getWorkItemTypesStore().getCurrentProcess();
    }
}
