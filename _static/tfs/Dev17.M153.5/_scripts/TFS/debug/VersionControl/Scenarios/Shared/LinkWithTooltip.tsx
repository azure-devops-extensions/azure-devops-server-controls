import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { Link, ILink, ILinkProps } from "OfficeFabric/Link";
import { TooltipHost } from "VSSUI/Tooltip";
import { getId, autobind, css } from "OfficeFabric/Utilities";

import * as React from "react";

export interface LinkWithTooltipProps extends ILinkProps {
    tooltipContent: string;
    directionalHint?: DirectionalHint;
    /**
     * A non-visible description that will only be used by screen readers.
     * It's additional to the `tooltipContent`.
     */
    ariaDescription?: string;
}

export interface LinkWithTooltipState {
    isTooltipVisible: boolean;
}

export class LinkWithTooltip extends React.PureComponent<LinkWithTooltipProps, LinkWithTooltipState> {
    public state: LinkWithTooltipState = {
        isTooltipVisible: false,
    };

    private readonly tooltipId = getId("link-tooltip");
    private readonly ariaDescriptionDivId = getId("link-aria-description");
    private link: ILink;

    public render(): JSX.Element {
        return (
             <TooltipHost
                id={this.tooltipId}
                content={this.props.tooltipContent}
                directionalHint={this.props.directionalHint || DirectionalHint.bottomCenter}
                onTooltipToggle={this.onTooltipToggle}
            >
                <Link
                    aria-describedby={css({
                        [this.tooltipId]: this.state.isTooltipVisible,
                        [this.ariaDescriptionDivId]: this.props.ariaDescription,
                    }) || undefined}
                    componentRef={ref => this.link = ref}
                    {...this.props}
                />
                {
                    this.props.ariaDescription &&
                    <div id={this.ariaDescriptionDivId} className="hidden">
                        {this.props.ariaDescription}
                    </div>
                }
            </TooltipHost>);
    }

    public focus() {
        this.link.focus();
    }

    @autobind
    private onTooltipToggle(isTooltipVisible: boolean) {
        this.setState({ isTooltipVisible });
    }
}
