/// <reference types="react" />
import "VSS/LoaderPlugins/Css!fabric";

import * as React from "react";
import * as ReactDOM from "react-dom";
import * as ComponentBase from "VSS/Flux/Component";

import * as VSS from "VSS/VSS";
import * as VSS_Controls from "VSS/Controls";

import { Nav, INavLink } from 'OfficeFabric/Nav';

import TFS_Host = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import FeatureAvailability = require("VSS/FeatureAvailability/Services");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import accountResources = require("Account/Scripts/Resources/TFS.Resources.Account");
import SecurityModels = require("Account/Scripts/TFS.Details.Security.Common.Models");

// Declare the action urls which gets populated in the json island in the view
declare var ActionUrls: SecurityModels.DetailsSecurityActionUrlModel;

export interface ISecurityNavProps extends ComponentBase.Props {
    selectedNavItem: string
}

export interface ISecurityNavState {
}

export class SecurityNav extends ComponentBase.Component<ISecurityNavProps, ISecurityNavState>  {

    constructor(props: ISecurityNavProps) {
        super(props);
        //Set initial state of component 
        this.state = {
        } as ISecurityNavState;
    }

    public render(): JSX.Element {
        return (
            <div className="nav-container">
                <Nav
                    groups={[{
                        links: this._generateLinks()
                    }]}
                    initialSelectedKey={this.props.selectedNavItem }
                />
            </div>
        );
    }

    private _generateLinks(): INavLink[]{
        var links: INavLink[] = [];

        links.push({ key: "pat", name: accountResources.TokenListPageTitle, url: ActionUrls.PersonalAccessToken.Index });

        var tfsContext = TFS_Host.TfsContext.getDefault();
        if (tfsContext.isHosted) {
            links.push({ key: "altcreds", name: accountResources.AlternateCredentialsPageTitle, url: ActionUrls.AlternateCredentials.Index });
            links.push({ key: "oauth", name: accountResources.OAuthPageTitle, url: ActionUrls.OAuthAuthorizations.Index });
        }

        var publicKeysEnabled = FeatureAvailability.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.SSHPublicKeys, false);
        if (publicKeysEnabled) {
            links.push({ key: "publicKey", name: accountResources.SSH_IndexPageTitle, url: ActionUrls.PublicKey.Index });
        }

        return links;
    }
}