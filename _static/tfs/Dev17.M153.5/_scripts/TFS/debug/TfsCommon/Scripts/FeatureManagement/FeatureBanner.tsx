import "VSS/LoaderPlugins/Css!fabric"
import "VSS/LoaderPlugins/Css!TfsCommon/FeatureManagement/FeatureManagement";

import * as React from "react";
import * as ReactDOM from "react-dom";

import { DefaultButton, PrimaryButton  } from "OfficeFabric/Button";
import { Fabric } from "OfficeFabric/Fabric";
import { Link } from "OfficeFabric/Link";

import * as ComponentBase from "VSS/Flux/Component";
import * as Context from "VSS/Context";
import * as FeatureManagement_Contracts from "VSS/FeatureManagement/Contracts";
import * as FeatureManagement_RestClient from "VSS/FeatureManagement/RestClient";
import * as Resources from "TfsCommon/Scripts/Resources/TFS.Resources.TfsCommon";
import * as SDK_Shim from "VSS/SDK/Shim";
import * as Service from "VSS/Service";
import * as SettingsRestClient from "VSS/Settings/RestClient";
import * as StringUtils from "VSS/Utils/String";
import * as Telemetry from "VSS/Telemetry/Services";
import * as VSS from "VSS/VSS";

import * as FeatureCallouts_Async from "TfsCommon/Scripts/FeatureManagement/FeatureCallouts";
import * as FeatureManagementUtil_Async from "TfsCommon/Scripts/FeatureManagement/FeatureManagementUtil";

const featureBannerDismissedSettingPrefix = "FeatureAds/Dismissed/";
const featureBannerDismissedCalloutSetting = "FeatureAds/DismissCalloutShown";
const telemetryArea = "FeatureBanner";

interface IFeatureBannerComponentProps extends ComponentBase.Props {
    feature: FeatureManagement_Contracts.ContributedFeature;
    message: string;
    onDismiss: Function;
    showDismissCallout?: boolean;
}

interface IFeatureBannerComponentState {
}

class FeatureBannerComponent extends React.Component<IFeatureBannerComponentProps, IFeatureBannerComponentState> {

    private _feedbackText: string;

    constructor(props: IFeatureBannerComponentProps) {
        super(props);
        this.state = {};
    }

    public render(): JSX.Element {
        return (
            <Fabric className="feature-banner">
                <span className="feature-name">{StringUtils.format(Resources.FeatureBannerNameFormat, this.props.feature.name)}</span>
                <span className="description">
                    <span className="description-text">{this.props.message || this.props.feature.description || ""}</span>
                    {
                        (this.props.feature._links && this.props.feature._links.learn) ?
                            <Link href={this.props.feature._links.learn.href} className="learn-more" target="_blank">{Resources.LearnMore}</Link> :
                            null
                    }
                </span>
                <PrimaryButton onClick={this._onTryItClicked}>{Resources.FeatureBannerTryItButton}</PrimaryButton>
                <DefaultButton onClick={this._onDismissedClicked}>{Resources.FeatureBannerDismissButton}</DefaultButton>
            </Fabric>
        );
    }

    private _onTryItClicked = (): void => {

        let userScoped = this.props.feature.scopes.filter(s => s.userScoped).length > 0;

        Telemetry.publishEvent(new Telemetry.TelemetryEventData(telemetryArea, "bannerTryItClicked", {
            featureId: this.props.feature.id,
            openedPanel: !userScoped
        }), true);
        
        if (userScoped) {

            // User-scoped feature. Toggle the scope on for the user right here through an XHR call
            let stateToUpdate = {
                state: FeatureManagement_Contracts.ContributedFeatureEnabledValue.Enabled
            } as FeatureManagement_Contracts.ContributedFeatureState;

            const featureManagementClient = Service.getClient(FeatureManagement_RestClient.FeatureManagementHttpClient, null, this.props.feature.serviceInstanceType);
            let setFeatureStatePromise: IPromise<FeatureManagement_Contracts.ContributedFeatureState>;
            featureManagementClient.setFeatureState(stateToUpdate, this.props.feature.id, "me").then((newState) => {
                this._dismissAd().then(() => {
                    this._setCalloutCookie();
                    window.location.reload();
                });
            }, (error) => {
                VSS.handleError(error);
            });
        }
        else {
            // The feature is not manageable at the user scope. Show the Feature Management panel with this feature selected.
            VSS.requireModules(["TfsCommon/Scripts/FeatureManagement/FeatureManagementUtil"]).spread((_FeatureManagementUtil: typeof FeatureManagementUtil_Async) => {
                _FeatureManagementUtil.showFeatureManagementUI({
                    selectedFeatureId: this.props.feature.id,
                    processChanges: (changes) => {
                        const thisFeatureToggled = changes.some(c => c.featureId === this.props.feature.id);

                        Telemetry.publishEvent(new Telemetry.TelemetryEventData(telemetryArea, "bannerPanelClosed", {
                            featureId: this.props.feature.id,
                            toggledFeature: thisFeatureToggled
                        }), true);

                        if (thisFeatureToggled) {
                            this._setCalloutCookie();
                            return this._dismissAd();
                        }
                    }
                });
            });
        }
    };

    private _setCalloutCookie() {
        let secureFlag = "";
        if (window.location.protocol.toLowerCase().indexOf("https") === 0) {
            secureFlag = ";secure";
        }
        document.cookie = "Feature-Enabled-Callout=" + this.props.feature.id + ";path=/;max-age=10" + secureFlag;
    }

    private _onDismissedClicked = (): void => {
        
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(telemetryArea, "bannerDismissed", {
            featureId: this.props.feature.id
        }));
        
        this.props.onDismiss();
        this._dismissAd();

        if (this.props.showDismissCallout) {
            VSS.requireModules(["TfsCommon/Scripts/FeatureManagement/FeatureCallouts"]).spread((_FeatureCallouts: typeof FeatureCallouts_Async) => {
                _FeatureCallouts.showFeatureBannerDismissedCallout();
            });
        }
    };

    private _dismissAd(): IPromise<any> {
        const settingEntries: IDictionaryStringTo<any> = {};

        settingEntries[featureBannerDismissedSettingPrefix + this.props.feature.id] = true;
        settingEntries[featureBannerDismissedCalloutSetting] = true;

        const settingsClient = Service.getClient(SettingsRestClient.SettingsHttpClient);
        return settingsClient.setEntries(settingEntries, "me");
    }
}

SDK_Shim.registerContent("featureManagement.banner", (context) => {

    Telemetry.publishEvent(new Telemetry.TelemetryEventData(telemetryArea, "bannerShown", {
        featureId: context.options.contentProperties.feature.id
    }));
    
    ReactDOM.render(
        <FeatureBannerComponent
            feature={context.options.contentProperties.feature}
            message={context.options.contentProperties.message}
            showDismissCallout={context.options.contentProperties.showDismissCallout}
            onDismiss={context.options.onDismiss}
        />,
        context.container);
});