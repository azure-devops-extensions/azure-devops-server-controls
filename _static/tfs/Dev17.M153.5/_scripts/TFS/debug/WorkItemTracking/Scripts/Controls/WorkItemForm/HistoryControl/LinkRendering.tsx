import React = require("react");
import WorkItemTrackingResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import Events_Action = require("VSS/Events/Action");
import { TooltipHost } from "OfficeFabric/Tooltip";
import { css } from "OfficeFabric/Utilities";

import { IArtifactIconDescriptor, RemoteLinkStatus } from "TFS/WorkItemTracking/ExtensionContracts";
import { IInternalLinkedArtifactPrimaryData, IHostArtifact } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import { LinkChangeType, LinkChange } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Interfaces";
import { getFriendlyRemoteLinkStatus } from "WorkItemTracking/Scripts/Utils/RemoteWorkItemUtils";
import { Link } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";

export interface IArtifactLinkComponentProps {
    linkChange: LinkChange;
    hostArtifact: IHostArtifact;
}

export interface IArtifactLinkErrorComponentProps {
    linkChange: LinkChange;
}

class UnresolvedArtifactLinkComponent extends React.Component<IArtifactLinkErrorComponentProps, {}> {
    public render(): JSX.Element {
        let linkedArtifact = this.props.linkChange.resolvedLink.artifactLink;
        let iconClass = `icon bowtie-icon bowtie-link`;
        let linkText = decodeURIComponent(decodeURIComponent(linkedArtifact.id));
        return (
            <div key={linkedArtifact.uri}>
                <span className={iconClass}></span>
                <span className="link-display-name">
                    <span>{linkedArtifact.linkTypeDisplayName}</span>
                </span>
                <span className="link-text"> {linkText}</span>
                <RemoteLinkStatusComponent link={this.props.linkChange.resolvedLink.link} />
            </div>
        );
    }
}

export class ArtifactLinkComponent extends React.Component<IArtifactLinkComponentProps, {}> {
    public render(): JSX.Element {
        let artifact = this.props.linkChange.resolvedLink.resolvedArtifact;
        let component = null;
        let changeTypeClass = this._getLinkChangeTypeClass();
        let linkChangeText = this._getlinkChangeText();

        if (!artifact || artifact.error) {
            component = <UnresolvedArtifactLinkComponent linkChange={this.props.linkChange} />
        }
        else {
            switch (artifact.type.toLowerCase()) {
                case "workitem":
                    component = <WorkItemLinkComponent
                        hostArtifact={this.props.hostArtifact}
                        linkChange={this.props.linkChange}
                    />;
                    break;
                default:
                    component = <DefaultLinkComponent
                        hostArtifact={this.props.hostArtifact}
                        linkChange={this.props.linkChange}
                    />
            }
        }

        return (
            <div className={changeTypeClass} >
                <span className="visually-hidden">{linkChangeText}</span>
                {component}
            </div>
        );
    }

    private _getLinkChangeTypeClass(): string {
        switch (this.props.linkChange.changeType) {
            case LinkChangeType.Create:
            case LinkChangeType.Unknown:
                return "link link-add";
            case LinkChangeType.Delete:
                return "link link-delete";
        }
    }

    private _getlinkChangeText(): string {
        switch (this.props.linkChange.changeType) {
            case LinkChangeType.Create:
            case LinkChangeType.Unknown:
                return WorkItemTrackingResources.HistoryControlLinkAddedText;
            case LinkChangeType.Delete:
                return WorkItemTrackingResources.HistoryControlLinkDeletedText;
        }
    }
}

interface IRemoteLinkStatusComponent {
    link: Link;
}

class RemoteLinkStatusComponent extends React.Component<IRemoteLinkStatusComponent> {
    private _getClassName(): string {
        const { link: { remoteStatus } } = this.props;
        switch (remoteStatus) {
            case RemoteLinkStatus.Failed:
                return "link-status-failed";
            case RemoteLinkStatus.PendingAdd:
            case RemoteLinkStatus.PendingUpdate:
            case RemoteLinkStatus.PendingDelete:
                return "link-status-pending";
            default:
                return null;
        }
    }

    public render(): JSX.Element {
        const { link } = this.props;
        if (link && link.remoteHostId && link.remoteStatus !== RemoteLinkStatus.Success) {
            return (
                <TooltipHost content={link.remoteStatusMessage}>
                    <span className={css("link-status", this._getClassName())}>
                        {getFriendlyRemoteLinkStatus(link.remoteStatus)}
                    </span>
                </TooltipHost>
            );
        }
        return null;
    }
}

class DefaultLinkComponent extends React.Component<IArtifactLinkComponentProps, {}> {
    public render(): JSX.Element {
        const artifact = this.props.linkChange.resolvedLink.resolvedArtifact;
        const prefixAdditionalIcon = artifact.primaryData && artifact.primaryData.additionalPrefixIcon;
        const iconClass = `icon bowtie-icon ${this.getIconClass()}`;
        const linkDisplayName = artifact.linkTypeDisplayName;

        return (
            <div key={artifact.uri}>
                {prefixAdditionalIcon && <span className={`icon bowtie-icon ${prefixAdditionalIcon.descriptor} prefix-icon`}></span>}
                <span className={iconClass}></span>
                <span className="link-display-name">
                    <span>{linkDisplayName}</span>
                </span>
                {this.buildLinkText()}
                {this.buildStatusComponent()}
            </div>
        );
    }

    protected buildLinkText(): JSX.Element {
        return (
            <span className="link-text">{this.buildHyperlink()}</span>
        );
    }

    protected buildStatusComponent(): JSX.Element {
        return null;
    }

    protected buildHyperlink(): JSX.Element {
        let artifact = this.props.linkChange.resolvedLink.resolvedArtifact;
        let hyperlinkText = this.buildHyperLinkText();

        return (
            <a href={artifact.primaryData.href}
                onClick={this.openArtifact.bind(
                    null,
                    artifact.primaryData,
                    this.props.hostArtifact)}>
                {hyperlinkText}
            </a>
        );
    }

    protected buildHyperLinkText(): string {
        return this.props.linkChange.resolvedLink.resolvedArtifact.primaryData.title;
    }

    protected getIconClass(): string {
        let iconClass: string;
        const typeIconDescriptor = this.props.linkChange.resolvedLink.resolvedArtifact.primaryData.typeIcon.descriptor;

        if (typeof typeIconDescriptor === "string") {
            iconClass = typeIconDescriptor as string;
        }
        else {
            const iconDescriptor = typeIconDescriptor as IArtifactIconDescriptor
            iconClass = iconDescriptor ? iconDescriptor.icon : null;
        }

        return iconClass;
    }

    protected openArtifact(
        primaryData: IInternalLinkedArtifactPrimaryData,
        hostArtifact: IHostArtifact,
        e: React.MouseEvent<HTMLElement>) {
        let performDefault = true;

        const modifierKeyPressed = e.altKey || e.ctrlKey || e.metaKey || e.shiftKey;

        if (!modifierKeyPressed) {
            if (primaryData.callback) {
                if (primaryData.callback(primaryData.miscData, hostArtifact)) {
                    // Callback has handled the action, prevent default
                    performDefault = false;
                    e.preventDefault();
                }
            }
        }

        if (performDefault) {
            Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
                url: primaryData.href,
                target: "_blank"
            });

            e.preventDefault();
        }
    }
}


class WorkItemLinkComponent extends DefaultLinkComponent {
    public getIconClass(): string {
        return "bowtie-link";
    }

    protected buildStatusComponent(): JSX.Element {
        return <RemoteLinkStatusComponent link={this.props.linkChange.resolvedLink.link} />
    }

    public buildLinkText(): JSX.Element {
        const artifact = this.props.linkChange.resolvedLink.resolvedArtifact;
        const workItemTitle = `: ${artifact.primaryData.title}`;
        const title = <span>{workItemTitle}</span>;
        const link = this.props.linkChange.resolvedLink.link;
        let remoteLinkIcon: JSX.Element;
        let remoteLinkText: JSX.Element;
        if (link && link.remoteHostId) {
            if (artifact.miscData) {
                remoteLinkIcon = <span className="icon bowtie-icon bowtie-azure-api-management"></span>;
                remoteLinkText = <span className="remote-link-text">{artifact.miscData.SubGroup}</span>;
            }
        }
        return (
            <span className="link-text">
                {remoteLinkIcon}
                {remoteLinkText}
                {this.buildHyperlink()}
                {title}
            </span>
        );
    }

    public buildHyperLinkText(): string {
        let artifact = this.props.linkChange.resolvedLink.resolvedArtifact;
        let hyperlinkText = `${artifact.primaryData.typeName} ${artifact.primaryData.displayId}`;
        return hyperlinkText;
    }

    public render(): JSX.Element {
        return super.render();
    }
}