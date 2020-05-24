import Controls = require("VSS/Controls");
import Utils_UI = require("VSS/Utils/UI");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import VSSError = require("VSS/Error");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_TagService = require("Presentation/Scripts/TFS/FeatureRef/TFS.TagService");
import TFS_UI_Tags = require("WorkItemTracking/Scripts/TFS.UI.Tags");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import WorkItemTrackingResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import { WorkItemControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl";
import { TagUtils } from "WorkItemTracking/Scripts/Utils/TagUtils";
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import { WorkItemChangeType, PageSizes } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import { WIFormCIDataHelper } from "WorkItemTracking/Scripts/Utils/WIFormCIDataHelper";
import { WorkItem } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";

const delegate = Utils_Core.delegate;

export class TagFieldControl extends WorkItemControl {
    public static enhancementTypeName: string = "tfs.wit.tagFieldControl";

    private _$container: JQuery;
    private _tagControl: TFS_UI_Tags.TagControl;
    private _ignoreTagChangeEvent: boolean;
    private _onChangedDelegate: any;
    private _onKeydownDelegate: any;
    private _onWorkItemChangedDelegate: any;
    private _onWorkItemTagsChangedDelegate: any;
    private _onTagControlLayoutChanged: any;

    constructor(container, options?, workItemType?) {
        /// <summary>Control to wrap TagControl as a proper WorkItemControl.</summary>
        /// <param name="container" type="Object">Containing element for the control.</param>
        /// <param name="options?" type="Object">Options for the control.</param>
        /// <param name="workItemType?" type="Object">workItemType for the control.</param>
        super(container, options, workItemType);

        this._$container = $(container);
        this._onTagControlLayoutChanged = options ? options.onTagControlLayoutChanged : null;
        this._tagControl = <TFS_UI_Tags.TagControl>Controls.BaseControl.createIn(TFS_UI_Tags.TagControl, container, {
            tagLabel: (options && options.hideLabel) ? "" : WorkItemTrackingResources.TagsLabelText,
            addButtonText: WorkItemTrackingResources.AddTagText,
            addTagTextOnChange: WorkItemTrackingResources.AddTagPlusText,
            readOnly: true,
            selectable: true,
            useDeleteExperience: true,
            beginGetSuggestedValues: (callback) => {
                var tagService = <TFS_TagService.TagService>TFS_OM_Common.ProjectCollection.getConnection(this.getTfsContext()).getService(TFS_TagService.TagService);
                var projectScope = this._workItem.project.guid;
                tagService.beginQueryTagNames(
                    [TFS_TagService.TagService.WORK_ITEM_ARTIFACT_KIND],
                    projectScope,
                    callback,
                    function (error) {
                        // if the autocomplete doesn't retrieve it simply won't be displayed, but log the error
                        var errorMessage = "TagService.QueryTagNames failed.";
                        if (error.type) {
                            errorMessage += " Error type: " + error.type;
                        }
                        if (error.message) {
                            errorMessage += " Error message: " + error.message;
                        }
                        var details: TfsError = {
                            name: "QueryTagNamesError",
                            message: errorMessage
                        };
                        VSSError.publishErrorToTelemetry(details);
                    });
            },
            onInputControlDisplayChanged: this._onTagControlLayoutChanged,
            onRemoveTagRenderComplete: this._onTagControlLayoutChanged
        });
        this._onChangedDelegate = delegate(this, this._onChanged);
        this._onKeydownDelegate = delegate(this, this._onKeydown);
        this._onWorkItemChangedDelegate = delegate(this, this._onWorkItemChanged);
        this._onWorkItemTagsChangedDelegate = delegate(this, this._onWorkItemTagsChanged);
    }

    public bind(workItem: WorkItem) {
        /// <summary>Bind the control to a WorkItem.</summary>
        /// <param name="workItem" type="Object">WorkItem to which we will bind the control.</param>
        if (this._workItem) {
            this.unbind();
        }
        this._workItem = workItem;
        this._tagControl.setReadOnly(workItem.isReadOnly());
        this._tagControl.setItems(workItem.getTagNames());
        this._tagControl._bind("change", this._onChangedDelegate);
        this._$container.bind("keydown", this._onKeydownDelegate);
        WorkItemManager.get(this._workItem.store).attachWorkItemChanged(this._onWorkItemChangedDelegate);
        this._workItem.attachFieldChange(WITConstants.DalFields.Tags, this._onWorkItemTagsChangedDelegate);
    }

    public unbind() {
        /// <summary>Unbind the control from its WorkItem.</summary>
        this._tagControl.clearItems();
        this._tagControl._unbind("change", this._onChangedDelegate);
        this._$container.unbind("keydown", this._onKeydownDelegate);
        if (this._workItem) {
            WorkItemManager.get(this._workItem.store).detachWorkItemChanged(this._onWorkItemChangedDelegate);
            this._workItem.detachFieldChange(WITConstants.DalFields.Tags, this._onWorkItemTagsChangedDelegate);
            this._workItem = null;
        }
    }

    private _findTagIndex(name: string, array: string[]) {
        for (var i = 0, l = array.length; i < l; i++) {
            if (Utils_String.ignoreCaseComparer(array[i], name) === 0) {
                return i;
            }
        }

        return -1;
    }

    private _onChanged(event, data) {
        /// <summary>Handle addition/removal of tags fired by the TagControl.</summary>
        /// <param name="event" type="Object">The event object.</param>
        /// <param name="data" type="Object">The event data object.</param>

        if (data.type == null)
        {
            return;
        }

        var currentTags = this._workItem.getTagNames();
        var tagName = data.name;
        var index = this._findTagIndex(tagName, currentTags);

        if (data.type === TFS_UI_Tags.TagChangeType.Add) {
            if (index < 0) {
                currentTags.push(tagName);
            }
        }
        else if (data.type === TFS_UI_Tags.TagChangeType.Delete) {
            if (index >= 0) {
                currentTags.splice(index, 1);
            }
        }

        // ignoring this event so that we don't update ourself again.
        this._ignoreTagChangeEvent = true;
        this._workItem.setFieldValue(WITConstants.CoreField.Tags, TagUtils.formatTags(currentTags));
        this._ignoreTagChangeEvent = false;

        // publish tag changes
        WIFormCIDataHelper.fieldValueChanged(this._workItem.sessionId, WITConstants.CoreFieldRefNames.Tags, WITConstants.WellKnownControlNames.TagFieldControl);
        
    }

    private _onKeydown(event, data) {
        /// <summary>Handle keydown fired by the TagControl.</summary>
        /// <param name="event" type="Object">The event object.</param>
        /// <param name="data" type="Object">The event data object.</param>
        if (Utils_UI.KeyUtils.isExclusivelyCtrl(event) && (String.fromCharCode(event.keyCode).toLowerCase() === "s")) {
            this._tagControl.flush();
            this._tagControl.focusAddButton();
        }
    }

    private _onWorkItemChanged(sender, args) {
        /// <summary>Handle work item change events.</summary>
        /// <param name="event" type="Object">The event object.</param>
        /// <param name="data" type="Object">The event data object.</param>
        if (!this._workItem || !args.workItem || this._workItem.id !== args.workItem.id) {
            return;
        }

        if (args.change === WorkItemChangeType.PreSave) {
            this._tagControl.flush();
        }

        if (args.change === WorkItemChangeType.Saved) {
            this._tagControl.resetSuggestedValues();

            if(FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.InvalidateClientTagCacheOnWorkItemSave))
            {
                // Also clear the cache of the tag service, after resetting the suggestions for the tag control (or
                // else the control will just end up getting the same suggested values from the tag service)
                const tagService: TFS_TagService.TagService = TFS_OM_Common.ProjectCollection.getConnection(this.getTfsContext()).getService<TFS_TagService.TagService>(TFS_TagService.TagService);
                tagService.invalidateCacheForArtifactKinds([TFS_TagService.TagService.WORK_ITEM_ARTIFACT_KIND], this._workItem.project.guid);
            }
        }
    }

    private _onWorkItemTagsChanged(workItem) {
        /// <summary>Handle tag field changes fired by the work item.</summary>
        /// <param name="event" type="Object">The event object.</param>
        /// <param name="data" type="Object">The event data object.</param>
        var tagService;
        if (this._workItem === workItem && !this._ignoreTagChangeEvent) {
            this._tagControl.setItems(workItem.getTagNames());
            tagService = TFS_OM_Common.ProjectCollection.getConnection(this.getTfsContext()).getService<TFS_TagService.TagService>(TFS_TagService.TagService);
            tagService.invalidateCacheForArtifactKinds([TFS_TagService.TagService.WORK_ITEM_ARTIFACT_KIND], this._workItem.project.guid);
        }
    }
}
