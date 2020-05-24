import * as React from "react";
import { getId } from "OfficeFabric/Utilities";
import { KeyboardAccesibleComponent } from "Presentation/Scripts/TFS/Components/KeyboardAccessible";
import { Callout, ICalloutProps } from "OfficeFabric/Callout";
import { Link } from "OfficeFabric/Link";
import {IconButton } from "OfficeFabric/Button";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import * as MyExperiencesResources from "MyExperiences/Scripts/Resources/TFS.Resources.MyExperiences";

import "VSS/LoaderPlugins/Css!MyExperiences/Scenarios/CreateProject/Components/LinkCallout";


export interface ILinkCalloutProps {
    /**
     * The link text clicking on which the callout will be displayed
     */
    linkText: string;
    /**
     * The tooltip to be shown on the link callout
     */
    tooltip?: string;
    /**
     * The aria-label to be shown on the link callout
     */
    ariaLabel?: string;
    /**
     * The main text that is displayed in the link callout
     */
    calloutText: string;
    /**
     * The tooltip for the main text in the callout, if not provided no tooltip will be set
     */
    calloutTextToolTip?: string;
    /**
     * The title for the link callout, rendered if the title is provided, else no title is rendered
     */
    calloutTitle?: string;
    /**
     * The tooltip for the title of the callout, if not provided no tooltip will be set
     */
    calloutTitleToolTip?: string;
    /**
     * The url to which the "Learn more" link would point to. If url is provided, the learn more link is rendered, else no learn more link is rendered
     */
    learnMoreUrl?: string;
    /**
     * Indicator of how the callout should be anchored to its targetElement, default is DirectionalHint.rightCenter
     */
    directionalHint?: DirectionalHint;
    /**
     * The gap space between the target element and the callout, default is 20px
     */
    gapSpace?: number;
}

export interface ILinkCalloutState {
    isCalloutVisible?: boolean;
}

export class LinkCallout extends React.Component<ILinkCalloutProps, ILinkCalloutState> {
    private _element: HTMLElement;
    private _id: string;
    private _calloutId: string;
    private _calloutTextId: string;
    private _calloutTitleId: string;

    constructor(props: ILinkCalloutProps, context?: any) {
        super(props, context);

        // State initialization
        this.state = {
            isCalloutVisible: false
        };
        this._id = getId("link-callout");
        this._calloutId = this._id + "-callout";
        this._calloutTextId = this._calloutId + "-text";
        this._calloutTitleId = this._calloutId + "-title";
    }

    public render(): JSX.Element {
        return (
            <div className="link-callout"
                ref={(icon) => this._element = icon}
                title={this.props.tooltip}
                aria-label={this.props.ariaLabel}>
                <Link className="link-callout-container"
                    aria-owns={(this.state.isCalloutVisible ? this._calloutId : null)}
                    onClick={() => this._onIconClick()}>
                    <span className="text">
                        {this.props.linkText}
                    </span>
                </Link>
                {
                    this.state.isCalloutVisible &&
                    <Callout
                        role="dialog"
                        className="link-callout-dialog"
                        ariaLabelledBy={this.props.calloutTitle && this._calloutTitleId}
                        ariaDescribedBy={this.props.calloutText && this._calloutTextId}
                        target={this._element}
                        onDismiss={() => this._onCalloutDismiss()}
                        directionalHint={this.props.directionalHint || DirectionalHint.rightCenter}
                        gapSpace={this.props.gapSpace}
                        isBeakVisible={true}
                        doNotLayer={true}
                        beakWidth={16}
                        setInitialFocus={true}>
                        <IconButton
                            className="close-callout-button"
                            iconProps={{ iconName: "Cancel" }}
                            ariaLabel={MyExperiencesResources.CloseDialogButtonLabel}
                            onClick={() => this._onCalloutDismiss()}
                        />
                        <div className="callout-details" id={this._calloutId}>
                            {
                                this.props.calloutTitle &&
                                <div id={this._calloutTitleId} className="title" title={this.props.calloutTitleToolTip || ""} aria-label={this.props.calloutTitleToolTip || ""}>
                                    {this.props.calloutTitle}
                                </div>
                            }
                            <div id={this._calloutTextId} className="text" title={this.props.calloutTextToolTip || ""} aria-label={this.props.calloutTextToolTip || ""}>
                                {this.props.calloutText}
                            </div>
                            {
                                this.props.learnMoreUrl &&
                                <Link className="learn-more-link"
                                    href={this.props.learnMoreUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={MyExperiencesResources.LearnMoreText}>
                                    {MyExperiencesResources.LearnMoreText}
                                </Link>
                            }
                        </div>
                    </Callout>
                }
            </div>
        );
    }

    public componentWillUnmount(): void {
        this._element = null;
    }

    /**
     * Onclick event handler for both the link and close icons. It toggles the visibility of the callout on click
     */
    private _onIconClick(): void {
        this.setState({
            isCalloutVisible: !this.state.isCalloutVisible
        });
    }

    /**
     * Close the callout when the callout is dismissed by clicking else where in the view
     */
    private _onCalloutDismiss(): void {
        this.setState({
            isCalloutVisible: false
        });
    }
}
