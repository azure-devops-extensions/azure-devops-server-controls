/// <reference types="react-dom" />
import { DirectionalHint, TooltipDelay, TooltipHost } from "VSSUI/Tooltip";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as React from "react";
import * as Diag from "VSS/Diag";
import { urlHelper } from "VSS/Locations";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_UI from "VSS/Utils/UI";
import {
    LinkDirection,
    TopologyOptions,
    TopologyType,
} from "WorkItemTracking/Scripts/Controls/LinksVisualization/Interfaces";
import * as WorkItemsAsArtifacts from "WorkItemTracking/Scripts/Controls/WorkItemsAsArtifactsControl";
import * as Resources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { WorkItem } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { RemoteLinkContext } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";

export interface ILinksTopologyVisualizationControlProps {
    topologyOptions: TopologyOptions;
    tfsContext: TFS_Host_TfsContext.TfsContext;
    workItemIds: number[];
    workItem: WorkItem;
    isVisible: boolean;
    showLinks: boolean;
    showLinkImage: boolean;
    readOnly?: boolean;
    onRemove?: (removedId: number) => void;
    remoteContext?: RemoteLinkContext;
}

export interface ILinkImage {
    styleClassName: string;
    altText: string;
    src: string;
    tooltipContent: string;
    id: string;
}

export class LinksTopologyVisualizationControl extends React.Component<ILinksTopologyVisualizationControlProps, {}>{

    private static CSS_LINK_IMAGES: string = "ltv-image";
    private static CSS_LINK_IMAGES_COLUMN: string = "ltv-image-column";

    //  Images describing link topologies.
    private static LINK_IMAGES: IDictionaryStringTo<IDictionaryStringTo<ILinkImage>> = {
        [TopologyType[TopologyType.Dependency]]: {
            [LinkDirection[LinkDirection.Forward]]: {
                styleClassName: LinksTopologyVisualizationControl.CSS_LINK_IMAGES,
                altText: Resources.LinkTopologyDependencyImageAltText,
                src: "Work/ltv-dependency-fwd.png",
                tooltipContent: Resources.LinkTopologyDependencyImageAltText,
                id: "img-dependency-forward"
            },
            [LinkDirection[LinkDirection.Reverse]]: {
                styleClassName: LinksTopologyVisualizationControl.CSS_LINK_IMAGES,
                altText: Resources.LinkTopologyDependencyImageAltText,
                src: "Work/ltv-dependency-rev.png",
                tooltipContent: Resources.LinkTopologyDependencyImageAltText,
                id: "img-dependency-reverse"
            }
        },
        [TopologyType[TopologyType.DirectedNetwork]]: {
            [LinkDirection[LinkDirection.Forward]]: {
                styleClassName: LinksTopologyVisualizationControl.CSS_LINK_IMAGES,
                altText: Resources.LinkTopologyDirectedNetworkImageAltText,
                src: "Work/ltv-directed-network-fwd.png",
                tooltipContent: Resources.LinkTopologyDirectedNetworkImageAltText,
                id: "img-directedNetwork-forward"
            },
            [LinkDirection[LinkDirection.Reverse]]: {
                styleClassName: LinksTopologyVisualizationControl.CSS_LINK_IMAGES,
                altText: Resources.LinkTopologyDirectedNetworkImageAltText,
                src: "Work/ltv-directed-network-rev.png",
                tooltipContent: Resources.LinkTopologyDirectedNetworkImageAltText,
                id: "img-directedNetwork-reverse"
            }
        },
        [TopologyType[TopologyType.Network]]: {
            [LinkDirection[LinkDirection.NonDirectional]]: {
                styleClassName: LinksTopologyVisualizationControl.CSS_LINK_IMAGES,
                altText: Resources.LinkTopologyNetworkImageAltText,
                src: "Work/ltv-network.png",
                tooltipContent: Resources.LinkTopologyNetworkImageAltText,
                id: "img-network-nonDirectional"
            }
        },
        [TopologyType[TopologyType.Tree]]: {
            [LinkDirection[LinkDirection.Forward]]: {
                styleClassName: LinksTopologyVisualizationControl.CSS_LINK_IMAGES,
                altText: Resources.LinkTopologyTreeForwardImageAltText,
                src: "Work/ltv-tree-fwd.png",
                tooltipContent: Resources.LinkTopologyTreeForwardImageAltText,
                id: "img-tree-forward"
            },
            [LinkDirection[LinkDirection.Reverse]]: {
                styleClassName: LinksTopologyVisualizationControl.CSS_LINK_IMAGES,
                altText: Resources.LinkTopologyTreeReverseImageAltText,
                src: "Work/ltv-tree-rev.png",
                tooltipContent: Resources.LinkTopologyTreeReverseImageAltText,
                id: "img-tree-reverse"
            }
        }
    };

    private static CSS_CONTAINER: string = "ltv-container";
    private static CSS_WI_ARTIFACTS_CONTAINER: string = "ltv-wi-artifacts-container";
    private static CSS_TABLE_ONLY_IMAGE: string = "ltv-table-only-image";
    private static CSS_EMPTY_ROW: string = "ltv-empty-row";
    private static CSS_EMPTY_ROW_EDGE_IE_BOTTOM_ONE_WI: string = "ltv-empty-row-edge-ie-one-wi";
    private static CSS_ROW_LINKS_TOP: string = "ltv-row-links-top";

    private _workItem: WorkItem;
    private _tfsContext: TFS_Host_TfsContext.TfsContext;

    constructor(props: ILinksTopologyVisualizationControlProps) {
        super(props);

        this._validate();

        this._workItem = props.workItem;
        this._tfsContext = props.tfsContext;

        this.state = {};
    }

    public render(): JSX.Element {
        return (this.props.isVisible) ? this._getMainComponent() : null;
    }

    public dispose(): void {
    }

    private _validate(): void {
        Diag.Debug.assertIsNotNull(this.props.workItem, "Work item is required.");
        Diag.Debug.assertIsNotNull(this.props.tfsContext, "TFS Context is required.");
        Diag.Debug.assertIsNotNull(this.props.workItemIds, "Work item ids is required.");
        Diag.Debug.assertIsNotNull(this.props.topologyOptions, "Topology options are required.");
    }

    private _getMainComponent(): JSX.Element {
        let tableElement: JSX.Element = null;
        let linkImagesInfo: ILinkImage = this._getLinkImageInfo();

        if (this.props.showLinks) {
            tableElement = this._getTableImageAndLinks(linkImagesInfo);
        }
        else {
            tableElement = this._getTableOnlyImage(linkImagesInfo);
        }

        return (
            <div className={LinksTopologyVisualizationControl.CSS_CONTAINER}>
                {tableElement}
            </div>
        );
    }

    private _getTableImageAndLinks(linkImageInfo: ILinkImage): JSX.Element {
        let linksDetailsOnTop = this._shouldLinksDetailsGoOnTop();
        let linksDetailsComponent = this._getLinksDetailsComponent(linksDetailsOnTop);
        let result: JSX.Element = null;

        if (linksDetailsOnTop) {
            result = (
                <tbody>
                    <tr>
                        <td
                            className={LinksTopologyVisualizationControl.CSS_LINK_IMAGES_COLUMN}
                        >
                            {this._getImageComponent(linkImageInfo)}
                        </td>
                        <td
                            className={LinksTopologyVisualizationControl.CSS_ROW_LINKS_TOP}
                        >
                            {linksDetailsComponent}
                        </td>
                    </tr>
                </tbody>
            );
        }
        else {

            let trClassName: string = LinksTopologyVisualizationControl.CSS_EMPTY_ROW;

            if ((Utils_UI.BrowserCheckUtils.isIE() || Utils_UI.BrowserCheckUtils.isEdge()) &&
                this.props.workItemIds.length === 1) {
                trClassName = LinksTopologyVisualizationControl.CSS_EMPTY_ROW_EDGE_IE_BOTTOM_ONE_WI;
            }

            result = (
                <tbody>
                    <tr className={trClassName}>
                        <td
                            rowSpan={2}
                            className={LinksTopologyVisualizationControl.CSS_LINK_IMAGES_COLUMN}
                        >
                            {this._getImageComponent(linkImageInfo)}
                        </td>
                        <td>&nbsp;</td>
                    </tr>
                    <tr>
                        <td>{linksDetailsComponent}</td>
                    </tr>
                </tbody>
            );
        }

        return (
            <table>
                {result}
            </table>
        );
    }

    private _getTableOnlyImage(linkImageInfo: ILinkImage): JSX.Element {
        return (
            <table className={LinksTopologyVisualizationControl.CSS_TABLE_ONLY_IMAGE}>
                <tbody>
                    <tr>
                        <td>
                            {this._getImageComponent(linkImageInfo)}
                        </td>
                    </tr>
                </tbody>
            </table>
        );
    }

    private _getImageComponent(linkImageInfo: ILinkImage): JSX.Element {
        let result: JSX.Element = (
            <TooltipHost
                content={linkImageInfo.tooltipContent}
                delay={TooltipDelay.zero}
                directionalHint={DirectionalHint.bottomCenter}
            >
                <img src={urlHelper.getVersionedContentUrl(linkImageInfo.src)}
                    id={linkImageInfo.id}
                    alt={linkImageInfo.altText}
                    className={linkImageInfo.styleClassName}
                    tabIndex={0} />
            </TooltipHost>
        );

        return (this.props.showLinkImage) ? result : null;
    }

    private _getLinkImageInfo(): ILinkImage {
        let topologyTypeName: string = TopologyType[this.props.topologyOptions.topology];
        let linkDirectionName: string = LinkDirection[this.props.topologyOptions.linkDirection];

        let topologyDic: IDictionaryStringTo<ILinkImage> = LinksTopologyVisualizationControl.LINK_IMAGES[topologyTypeName];

        Diag.Debug.assertIsNotNull(
            topologyDic,
            Utils_String.format(
                "Missing link image information for topology {0}",
                topologyTypeName));

        let linkImageInfo: ILinkImage = topologyDic[linkDirectionName];

        Diag.Debug.assertIsNotNull(
            linkImageInfo,
            Utils_String.format(
                "Missing link image information for topology {0} and link direction {1}",
                topologyTypeName,
                linkDirectionName));

        return linkImageInfo;
    }

    private _shouldLinksDetailsGoOnTop(): boolean {
        return this.props.topologyOptions.linkDirection === LinkDirection.Reverse;
    }

    private _getLinksDetailsComponent(linksDetailsOnTop: boolean): JSX.Element {
        const result: JSX.Element = (
            <WorkItemsAsArtifacts.WorkItemsAsArtifactsControl
                workItem={this._workItem}
                tfsContext={this._tfsContext}
                workItemIds={this.props.workItemIds}
                viewMode={WorkItemsAsArtifacts.WorkItemsAsArtifactsControlViewMode.List}
                cssContainerClassName={LinksTopologyVisualizationControl.CSS_WI_ARTIFACTS_CONTAINER}
                readOnly={this.props.readOnly}
                onRemove={this.props.onRemove}
                remoteContext={this.props.remoteContext}
            />
        );
        return (this.props.showLinks) ? result : null;
    }
}