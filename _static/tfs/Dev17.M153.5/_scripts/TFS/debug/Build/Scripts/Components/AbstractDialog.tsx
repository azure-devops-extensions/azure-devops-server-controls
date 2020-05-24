/// <reference types="react" />

import * as React from "react";

import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";

import { DefaultButton } from "OfficeFabric/components/Button/DefaultButton/DefaultButton";
import { PrimaryButton } from "OfficeFabric/components/Button/PrimaryButton/PrimaryButton";
import { Dialog, DialogFooter, DialogType, IDialogProps } from "OfficeFabric/Dialog";

import * as VSS_Resources_Platform from "VSS/Resources/VSS.Resources.Platform";

export interface IAbstractDialogProps extends IDialogProps {
    okDisabled: boolean;
    onOkClick: () => void;
}

export class AbstractDialog extends React.Component<IAbstractDialogProps, {}> {
    public render(): JSX.Element {
        return <Dialog
            dialogContentProps={{
                type: DialogType.close
            }}
            closeButtonAriaLabel={BuildResources.CloseButtonText}
            {...this.props}>
            <div className="content">
                {React.Children.map(this.props.children, child => <span>{child}</span>)}
            </div>
            <DialogFooter>
                <PrimaryButton disabled={this.props.okDisabled} onClick={this.props.onOkClick}>{VSS_Resources_Platform.ModalDialogOkButton}</PrimaryButton>
                <DefaultButton onClick={this.props.onDismiss}>{VSS_Resources_Platform.CloseButtonLabelText}</DefaultButton>
            </DialogFooter>
        </Dialog>;
    }
}