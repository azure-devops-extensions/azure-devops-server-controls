import * as React from "react";

import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { Link } from "OfficeFabric/Link";
import { TooltipHost } from "VSSUI/Tooltip";
import { css } from "OfficeFabric/Utilities";

import { Spacer } from "VersionControl/Scenarios/Shared/RefTree/Spacer";
import { HighlightableSpan } from "Presentation/Scripts/TFS/Components/HighlightableSpan";
import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";
import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!VersionControl/Shared/RefTree/RefNameLinkInTree";

export interface RefNameLinkInTreeProperties {
    refIcon?: string; // required if icon should be rendered
    redirectUrl: string;
    depth: number;
    name: string;
    showFullName?: boolean;
    isDeleted: boolean;
    deletedRefText: string;
    highlightText: string;
    leaveRoomForBadge?: boolean;
    leaveRoomForChevrons: boolean;
    appendAdditionalTooltip?: string;
    alwaysDisplayTooltip?: boolean;
    onLinkClicked?(event: React.MouseEvent<HTMLAnchorElement>): void | boolean;
    className?: string;
}

export const RefNameLinkInTree = (props: RefNameLinkInTreeProperties): JSX.Element => {
    const chevronSpacer = (): JSX.Element => {
        if (props.leaveRoomForChevrons) {
            const spacerClass = props.depth > 0 ? "bowtie-folder" : "bowtie-chevron-right";
            return <span className={"bowtie-icon " + spacerClass + " vc-transparent-icon"}></span>;
        }
        return null;
    }

    return (
        <span className={css("vc-ref-tree-name", props.className)}>
            <Spacer depth={props.depth}/>
            {chevronSpacer()}
            <span className={css("bowtie-icon", props.refIcon)}></span>
            <RefExplorerLink
                leaveRoomForBadge={props.leaveRoomForBadge}
                name={props.name}
                showFullName={props.showFullName}
                isDeleted= {props.isDeleted}
                deletedRefText= {props.deletedRefText}
                highlightText= {props.highlightText}
                redirectUrl={props.redirectUrl}
                appendAdditionalTooltip={props.appendAdditionalTooltip}
                alwaysDisplayTooltip={props.alwaysDisplayTooltip}
                onLinkClicked={props.onLinkClicked}/>
            </span>
    );
}

interface RefExplorerLinkProperties {
    name: string;
    showFullName?: boolean;
    isDeleted: boolean;
    deletedRefText: string;
    highlightText: string;
    leaveRoomForBadge?: boolean;
    redirectUrl: string;
    appendAdditionalTooltip?: string;
    alwaysDisplayTooltip?: boolean;
    onLinkClicked?(event: React.MouseEvent<HTMLAnchorElement>): void | boolean;
}

const RefExplorerLink = (props: RefExplorerLinkProperties): JSX.Element => {
    const friendlyName = GitRefUtility.getRefFriendlyName(props.name);
    let refName: string = friendlyName; 

    if (!props.showFullName) {
        // Split the name and show the the last part as emphasized and previous parts as subdued.
        const nameParts = GitRefUtility.refNameToParts(props.name);
        const lastPartIndex = nameParts.length - 1;
        refName = nameParts[lastPartIndex];
    }

    let tooltipContent = (props.appendAdditionalTooltip) ? props.appendAdditionalTooltip : null;

    let className = "";
    if (props.leaveRoomForBadge) {
        className += " ref-badge-space";
    }

    if (!props.isDeleted) {
        const content =
            <Link href={props.redirectUrl} className={className} aria-label={friendlyName} onClick={props.onLinkClicked}>
                <HighlightableSpan className="ref-name-margin" highlight={props.highlightText} text={refName} />
            </Link>;

        if (props.alwaysDisplayTooltip || friendlyName !== refName) {
            tooltipContent = (props.appendAdditionalTooltip) ? Utils_String.format("{0} {1}", friendlyName, props.appendAdditionalTooltip) : friendlyName;
        }

        return (
            (tooltipContent === null) ? content :
                <TooltipHost
                    content={tooltipContent}
                    directionalHint={DirectionalHint.bottomCenter}>
                    {content}
                    </TooltipHost>
        );
    }

    return (
        <span aria-label={props.deletedRefText} title={props.deletedRefText}>
            <HighlightableSpan className="ref-name-margin vc-deleted-name" highlight={props.highlightText} text={refName} />
        </span>
    );
};
