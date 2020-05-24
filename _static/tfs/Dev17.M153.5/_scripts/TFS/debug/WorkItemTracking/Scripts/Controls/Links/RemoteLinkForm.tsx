import { TextField } from "OfficeFabric/TextField";
import { BaseComponent, IBaseProps } from "OfficeFabric/Utilities";
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as React from "react";
import * as ReactDOM from "react-dom";
import "VSS/LoaderPlugins/Css!Controls/Links/RemoteLinkForm";
import { isSafeProtocol } from "VSS/Utils/Url";
import { ILinksTopologyVisualizationControlProps, LinksTopologyVisualizationControl } from "WorkItemTracking/Scripts/Controls/LinksVisualization/LinksTopologyVisualizationControl";
import { LinkForm } from "WorkItemTracking/Scripts/LinkForm";
import { getRemoteWorkItemByUrl, IRemoteWebApiWorkItemData } from "WorkItemTracking/Scripts/OM/RemoteWorkItemProviderDataSource";
import { IWorkItemLinkTypeEnd, RemoteLinkContext } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";
import { RegisteredLinkTypeNames } from "WorkItemTracking/Scripts/RegisteredLinkTypeNames";
import * as Resources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import * as LinkingUtils from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Linking.Utils";
import { RemoteWorkItemLinkValidator } from "WorkItemTracking/Scripts/TFS.WorkItemTracking.LinkValidator";
import { sanitizeRemoteWorkItemUrl } from "WorkItemTracking/Scripts/Utils/RemoteWorkItemUtils";

interface IRemoteLinkUrlProps extends IBaseProps {
    performUrlValidation: (value: string) => Promise<string>;
}

export class RemoteLinkUrlPicker extends BaseComponent<IRemoteLinkUrlProps> {
    constructor(props: IRemoteLinkUrlProps) {
        super(props);
    }

    public render(): JSX.Element {
        return (
            <div className="remote-url-picker-container bowtie-fabric">
                <TextField
                    inputClassName="remote-link-url-input"
                    label={Resources.RemoteLinkDialogAddressTitle}
                    placeholder={Resources.RemoteLinkDialogAddressTitleWatermark}
                    onGetErrorMessage={this.props.performUrlValidation}
                    ariaLabel={Resources.RemoteLinkDialogAddressTitle}
                    spellCheck={false}
                    required={true}
                    errorMessage={""}
                    validateOnLoad={false}
                    value={""}
                />
            </div>
        );
    }
}

export class RemoteLinkForm extends LinkForm {
    private _linkType: string;
    private _linkTypeEnd: IWorkItemLinkTypeEnd;
    private _$urlPickerContainer: JQuery;
    private _$linkTopologycontainer: JQuery;
    private _selectedWorkItemId: number;
    private _remoteLinkContext: RemoteLinkContext;
    private _tfsContext: TfsContext = TfsContext.getDefault();

    constructor(options) {
        super(options);
        this._linkType = options.linkType;
        this._linkTypeEnd = this._workItem.store.findLinkTypeEnd(this._linkType);
        options.linkTypeEnd = this._linkTypeEnd;
        this._validator = new RemoteWorkItemLinkValidator(options);
        this._validator.setLinkTypeEnd(this._linkTypeEnd);
        this._updateDialogState(false);
    }

    public initialize() {
        super.initialize();

        this._$urlPickerContainer = $("<div/>").appendTo(this._element);
        this._renderUrlPicker();

        this._$linkTopologycontainer = $("<div/>").appendTo(this._element);
        this._renderLinkTopologyVisualization();
        // Adding comment field
        this._createComment();
        this._updateDialogState(false);
    }

    public getLinkResult() {
        return {
            linkType: RegisteredLinkTypeNames.RemoteWorkItemLink,
            linkTypeEnd: this._linkTypeEnd,
            comment: this.getComment(),
            links: [{ id: this._selectedWorkItemId }],
            remoteHostUrl: this._remoteLinkContext.remoteHostUrl,
            remoteHostId: this._remoteLinkContext.remoteHostId,
            remoteProjectId: this._remoteLinkContext.remoteProjectId,
            remoteHostName: this._remoteLinkContext.remoteHostName
        };
    }

    public linkTypeChanged(linkType) {
        if (this.isDisposed()) {
            return;
        }

        if (linkType !== this._linkType) {
            const validator = this._validator as RemoteWorkItemLinkValidator;

            // Setting new link type as the current link type
            this._linkType = linkType;

            // Setting current link type end details
            this._linkTypeEnd = this._workItem.store.findLinkTypeEnd(this._linkType);
            validator.setLinkTypeEnd(this._linkTypeEnd);
            this._renderUrlPicker();
            this._renderLinkTopologyVisualization();
            this._updateDialogState(false);
        }
    }

    public unload() {
        super.unload();
        ReactDOM.unmountComponentAtNode(this._$urlPickerContainer[0]);
        ReactDOM.unmountComponentAtNode(this._$linkTopologycontainer[0]);
    }

    private _renderUrlPicker() {
        const urlProps: IRemoteLinkUrlProps & React.Props<RemoteLinkUrlPicker> = {
            performUrlValidation: this._performUrlValidation
        };
        ReactDOM.render(
            React.createElement<IRemoteLinkUrlProps>(
                RemoteLinkUrlPicker,
                urlProps),
            this._$urlPickerContainer[0]);
    }

    private _renderLinkTopologyVisualization() {
        if (this.isDisposed()) {
            return;
        }

        const defaultProps: ILinksTopologyVisualizationControlProps = {
            topologyOptions: LinkingUtils.getLinkTopologyOptions(this._linkTypeEnd.linkType.topology, this._linkTypeEnd.isForwardLink),
            tfsContext: this._tfsContext,
            workItemIds: (this._selectedWorkItemId && [this._selectedWorkItemId]) || [],
            workItem: this._workItem,
            isVisible: true,
            showLinks: true,
            showLinkImage: true,
            readOnly: false,
            onRemove: (removedId: number) => {
                this._resetLinkTopologyVisualization();
                this._renderUrlPicker();
            },
            remoteContext: this._remoteLinkContext
        };

        ReactDOM.render(
            React.createElement(
                LinksTopologyVisualizationControl,
                { ...defaultProps }),
            this._$linkTopologycontainer[0]);
    }

    private _resetLinkTopologyVisualization() {
        if (this._selectedWorkItemId) {
            this._selectedWorkItemId = null;
            this._renderLinkTopologyVisualization();
        }
        this._updateDialogState(false);
    }

    private _updateDialogState(isValidationSuccess: boolean) {
        this.fireLinkFormValidationEvent(isValidationSuccess);
    }

    private _performUrlValidation = (url: string): Promise<string> => {

        return new Promise((resolve) => {
            const onFailed = (message: string) => {
                this._resetLinkTopologyVisualization();
                return resolve(message);
            };

            // Remove if any trailing slash exist
            url = url && sanitizeRemoteWorkItemUrl(url.trim());
            if (!url) {
                return onFailed(Resources.RemoteLinkDialogAddressTitleWatermark);
            } else if (!isSafeProtocol(url) || !this._validator.isValidWorkItemUrl(url)) {
                return onFailed(Resources.InvalidRemoteWorkItemUrl);
            } else if (this._validator.isWorkItemFromSameHost(url, this._tfsContext.navigation.serviceHost.uri)) {
                return onFailed(Resources.LinksControlSameHostRemoteLink);
            } else {
                getRemoteWorkItemByUrl(url).then((dataProviderData: IRemoteWebApiWorkItemData) => {
                    if (!dataProviderData) {
                        return onFailed(Resources.LinkFormWorkItemNotFound);
                    } else {
                        const remoteWorkItem = dataProviderData["work-item-data"];
                        const remoteHostId = dataProviderData["work-item-host-id"];

                        // Validate for duplicate remote link
                        if (this._validator.isDuplicate(`${remoteHostId}-${remoteWorkItem.id}-${this._linkTypeEnd.immutableName}`)) {
                            return onFailed(Resources.LinksControlDuplicateRemoteLink);
                        } else if (this._validator.isLinkCircular(this._linkTypeEnd, `${remoteHostId}-${remoteWorkItem.id}-${this._linkTypeEnd.oppositeEnd.immutableName}`)) {
                            return onFailed(Resources.LinksControlCircularRemoteLink);
                        }

                        const remoteHostUrl = dataProviderData["work-item-host-url"];
                        const remoteProjectId = dataProviderData["work-item-project-id"];
                        const remoteHostName = dataProviderData["work-item-host-name"];
                        this._selectedWorkItemId = remoteWorkItem.id;
                        this._remoteLinkContext = {
                            remoteHostId,
                            remoteHostName,
                            remoteHostUrl,
                            remoteProjectId
                        };
                        this._renderLinkTopologyVisualization();
                        this._updateDialogState(true);
                        return resolve("");
                    }
                }, () => {
                    return onFailed(Resources.InvalidRemoteWorkItemUrl);
                });
            }
        });
    }
}
