import * as React from "react";
import * as ReactDOM from "react-dom";

import * as Contribution_Services from "VSS/Contributions/Services";
import * as Service from "VSS/Service";
import * as VSS from "VSS/VSS";

import * as SDK_Shim from "VSS/SDK/Shim";
import * as VSS_Controls from "VSS/Controls";
import * as String_Utils from "VSS/Utils/String";
import SecurityModels = require("Account/Scripts/TFS.Details.Security.Common.Models");
import { css } from "OfficeFabric/Utilities";
import VSS_Context = require("VSS/Context");
import * as AccountResources from "../Resources/TFS.Resources.Account";

import "Account/Scripts/TFS.Details.Security.Common.Controls";
import "Account/Scripts/TFS.Details.Security.Tokens.Controls";
import "Presentation/Scripts/TFS/TFS.UI.Controls.Accessories";
import "VSS/LoaderPlugins/Css!Core";
import "VSS/LoaderPlugins/Css!Details.Common";
import "VSS/LoaderPlugins/Css!Details.Security.Token";
import "VSS/LoaderPlugins/Css!Details.Security.Common";

enum ScopeMode {
    AllScopes = 0,
    SelectedScopes = 1
}

declare global {
    interface Window {
        ActionUrls: SecurityModels.DetailsSecurityActionUrlModel;
    }
}

interface IDetail {
    key: string;
    value: string;
}

export interface IActionUrldata {
    detailsSecurityActionUrlModel: SecurityModels.DetailsSecurityActionUrlModel;
}

interface IPersonalAccessTokenComponentProps {
    allAccounts?: { [key: string]: string };
    allScopes: IDetail[];
    authorizationId: string;
    currentAccount: string;
    description: string;
    displayAllAccountsOption: boolean;
    expiresUtc: string;
    isEditMode: boolean;
    isValid: Boolean;
    scopeMode: number;
    selectedScopes: string[];
    selectedTokenData: string;
    tenant: string;
    validExpirationValues: IDetail[];
}

SDK_Shim.registerContent("personalAccessTokenSecurityView.initialize", (context: SDK_Shim.InternalContentContextData): void => {
    const pageDataService = Service.getService(Contribution_Services.WebPageDataService);

    // Setup the global action urls used by the token management pages
    const urlData = pageDataService.getPageData<IActionUrldata>("ms.vss-admin-web.action-url-data-provider");
    window.ActionUrls = urlData.detailsSecurityActionUrlModel;

    const pageData = pageDataService.getPageData<IPersonalAccessTokenComponentProps>("ms.vss-token-web.personal-access-token-data-provider");
    ReactDOM.render(
        <PersonalAccessTokenComponent {...pageData} />,
        context.container);
});

class PersonalAccessTokenComponent extends React.Component<IPersonalAccessTokenComponentProps, {}> {

    private _ensureEnhancements = (ref: HTMLElement): void => {

        const $container = $(ref);
        VSS.globalProgressIndicator.registerProgressElement($container.find(".pageProgressIndicator"));

        $(".token-is-valid").val(this.props.isValid ? "True" : "False");

        // If in list mode and token info was passeed, then update the grid
        if (!this.props.isEditMode && this.props.selectedTokenData) {
            $(".pat-grid").attr("data-selected", this.props.selectedTokenData);
        }
        VSS_Controls.Enhancement.ensureEnhancements();
    }

    public render(): JSX.Element {

        return this.props.isEditMode ? this.renderEditView() : this.renderListView();
    }

    private renderListView(): JSX.Element {
        return (
            <div className="hub-view personal-access-token-view" ref={this._ensureEnhancements}>
                <div className="hub-title"></div>
                <div className="hub-progress pageProgressIndicator"></div>
                <div className="hub-content">
                    <div className="rightPane">
                        <div id="commonMessage"></div>
                        <div className="main-column has-footer" role="main">
                            <div className="clearfix">
                                <div className="column span6 normal-space-container">
                                    <div className="normal-space-container">
                                        <div className="header-content">
                                            <div className="header-text-wrapper featureHeader section-box">
                                                <span className="header-text">{AccountResources.TokenListPageHeader}</span>
                                            </div>
                                        </div>
                                        <div className="token-notice"></div>
                                        <div className="tokenHub-token-view">
                                            <div className="pat-menu"></div>
                                            <div className="pat-grid"></div>
                                            <div id="no-pats-text"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    private renderEditView(): JSX.Element {
        const scopeComponents: JSX.Element[] = this.props.allScopes.map(scopeDefinition => {
            return <span className="scope-check-wrapper" key={scopeDefinition.key}>
                <input type="checkbox"
                    className="selected-scope-checkbox"
                    data-row="0"
                    data-col="0"
                    id={scopeDefinition.key}
                    name={scopeDefinition.key}
                    value={scopeDefinition.key}
                    disabled={this.props.scopeMode === ScopeMode.AllScopes}
                    defaultChecked={this.props.selectedScopes && this.props.selectedScopes.indexOf(scopeDefinition.key) !== -1} />
                <label htmlFor={scopeDefinition.key}>{scopeDefinition.value}</label>
            </span>
        });

        let accountComponents: JSX.Element[] = [];
        if (!this.props.authorizationId && this.props.allAccounts) {
            accountComponents = Object.keys(this.props.allAccounts).map(account => {
                return <option key={account} value={account}>{this.props.allAccounts[account]}</option>
            });

            if (this.props.displayAllAccountsOption) {
                if (this.props.tenant) {
                    accountComponents.unshift(<option key={"all_accounts"} value="all_accounts">{String_Utils.format(AccountResources.TokenAllAccountsSelection, this.props.tenant)}</option>);
                } else {
                    accountComponents.unshift(<option key={"all_accounts"} value="all_accounts">{AccountResources.TokenAllAccountsSelection}</option>);
                }
            }
        }

        let expirationComponents: JSX.Element[] = [];
        if (this.props.validExpirationValues) {
            expirationComponents = this.props.validExpirationValues.map(expiry => {
                return <option key={expiry.key} value={expiry.key}>{expiry.value}</option>
            });
        }

        return (
            <div className="hub-view personal-access-token-view" ref={this._ensureEnhancements}>
                <div className="hub-title"></div>
                <div className="hub-progress pageProgressIndicator"></div>
                <div className="hub-content">
                    <div className="rightPane">
                        <div id="commonMessage"></div>
                        <div className="main-column add-token-form has-footer" role="main" aria-labelledby="pat-header">
                            <h1 className="header-title" id="pat-header">{this.props.description || AccountResources.TokenAddPageTitle}</h1>
                            <div className="clearfix">
                                <div className="column span6 normal-space-container">
                                    <div className="normal-space-container">
                                        {
                                            !this.props.description &&
                                            <div className="header-text-wrapper feature-header section-box">
                                                <label id="headertext" className="header-text">{AccountResources.TokenGenerateFormHeaderText}</label>
                                            </div>
                                        }
                                        <div className="token-form-wrapper">
                                            <form className="token-form" role="form" aria-labelledby="headertext">
                                                <input name="__RequestVerificationToken" type="hidden" value="" />
                                                <input type="hidden" name="token-id" className="token-id" defaultValue={this.props.authorizationId} />
                                                <input type="hidden" name="token-is-valid" className="token-is-valid" />

                                                <div className="description-wrapper section-box">
                                                    <label className="description-label form-label" id="pat-descriptionid" htmlFor="pat-descritionInput">
                                                        {AccountResources.TokenDescriptionLabel}
                                                    </label>
                                                    <input id="pat-descritionInput" aria-labelledby="pat-descriptionid" className="input-field input-visible description" name="description" type="text" maxLength={256} autoFocus defaultValue={this.props.description} />

                                                    <label className="error description-error"></label>
                                                </div>

                                                {
                                                    this.props.expiresUtc &&
                                                    <div className="existing-expiration-wrapper section-box">
                                                        <label className="existing-expiration-date form-label">
                                                            {AccountResources.TokenExpirationDateLabel}
                                                        </label>
                                                        {this.props.expiresUtc}
                                                    </div>
                                                }

                                                <div className="expiration-wrapper section-box">
                                                    <label className="expiration-label form-label" id="pat-expiration-id">
                                                        {AccountResources.TokenExpirationLabel}
                                                    </label>
                                                    <select className="drpdown inputfield input-visible expiration" name="expiration" aria-labelledby="pat-expiration-id">
                                                        {expirationComponents}
                                                    </select>
                                                    <label className="error expiration-error"></label>
                                                </div>

                                                {
                                                    !this.props.authorizationId && this.props.allAccounts &&
                                                    <div className="account-wrapper section-box account-wrapper">
                                                        <label className="account-label form-label" id="pat-accountsel-id">
                                                            {AccountResources.TokenAccountSelectionLabel}
                                                        </label>
                                                        <select className="drpdown inputfield input-visible account" name="account" aria-labelledby="pat-accountsel-id" defaultValue={this.props.currentAccount || "all_accounts"}>
                                                            {accountComponents}
                                                        </select>
                                                    </div>
                                                }

                                                <div className="authorized-scopes section-box">
                                                    <div className="label-row authorized-scopes-label">
                                                        <label className="form-label section-box authorization-label">
                                                            {AccountResources.TokenAuthorizedScopesLabel}
                                                        </label>
                                                    </div>
                                                    <div className="radio-field">
                                                        <div className="all-scopes">
                                                            <input type="radio" id="AllScopes" name="scopeMode" className="scope-mode-all" value="AllScopes" defaultChecked={this.props.scopeMode === ScopeMode.AllScopes} />
                                                            <label htmlFor="AllScopes">{AccountResources.TokenAllScopesSelection}</label>
                                                        </div>
                                                        <div className="selected-scopes">
                                                            <input type="radio" id="SelectedScopes" name="scopeMode" className="scope-mode-selected" value="SelectedScopes" defaultChecked={this.props.scopeMode === ScopeMode.SelectedScopes} />
                                                            <label htmlFor="SelectedScopes">{AccountResources.TokenSelectedScopeSelection}</label>
                                                        </div>
                                                    </div>
                                                    <div className={css("scopes check-field", this.props.scopeMode === ScopeMode.AllScopes ? "disabled" : "")} role="group">
                                                        {scopeComponents}
                                                    </div>
                                                </div>

                                                <div className="button-container">
                                                    <div className="button-field">
                                                        <button type="submit" className="token-save-button formInput" disabled={true}>{this.props.authorizationId ? AccountResources.DialogSave : AccountResources.TokenGenerateButton}</button>
                                                        <button type="button" className="token-cancel-button formInput">{AccountResources.DialogCancel}</button>
                                                        <img className="wait" alt={AccountResources.PleaseWait} src={VSS_Context.getPageContext().webAccessConfiguration.paths.resourcesPath + "big-progress.gif"} />
                                                    </div>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}