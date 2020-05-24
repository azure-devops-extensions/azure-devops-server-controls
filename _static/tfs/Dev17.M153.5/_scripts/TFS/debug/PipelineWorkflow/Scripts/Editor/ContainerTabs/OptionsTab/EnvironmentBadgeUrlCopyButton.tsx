/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { IconButton } from "OfficeFabric/Button";
import { Callout } from "OfficeFabric/Callout";
import { TooltipHost } from "VSSUI/Tooltip";
import { css } from "OfficeFabric/Utilities";

export interface IBadgeUrlCopyButtonProps extends Base.IProps {
    onClick: () => void;
}

export interface IBadgeUrlCopyButtonState extends Base.IState {
    isCalloutVisible: boolean;
}

export class BadgeUrlCopyButton extends Base.Component<IBadgeUrlCopyButtonProps, IBadgeUrlCopyButtonState> {

    public render() {

        return (
            <div className="badge-url-copy-button"
                ref={this._resolveRef("_elementToFocus")}>

                {
                    !this.state.isCalloutVisible ? (<TooltipHost content={Resources.CopyToClipboardText}>
                        {this._getButton()}
                    </TooltipHost>) : this._getButton()
                }

                {this.state.isCalloutVisible && (
                    <Callout
                        gapSpace={0}
                        target={this._elementToFocus}
                        onDismiss={this._onCalloutDismiss} >
                        <div className="badge-url-callout-content">
                            {Resources.CopiedToClipboard}
                        </div>
                    </Callout>)
                }

            </div>);
    }

    private _getButton(): JSX.Element {
        return (<IconButton
            className={css("badge-url-copy-button", "task-input-icon-button", "fabric-style-overrides", "icon-button-override")}
            iconProps={{ iconName: "Copy" }}
            onClick={this._onShowCopyClicked}
            ariaLabel={Resources.ARIALabelCopyBadgeURL}
            ariaDescription={Resources.ARIADescriptionCopyBadgeURL} />);
    }

    public componentWillMount() {
        this.setState({
            isCalloutVisible: false
        });
    }

    private _onShowCopyClicked = (): void => {
        this.setState({
            isCalloutVisible: true
        });

        this.props.onClick();
    }

    private _onCalloutDismiss = (): void => {
        this.setState({
            isCalloutVisible: false
        });
    }

    private _elementToFocus: HTMLElement;
}
