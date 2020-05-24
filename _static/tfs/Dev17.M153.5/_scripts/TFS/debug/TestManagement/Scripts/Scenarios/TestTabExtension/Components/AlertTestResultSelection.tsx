/// <reference types="react" />
import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/TestTabExtension/Components/AlertTestResultSelection";

import { IDialogContentProps } from "OfficeFabric/components/Dialog/DialogContent.types";
import { Dialog } from "OfficeFabric/Dialog";
import { IModalProps } from "OfficeFabric/Modal";
import { autobind } from "OfficeFabric/Utilities";
import { ResponsiveMode } from "OfficeFabric/utilities/decorators/withResponsiveMode";
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import * as ComponentBase from "VSS/Flux/Component";

export interface IAlertTestResultSelectionProps extends ComponentBase.Props {
    header: string;
    subText: string;
    onCloseDialog: () => void;
}

export interface IAlertTestResultSelectionState extends ComponentBase.State {
    showDialog: boolean;
}

export function renderDialog(element: Element, alertNoTestResultSelectionProps: IAlertTestResultSelectionProps): void {
    ReactDOM.render(<AlertTestResultSelectionComponent { ...alertNoTestResultSelectionProps } />, element);
}

export function unmountDialog(element: Element): void {
    ReactDOM.unmountComponentAtNode(element);
}

export class AlertTestResultSelectionComponent extends ComponentBase.Component<IAlertTestResultSelectionProps, IAlertTestResultSelectionState> {

    public componentWillMount(): void {
        this.setState({ showDialog: true });
    }

    public render(): JSX.Element {

        let dialogcontentProps: IDialogContentProps = {
            showCloseButton: true,
            title: this.props.header,
            closeButtonAriaLabel: Resources.CloseText,
            subText: this.props.subText,
            responsiveMode: ResponsiveMode.large,
        };

        let modalProps: IModalProps = {
            className: "alert-testResult-selection-dialog",
            containerClassName: "alert-testResult-selection-dialog-container",
            isBlocking: true
        };

        return (
            <Dialog
                hidden={!this.state.showDialog}
                dialogContentProps={dialogcontentProps}
                modalProps={modalProps}
                onDismiss={this._closeDialog}>
            </Dialog>
        );
    }

    @autobind
    private _closeDialog() {
        this.setState({ showDialog: false });
        this.props.onCloseDialog();
    }
}