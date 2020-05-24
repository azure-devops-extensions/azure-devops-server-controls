/// <reference types="jquery" />
import * as Dialogs from "VSS/Controls/Dialogs";
import * as Performance from "VSS/Performance";
import { delegate } from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";
import * as VSS from "VSS/VSS";

import * as Actions from "Package/Scripts/Actions/Actions";
import { CiConstants } from "Feed/Common/Constants/Constants";
import { CustomerIntelligenceHelper } from "Package/Scripts/Helpers/CustomerIntelligenceHelper";
import * as UrlHelper from "Package/Scripts/Helpers/UrlHelper";
import * as PackageResources from "Feed/Common/Resources";
import { IError } from "Feed/Common/Types/IError";
import { Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { Package, PackageVersion } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Dialogs/RemovePackageDialog";

// @TODO: Why is this a class?
export class RemovePackageDialogOptions {
    public feed: Feed;
    public packageSummary: Package;
    public packageVersion: PackageVersion;
    public commandName: string;
    public viaPackageList: boolean;
    public removePackageDelegate: (
        packageToRemove: Package,
        packageVersion: PackageVersion,
        feed: Feed
    ) => IPromise<any>;

    // Need *something* in common with IModalDialogOptions to make the compiler happy.
    // If this were an interface we wouldn't have this problem.
    public dialogClass: string;
}

export class RemovePackageDialog extends Dialogs.ModalDialogO<RemovePackageDialogOptions> {
    private _packageSummary: Package;
    private _packageVersion: PackageVersion;
    private _feed: Feed;
    private _commandName: string;
    private _viaPackageList: boolean;
    private _removePackageDelegate: (
        packageSummary: Package,
        packageVersion: PackageVersion,
        feed: Feed,
        viaPackageList: boolean
    ) => IPromise<any>;

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        if (options && options.packageSummary) {
            this._feed = options.feed;
            this._packageSummary = options.packageSummary;
            this._packageVersion = options.packageVersion;
            this._commandName = options.displayText;
            this._viaPackageList = options.viaPackageList;
            this._removePackageDelegate = options.removePackageDelegate;

            super.initializeOptions(
                $.extend(
                    {
                        resizable: false,
                        width: 650,
                        dialogClass: "bowtie",
                        title: Utils_String.format("{0} {1}", this._commandName, this._packageSummary.name),
                        buttons: {
                            remove: {
                                id: "ok",
                                class: "warning",
                                text: this._commandName,
                                click: delegate(this, this._onOkClick)
                            },
                            cancel: {
                                id: "cancel",
                                text: PackageResources.Dialog_CancelButtonText,
                                click: () => {
                                    CustomerIntelligenceHelper.publishEvent(CiConstants.RemovePackageDialogClosed);
                                    super.close();
                                }
                            }
                        }
                    },
                    options
                )
            );
        }
    }

    public initialize() {
        super.initialize();
        this._drawContent();
        this.updateOkButton(false);
        $("#ok").attr("aria-disabled", "true");
    }

    private _drawContent() {
        const $packageDialogContent = $("<div/>")
            .addClass("remove-package-dialog")
            .appendTo(this._element);
        const $RemovePackageLeftPanel = $("<div/>")
            .addClass("remove-package-left-panel")
            .attr("title", PackageResources.RemovePackageDialog_RemovePackageText)
            .appendTo($packageDialogContent);
        const imagePath = UrlHelper.getVersionedContentUrl("bo-deleted-warning.svg");
        $("<img/>")
            .attr("src", imagePath)
            .attr("alt", "")
            .appendTo($RemovePackageLeftPanel);

        const $removePackageRightPanel = $("<div/>")
            .addClass("remove-package-right-panel")
            .appendTo($packageDialogContent);
        $("<div/>")
            .addClass("remove-package-warning-heading")
            .text(PackageResources.RemovePackageDialog_ConfirmationText)
            .appendTo($removePackageRightPanel);
        const $warningText = $("<div/>")
            .addClass("remove-package-warning-text")
            .text(
                Utils_String.format(
                    PackageResources.RemovePackageDialog_WarningText,
                    this._commandName.toLocaleLowerCase(),
                    this._packageVersion.version
                )
            )
            .appendTo($removePackageRightPanel);
        $("<span/>")
            .addClass("remove-package-package-info")
            .text(this._packageSummary.name)
            .appendTo($warningText);
        $("<div/>")
            .addClass("remove-package-warning-text")
            .text(PackageResources.RemovePackageDialog_BuildBreakText)
            .appendTo($removePackageRightPanel);
        $("<div/>")
            .addClass("remove-package-warning-text")
            .text(PackageResources.RemovePackageDialog_DeletePackageConfirmText)
            .appendTo($removePackageRightPanel);

        const $releaseRowsContainer = $("<div/>")
            .addClass("remove-package-release-rows")
            .appendTo($removePackageRightPanel);
        const $inputContainer = $("<div/>").addClass("remove-package-release-row");
        const $input = $("<input/>")
            .addClass("feed-edit-dialog-error-in-text")
            .attr(
                "aria-label",
                Utils_String.format(PackageResources.AriaLabel_RemovePackageDialog_Input, this._packageSummary.name)
            )
            .on("keyup paste focusout", e => {
                const inputIsValid = this._validateInput($input);

                if (inputIsValid && e.keyCode && e.keyCode == KeyCode.ENTER) {
                    this._onOkClick();
                }
            })
            .appendTo($inputContainer);

        $inputContainer.appendTo($releaseRowsContainer);
        $input.focus();
    }

    private _validateInput($input: JQuery): boolean {
        if (this._packageSummary.name === $input.val()) {
            $input.removeClass("feed-edit-dialog-error-in-text");
            this.updateOkButton(true);
            $("#ok").attr("aria-disabled", "false");
            return true;
        } else {
            $input.addClass("feed-edit-dialog-error-in-text");
            this.updateOkButton(false);
            $("#ok").attr("aria-disabled", "true");
            return false;
        }
    }

    private _onOkClick() {
        const removePackageScenario = Performance.getScenarioManager().startScenario(
            CiConstants.Area,
            CiConstants.RemovePackage
        );

        // Enable progress bar
        VSS.globalProgressIndicator.registerProgressElement($(".ui-dialog-titlebar-progress-element"));
        const progressId = VSS.globalProgressIndicator.actionStarted("deletePackage", true);

        // Callback to delete the package
        this._removePackageDelegate(this._packageSummary, this._packageVersion, this._feed, this._viaPackageList).then(
            success => {
                removePackageScenario.end();
                VSS.globalProgressIndicator.actionCompleted(progressId);
                this.close();
            },
            err => {
                removePackageScenario.abort();

                // The delegate method should surface the error message
                Actions.ErrorEncountered.invoke({
                    message: "",
                    details: err
                } as IError);
                this.close();
                VSS.globalProgressIndicator.actionCompleted(progressId);
            }
        );
    }
}

VSS.tfsModuleLoaded("VSS.Feed.Controls.RemovePackageDialog", exports);
