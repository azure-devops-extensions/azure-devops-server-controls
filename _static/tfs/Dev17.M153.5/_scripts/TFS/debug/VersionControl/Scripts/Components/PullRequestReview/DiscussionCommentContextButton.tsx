import * as React from "react";
import { DefaultButton, PrimaryButton, IButtonProps, IButton } from "OfficeFabric/Button";
import { DirectionalHint, TooltipHost } from "VSSUI/Tooltip";
import { autobind, BaseComponent, css } from "OfficeFabric/Utilities";
import { format } from "VSS/Utils/String";
import { DiscussionThread, DiscussionThreadUtils, PositionContext } from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import * as VSS_Telemetry from "VSS/Telemetry/Services";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";

import "VSS/LoaderPlugins/Css!VersionControl/DiscussionCommentContextButton";

export interface DiscussionCommentContextButtonProps {
    thread: DiscussionThread;
    viewingThreadInContext?: boolean;
    latestIterationId?: number;
    isReadOnly?: boolean;
    onViewDiffContext?: () => void;
    onResetDiffContext?: () => void;
}

/**
 * Button to toggle between latest diff for this comment and the original context.
 */
export class DiscussionCommentContextButton extends React.PureComponent<DiscussionCommentContextButtonProps, {}> {

    private _buttonRef: IButton | null = null;

    public render(): JSX.Element {
        const updateNumber: number = DiscussionThreadUtils.getThreadUpdateNumber(this.props.thread);
        const threadExists: boolean = Boolean(this.props.thread) && !this.props.thread.isDeleted;
        const threadWasTracked: boolean = threadExists && Boolean(this.props.thread.trackingCriteria);

        // threads are generally not tracked if left on the base (unless a rebase happens), so show the button
        // if thread was on the left buffer in a previous iteration in case the diff changed
        const threadOnBase: boolean = threadExists
            && this.props.thread.position
            && this.props.thread.firstComparingIteration === this.props.thread.secondComparingIteration
            && this.props.thread.position.positionContext === PositionContext.LeftBuffer
            && this.props.thread.secondComparingIteration < this.props.latestIterationId;

        // don't render if thread doesn't exist or has a bad update number
        // also don't render if we're viewing the latest thread context but it wasn't tracked
        if (!threadExists || updateNumber < 0 || (!this.props.viewingThreadInContext && !threadWasTracked && !threadOnBase)) {
            return null;
        }

        const calloutContent: string = this.props.isReadOnly ? format(VCResources.DiscussionCommentDisabledContextCallout, updateNumber) : "";
        const buttonLabelContent: string = this.props.isReadOnly
            ? format(VCResources.DiscussionCommentChangeContextTag, updateNumber) // update {x}
            : this.props.viewingThreadInContext 
            ? VCResources.DiscussionCommentResetContextLabel // view latest diff
            : VCResources.DiscussionCommentChangeContextLabel; // view original diff
        
        const buttonProps: IButtonProps = {
            className: css("discussion-comment-context-button"),
            ariaLabel: calloutContent,
            disabled: this.props.isReadOnly,
            onClick: this._onContextButtonClick,
            componentRef: this._setButtonRef,
        };

        const buttonElement: JSX.Element = this.props.isReadOnly
            ? <span className={css(buttonProps.className, "readonly")} role={"note"} aria-label={calloutContent} tabIndex={0}>{buttonLabelContent}</span>
            : this.props.viewingThreadInContext
            ? <PrimaryButton {...buttonProps}>{buttonLabelContent}<span className="bowtie-icon bowtie-navigate-close" /></PrimaryButton>
            : <DefaultButton {...buttonProps}>{buttonLabelContent}</DefaultButton>;

        return (
            <div className={"discussion-comment-context"}>
                { calloutContent.length
                ?   <TooltipHost
                        content={calloutContent}
                        calloutProps={{ gapSpace: 4 }}
                        directionalHint={DirectionalHint.topCenter}>
                        {buttonElement}
                    </TooltipHost>
                : buttonElement }
            </div>
        );
    }
    
    public componentDidUpdate(prevProps: DiscussionCommentContextButtonProps): void {
        // if we're swapping between viewing and not, the button was just activated and needs to 
        // be re-focused to account for keyboard accessibility
        if (prevProps && prevProps.viewingThreadInContext !== this.props.viewingThreadInContext) {
            this._buttonRef && this._buttonRef.focus();
        }
    }

    @autobind
    private _onContextButtonClick(): void {
        const telemetryEvent = new VSS_Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            CustomerIntelligenceConstants.PULL_REQUEST_COMMENT_CONTEXT_FEATURE, {
                threadId: DiscussionThreadUtils.copyWithEUIIRedacted(this.props.thread),
                viewingThreadInContext: this.props.viewingThreadInContext,
                latestIterationId: this.props.latestIterationId,
            });
        VSS_Telemetry.publishEvent(telemetryEvent);

        this.props.viewingThreadInContext
            ? this.props.onResetDiffContext && this.props.onResetDiffContext()
            : this.props.onViewDiffContext && this.props.onViewDiffContext();
    }

    @autobind
    private _setButtonRef(ref: IButton): void {
        this._buttonRef = ref;
    }
}
