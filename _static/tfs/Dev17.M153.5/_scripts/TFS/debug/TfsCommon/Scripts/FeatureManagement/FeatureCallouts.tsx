import "VSS/LoaderPlugins/Css!fabric"
import "VSS/LoaderPlugins/Css!TfsCommon/FeatureManagement/FeatureManagement";

import * as React from "react";
import * as ReactDOM from "react-dom";

import { Callout, DirectionalHint } from "OfficeFabric/Callout";

import * as ComponentBase from "VSS/Flux/Component";
import * as FeatureManagement_Contracts from "VSS/FeatureManagement/Contracts";
import * as Resources from "TfsCommon/Scripts/Resources/TFS.Resources.TfsCommon";
import * as SDK_Shim from "VSS/SDK/Shim";
import * as StringUtils from "VSS/Utils/String";

interface IFeatureCalloutComponentProps extends ComponentBase.Props {
    headerText: string;
    bodyHtml: string;
    onDismiss: (ev?: any) => void;
}

interface IFeatureCalloutComponentState {
    fadingOut: boolean;
}

class FeatureCalloutComponent extends React.Component<IFeatureCalloutComponentProps, IFeatureCalloutComponentState> {

    private static INITIAL_START_FADE_TIMEOUT = 3000;
    private static FADE_CLOSE_TIMEOUT = 3000;
    private static INITIAL_ENTER_TIMEOUT = 2000;
    
    private _fadingTimeout: number;
    private _initialFadeTimeout: number;
    private _initialMouseEnterTimeout: number;

    private _mouseEntered: boolean;

    constructor(props: IFeatureCalloutComponentProps) {
        super(props);
        this.state = {
            fadingOut: false
        };
    }

    public componentDidMount() {

        this._initialFadeTimeout = window.setTimeout(() => {
            if (!this._mouseEntered) {
                this._startFadeOut();
            }
        }, FeatureCalloutComponent.INITIAL_START_FADE_TIMEOUT);

        this._initialMouseEnterTimeout = window.setTimeout(() => {
            this._initialMouseEnterTimeout = undefined;
        }, FeatureCalloutComponent.INITIAL_ENTER_TIMEOUT);
    }

    public componentWillUnmount() {
        window.clearTimeout(this._fadingTimeout);
        window.clearTimeout(this._initialFadeTimeout);
        window.clearTimeout(this._initialMouseEnterTimeout);
    }
    
    public render(): JSX.Element {
        let dismissedBodyHtml = { __html: this.props.bodyHtml };

        return <Callout
            target=".right-menu-bar .profile"
            className={"feature-callout" + (this.state.fadingOut ? " fading-out" : "")}
            gapSpace={0}
            directionalHint={DirectionalHint.bottomRightEdge}
            onDismiss={this.props.onDismiss}>

            <div className="callout-content" onMouseEnter={this._onMouseEnter} onMouseLeave={this._onMouseLeave}>
                <p className='callout-header'>{this.props.headerText}</p>
                <p dangerouslySetInnerHTML={dismissedBodyHtml} />
            </div>

        </Callout>;
    }

    private _startFadeOut() {

        this.setState({ fadingOut: true });

        this._fadingTimeout = window.setTimeout(() => {
            this.props.onDismiss();
        }, FeatureCalloutComponent.FADE_CLOSE_TIMEOUT);
    }

    private _onMouseEnter = (): void => {
        if (!this._initialMouseEnterTimeout && !this._mouseEntered) {
            this._mouseEntered = true;
            window.clearTimeout(this._fadingTimeout);
            this.setState({ fadingOut: false });
        }
    };

    private _onMouseLeave = (): void => {
        if (!this._initialMouseEnterTimeout && this._mouseEntered) {
            this._mouseEntered = false;
            this.props.onDismiss();
        }
    };
}

export function showFeatureEnabledCallout(feature: FeatureManagement_Contracts.ContributedFeature) {
    showFeatureCallout(StringUtils.format(Resources.FeatureEnabledCalloutHeader, feature.name), Resources.FeatureEnabledCalloutBodyHtml);
}

export function showFeatureBannerDismissedCallout() {
    showFeatureCallout(Resources.FeatureDismissedCalloutHeader, Resources.FeatureDismissedCalloutBodyHtml);
}

function showFeatureCallout(headerText: string, bodyHtml: string) {

    let container = document.createElement("div");
    document.body.appendChild(container);

    let onClose = () => {
        ReactDOM.unmountComponentAtNode(container);
        container.remove();
    };

    ReactDOM.render(
        <FeatureCalloutComponent
            headerText={headerText}
            bodyHtml={bodyHtml}
            onDismiss={onClose}
        />,
        container);
}

SDK_Shim.registerContent("featureManagement.enabledCallout", (context) => {
    showFeatureEnabledCallout(context.options.contentProperties.feature);
});