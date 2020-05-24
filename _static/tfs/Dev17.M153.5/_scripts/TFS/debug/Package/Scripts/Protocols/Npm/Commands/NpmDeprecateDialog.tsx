import * as React from "react";

import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { Dialog, DialogFooter, DialogType } from "OfficeFabric/Dialog";
import { TextField } from "OfficeFabric/TextField";
import { autobind } from "OfficeFabric/Utilities";

import { Props, State } from "VSS/Flux/Component";
import { ProgressAnnouncer } from "VSS/Utils/Accessibility";
import * as Utils_String from "VSS/Utils/String";

import * as Actions from "Package/Scripts/Actions/Actions";
import { NpmProtocolMetadata } from "Package/Scripts/Protocols/Npm/NpmContracts";
import * as PackageResources from "Feed/Common/Resources";
import { IError } from "Feed/Common/Types/IError";
import { Package, PackageVersion } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Protocols/Npm/Commands/NpmDeprecateDialog";

export interface INpmDeprecateDialogProps extends Props {
    packageSummary: Package;
    packageVersion: PackageVersion;
    onDismiss: () => void;
    deprecatePackageDelegate: (deprecateMessage: string) => IPromise<any>;
}

export interface INpmDeprecateDialogState extends State {
    hidden: boolean;
    initialDeprecateMessage?: string;
    hideUndeprecateButton: boolean;
    disableDeprecateButton: boolean;
    isSaving: boolean;
}

export class NpmDeprecateDialog extends React.Component<INpmDeprecateDialogProps, INpmDeprecateDialogState> {
    private deprecateMessage: string;

    constructor(props: INpmDeprecateDialogProps) {
        super(props);

        const protocolMetadata: NpmProtocolMetadata = props.packageVersion.protocolMetadata.data;
        const initialDeprecated: string = protocolMetadata.deprecated;

        this.state = {
            hidden: false,
            initialDeprecateMessage: initialDeprecated,
            hideUndeprecateButton: initialDeprecated == null || initialDeprecated.length === 0,
            disableDeprecateButton: true,
            isSaving: false
        };

        this.deprecateMessage = initialDeprecated ? initialDeprecated : Utils_String.empty;
    }

    public render(): JSX.Element {
        return (
            <Dialog
                hidden={this.state.hidden}
                modalProps={{
                    isBlocking: false,
                    className: "deprecate-package-dialog",
                    containerClassName: "deprecate-dialog"
                }}
                dialogContentProps={{
                    type: DialogType.close
                }}
                forceFocusInsideTrap={true}
                firstFocusableSelector="dialog-content-textarea"
                onDismiss={this._closeDialog}
                title={Utils_String.format(
                    "{0} {1} {2}",
                    PackageResources.DeprecatePackageTitle,
                    this.props.packageSummary.name,
                    this.props.packageVersion.version
                )}
            >
                {this._renderDescription()}
                {this._renderMessageTextBox()}
                <DialogFooter className="deprecate-dialog-footer">
                    {this._renderUndeprecateButton()}
                    {this._renderDeprecateButton()}
                    {this._renderCloseButton()}
                </DialogFooter>
            </Dialog>
        );
    }

    @autobind
    private _closeDialog(): void {
        this.setState({ hidden: true });
        this.props.onDismiss();
    }

    private _renderDescription(): JSX.Element {
        return (
            <div>
                <div>
                    <span className="deprecate-package-info">
                        {this.state.initialDeprecateMessage
                            ? PackageResources.DeprecatePackageDialogWarning1_Deprecated
                            : PackageResources.DeprecatePackageDialogWarning1}
                    </span>
                    <span className="deprecate-package-info deprecate-package-info-bold">
                        {this.props.packageVersion.version}
                    </span>
                    <span className="deprecate-package-info">{PackageResources.DeprecatePackageDialogWarning2}</span>
                    <span className="deprecate-package-info deprecate-package-info-bold">
                        {this.props.packageSummary.name + (this.state.initialDeprecateMessage ? "" : ".")}
                    </span>
                    {this.state.initialDeprecateMessage ? (
                        <span className="deprecate-package-info">
                            {PackageResources.DeprecatePackageDialogWarning3_Deprecated}
                        </span>
                    ) : null}
                </div>
                <div className="deprecate-package-warning">{PackageResources.DeprecatePackageDialogInfo}</div>
            </div>
        );
    }

    private _renderMessageTextBox(): JSX.Element {
        return (
            <TextField
                ariaLabel={PackageResources.DeprecatePackageDialogMessage}
                inputClassName="dialog-content-textarea"
                defaultValue={this.props.packageVersion.protocolMetadata.data.deprecated}
                label={PackageResources.DeprecatePackageDialogMessage}
                placeholder={PackageResources.DeprecatePackageDialogPlaceholderMessage}
                rows={3}
                multiline={true}
                resizable={false}
                maxLength={255}
                onChanged={this._onChanged}
                disabled={this.state.isSaving}
            />
        );
    }

    private _renderUndeprecateButton(): JSX.Element {
        if (this.state.hideUndeprecateButton) {
            return null;
        } else {
            return (
                <PrimaryButton
                    className="undeprecate-button"
                    onClick={() => this._invokeDeprecate(true)}
                    ariaLabel={PackageResources.UndeprecatePackageTitle}
                    disabled={this.state.isSaving}
                    text={PackageResources.UndeprecatePackageTitle}
                />
            );
        }
    }

    private _renderDeprecateButton(): JSX.Element {
        return (
            <PrimaryButton
                className="deprecate-button"
                onClick={() => this._invokeDeprecate()}
                ariaLabel={PackageResources.DeprecatePackageTitle}
                disabled={this.state.disableDeprecateButton || this.state.isSaving}
                text={
                    this.state.isSaving
                        ? PackageResources.NpmDeprecate_ProgressStarted
                        : PackageResources.DeprecatePackageTitle
                }
            />
        );
    }

    private _renderCloseButton(): JSX.Element {
        return (
            <DefaultButton
                className="cancel-button"
                onClick={this._closeDialog}
                ariaLabel={PackageResources.Dialog_CancelButtonText}
                text={PackageResources.Dialog_CancelButtonText}
            />
        );
    }

    @autobind
    private _invokeDeprecate(isUnDeprecate: boolean = false): void {
        let announceStart = PackageResources.NpmDeprecate_ProgressStarted;
        let announceEnd = PackageResources.NpmDeprecate_ProgressEnded;
        let announceError = PackageResources.NpmDeprecate_ProgressFailed;

        if (isUnDeprecate) {
            this.deprecateMessage = Utils_String.empty;

            announceStart = PackageResources.NpmDeprecate_ProgressStarted_Undeprecate;
            announceEnd = PackageResources.NpmDeprecate_ProgressEnded_Undeprecate;
            announceError = PackageResources.NpmDeprecate_ProgressFailed_Undeprecate;
        }

        // Disable buttons as we try to deprecate the package
        this.setState({
            isSaving: true
        });

        const deprecatePromise = this.props.deprecatePackageDelegate(this.deprecateMessage).then(
            success => {
                this._closeDialog();
            },
            err => {
                // The delegate method should surface the error message
                Actions.ErrorEncountered.invoke({
                    message: PackageResources.NpmDeprecate_ProgressFailed,
                    details: err
                } as IError);

                this.setState({
                    isSaving: false
                });
            }
        );

        ProgressAnnouncer.forPromise(deprecatePromise, {
            announceStartMessage: announceStart,
            announceEndMessage: announceEnd,
            announceErrorMessage: announceError,
            alwaysAnnounceEnd: true
        });
    }

    @autobind
    private _onChanged(text: string): void {
        if (text) {
            this.deprecateMessage = text;
            if (text !== this.state.initialDeprecateMessage) {
                this.setState({
                    disableDeprecateButton: false
                });
            }
        } else {
            this.setState({
                disableDeprecateButton: true
            });
        }
    }
}
