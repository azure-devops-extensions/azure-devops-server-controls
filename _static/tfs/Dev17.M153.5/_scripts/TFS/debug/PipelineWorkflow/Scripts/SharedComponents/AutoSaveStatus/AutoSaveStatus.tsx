
import * as React from "react";
import * as Base from "DistributedTaskControls/Common/Components/Base";

import { CommandButton } from "OfficeFabric/Button";
import { TooltipHost } from "VSSUI/Tooltip";
import { css } from "OfficeFabric/Utilities";

import * as Utils_String from "VSS/Utils/String";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/SharedComponents/AutoSaveStatus/AutoSaveStatus";

export interface IAutoSaveStatusProps extends Base.IProps {
    isSaveInProgress?: boolean;
    errorMessage?: string;
    onRetryClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

/**
 * Component to show the auto save status and corresponding error scenarios
 */
export class AutoSaveStatus extends Base.Component<IAutoSaveStatusProps, Base.IStateless> {

    constructor(props) {
        super(props);
        this._tooltipId = "auto-save-status-tooltip-id" + Utils_String.generateUID();
    }

    public render(): JSX.Element {
        let isSaveInProgress: boolean = !!this.props.isSaveInProgress;
        let isErrorMode: boolean = this._isErrorMode();
        let className: string = css(this.props.cssClass, "auto-save-container", isSaveInProgress ? "auto-save-inprogress" : "auto-save-error");

        // Show this component when auto save is in progress or auto save failed with error
        if (isSaveInProgress || isErrorMode) {
            return (
                <div className={className} aria-live="polite" aria-relevant="all" >
                    {this._getIconSection()}
                    {this._getTextSection()}
                    {this._getRetrySection()}
                </div>
            );
        } else {
            return null;
        }

    }

    public componentDidUpdate(prevProps: IAutoSaveStatusProps) {
        //  If previous error and new error is not same, and the icon button exists,
        //  Then, focus on the icon button.
        //  In case of new error, try-again. The error message strings are not equal so the focus goes to the icon button correctly

        if ((Utils_String.defaultComparer(prevProps.errorMessage, this.props.errorMessage) !== 0) && this._isErrorMode() && this._iconButton) {
            this._iconButton.focus();
        }
    }

    private _getIconSection(): JSX.Element {
        let isSaveInProgress: boolean = !!this.props.isSaveInProgress;
        let text: string = isSaveInProgress ? Resources.AutoSaveInProgressText : Resources.AutoSaveFailedText;
        let iconClass: string = isSaveInProgress ? "bowtie-spinner" : "bowtie-status-error-outline";
        
        return (
            <TooltipHost content={this.props.errorMessage} id={this._tooltipId}>
                <div ref={this._resolveRef("_iconButton")} aria-describedby={this._tooltipId} tabIndex={0} aria-label={text} className={css("auto-save-section-icon", "bowtie-icon", iconClass)}></div>
            </TooltipHost>
        );
    }

    private _getTextSection(): JSX.Element {
        let isSaveInProgress: boolean = !!this.props.isSaveInProgress;
        let text: string = isSaveInProgress ? Resources.AutoSaveInProgressText : Resources.AutoSaveFailedText;
        return (
            <div className="auto-save-section-text">{text}</div>
        );
    }

    private _getRetrySection(): JSX.Element {
        let isErrorMode: boolean = this._isErrorMode();

        if (!!this.props.onRetryClick && isErrorMode) {
            return (
                <div className="auto-save-section-retry-container">
                    <div className="retry-button-separator" />
                    <div className="auto-save-error-retry-button">
                        <CommandButton
                            styles={{ textContainer: { fontSize: "12px", color: "#106ebe" }, root: { height: "20px" } }}
                            onClick={this.props.onRetryClick}
                            ariaLabel={Resources.AutoSaveFailedRetryButtonAriaLabel} >{Resources.TryAgainText}</CommandButton>
                    </div>
                </div>
            );
        } else {
            return null;
        }
    }

    private _isErrorMode(): boolean {
        let isSaveInProgress: boolean = !!this.props.isSaveInProgress;
        let isErrorMessagePresent: boolean = !!this.props.errorMessage;
        let isErrorMode: boolean = !isSaveInProgress && isErrorMessagePresent;
        return isErrorMode;
    }

    private _onRetryClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        if (this.props.onRetryClick) {
            this.props.onRetryClick(event);
        }
    }

    private _iconButton: HTMLDivElement;
    private _tooltipId: string;
}