import { Link } from "OfficeFabric/Link";
import * as React from "react";
import { format } from "VSS/Utils/String";

import { CopyButton } from "VSSPreview/Flux/Components/CopyButton";

import { LinkWithTooltip } from "VersionControl/Scenarios/Shared/LinkWithTooltip";
import { GitObjectId } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import "VSS/LoaderPlugins/Css!VersionControl/CommitHash";

export interface CommitHashProps {
    className?: string;
    commitId: GitObjectId;
    href?: string;
    onLinkClick?: React.EventHandler<React.MouseEvent<HTMLLinkElement>>;
    showCopyButton: boolean;
    showTooltip?: boolean;
    rightAlignCopyToolTip?: boolean;
    overrideToolTipText?: string;
    onCopied?(): void;
    onFocus?(): void;
}

interface IFocusableLink {
    focus(): void;
}

export class CommitHash extends React.PureComponent<CommitHashProps, {}> {
    public static defaultProps = {
        showTooltip: true,
    } as CommitHashProps;

    private link: IFocusableLink;

    public render(): JSX.Element {
        return (
            <div className={"vc-commit-hash " + (this.props.className || "")}>
                {
                    this.props.href
                    ? this.renderLink()
                    : <Caption {...this.props} />
                }
                {
                    this.props.showCopyButton &&
                    <CopyButton
                        copyTitle={VCResources.VersionControlCommitDetailsCopyShaToolTip}
                        copyText={this.props.commitId.full}
                        copyAsHtml={false}
                        cssClass="copy-button"
                        rightAlignCopyToolTip={this.props.rightAlignCopyToolTip}
                        onCopied={this.props.onCopied}
                        />
                }
            </div>);
    }

    public focus() {
        this.link.focus();
    }

    private renderLink() {
        const tooltipContent = getTooltip(this.props);
        return this.props.showTooltip && tooltipContent
            ? <LinkWithTooltip
                tooltipContent={tooltipContent}
                ref={this.rememberLink}
                {...this.getLinkProps()}
                />
            : <Link
                aria-label={tooltipContent}
                componentRef={this.rememberLink}
                {...this.getLinkProps()}
                />;
    }

    private getLinkProps() {
        return {
            onClick: this.props.onLinkClick,
            onFocus: this.props.onFocus,
            href: this.props.href,
            children: <Caption {...this.props} />,
        };
    }

    private rememberLink = (link: IFocusableLink): void => {
        this.link = link;
    }
}

const Caption = (props: CommitHashProps): JSX.Element =>
    <span className="commitId-text">
        {props.commitId.short}
    </span>;

function getTooltip(props: CommitHashProps): string {
    return props.overrideToolTipText ? props.overrideToolTipText : format(VCResources.VersionControlCommitDetailsNavigateToCommit, props.commitId.short);
}
