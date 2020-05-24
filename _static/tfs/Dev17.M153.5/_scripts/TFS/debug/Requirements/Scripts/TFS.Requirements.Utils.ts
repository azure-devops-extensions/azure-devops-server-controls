//Auto converted from Requirements/Scripts/TFS.Requirements.Utils.debug.js

/// <reference types="jquery" />




import VSS = require("VSS/VSS");
import Dialogs = require("VSS/Controls/Dialogs");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import Diag = require("VSS/Diag");
import FeedbackResources = require("Requirements/Scripts/Resources/TFS.Resources.RequirementsFeedback");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import TFS_AgileCommon = require("Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon");
import Service = require("VSS/Service");
import TFS_Core_Utils = require("Presentation/Scripts/TFS/TFS.Core.Utils");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import Artifacts_Services = require("VSS/Artifacts/Services");
import Artifacts_Constants = require("VSS/Artifacts/Constants");
import Linking = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Linking");
import { StoryboardLinkValidator } from "WorkItemTracking/Scripts/TFS.WorkItemTracking.LinkValidator";
import TFS_UI_Controls_Accessories = require("Presentation/Scripts/TFS/TFS.UI.Controls.Accessories");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");

var WorkItemLink = WITOM.WorkItemLink;
var delegate = Utils_Core.delegate;
var transformError = TFS_Core_Utils.transformError;

export class StoryboardArtifact extends Artifacts_Services.Artifact {

    private static _supportsLaunchingNetworkFiles() {
        /// <summary>Returns a value indicating if the browser supports calling window.open() directly
        /// on a file:// url or UNC path</summary>

        // This should optionally be an extension of $.supports.
        return Utils_UI.BrowserCheckUtils.isMsie();
    }

    public static DIALOG_HTML_FORMAT: string = "<div><p>{0}</p><p style='text-align: center'><a id='storyboardHyperlink' href=\"{1}\">{1}</a></p></div>";
    public static HYPERLINK_FILE_URL_HELP: string = "https://go.microsoft.com/fwlink/?LinkId=221665";

    constructor(data: Artifacts_Services.IArtifactData) {
        /// <summary>Decodes details of a storyboard which has an artifact URI like:
        /// vstfs:///Requirements/Storyboard/{item-id} 
        /// <param name="data" type="String">encoded Uri of the external storyboard</param>
        /// </summary>
        super(data);
    }

    public getTitle(): string {
        /// <summary>Decodes the artifact Id of a storyboard from encoded uri
        /// </summary>
        /// <returns type="string" />

        return Utils_String.format(FeedbackResources.LinksControlStoryboardLink, this.getId());
    }

    public getUrl(webContext): string {
        /// <returns type="string" />

        return this.getId();
    }

    public execute(webContext: Contracts_Platform.WebContext) {
        /// <summary>Invoked by the framework when a user double-clicks on a work item link to launch
        /// a storyboard artifact.</summary>
        /// <param name="tfsContext" type="VSS.Host.TfsContext">Context to be used</param>

        var storyboardLink = this.getUrl(webContext);

        // KLUDGE: IE supports window.open() for all link types... Other browsers only support that for HTTP urls. For the other
        // unsupported scenarios, we bring up a dialog where the user can click on the link (which is the only way in which e.g.
        // we can launch file links on these other browsers)
        if (StoryboardArtifact._supportsLaunchingNetworkFiles() || StoryboardLinkValidator.isValidHttpUrl(storyboardLink)) {
            super.execute(webContext);
        }
        else {
            // Normalize link (e.g. UNC paths to file: urls, as well as the "right" number of starting slashes in a file: url)
            storyboardLink = StoryboardLinkValidator.normalizeNetworkFilePathToFileUrl(storyboardLink, /** useTwoSlashes **/ false);

            var dialogHtml = Utils_String.format(StoryboardArtifact.DIALOG_HTML_FORMAT, FeedbackResources.FileUrlLaunchPrompt, storyboardLink);
            var $dialogContent = $(dialogHtml);
            var dialogControl: Dialogs.ModalDialog;

            $("a#storyboardHyperlink", $dialogContent).bind('click', () => {
                // Close the dialog on click of the hyperlink, and return true to let the browser do the default action
                dialogControl.close();
                return true;
            });

            var closeButton = {
                text: FeedbackResources.OpenNetworkFileDialog_CloseButton_Text,
                click: () => {
                    dialogControl.close();
                }
            };

            dialogControl = Dialogs.show(Dialogs.ModalDialog, {
                title: FeedbackResources.OpenNetworkFileDialogTitle,
                content: $dialogContent,
                resizable: false,
                minWidth: 400,
                buttons: [closeButton]
            });
        }
    }
}



export class RequirementsArtifactHandler {

    public static beginResolve(artifactIds: Object[], options?: any, callback?: IResultCallback, errorCallback?: IErrorCallback) {
        /// <summary>Resolves the artifacts by creating necessary artifact objects</summary>
        /// <param name="artifactIds" type="Object[]">A list of artifact ids</param>
        /// <param name="options" type="Object">Options object. TFS context to be used could be found here.</param>
        /// <param name="callback" type="IResultCallback">Callback to execute whenever resolution completes</param>
        /// <param name="errorCallback" type="IErrorCallback">Callback to execute whenever an error occurs</param>

        var i, l, artifactId, artifacts = [];

        for (i = 0, l = artifactIds.length; i < l; i += 1) {
            artifactId = artifactIds[i];
            if (Utils_String.ignoreCaseComparer(artifactId.type, Artifacts_Constants.ArtifactTypeNames.Storyboard) === 0) {
                artifacts[artifacts.length] = new StoryboardArtifact(artifactId);
            }
            else {
                // Falling back to default artifact
                artifacts[artifacts.length] = new Artifacts_Services.Artifact(artifactId);
            }
        }

        if ($.isFunction(callback)) {
            callback({ success: true, artifacts: artifacts });
        }
    }

    constructor() {
    }
}



export class FeedbackWorkItemCreator {

    public static SYSTEM_TITLE_FIELD: string = "System.Title";
    public static SYSTEM_DESCRIPTION_FIELD: string = "System.Description";
    public static SYSTEM_AREA_PATH_FIELD: string = "System.AreaPath";
    public static SYSTEM_ITERATION_PATH_FIELD: string = "System.IterationPath";
    public static SYSTEM_HISTORY_FIELD: string = "System.History";
    public static RELATED_LINKTYPE_FORWARD_END: string = "System.LinkTypes.Related-Forward";

    private _configuration: any;
    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _workItemStore: any;
    private _feedbackWorkItemType: any;
    private _relatedLinkTypeEnd: any;
    private _isMetadataLoaded: boolean;

    constructor(configuration: any) {
        /// <summary>Creates a new work item creator.</summary>
        /// <param name="configuration" type="object">The configuration that describes how to create feedback work items.</param>

        Diag.Debug.assertParamIsObject(configuration, "configuration");

        this._configuration = configuration;
        this._tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        this._workItemStore = TFS_OM_Common.ProjectCollection.getConnection(this._tfsContext).getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
    }

    public beginLinkRelatedWorkItems(workItems: any[], completionCallback?: IResultCallback, errorCallback?: IErrorCallback) {
        /// <summary>Asynchronously adds links the given work items as related.</summary>
        /// <param name="workItems" type="array">An array of work items to update.</param>
        /// <param name="completionCallback" type="IResultCallback" optional="true">An optional callback to be called on successful completion.</param>
        /// <param name="errorCallback" type="IErrorCallback" optional="true">An optional callback to be called if an error occurs.</param>

        Diag.Debug.assertParamIsArray(workItems, "workItems");
        Diag.Debug.assert(workItems.length > 0, "Need to pass at least one work item");

        var onLoadMetadataCompleted,
            linkTypeEnd;

        onLoadMetadataCompleted = function () {
            linkTypeEnd = this._relatedLinkTypeEnd;

            $.each(workItems, function (index, workItem) {
                $.each(workItems, function (index2, workItem2) {
                    // Create related links to all other work items, but not to itself
                    if (workItem.id !== workItem2.id) {
                        workItem.addLink(WorkItemLink.create(workItem, linkTypeEnd, workItem2.id, ""));
                    }
                });
            });

            this._workItemStore.beginSaveWorkItemsBatch(
                workItems,
                completionCallback,
                transformError(errorCallback, FeedbackResources.FeedbackRelatedLinkCreationFailed));
        };

        // First load the required work item metadata, and then create the work items...
        this._beginLoadMetadata(
            delegate(this, onLoadMetadataCompleted),
            errorCallback);
    }

    public beginCreateWorkItems(feedbackWorkItemData: any[], completionCallback?: IResultCallback, errorCallback?: IErrorCallback) {
        /// <summary>Begins creating the the corresponding feedback work items asynchronously.</summary>
        /// <param name="feedbackWorkItemData" type="array">An array of feedback work item creation data used to create
        /// the work items.</param>
        /// <param name="completionCallback" type="IResultCallback" optional="true">An optional callback to be called on successful completion.</param>
        /// <param name="errorCallback" type="IErrorCallback" optional="true">An optional callback to be called if an error occurs.</param>

        Diag.Debug.assertParamIsArray(feedbackWorkItemData, "feedbackWorkItemData");
        Diag.Debug.assert(feedbackWorkItemData.length > 0, "Need to pass at least one feedback work item");

        var that = this,
            newWorkItemsAreValid = true,
            onLoadMetadataCompleted,
            onWorkItemsCreated,
            newWorkItems = [];

        onWorkItemsCreated = function (result) {
            Diag.Debug.assertParamIsObject(result, "result");

            if ($.isFunction(completionCallback)) {
                // Pass the created and saved work items in the success callback
                completionCallback.call(this, result.workItems);
            }
        };

        onLoadMetadataCompleted = function () {
            $.each(feedbackWorkItemData, function (index, workItemData) {
                var newWorkItem = that._createFeedbackWorkItem(workItemData);
                newWorkItemsAreValid = newWorkItemsAreValid && newWorkItem.isValid();
                newWorkItems.push(newWorkItem);
            });

            if (!newWorkItemsAreValid) {
                Diag.Debug.fail("Some of the new feedback request work items are in an invalid state");
                if ($.isFunction(errorCallback)) {
                    errorCallback.call(this, new Error(FeedbackResources.FeedbackWorkItemCreationFailed));
                }
            }
            else {
                this._workItemStore.beginSaveWorkItemsBatch(
                    newWorkItems,
                    delegate(this, onWorkItemsCreated),
                    transformError(errorCallback, FeedbackResources.FeedbackWorkItemCreationFailed));
            }
        };

        // First load the required work item metadata, and then create the work items...
        this._beginLoadMetadata(
            delegate(this, onLoadMetadataCompleted),
            errorCallback);
    }

    public beginUpdateWorkItemHistory(workItems: any[], text: string, completionCallback?: IResultCallback, errorCallback?: IErrorCallback) {
        /// <summary>Asynchronously updates the history field of a set of work items.</summary>
        /// <param name="workItems" type="array">An array of work items to update.</param>
        /// <param name="text" type="string">The history text to set on each work item.</param>
        /// <param name="completionCallback" type="IResultCallback" optional="true">An optional callback to be called on successful completion.</param>
        /// <param name="errorCallback" type="IErrorCallback" optional="true">An optional callback to be called if an error occurs.</param>

        Diag.Debug.assertParamIsArray(workItems, "workItems");
        Diag.Debug.assert(workItems.length > 0, "Need to pass at least one work item");

        $.each(workItems, function (index, workItem) {
            workItem.setFieldValue(FeedbackWorkItemCreator.SYSTEM_HISTORY_FIELD, text);
        });

        this._workItemStore.beginSaveWorkItemsBatch(
            workItems,
            completionCallback,
            transformError(errorCallback, FeedbackResources.FeedbackWorkItemHistoryUpdateFailed));
    }

    private _createFeedbackWorkItem(workItemData: any) {
        /// <summary>Creates a new feedback work item based on the input data.</summary>
        /// <param name="workItemData" type="object">The input values for creating the work item.</param>
        /// <returns>The created work item.</returns>

        Diag.Debug.assertParamIsObject(workItemData, "workItemData");

        var workItem = this._feedbackWorkItemType.create();

        workItem.setFieldValue(FeedbackWorkItemCreator.SYSTEM_TITLE_FIELD, workItemData.title);
        workItem.setFieldValue(FeedbackWorkItemCreator.SYSTEM_DESCRIPTION_FIELD, workItemData.description);

        if (workItemData.areaPath) {
            workItem.setFieldValue(FeedbackWorkItemCreator.SYSTEM_AREA_PATH_FIELD, workItemData.areaPath);
        }

        if (workItemData.iterationPath) {
            workItem.setFieldValue(FeedbackWorkItemCreator.SYSTEM_ITERATION_PATH_FIELD, workItemData.iterationPath);
        }

        if (workItemData.history) {
            workItem.setFieldValue(FeedbackWorkItemCreator.SYSTEM_HISTORY_FIELD, workItemData.history);
        }

        workItem.setFieldValue(this._configuration.applicationTypeFieldName, workItemData.applicationType);
        workItem.setFieldValue(this._configuration.applicationStartInformationFieldName, workItemData.applicationStartInfo);
        workItem.setFieldValue(this._configuration.applicationLaunchInstructionsFieldName, workItemData.applicationLaunchInstructions);

        return workItem;
    }

    private _beginLoadMetadata(completionCallback?: IResultCallback, errorCallback?: IErrorCallback) {
        /// <summary>Asynchronously loads the work item store metadata required to create feedback work items.</summary>
        /// <param name="completionCallback" type="IResultCallback" optional="true">An optional callback to be called on successful completion.</param>
        /// <param name="errorCallback" type="IErrorCallback" optional="true">An optional callback to be called if an error occurs.</param>

        var onGetLinkTypesCompleted,
            onGetWorkItemTypeCompleted,
            onGetProjectCompleted,
            localErrorCallback;

        // Lazily load the metadata once only
        if (this._isMetadataLoaded) {
            if ($.isFunction(completionCallback)) {
                completionCallback.call(this);
            }

            return;
        }

        localErrorCallback = transformError(errorCallback, FeedbackResources.FeedbackMetadataLoadingFailed);

        onGetLinkTypesCompleted = function () {
            try {
                this._relatedLinkTypeEnd = this._workItemStore.findLinkTypeEnd(FeedbackWorkItemCreator.RELATED_LINKTYPE_FORWARD_END);
            }
            catch (error) {
                Diag.Debug.fail(error.message);
                if ($.isFunction(localErrorCallback)) {
                    localErrorCallback.call(this, error);
                }

                return;
            }

            // We are done loading metadata and won't need to do that again.
            this._isMetadataLoaded = true;

            if ($.isFunction(completionCallback)) {
                completionCallback.call(this);
            }
        };

        onGetWorkItemTypeCompleted = (workItemType) => {

            Diag.Debug.assertParamIsObject(workItemType, "workItemType");

            var i, l, fieldName,
                expectedFields = [
                    this._configuration.applicationTypeFieldName,
                    this._configuration.applicationLaunchInstructionsFieldName,
                    this._configuration.applicationStartInformationFieldName
                ];

            for (i = 0, l = expectedFields.length; i < l; i++) {
                fieldName = expectedFields[i];
                if (!workItemType.getFieldDefinition(fieldName)) {
                    Diag.Debug.fail("Feedback Request work item type does not contain expected field: " + fieldName);
                    if ($.isFunction(errorCallback)) {
                        errorCallback.call(this, new Error(FeedbackResources.FeedbackMetadataLoadingFailed));
                    }

                    return;
                }
            }

            this._feedbackWorkItemType = workItemType;

            this._workItemStore.beginGetLinkTypes(
                delegate(this, onGetLinkTypesCompleted),
                localErrorCallback);
        };

        onGetProjectCompleted = (project: WITOM.Project) => {
            Diag.Debug.assertParamIsObject(project, "project");

            let workItemType: WITOM.WorkItemType;
            let node: TFS_AgileCommon.INode;

            var tryFinish = () => {
                if (workItemType && node) {
                    onGetWorkItemTypeCompleted(workItemType);
                }
            };

            project.beginGetWorkItemType(
                this._configuration.feedbackRequestWorkItemTypeName,
                (workItemTypeData) => {
                    workItemType = workItemTypeData;
                    tryFinish();
                },
                localErrorCallback);

            project.nodesCacheManager.beginGetNodes().then(
                (nodeData) => {
                    node = nodeData;
                    tryFinish();
                },
                localErrorCallback);
        };

        this._workItemStore.beginGetProject(
            this._tfsContext.navigation.project,
            (project) => onGetProjectCompleted(project),
            localErrorCallback);
    }
}

VSS.initClassPrototype(FeedbackWorkItemCreator, {
    _configuration: null,
    _tfsContext: null,
    _workItemStore: null,
    _feedbackWorkItemType: null,
    _relatedLinkTypeEnd: null,
    _isMetadataLoaded: false
});

export class CommonIdentityPickerHelper {
    public static featureFlagEnabled: boolean;

    public static getFeatureFlagState() {
        var isFeatureEnabled = FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.TCMUseNewIdentityPicker);
        CommonIdentityPickerHelper.featureFlagEnabled = isFeatureEnabled;
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Requirements.Utils", exports);
