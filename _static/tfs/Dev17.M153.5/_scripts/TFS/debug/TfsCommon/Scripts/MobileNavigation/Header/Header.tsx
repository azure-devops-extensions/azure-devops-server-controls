import * as React from "react";

import "VSS/LoaderPlugins/Css!TfsCommon/MobileNavigation/Header/Header";

import { Area, Feature } from "TfsCommon/Scripts/CustomerIntelligenceConstants";
import { getPageContext } from "VSS/Context";
import { NavigationContextLevels } from "VSS/Common/Contracts/Platform";
import { HubsService } from "VSS/Navigation/HubsService";
import * as Service from "VSS/Service";
import { autobind } from "OfficeFabric/Utilities";

import * as Resources from "TfsCommon/Scripts/Resources/TFS.Resources.TfsCommon";

import { IHeaderProps } from "TfsCommon/Scripts/MobileNavigation/Header/Header.props";
import { Sidebar } from "TfsCommon/Scripts/MobileNavigation/Sidebar/Sidebar";
import { Navigation } from "TfsCommon/Scripts/MobileNavigation/Navigation/Navigation";
import * as Telemetry from "VSS/Telemetry/Services";

export interface IHeaderState {
    showSidebar: boolean;
}

export class Header extends React.Component<IHeaderProps, IHeaderState> {
    constructor(props: IHeaderProps, context: any) {
        super(props, context);

        this.state = {
            showSidebar: false
        };
    }

    public render() {
        const { showSidebar } = this.state;

        const sidebarHeaderHref = this._getSidebarHeaderHref();

        const { label, uri } = this._getHeaderInfo();

        return <div className="mobile-navigation-header">
            <button className="mobile-navigation-header-button" onClick={this._onClick} aria-label={Resources.MobileNavigation_ButtonOpenLabel}>
                <span className="bowtie-icon bowtie-menu" />
            </button>

            <div className="mobile-navigation-header-title">
                <a href={uri}>
                    {label}
                </a>
            </div>

            <Sidebar
                onDismiss={this._onSidebarDismiss}
                isOpen={showSidebar}
                headerLabel={this._getSidebarLabel()}
                headerHref={sidebarHeaderHref}
                brandHref={sidebarHeaderHref}>
                <Navigation postNavigation={this._onSidebarDismiss} />
            </Sidebar>
        </div>;
    }

    private _getHeaderInfo(): {
        label: string;
        uri: string;
    } {
        const pageContext = getPageContext();

        const hubService = Service.getLocalService(HubsService);

        const selectedHubId = hubService.getSelectedHubId();
        const selectedHub = hubService.getHubById(selectedHubId);

        return {
            label: selectedHub && selectedHub.name || pageContext.webContext.account.name,
            uri: selectedHub && selectedHub.uri || document.location.href
        };
    }

    private _getSidebarLabel() {
        const pageContext = getPageContext();
        const { webContext, navigation } = pageContext;

        let label = "";

        // Project
        if (webContext.project && webContext.project.name) {
            label = webContext.project.name;
        }

        // ... and team
        if (navigation.topMostLevel === NavigationContextLevels.Team && webContext.team && webContext.team.name) {
            label += ` / ${webContext.team.name}`;
        }

        if (!label) {
            // Collection
            if (webContext.collection && webContext.collection.name) {
                return webContext.collection.name;
            }

            // Account
            if (webContext.account && webContext.account.name) {
                return webContext.account.name;
            }
        }

        return label;
    }

    @autobind
    private _onClick() {
        this.setState({
            showSidebar: true
        });
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(Area.MobileNavigation, Feature.HamburgerMenuClick, {}), false);
    }

    @autobind
    private _onSidebarDismiss() {
        this.setState({
            showSidebar: false
        });
    }

    private _getSidebarHeaderHref(): string {
        const pageContext = getPageContext();
        const { webContext } = pageContext;

        if (webContext.collection && webContext.collection.uri) {
            return webContext.collection.uri;
        }

        if (webContext.account && webContext.account.uri) {
            return webContext.account.uri;
        }

        // We shouldn't get here. Just for safety.
        return "#";
    }
}
