import * as React from "react";
import * as ReactDOM from "react-dom";

import * as Contribution_Services from "VSS/Contributions/Services";
import * as VSS_Context from "VSS/Context";
import * as Service from "VSS/Service";
import * as VSS from "VSS/VSS";

import * as SDK_Shim from "VSS/SDK/Shim";
import * as VSS_Controls from "VSS/Controls";
import { FormatComponent } from "VSSPreview/Flux/Components/Format";
import SecurityModels = require("Account/Scripts/TFS.Details.Security.Common.Models");
import { css } from "OfficeFabric/Utilities";
import * as AccountResources from "../Resources/TFS.Resources.Account";
import { IActionUrldata } from "./PersonalAccessToken";

import "Account/Scripts/TFS.Details.Security.Common.Controls";
import "Account/Scripts/TFS.Details.Security.PublicKeys.Controls";
import "Presentation/Scripts/TFS/TFS.UI.Controls.Accessories";
import "VSS/LoaderPlugins/Css!Core";
import "VSS/LoaderPlugins/Css!Details.Common";
import "VSS/LoaderPlugins/Css!Details.Security.Common";
import "VSS/LoaderPlugins/Css!Details.Security.Token";

declare global {
    interface Window {
        ActionUrls: SecurityModels.DetailsSecurityActionUrlModel;
    }
}

interface IPublicKey {
    authorizationId: string;
    description: string;
    data: string;
    fingerprint: string;
    formattedCreatedTime: string;
    isValid: boolean;
}

interface ISshPublicKeysCredentialsModel {
    isEditMode: boolean;
    publicKey: IPublicKey;
    publicKeysDisabled: boolean;
}

SDK_Shim.registerContent("sshPublicKeysSecurityView.initialize", (context: SDK_Shim.InternalContentContextData): void => {
    const pageDataService = Service.getService(Contribution_Services.WebPageDataService);

    // Setup the global action urls used by the token management pages
    const urlData = pageDataService.getPageData<IActionUrldata>("ms.vss-admin-web.action-url-data-provider");
    window.ActionUrls = urlData.detailsSecurityActionUrlModel;

    const pageData = pageDataService.getPageData<ISshPublicKeysCredentialsModel>("ms.vss-admin-web.ssh-public-keys-data-provider");
    ReactDOM.render(
        <SshPublicKeysCredentialsComponent {...pageData} />,
        context.container);
});

class SshPublicKeysCredentialsComponent extends React.Component<ISshPublicKeysCredentialsModel, {}> {

    private _ensureEnhancements = (ref: HTMLElement): void => {

        const $container = $(ref);
        VSS.globalProgressIndicator.registerProgressElement($container.find(".pageProgressIndicator"));

        // If edit mode and public key exists then need to update the additional edit fields.
        if (this.props.isEditMode && this.props.publicKey) {
            $(".key-id").val(this.props.publicKey.authorizationId);
            $(".key-is-valid").val(this.props.publicKey.isValid ? "True" : "False");
            $(".description").val(this.props.publicKey.description);
            $(".description").prop('disabled', true);

            if (this.props.publicKey.data) {
                const data = document.querySelector(".data") as HTMLTextAreaElement;
                if (data) {
                    data.readOnly = true;
                    data.value = this.props.publicKey.data;
                }
            }
        }
        VSS_Controls.Enhancement.ensureEnhancements();
    }

    public render(): JSX.Element {
        return this.props.isEditMode ? this.renderEditView() : this.renderListView();
    }

    private renderListView(): JSX.Element {
        return <div className="hub-view ssh-public-keys-view" ref={this._ensureEnhancements}>
            <div className="hub-title"></div>
            <div className="hub-progress pageProgressIndicator"></div>
            <div id="commonMessage"></div>
            <div className="main-column has-footer" role="main">
                <div className="clearfix">
                    <div className="column span6 normal-space-container">
                        <div className="normal-space-container">
                            <div className="header-content">
                                <div className="header-text-wrapper featureHeader section-box">
                                    <span className="header-text">{AccountResources.SSH_KeyFormDescription} <a href={AccountResources.SSH_DescriptionLearnMoreUrl}>{AccountResources.LearnMore}</a></span>
                                </div>
                            </div>
                            <div className="token-notice"></div>
                            {
                                    this.props.publicKeysDisabled && 
                                    <div className="keyHub-key-view">
                                        <div className="disabled-message">{AccountResources.SSH_PublicKeysDisabled}</div>
                                    </div>
                                }
                                {
                                    !this.props.publicKeysDisabled && 
                                    <div className="keyHub-key-view">
                                        <div className="display-fingerprint"></div>
                                        <div className="key-menu"></div>
                                        <div className="key-grid"></div>
                                    </div>
                                }
                        </div>
                    </div>
                </div>
            </div>
        </div>;
    }

    private renderEditView(): JSX.Element {
        return <div className="hub-view ssh-public-keys-view" ref={this._ensureEnhancements}>
            <div className="hub-title"></div>
            <div className="hub-progress pageProgressIndicator"></div>
            <div id="commonMessage"></div>
            <div className="main-column add-key-form has-footer" role="main">
                <h1 id="ssh-headertitle" className="header-title">{this.props.publicKey ? this.props.publicKey.description : AccountResources.SSH_KeyFormTitle}</h1>
                <div className="clearfix">
                    <div className="column span6 normal-space-container">
                        <div className="normal-space-container">
                            <div className="key-form-wrapper">
                                <form className="key-form" role="form" aria-labelledby="ssh-headertitle">
                                    <input name="__RequestVerificationToken" type="hidden" value="" />
                                    <input type="hidden" name="key-id" className="key-id" defaultValue="" />
                                    <input type="hidden" name="key-is-valid" className="key-is-valid" defaultValue="true" />
                                    <div className="description-wrapper section-box">
                                        <label className="description-label form-label" id="ssh-description-id">
                                            {AccountResources.SSH_KeyDescription}
                                        </label>
                                        <input aria-labelledby="ssh-description-id" className="input-field input-visible description" name="description" type="text" defaultValue="" maxLength={256} autoFocus />
                                        <label className="error description-error"></label>
                                    </div>
                                    <div className="data-wrapper section-box">
                                        <label className="description-label form-label" id="ssh-keydata-id">
                                            {AccountResources.SSH_DataLabel}
                                        </label>
                                        <textarea aria-labelledby="ssh-keydata-id" rows={7} cols={20} className="input-field input-visible data"></textarea>
                                        <label className="error description-error"></label>
                                    </div>
                                    <div className="button-container">
                                        <div className="button-field">
                                            {!this.props.publicKey && <button type="submit" className="key-save-button formInput" disabled={true}>{AccountResources.DialogSave}</button>}
                                            <button type="button" className="key-cancel-button formInput">{AccountResources.DialogCancel}</button>
                                            <img className="wait" alt={AccountResources.ProgressPleaseWait} src={VSS_Context.getPageContext().webAccessConfiguration.paths.resourcesPath + "big-progress.gif"} />
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    }
}