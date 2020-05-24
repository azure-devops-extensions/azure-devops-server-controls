/// <reference types="react" />

import * as React from "react";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { Component as MarkdownRenderer } from "DistributedTaskControls/Components/MarkdownRenderer";
import { SafeLink } from "DistributedTaskControls/Components/SafeLink";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { DefaultButton } from "OfficeFabric/Button";
import { Callout } from "OfficeFabric/Callout";
import { DirectionalHint } from "OfficeFabric/ContextualMenu";
import { FocusZone, FocusZoneDirection } from "OfficeFabric/FocusZone";
import { FocusTrapZone } from "OfficeFabric/FocusTrapZone";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/CalloutComponent";

export interface ICalloutContentProps {
    calloutHeader?: string;
    calloutDescription?: string;
    calloutMarkdown?: string;
    calloutLink?: string;
    calloutLinkText?: string;
    calloutFooterText?: string;
    calloutAdditionalContent?: () => JSX.Element;
    calloutContentAriaLabel?: string;
    calloutFooterOnClick?: () => void;
}

export interface ICalloutComponentProps extends Base.IProps {
    targetElement?: HTMLElement;
    calloutContentProps: ICalloutContentProps;
    calloutDismissDelegate?: (ev: Event | React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => void;
}

const CalloutHeader = ({ header }) => (
    <div className="callout-header">{header}</div>
);

const CalloutDescription = ({ description }) => (
    <div className="callout-description">{description}</div>
);

const CallOutLink = ({ target, text }) => (
    <div className="callout-link">
        <SafeLink href={target} target="_blank">{text}</SafeLink>
        <span className="bowtie-icon bowtie-navigate-external" />
    </div>
);

const CalloutFooter = ({ text, onClick }) => (
    <div className="callout-footer">
        <DefaultButton onClick={onClick} className="callout-footer-btn" ariaLabel={text}>
            {text}
        </DefaultButton>
    </div>
);

export class CalloutComponent extends Base.Component<ICalloutComponentProps, Base.IStateless> {

    public render(): JSX.Element {
        return (
            <Callout
                className="dtc-callout-component"
                target={this.props.targetElement}
                onDismiss={this._onCalloutDismiss}
                gapSpace={5}
                setInitialFocus={true}
                directionalHint={DirectionalHint.rightCenter}>

                <FocusTrapZone isClickableOutsideFocusTrap={true}>
                    <FocusZone className="info-callout" direction={FocusZoneDirection.vertical}>
                        <div className="dtc-callout"
                            data-is-focusable={true}
                            aria-label={this.props.calloutContentProps.calloutContentAriaLabel}>
                            <div className="dtc-callout-content">
                                {this.props.calloutContentProps.calloutHeader && <CalloutHeader header={this.props.calloutContentProps.calloutHeader} />}
                                {this.props.calloutContentProps.calloutDescription && < CalloutDescription description={this.props.calloutContentProps.calloutDescription} />}
                                {this.props.calloutContentProps.calloutMarkdown && < MarkdownRenderer markdown={this.props.calloutContentProps.calloutMarkdown} />}
                                {this.props.calloutContentProps.calloutLinkText && this.props.calloutContentProps.calloutLink &&
                                    <CallOutLink target={this.props.calloutContentProps.calloutLink} text={this.props.calloutContentProps.calloutLinkText} />}
                                {this.props.calloutContentProps.calloutAdditionalContent && this.props.calloutContentProps.calloutAdditionalContent()}
                            </div>
                        </div>
                        {this.props.calloutContentProps.calloutFooterText &&
                            <CalloutFooter text={this.props.calloutContentProps.calloutFooterText} onClick={this._onCalloutFooterOnClick} />}
                    </FocusZone>
                </FocusTrapZone>
            </Callout>
        );
    }

    private _onCalloutDismiss = (ev: Event | React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>): void => {
        if (this.props.calloutDismissDelegate) {
            this.props.calloutDismissDelegate(ev);
        }

        //Setting focus:
        //If the event type is click, then set focus on the target element
        if (ev.type === "click") {
            (ev.target as HTMLElement).focus();
        }
        //Else set the target to the target element from which the callout appears
        else if (this.props.targetElement) {
            this.props.targetElement.focus();
        }
    }

    private _onCalloutFooterOnClick = (): void => {
        if (this.props.calloutContentProps.calloutFooterOnClick) {
            this.props.calloutContentProps.calloutFooterOnClick();
        }
    }
}

