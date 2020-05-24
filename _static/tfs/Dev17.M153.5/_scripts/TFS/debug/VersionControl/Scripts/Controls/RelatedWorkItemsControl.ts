import Controls = require("VSS/Controls");
import Artifacts_Services = require("VSS/Artifacts/Services");
import Q = require("q");
import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import VSS_Service = require("VSS/Service");
import Utils_Core = require("VSS/Utils/Core");
import TFS_Wit_WebApi = require("TFS/WorkItemTracking/RestClient");
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import VSS_Common_Contracts = require("VSS/WebApi/Contracts");
import TFS_Contracts = require("TFS/WorkItemTracking/Contracts");
import {IWorkItemUpdatePackage, IWorkItemUpdateResult, ILinkInfo} from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";
import {WorkItemUpdateResultState} from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import Wit_Constants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import Artifacts_Constants = require("VSS/Artifacts/Constants");
import Utils_String = require("VSS/Utils/String");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import MentionPickerControl = require("Mention/Scripts/TFS.Mention.Controls.Picker");
import MentionAutocomplete = require("Mention/Scripts/TFS.Mention.Autocomplete");
import Artifacts_Plugins = require("Presentation/Scripts/TFS/TFS.UI.Controls.ArtifactPlugins");
import {IArtifactType} from "Presentation/Scripts/TFS/TFS.ArtifactPlugins";
import {GitRefArtifact} from "VersionControl/Scripts/GitRefArtifact";
import Telemetry = require("VSS/Telemetry/Services");
import { RegisteredLinkTypeNames } from "WorkItemTracking/Scripts/RegisteredLinkTypeNames";

export interface IRelatedWorkItemsControlHost {

    //returns the context id
    getHostControlContextId(): string;

    //returns the initial list of work items to show
    getWorkItemsAsync(): IPromise<number[]>;

    //a work item link was deleted. Callback for any special handling that the host needs to do
    //for example, on the pull request details page we update policies
    onRemoveWorkItem(workItemId: number): void;

    //a work item link was added. Callback for any special handling that the host needs to do
    //for example, on the pull request details page we update policies
    onAddWorkItem(workItemId: number): void;

    //the control hit an error. The host can decide what to do with that error
    //for example, on the pull request details page we display the error on the page
    handleError(error: string): void;
}

export class RelatedWorkItemsControl extends Controls.BaseControl {
    protected _host: IRelatedWorkItemsControlHost;
    protected _artifact: Artifacts_Services.Artifact;

    private _commonControl: Artifacts_Plugins.RelatedArtifactsControl;
    private _currentContext: Artifacts_Plugins.IRelatedArtifactHostContext;
    private _controlOptions: Artifacts_Plugins.IRelatedArtifactsControlOptions;
    private _cachedData: Artifacts_Plugins.IRelatedArtifactsCachedData;

    private _$inputBox: JQuery;
    private _$dropIcon: JQuery;
    private _$inputTextBox: JQuery;
    protected _$zeroDataContainer: JQuery;

    constructor(options?) {
        super(options);
        this._host = options.host;
    }

    public initialize() {
        super.initialize();

        this._controlOptions = {
            tfsContext: TFS_Host_TfsContext.TfsContext.getDefault(),
            artifactOrder: <IArtifactType[]>[{ tool: "workitemtracking", type: "workitem" }],
            errorCallback: (error) => { },
            artifactListOptions: {
                removeItemToolTip: VCResources.RelatedWorkItemsRemoveToolTip
            }
        };

        const self = this;
        const $container = this._element;
        const dropIconCss = this._options.dropIconCss || "bowtie-triangle-down";
        this._$inputBox = $('<div class="vc-pullrequest-view-details-relatedartifacts-addartifactbox-container" />');
        this._$inputTextBox = $(`<input type="text" class="vc-pullrequest-view-details-relatedartifacts-addartifactbox textbox-input" placeholder="${VCResources.PullRequest_RelatedArtifactsAddWatermark}" />`).appendTo(this._$inputBox);
        this._$dropIcon = $(`<div class="drop-icon bowtie-icon ${dropIconCss}"/>`).appendTo(this._$inputBox);
        this._$zeroDataContainer = this._setUpZeroDataExperience();

        const $commonContainer = $(`<div class="vc-pullrequest-details-view-relatedartifacts-hostcontrol"></div>`);
        this._commonControl = <Artifacts_Plugins.RelatedArtifactsControl>Controls.BaseControl.createIn<Artifacts_Plugins.IRelatedArtifactsControlOptions>(Artifacts_Plugins.RelatedArtifactsControl, $commonContainer, this._controlOptions);

        if (this._$inputTextBox != null && this._$inputTextBox.length > 0) {
            const mentionPicker = <MentionPickerControl.MentionPickerEnhancement>Controls.Enhancement.enhance(MentionPickerControl.MentionPickerEnhancement,
                self._$inputTextBox,
                {
                    mentionType: MentionAutocomplete.MentionType.WorkItem,
                    dropDown: this._$dropIcon,
                    select: (replacement) => {
                        const wasValid = self._validateAndCreateWorkItemLink(replacement.getPlainText().textBeforeSelection);
                        if (wasValid) {
                            //if the text box was empty (because the user just clicked on the box and then on a work item),
                            //lose focus so that they can repeat that behavior.
                            //Otherwise, select the text so that the user can begin typing again for a new work item.
                            //The reason we don't clear the box is because if we clear and don't lose focus, the popup immediately re-appears
                            //and this blocks the user's view of their newly added work item which can give the illusion that nothing was added.
                            const typedText = self._$inputTextBox.val();
                            const emptyText = typedText === "";
                            if (emptyText) {
                                self._$inputTextBox.blur();
                            }
                            else {
                                self._$inputTextBox.select();
                            }

                            const executedEvent = new Telemetry.TelemetryEventData(
                                CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
                                CustomerIntelligenceConstants.RELATED_WORK_ITEMS_ADD, {
                                    "hostArtifactId": this._artifact ? this._artifact.getId() : null,
                                    "contextId": this._host.getHostControlContextId(),
                                    "hasTypedText": !emptyText,
                                    "typedTextIsANumber": !emptyText && !isNaN(typedText)
                                });
                            Telemetry.publishEvent(executedEvent);
                        }
                    },
                }
            );
        }

        $container.append($(`<div></div>`)).append(this._$inputBox);
        $container.append(this._$zeroDataContainer);
        $container.append($commonContainer);
    }

    public bind(artifact: Artifacts_Services.Artifact) {
        this._artifact = artifact;

        this._currentContext = {
            contextId: this._host.getHostControlContextId(),
            hostArtifact: artifact != null ? {
                id: artifact.getId(),
                tool: artifact.getTool(),
                type: artifact.getType(),
                uri: artifact.getUri()
            } : null,
            beginGetArtifacts: (): IPromise<Artifacts_Services.IArtifactData[]> => {
                return this._beginGetArtifacts();
            },
            beginRemoveArtifacts: (artifacts: Artifacts_Services.IArtifactData[]): IPromise<void> => {
                return this._beginDeleteArtifacts(artifacts);
            },
            getCachedData: (): any => {
                return this._cachedData;
            },
            setCachedData: (data: any) => {
                this._cachedData = data;
            }
        };

        this._cachedData = null;
        this._commonControl.beginSetContext(this._currentContext).then(result => {
            //nothing to do on success
        }, (error) => {
            this._host.handleError(error);
        });
    }

    /**
     * This method will show/hide the text box and can also focus on the input
     * @param shouldTextBoxDisplay - If this is true, show the text box, if it is false hide the textbox
     * @param focusOnShow - If this is true, we want to focus on the text box when it is shown
     */
    public showTextBox(shouldTextBoxDisplay: boolean, focusOnShow?: boolean) {
        if (shouldTextBoxDisplay) {
            this._$inputBox.show();
            if (focusOnShow) {
                this._$inputTextBox.click();
                this._$inputTextBox.focus();
            }
        }
        else {
            this._$inputBox.hide();
        }
    }

    /**
    * Returns the data related to the artifacts
    */
    protected _beginGetArtifacts(): IPromise<Artifacts_Services.IArtifactData[]> {
        const deferred = Q.defer<Artifacts_Services.IArtifactData[]>();
        const artifacts: Artifacts_Services.IArtifactData[] = [];

        this._host.getWorkItemsAsync().then((workItemIds: number[]) => {
            for (const workItemId of workItemIds) {
                const artifact = new Artifacts_Services.Artifact({
                    id: workItemId.toString(),
                    tool: "workitemtracking",
                    type: "workitem"
                });

                artifacts.push(artifact._data);
            }
            
            // show zero data container if no artifacts are being added
            if (this._options.showZeroData && artifacts.length === 0) {
                this._$zeroDataContainer.show();
            }

            deferred.resolve(artifacts);

        }, (error) => {
            this._host.handleError(error);
            deferred.reject(error);
        });

        return deferred.promise;
    }

    protected _beginDeleteArtifacts(artifacts: Artifacts_Services.IArtifactData[]): IPromise<void> {
        const deferred = Q.defer<void>();

        const witClient = VSS_Service.getCollectionClient(TFS_Wit_WebApi.WorkItemTrackingHttpClient);
        if (witClient == null) {
            this._host.handleError(VCResources.PullRequests_RelatedArtifacts_FailToDelete_NoWorkItemClient);
            deferred.reject(VCResources.PullRequests_RelatedArtifacts_FailToDelete_NoWorkItemClient);
            return deferred.promise;
        }

        //if no artifact sent in for linking, don't do any unlinking
        //instead we just remove the work item from the control
        if (this._artifact === null) {
            for (let j = 0; j < artifacts.length; ++j) {
                this._onRemoveWorkItem(+artifacts[j].id);
            }
            deferred.resolve(null);
            return deferred.promise;
        }

        const promiseList: Q.IPromise<void>[] = [];

        for (let j = 0; j < artifacts.length; ++j) {
            const artifact = artifacts[j];

            if (Utils_String.ignoreCaseComparer(artifact.type, "workitem") === 0) {
                promiseList.push(this._deleteWorkItemLinkAsync(witClient, +artifact.id));
            }
        }

        Q.all(promiseList).then((results) => {
            deferred.resolve(null);
        }).fail((error) => {
            deferred.reject(error);
            this._host.handleError(error);
        });

        return deferred.promise;
    }

    private _deleteWorkItemLinkAsync(witClient: TFS_Wit_WebApi.WorkItemTrackingHttpClient, workItemId: number): IPromise<void> {
        const deferredDeletion = Q.defer<void>();

        witClient.getWorkItem(workItemId, null, null, TFS_Contracts.WorkItemExpand.Relations).then((workItem: TFS_Contracts.WorkItem) => {

            const uri = this._artifact.getUri();
            let deleteIndex: number = -1;
            let serverUri = uri;

            if (workItem != null && workItem.relations != null) {
                for (let i = 0; i < workItem.relations.length; ++i) {
                    if (Utils_String.ignoreCaseComparer(workItem.relations[i].url, uri) == 0) {
                        deleteIndex = i;
                        serverUri = workItem.relations[i].url;
                        break;
                    }
                }
            }

            if (deleteIndex !== -1) {
                const testOp = <VSS_Common_Contracts.JsonPatchOperation>{
                    op: VSS_Common_Contracts.Operation.Test,
                    path: "/relations/" + deleteIndex + "/url",
                    value: serverUri
                };

                const patchOp = <VSS_Common_Contracts.JsonPatchOperation>{
                    op: VSS_Common_Contracts.Operation.Remove,
                    path: "/relations/" + deleteIndex
                };

                witClient.updateWorkItem([testOp, patchOp], workItemId).then(
                    (workItem: TFS_Contracts.WorkItem) => {
                        this._onRemoveWorkItem(workItem.id);
                        deferredDeletion.resolve(null);
                    }, (error) => {
                        //We delete links by array index. If indicies were changed inbetween the getWorkItem call 
                        //and the path call in this function, then the patch call will fail.
                        this._host.handleError(VCResources.PullRequests_RelatedArtifacts_FailToDelete_IndexChanged);
                        deferredDeletion.reject(VCResources.PullRequests_RelatedArtifacts_FailToDelete_IndexChanged);
                    });
            }
            else {
                //The link doesn't exist. It must have already been deleted. No reason to error though because the user has reached their desired state
                this._onRemoveWorkItem(workItem.id);
                deferredDeletion.resolve(null);
            }
        }, (error) => {
            //The work item was deleted or has somehow gone missing.
            this._host.handleError(VCResources.PullRequests_RelatedArtifacts_FailToDelete + " " + error);
            deferredDeletion.reject(VCResources.PullRequests_RelatedArtifacts_FailToDelete + " " + error);
        });

        return deferredDeletion.promise;
    }

    //returns whether the string was a valid work item identifier
    protected _validateAndCreateWorkItemLink(textVal: string): boolean {
        if (textVal == null || textVal.length <= 0) {
            return false;
        }

        let workItemId = +textVal;
        if (textVal[0] == '#') {
            workItemId = +textVal.substr(1);
        }

        if (isNaN(workItemId) || (workItemId % 1 != 0)) {
            return false;
        }

        const witClient = VSS_Service.getCollectionClient(TFS_Wit_WebApi.WorkItemTrackingHttpClient);
        if (witClient == null) {
            this._host.handleError(VCResources.PullRequests_RelatedArtifacts_FailToCreate_NoWorkItemClient);
            return false;
        }

        const workItemArtifactData = <Artifacts_Services.IArtifactData>{
            id: workItemId.toString(),
            tool: Artifacts_Constants.ToolNames.WorkItemTracking,
            type: Artifacts_Constants.ArtifactTypeNames.WorkItem
        };

        if (this._artifactExists(workItemArtifactData)) {
            //we already have this work item. No need to do anything
            return true;
        }

        //if no artifact provided for linking, don't link
        //instead we just retrieve the work item and add it to the control
        if (this._artifact === null) {
            this._onAddWorkItem(workItemId);
        }
        else {
            const patchOp = <VSS_Common_Contracts.JsonPatchOperation>{
                op: VSS_Common_Contracts.Operation.Add,
                path: "/relations/-",
                value: <TFS_Contracts.Link>{
                    attributes: { "name": RegisteredLinkTypeNames.PullRequest },
                    rel: Wit_Constants.WorkItemLinkConstants.ARTIFACTLINKTYPE,
                    url: this._artifact.getUri(),
                    title: ""
                }
            };

            witClient.updateWorkItem([patchOp], workItemId).then(
                (workItem: TFS_Contracts.WorkItem) => {
                    this._onAddWorkItem(workItemId);
                }, (error) => {
                    if (error != null && error.responseText != null && error.responseText.match("Microsoft.TeamFoundation.WorkItemTracking.Web.Common.RelationAlreadyExistsException") != null) {
                        //if the error was because it already exists, don't display an error because the user reached their desired state
                        //We already checked above that the link doesn't exist, but now it does, so add it.
                        this._onAddWorkItem(workItemId);
                        return true;
                    }
                    this._host.handleError(VCResources.PullRequests_RelatedArtifacts_FailToCreate + " " + error);
                });
        }

        return true;
    }

    protected _onAddWorkItem(workItemId: number) {
        const newArtifact = new Artifacts_Services.Artifact({
            id: workItemId.toString(),
            tool: "workitemtracking",
            type: "workitem"
        });

        if (this._options.showZeroData) {
            this._$zeroDataContainer.hide();
        }

        this._host.onAddWorkItem(workItemId);
        this._addArtifactsToCommonControl([newArtifact._data]);
    }

    protected _onRemoveWorkItem(workItemId: number) {
        // if there are no more artifacts after this remove, show the zero data
        if (this._options.showZeroData) {
            if (!this._cachedData || Object.keys(this._cachedData.rawArtifacts).length === 0) {
                this._$zeroDataContainer.show();
            }
        }

        const executedEvent = new Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            CustomerIntelligenceConstants.RELATED_WORK_ITEMS_DELETE, {
                "hostArtifactId": this._artifact ? this._artifact.getId() : null,
                "contextId": this._host.getHostControlContextId(),
                "workItemId": workItemId
            });
        Telemetry.publishEvent(executedEvent);

        this._host.onRemoveWorkItem(workItemId);
    }

    protected _addArtifactsToCommonControl(newArtifacts: Artifacts_Services.IArtifactData[]) {
        this._commonControl.beginAddArtifacts(newArtifacts).then(result => {
            //nothing to do on success
        }, (error) => {
            this._host.handleError(error);
        });
    }

    protected _artifactExists(artifact: Artifacts_Services.IArtifactData): boolean {
        return this._commonControl.artifactExists(artifact);
    }

    protected _setUpZeroDataExperience(): JQuery {
        const zeroDataContainer = $("<div></div>").addClass("relatedartifacts-zerodata-text").hide();

        if (this._options.zeroDataText) {
            zeroDataContainer.text(this._options.zeroDataText);
        }
        else {
            zeroDataContainer.text(VCResources.RelatedArtifacts_DefaultZeroDataText);
        }

        return zeroDataContainer;
    }
}

    /***
     * Link an artifact to work items
     * @param artifact - artifact to link
     * @param workItemIds - array of work item Ids to link
     * @param linkType - type of link to create
     */
export function linkArtifactToWorkItems(workItemIds: number[], artifact: Artifacts_Services.Artifact, linkType: string): IPromise <void> {
        const deferred = Q.defer<void>();
        const workItemIdsToLink = workItemIds || [];

        // Not expecting a high rate of WIT linking failures
        // So not handling the failure in UI instead publish a CI event
        const publishCiOnFailure = (error: Error) => {
            const createdEvent = new Telemetry.TelemetryEventData(
                CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
                CustomerIntelligenceConstants.CREATE_BRANCH_WIT_LINK_FAILED, {
                    "MoreThanOneItemLinked": (workItemIdsToLink.length > 1),
                    "artifactUri": (artifact.getUri()),
                    "error": error
                });
            Telemetry.publishEvent(createdEvent, true);
        }

        const rejectDeferred = (error: Error) => {
            publishCiOnFailure(error);
            deferred.reject(error);
        }

        const witClient = VSS_Service.getCollectionClient(TFS_Wit_WebApi.WorkItemTrackingHttpClient);

        if(workItemIdsToLink.length === 0) {
            deferred.resolve(null);
        }
        else if (workItemIdsToLink.length === 1) {
            const patchOp = <VSS_Common_Contracts.JsonPatchOperation>{
                op: VSS_Common_Contracts.Operation.Add,
                path: "/relations/-",
                value: <TFS_Contracts.Link>{
                    attributes: { "name": linkType },
                    rel: Wit_Constants.WorkItemLinkConstants.ARTIFACTLINKTYPE,
                    url: artifact.getUri(),
                    title: ""
                }
            };

            witClient.updateWorkItem([patchOp], workItemIdsToLink[0]).then((results) => {
                deferred.resolve(null)
            }, (error) => {
                rejectDeferred(error)
            });
        }
        // if multiple items to link, use batch updating to save on server calls
        else {
            witClient.getWorkItems(workItemIdsToLink).then((workItems: TFS_Contracts.WorkItem[]) => {
                const workItemUpdatePayloads: IWorkItemUpdatePackage[] = [];

                const addedLink = <ILinkInfo>{
                    OriginalName: RegisteredLinkTypeNames.Branch,
                    FilePath: artifact.getUri(),
                    FldID: Wit_Constants.DalFields.BISURI
                };

                // add the new link to every work item to-be-linked
                for (let i = 0; i < workItems.length; ++i) {
                    const payload: IWorkItemUpdatePackage = {
                        id: workItems[i].id,
                        rev: workItems[i].rev,
                        projectId: (<GitRefArtifact>artifact).projectGuid,
                        isDirty: false,
                        links: { addedLinks: [addedLink] }
                    };

                    workItemUpdatePayloads.push(payload);
                }

                const apiLocation = TFS_Host_TfsContext.TfsContext.getDefault().getActionUrl("updateWorkItems", "wit", { project: "", team: "", area: "api" });

                Ajax.postMSJSON(apiLocation, { updatePackage: Utils_Core.stringifyMSJSON(workItemUpdatePayloads) },
                    (updateResults: IWorkItemUpdateResult[]) => {
                        if (updateResults.length === workItemUpdatePayloads.length) {
                            // if a single item in the batch failed, none of them are saved...check for 1 failure
                            let batchFailed = false;
                            $.each(updateResults, (i: number, result: IWorkItemUpdateResult) => {
                                if (result.state !== WorkItemUpdateResultState.Success) {
                                    batchFailed = true;
                                    return false;
                                }
                            });

                            //  only consider this workitem update successful if the batch passsed
                            if (!batchFailed) {
                                deferred.resolve(null);
                            }
                            else {
                                // Error : WorkItemUpdate was not successful or batch failed
                                rejectDeferred(new Error(''));
                            }
                        }
                        else {
                            // Error : "Server data does not match with what client sent."
                            rejectDeferred(new Error(''));
                        }
                    },
                    (error) => {
                        // Error : UpdateWorkItems server call failed
                        rejectDeferred(error);
                    });
            });
        }

        return deferred.promise;
    }