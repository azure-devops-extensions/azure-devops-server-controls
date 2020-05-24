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
import "Account/Scripts/TFS.Details.Security.AltCredentials.Controls";
import "Presentation/Scripts/TFS/TFS.UI.Controls.Accessories";
import "VSS/LoaderPlugins/Css!Core";
import "VSS/LoaderPlugins/Css!Details.Common";
import "VSS/LoaderPlugins/Css!Details.Security.AltCreds";
import "VSS/LoaderPlugins/Css!Details.Security.Common";

declare global {
    interface Window {
        ActionUrls: SecurityModels.DetailsSecurityActionUrlModel;
    }
}

interface IAlternateCredentialsModel {
    basicAuthenticationDisabled: boolean;
    basicAuthenticationDisabledOnAccount: boolean;
    basicAuthenticationUsername: string;
    primaryUsername: string;
    basicAuthenticationHasPassword: boolean;
}

interface IAlternateAuthCredentialsComponentProps {
    alternateCredentialsModel: IAlternateCredentialsModel;
}

SDK_Shim.registerContent("alternateAuthCredentialsSecurityView.initialize", (context: SDK_Shim.InternalContentContextData): void => {
    const pageDataService = Service.getService(Contribution_Services.WebPageDataService);
    const pageData = pageDataService.getPageData<IAlternateAuthCredentialsComponentProps>("ms.vss-admin-web.alternate-credentials-data-provider");

    // Setup the global action urls used by the token management pages
    const urlData = pageDataService.getPageData<IActionUrldata>("ms.vss-admin-web.action-url-data-provider");
    window.ActionUrls = urlData.detailsSecurityActionUrlModel;

    ReactDOM.render(
        <AlternateAuthCredentialsComponent {...pageData} />,
        context.container);
});

class AlternateAuthCredentialsComponent extends React.Component<IAlternateAuthCredentialsComponentProps, {}> {

    private _ensureEnhancements = (ref: HTMLElement): void => {

        const $container = $(ref);
        VSS.globalProgressIndicator.registerProgressElement($container.find(".pageProgressIndicator"));

        if (!this.props.alternateCredentialsModel.basicAuthenticationDisabledOnAccount) {
            if (!this.props.alternateCredentialsModel.basicAuthenticationDisabled && this.props.alternateCredentialsModel.basicAuthenticationHasPassword) {
                $(".enable-authcreds").prop("checked", true);
            }

            if (this.props.alternateCredentialsModel.basicAuthenticationUsername) {
                $(".username-secondary").val(this.props.alternateCredentialsModel.basicAuthenticationUsername);
            }

            if (this.props.alternateCredentialsModel.basicAuthenticationHasPassword) {
                $(".password-confirm").val("********");
                $(".password").val("********");
            }
        }
        VSS_Controls.Enhancement.ensureEnhancements();
    }

    public render(): JSX.Element {
        return (
            <div className="hub-view" ref={this._ensureEnhancements}>
                <div className="hub-title"></div>
                <div className="hub-progress pageProgressIndicator"></div>
                <div id="commonMessage"></div>
                <div className="main-column alt-creds has-footer" role="main">
                    <div className="alt-cred-warning">
                        <img src={VSS_Context.getPageContext().webAccessConfiguration.paths.resourcesPath + "warning.png"} alt="warning" />
                        <FormatComponent className="warning-text" format={AccountResources.AltCredsWarning1}>
                            {
                                <a href="">{AccountResources.AltCreds_PersonalAccessTokens}</a>
                            }
                        </FormatComponent>
                    </div>
                    <div id="headerTextWrapper" className="featureHeader section-box">
                        <span id="headerText" className="headerText">{AccountResources.AlternateCredentialsPageHeader}</span>
                    </div>
                    <div className="clearfix">
                        <div className="column span6 normal-space-container">
                            <div className="normal-space-container">
                                <div className="altcreds-view">
                                    {this.props.alternateCredentialsModel.basicAuthenticationDisabledOnAccount && AccountResources.AltCredsDisabledOnAccount}
                                    {!this.props.alternateCredentialsModel.basicAuthenticationDisabledOnAccount && <div className="vertical-fill-layout">
                                        <input name="__RequestVerificationToken" type="hidden" value="" />
                                        <div className="notice section-box">
                                            <input type="checkbox" className="enable-authcreds" id="enable-altcreds-check" autoFocus />
                                            <label htmlFor="enable-altcreds-check" className="enable-authcreds-label">{AccountResources.AlternateCredentialsEnable}</label>
                                        </div>
                                        <div className="primary-form-collapsible" role="form">
                                            <div className="username-primary-wrapper section-box">
                                                <span className="username-primary-label formlabel">
                                                    {AccountResources.AlternateCredentialsUsernamePrimary}
                                                </span>
                                                <span className="credentials-username-text">{this.props.alternateCredentialsModel.primaryUsername}</span>
                                            </div>
                                            <div className="username-secondary-wrapper section-box">
                                                <span className="username-secondary-label formlabel">
                                                    {AccountResources.AlternateCredentialsUsernameSecondary}
                                                </span>
                                                <span className="custom-text-input-cell">
                                                    <input title="Username Secondary" type="text" maxLength={256} className="username-secondary custom-text-input" name="username-secondary" defaultValue="" />
                                                    <label htmlFor="username-secondary" className="error username-secondary-error"></label>
                                                </span>
                                            </div>
                                            <div id="password-wrapper" className="section-box">
                                                <span id="password-label" className="formlabel">
                                                    {AccountResources.AlternateCredentialsPassword}
                                                </span>
                                                <span className="custom-text-input-cell">
                                                    <input title="Password" type="password" maxLength={256} className="password custom-text-input" name="password" data-default-value="********" data-has-value="Model.BasicAuthenticationHasPassword" defaultValue="" />
                                                    <label htmlFor="password" className="error password-error"></label>
                                                </span>
                                            </div>
                                            <div className="confirm-password-wrapper section-box">
                                                <span className="confirm-password-label formlabel">
                                                    {AccountResources.AlternateCredentialsConfirmPassword}
                                                </span>
                                                <span className="custom-text-input-cell">
                                                    <input title="Confirm Password" type="password" maxLength={256} className="password-confirm custom-text-input" name="password-confirm" defaultValue="" />
                                                    <label htmlFor="password-confirm" className="error password-confirm-error"></label>
                                                </span>
                                            </div>
                                        </div>
                                        <div id="buttonWrapper" className="section-box">
                                            <button className="alt-creds-submit-button disabled" type="submit" disabled={true}>{AccountResources.DialogSave}</button>
                                            <button className="alt-creds-cancel-button disabled" type="button" disabled={true}>{AccountResources.DialogCancel}</button>
                                            <img className="wait" alt={AccountResources.PleaseWait} src={VSS_Context.getPageContext().webAccessConfiguration.paths.resourcesPath + "big-progress.gif"} />
                                        </div>
                                    </div>
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}