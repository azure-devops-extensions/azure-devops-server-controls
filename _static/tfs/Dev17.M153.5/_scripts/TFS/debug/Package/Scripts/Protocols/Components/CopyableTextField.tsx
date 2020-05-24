import * as CopyToClipboard from "Package/Scripts/3rdParty/react-copy-to-clipboard";
import * as React from "react";

import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { TooltipHost } from "VSSUI/Tooltip";
import { css } from "OfficeFabric/Utilities";

import { Component, Props, State } from "VSS/Flux/Component";
import * as Utils_Accessibility from "VSS/Utils/Accessibility";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";
import { BrowserCheckUtils } from "VSS/Utils/UI";

import * as Actions from "Package/Scripts/Actions/Actions";
import { CiConstants } from "Feed/Common/Constants/Constants";
import { CustomerIntelligenceHelper } from "Package/Scripts/Helpers/CustomerIntelligenceHelper";
import * as PackageResources from "Feed/Common/Resources";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Protocols/Components/CopyableTextField";

export interface ICopyableTextFieldTelemetry {
    commandName: string;
    feedName: string;
    packageName?: string;
    packageVersion?: string;
    protocol: string;
    clientTool?: string;
}

export interface ICopyableTextFieldProps extends Props {
    text: string;
    // optional: when text shown to user needs to be different from what is copied to clipboard
    displayText?: string;
    telemetryProperties: ICopyableTextFieldTelemetry;
    buttonAriaLabel: string;
    textFieldAriaLabel: string;
    /*Id of the element for aria-describedby.
    Only provide this if you have assigned the same id to the element that describes the copiable text*/
    ariaDescribedByIdForLabelText?: string;
    // Optional Css class to put in child nodes
    cssClassToOverWrite?: string;
}

export interface ICopyableTextFieldState extends State {
    wasCopied: boolean;
}

export class CopyableTextField extends Component<ICopyableTextFieldProps, ICopyableTextFieldState> {
    private _copyButton: HTMLElement = null;

    constructor(props: ICopyableTextFieldProps) {
        super(props);
        this.state = {
            wasCopied: false
        };
    }

    public focus(): void {
        Utils_Core.delay(this, 0, () => {
            if (this._copyButton) {
                this._copyButton.focus();
            }
        });
    }

    public render(): JSX.Element {
        const tooltipText = this.state.wasCopied
            ? PackageResources.CopiedToClipboard
            : PackageResources.CopyToClipboard;

        return (
            <div className={"copyable-text-field bowtie"}>
                <div className={"copyable-text-field-text-tooltip-container"}>{this._getLabel()}</div>
                <TooltipHost content={tooltipText} directionalHint={DirectionalHint.bottomCenter}>
                    <CopyToClipboard text={this.props.text} onCopy={() => this._onCopy()}>
                        <button
                            className={"copy-button"}
                            onBlur={() => this.setState({ wasCopied: false })}
                            onMouseLeave={() => this.setState({ wasCopied: false })}
                            name={tooltipText}
                            aria-label={this.props.buttonAriaLabel}
                            ref={self => (this._copyButton = self)}
                        >
                            <span className={"bowtie-icon bowtie-edit-copy"} />
                        </button>
                    </CopyToClipboard>
                </TooltipHost>
            </div>
        );
    }

    private _getLabel(): JSX.Element {
        const lines = this._replaceNewLines();
        const divClassName = css("copyable-text-field-text", this.props.cssClassToOverWrite || "");
        return (
            <label
                className={divClassName}
                aria-describedby={
                    this.props.ariaDescribedByIdForLabelText ? this.props.ariaDescribedByIdForLabelText : null
                }
                aria-label={this.props.textFieldAriaLabel ? this.props.textFieldAriaLabel : null}
            >
                {lines.map(line => line)}
            </label>
        );
    }

    private _onCopy(): void {
        // workaround for IE11
        if ((window as any).clipboardData !== undefined && BrowserCheckUtils.isIE()) {
            (window as any).clipboardData.setData("text", this.props.text);
        }

        Utils_Accessibility.announce(PackageResources.CopiedToClipboard);

        this.setState({ wasCopied: true });

        // return the focus to the button in IE and edge
        if (BrowserCheckUtils.isIE() || BrowserCheckUtils.isEdge()) {
            this.focus();
        }

        Actions.CopyToClipboard.invoke(null);
        CustomerIntelligenceHelper.publishEvent(CiConstants.CopyCommand, this.props.telemetryProperties);
    }

    private _replaceNewLines(): React.ReactNode[] {
        const content: React.ReactNode[] = [];
        let displayText: string = this.props.displayText || this.props.text;
        if (displayText == null) {
            displayText = Utils_String.empty;
        }
        const lines = displayText.split(/\r\n|\r|\n/g);
        content.push(lines[0]);
        for (let i = 1; i < lines.length; i++) {
            content.push(<br key={i} />);
            content.push(lines[i]);
        }

        return content;
    }
}
