export class WITCustomerIntelligenceArea {
    public static WORK_ITEM_TRACKING = "WIT";
    public static WORK_ITEM_TRACKING_MOBILE = "WIT_MOBILE";
    public static NEW_QUERIES_EXPERIENCE = "NEW_QUERIES";
    public static WORK_ITEM_TRACKING_NEWNAV = "WIT_NEWNAV";
}

export class WITCustomerIntelligenceFeature {
    public static CLIENTSIDEOPERATION_SEND_EMAIL = "SendEmail";
    public static CLIENTSIDEOPERATION_OPEN_WORK_ITEM_IN_NEW_TAB = "OpenWorkItemInNewTab";
    public static CLIENTSIDEOPERATION_PREFETCH_NEXT_WORKITEM = "PrefetchNextWorkitemInTriageView";
    public static CLIENTSIDEOPERATION_BACK_TO_QUERY_RESULTS: string = "BackToQueryResults";
    public static CLIENTSIDEOPERATION_MAXIMIZE_RICH_EDITOR = "MaximizeRichEditor";
    public static CLIENTSIDEOPERATION_QUERY_SOFTCAP_LINK = "QuerySoftCapLink";
    public static CLIENTSIDEOPERATION_COPY_SELECTION_AS_HTML = "CopySelectionAsHtml";
    public static CLIENTSIDEOPERATION_WORK_ITEM_FINDER = "WorkItemFinder";
    public static CLIENTSIDEOPERATION_QUERYACROSSPROJECTS = "QueryAcrossProjects";
    public static CLIENTSIDEOPERATION_QUERY_WORK_ITEM = "QueryWorkItem";
    public static CLIENTSIDEOPERATION_CREATE_QUERY = "CreateQuery";
    public static CLIENTSIDEOPERATION_CHANGE_QUERY_COLUMNS = "ChangeQueryColumns";
    public static CLIENTSIDEOPERATION_WIT_CLONE = "CloneWorkItem";
    public static CLIENTSIDEOPERATION_COPY_WORKITEM_LINK = "WorkItem.CopyWorkItemLink";
    public static CLIENTSIDEOPERATION_TOOLBAR_CLICK = "WorkItem.ToolbarButtonClicks";
    public static CLIENTSIDEOPERATION_WIT_TABSELECTION = "WorkItem.TabSelection";
    public static CLIENTSIDEOPERATION_WIT_GROUPCOLLAPSED = "WorkItem.GroupCollapsed";
    public static CLIENTSIDEOPERATION_WIT_SAVING = "WorkItem.Saving";
    public static CLIENTSIDEOPERATION_WIT_MOBILEDISCUSSIONOPENED = "WorkItem.DiscussionOpened";
    public static CLIENTSIDEOPERATION_WIT_MOBILEDISCUSSIONMESSAGESLOADED = "WorkItem.DiscussionMessagesLoaded";
    public static CLIENTSIDEOPERATION_WIT_MOBILEDISCUSSIONCOMMENTSUBMITTED = "WorkItem.DiscussionCommentSubmitted";
    public static CLIENTSIDEOPERATION_WIT_MOBILEDISCUSSIONUNSAVEDPREVIEW = "WorkItem.DiscussionUnsavedPreview";
    public static CLIENTSIDEOPERATION_WIT_MOBILEDISCUSSIONRETURNTOUNSAVEDCOMMENT = "WorkItem.DiscussionReturnToUnsavedComment";
    public static CLIENTSIDEOPERATION_WIT_MOBILEDISCUSSIONPREVIEWCLICKED = "WorkItem.DiscussionPreviewClicked";
    public static RESULT_FILTER = "ResultFilter";
    public static CLIENTSIDEOPERATION_VS_WORKITEM_NOT_IN_QUERY_RESULTS = "VSOpenInWeb.WorkItemNotInQueryResult";
    public static WORKITEMPANECHANGED = "WorkItemPaneChanged";
    public static WI_FORM_CONTRIBUTION = "FormContribution";

    // Move Work Item
    public static CLIENTSIDEOPERATION_WIT_MOVE_CANCEL = "WorkItemMove.CancelMove";
    public static CLIENTSIDEOPERATION_WIT_MOVE_CANCEL_AFTER_HIDDEN_TYPE_FAILED = "WorkItemMove.CancelAfterHiddenTypeFailed";
    public static CLIENTSIDEOPERATION_WIT_MOVE_CANCEL_AFTER_TYPE_FAILED = "WorkItemMove.CancelAfterTypeFailed";
    public static CLIENTSIDEOPERATION_WIT_MOVE_SUCCEED_AFTER_TYPE_FAILED = "WorkItemMove.PassAfterTypeFailed";
    public static CLIENTSIDEOPERATION_WIT_MOVE_PERMISSIONS_ERROR = "WorkItemMove.PermissionsError";
    public static CLIENTSIDEOPERATION_WIT_MOVE_REVERT = "WorkItemMove.Revert";
    public static CLIENTSIDEOPERATION_WIT_MOVE_SUCCESS = "WorkItemMove.Success";

    // Change Work Item Type
    public static CLIENTSIDEOPERATION_WIT_TYPE_CHANGE_REVERT = "WorkItemChangeType.Revert";
    public static CLIENTSIDEOPERATION_WIT_TYPE_CHANGE_CANCEL_AFTER_FAIL = "WorkItemChangeType.CancelAfterFailed";
    public static CLIENTSIDEOPERATION_WIT_TYPE_CHANGE_CANCEL_AFTER_OPEN = "WorkItemChangeType.CancelAfterOpen";
    public static CLIENTSIDEOPERATION_WIT_TYPE_CHANGE_SUCCESS = "WorkItemChangeType.Success";

    public static BULK_EDIT_TAGS = "BulkEditTags";

    public static TELEMETRY_ASSIGNTO_POPULATEMENU = "AssignTo.PopulateMenu";
    public static TELEMETRY_OPENWORKITEM_CONTEXTMENU = "OpenWorkItemConextMenu";
    public static WORKITEM_DISCUSSIONCONTROL = "WorkItemDiscussion";
    public static WORKITEM_VIEWFOLLOWS = "ViewWorkItemFollows";
    public static WORKITEM_BULKUNFOLLOWS = "BulkUnfollows";

    // Related Work Items Control
    public static CLIENTSIDEOPERATION_RELATEDWORKITEMS_CONTROL_OPENWORKITEM = "RelatedWorkItemsControlOpenWorkItem";

    // New Queries Experience
    public static NEWQUERYEXPERIENCE_NAVIGATE_PIVOT = "NewQueries.NavigatePivot";
    public static NEWQUERYEXPERIENCE_WORKITEMNAVIGATOR = "NewQueries.WorkItemNavigator";
    public static NEWQUERYEXPERIENCE_TRIAGEVIEWHUB_PIVOTCOMMAND = "NewQueries.TriageViewHub.PivotCommand";
    public static NEWQUERYEXPERIENCE_QUERY_ACTION = "NewQueries.QueryAction";
    public static NEWQUERYEXPERIENCE_MOVE_QUERY = "NewQueries.MoveQuery";
    public static NEWQUERYEXPERIENCE_LEAVE_DIRTY = "NewQueries.LeaveDirty";
    public static NEWQUERYEXPERIENCE_ADHOCQUERY_REDIRECTION = "NewQueries.AdhocQuery.Redirection";
    public static NEWQUERYEXPERIENCE_LASTVISITED_REDIRECTION = "NewQueries.LastVisited.Redirection";
    public static NEWQUERYEXPERIENCE_NAVIGATE_QUERIESPIVOT = "NewQueries.Navigate.QueriesPivot";
    public static NEWQUERYEXPERIENCE_BREADCRUMB_CLICKED = "NewQueries.Breadcrumb.Clicked";

    // New Nav
    public static CUSTOMIZE_WORKITEM = "WorkItemToolbar.Customize";

    // Charts
    public static QUERYCHARTS_NAVIGATE = "QueryCharts.Navigate";

    // Queries
    public static QUERY_SEARCH = "Query.Search";

    // WorkItem Field Keyboard shortcut
    public static CLIENTSIDEOPERATION_WIT_FIELDKEYBOARDSHORTCUT = "WorkItemForm.FieldKeyboardShortcut";

    // WIT nodes cache manager
    public static NODES_CACHE_MANAGER = "NodesCacheManager";

    // Classification fields mru error
    public static CLASSIFICATION_MRU_VALUE_CHANGED = "ClassificationFieldsMruValueChanged";

    // WIT Client Side Caching
    public static WIT_CACHE_PROVIDER_INIT = "WorkItemTracking.CacheProvider.Initialize";
    public static WIT_CACHE_PROVIDER_OPEN = "WorkItemTracking.CacheProvider.OpenCache";

    // WIT watchDog service for open WI form
    public static WIT_WATCHDOG_OPEN_FORM = "WorkItemTracking.WatchDog.OpenForm";
}

export class WITPerformanceScenario {
    public static WORKITEM_OPEN_NEWFORMDIALOG = "WorkItem.Open.NewFormDialog";
    public static WORKITEM_DISCUSSION_LINKING = "WorkItem.Discussion.Linking";
    public static WORKITEMFORM_FOLLOWS_ACTION_FOLLOW = "WorkItemForm.Follows.Action.Follow";
    public static WORKITEMFORM_FOLLOWS_ACTION_UNFOLLOW = "WorkItemForm.Follows.Action.Unfollow";
    public static WORKITEM_OPENFORM = "WorkItem.OpenForm";
    public static WORKITEM_OPENFORM_NEWLAYOUT = "WorkItem.OpenForm.NewLayout";
    public static WORKITEM_OPENFORM_CREATE_NEWLAYOUT = "WorkItem.OpenForm.Create.NewLayout";
    public static WORKITEM_OPENDIALOG_NEWLAYOUT = "WorkItem.OpenDialog.NewLayout";
    public static WORKITEM_OPENIDE_NEWLAYOUT = "WorkItem.IDE.OpenForm.NewLayout";
    public static WORKITEM_SAVE = "WorkItem.Save";
    public static WORKITEM_BULKSAVE = "WorkItem.BulkSave";
    public static WORKITEM_CLOSED = "WorkItem.Closed";
    public static WORKITEM_FIELDCHANGED = "WorkItem.FieldChanged";
    public static QUERY_OPENRESULTS = "Query.OpenResults";
    public static QUERY_SAVE = "Query.Save";
    public static QUERY_SAVEAS = "Query.SaveAs";
    public static QUERYHIERARCHY_LOAD = "QueryHierarchy.Load";
    public static HISTORYVIEW_EXTENSION_LOAD = "HistoryView.Extension.Load";
    // NQE performance scenarios
    public static QUERIESHUB_TRIAGEVIEW_OPENQUERYRESULTS = "QueriesHub.TriageView.OpenQueryResults";
    public static QUERIESHUB_TRIAGEVIEW_OPENBREADCRUMBQUERYRESULTS = "QueriesHub.TriageView.OpenBreadcrumbQueryResults";
    public static QUERIESHUB_TRIAGEVIEW_OPENWORKITEM = "QueriesHub.TriageView.OpenWorkItem";
    public static QUERIESHUB_TRIAGEVIEW_SAVEEXISTINGQUERY = "QueriesHub.TriageView.SaveExistingQuery";
    public static QUERIESHUB_QUERIESVIEW_OPENFAVORITESPIVOT = "QueriesHub.QueriesView.OpenFavoritesPivot";
    public static QUERIESHUB_QUERIESVIEW_OPENALLQUERIESPIVOT = "QueriesHub.QueriesView.OpenAllQueriesPivot";
}

export class WITPerformanceScenarioEvent {
    public static QUERIESHUB_TRIAGEVIEW_OPENWORKITEM_COMPLETE = "QueriesHub.TriageView.OpenWorkItem.Complete";
    public static QUERIESHUB_TRIAGEVIEW_OPENQUERYRESULTS_COMPLETE = "QueriesHub.TriageView.OpenQueryResults.Complete";
}

export class WITUserScenarioActions {
    public static WORKITEM_CREATEOREDIT = "WorkItem.CreateOrEdit";
}

export class PerformanceEvents {
    // WorkItemDiscussion
    public static WORKITEMDISCUSSION_LINKING_COMPLETE = "WorkItemDiscussion.Linking.Complete";
    // WorkItemDialog
    public static WORKITEMDIALOG_CREATEWORKITEMFORM = "WorkItemDialog.CreateWorkItemForm";
    public static WORKITEM_SAVE_COMPLETE = "WorkItem.Save.Complete";

    // *******************
    //   New events
    // *******************

    // WorkItemForm
    public static WORKITEMFORM_INITIALIZE = "WorkItemForm.Initialize";
    public static WORKITEMFORMBASE_INITIALIZE = "WorkItemFormBase.Initialize";
    public static WORKITEMFORM_GETWORKITEM = "WorkItemForm.GetWorkItems";
    public static WORKITEMFORM_BINDWORKITEM = "WorkItemForm.BindWorkItem";
    public static WORKITEMFORM_UNBINDWORKITEM = "WorkItemForm.UnBindWorkItem";
    // WorkItemTracking
    public static WORKITEMTRACKING_GETPROJECTS_REQUEST = "WorkItemTracking.GetProjects.Request";
    public static WORKITEMTRACKING_GETTYPES = "WorkItemTracking.GetTypes";
    public static WORKITEMTRACKING_GETTYPES_REQUEST = "WorkItemTracking.GetTypes.Request";
    public static WORKITEMTRACKING_GETTYPEEXTENSIONS_REQUEST = "WorkItemTracking.GetTypeExtensions.Request";
    public static WORKITEMTRACKING_GETCONSTANTSETS = "WorkItemTracking.GetConstantSets";
    public static WORKITEMTRACKING_GETCONSTANTSETS_REQUEST = "WorkItemTracking.GetConstantSets.Request";
    public static WORKITEMTRACKING_GETLINKTYPES_REQUEST = "WorkItemTracking.GetLinkTypes.Request";
    public static WORKITEMTRACKING_GETREGISTEREDLINKFORMTYPES = "WorkItemTracking.GetRegisteredLinkFormTypes";
    public static WORKITEMTRACKING_GETMETADATACACHESTAMP_FROMAPI = "WorkItemTracking.GetMetadataCacheStamp.FromApi";
    public static WORKITEMTRACKING_GETMETADATACACHESTAMP_FROMPAGEDATA = "WorkItemTracking.GetMetadataCacheStamp.FromPageData";
    public static WORKITEMTRACKING_GETNODES_REQUEST = "WorkItemTracking.GetNodes.Request";
    public static WORKITEMTRACKING_GETFIELDS_REQUEST = "WorkItemTracking.GetFields.Request";
    public static WORKITEMTRACKING_GETFIELDS_PROCESS = "WorkItemTracking.GetFields.Process";
    public static WORKITEMTRACKING_GETLAYOUTUSERSETTINGS_REQUEST = "WorkItemTracking.GetLayoutUserSettings.Request";
    public static WORKITEMTRACKING_UPDATE_AJAX = "WorkItemTracking.Update.Ajax";
    public static WORKITEMTRACKING_TAKEUPDATERESULT = "WorkItemTracking.TakeUpdateResult";
    public static WORKITEMTRACKING_EVALUATELINKUPDATES = "WorkItemTracking.EvaluateLinkUpdates";
    public static WORKITEMTRACKING_RESETAFTERSAVE = "WorkItemTracking.ResetAfterSave";
    public static WORKITEMTRACKING_CACHING = "WorkItemTracking.Caching";
    // WorkItemsView
    public static WORKITEMSVIEW_INITIALIZE = "WorkItemsView.Initialize";
    public static WORKITEMSVIEW_ENSUREVIEW = "WorkItemsView.EnsureView";
    public static WORKITEMSVIEW_NAVIGATE = "WorkItemsView.Navigate";
    public static WORKITEMSVIEW_GETQUERY = "WorkItemsView.GetQuery";
    public static WORKITEMSVIEW_GETQUERYPROVIDER = "WorkItemsView.GetQueryProvider";
    public static WORKITEMSVIEW_CREATELAYOUT = "WorkItem.WorkItemView.CreateLayout";
    public static WORKITEMSVIEW_RENDERLAYOUT_CREATELABELANDTABS = "WorkItem.WorkItemView.RenderLayout.CreateLabelAndTabs";
    public static WORKITEMSVIEW_RENDERLAYOUT_CREATECONTROLS = "WorkItem.WorkItemView.RenderLayout.CreateControls";
    public static WORKITEMSVIEW_RENDERLAYOUT_TABIFYLAYOUT = "WorkItem.WorkItemView.RenderLayout.TabifyLayout";
    public static WORKITEMSVIEW_APPENDELEMENT = "WorkItem.WorkItemView.AppendElement";
    public static WORKITEMSVIEW_BIND = "WorkItem.WorkItemView.Bind";
    public static WORKITEMSVIEW_BIND_CONTRIBUTIONS = "WorkItem.WorkItemView.Bind.Contributions";
    public static WORKITEMSVIEW_BIND_EVENTS = "WorkItem.WorkItemView.Bind.Events";
    public static WORKITEMSVIEW_ONRENDER = "WorkItem.WorkItemView.OnRender";
    public static WORKITEMSVIEW_ATTACHLAYOUT = "WorkItem.WorkItemView.AttachLayout";
    // TriageView
    public static TRIAGEVIEW_QUERYRESULT = "TriageView.QueryResult";
    public static TRIAGEVIEW_ENTER = "TriageView.Enter";
    public static TRIAGEVIEW_AHOCREQUIRE_TRIAGEVIEW = "TriageView.AdhocRequire.TriageView";
    public static TRIAGEVIEW_AHOCREQUIRE_QUERYRESULTINFOBAR = "TriageView.AdhocRequire.QueryResultInfoBar";
    public static TRIAGEVIEW_ENSUREWORKITEMFORMMODULE = "TriageView.EnsureWorkItemFormModule";
    // QueryHierarchy
    public static QUERYHIERARCHY_POPULATE = "QueryHierarchy.Populate";
    public static QUERYHIERARCHY_GETQUERYFAVORITES_REQUEST = "QueryHierarchy.GetQueryFavorites.Request";
    public static QUERYHIERARCHY_POPULATEFOLDERTREE = "QueryHierarchy.PopulateFolderTree";
    public static QUERYHIERARCHY_GETHIERARCHY_REQUEST = "QueryHierarchy.GetHierarchy.Request";
    public static QUERYHIERARCHY_UPDATEFROMDATA = "QueryHierarchy.UpdateFromData";
    public static QUERYHIERARCHY_ENSUREITEMINTREE = "QueryHierarchy.EnsureItemInTree";
    public static QUERYHIERARCHY_BEGINGETQUERYBYPATHORID_REQUEST = "QueryHierarchy.BeginGetQueryByIdOrPath.Request";
    // Query
    public static QUERY_UPDATEADHOCQUERY_REQUEST = "Query.UpdateAdHocQuery.Request";
    public static QUERY_UPDATEQUERY_REQUEST = "Query.UpdateQuery.Request";
    public static QUERY_CREATEQUERY_REQUEST = "Query.CreateQuery.Request";
    public static QUERY_GETQUERYTEXT = "Query.GetQueryText";
    // NQE - Initialize
    public static QUERIESHUB_INITIALIZE_QUERIESHUBCONTEXT = "QueriesHub.Initialize.QueriesHubContext";
    // NQE - Actions
    public static QUERIESHUB_ACTIONS_GETALLQUERYITEMS_REQUEST = "QueriesHub.Actions.GetAllQueryItems.Request";
    public static QUERIESHUB_ACTIONS_GETFAVORITEQUERYITEMS_REQUEST = "QueriesHub.Actions.GetFavoriteQueryItems.Request";
    public static QUERIESHUB_ACTIONS_ENSUREROOTFOLDERS_REQUEST = "QueriesHub.Actions.EnsureRootFolders.Request";
    public static QUERIESHUB_ACTIONS_ENSUREQUERYITEM_REQUEST = "QueriesHub.Actions.EnsureQueryItem.Request";
    public static QUERIESHUB_ACTIONS_SEARCHQUERYITEMS_REQUEST = "QueriesHub.Actions.SearchQueryItems.Request";
    // NQE - Components
    public static QUERIESHUB_TRIAGEVIEW_COMPONENT_MOUNT = "QueriesHub.TriageView.Component.Mount";
    public static QUERIESHUB_QUERYRESULTSPIVOT_COMPONENT_MOUNT = "QueriesHub.QueryResultsPivot.Component.Mount";
    public static QUERIESHUB_QUERIESVIEW_COMPONENT_MOUNT = "QueriesHub.QueriesView.Component.Mount";
    public static QUERIESHUB_QUERIESPIVOT_COMPONENT_MOUNT = "QueriesHub.QueriesPivot.Component.Mount";
    // NQE - Stores
    public static QUERIESHUB_STORES_ACTIVEQUERYVIEWSTORE_CHANGEQUERYVIEW = "QueriesHub.Stores.ActiveQueryViewStore.ChangeQueryView";
    public static QUERIESHUB_STORES_QUERYFAVORITEGROUPSTORE_INITIALIZEQUERYFAVORITEGROUPS = "QueriesHub.Stores.QueryFavoriteGroupStore.InitializeQueryFavoriteGroups";
    public static QUERIESHUB_STORES_QUERYHIERARCHYITEMSTORE_INITIALIZEQUERYHIERARCHYITEM = "QueriesHub.Stores.QueryHierarchyItemStore.InitializeQueryHierarchyItem";
    public static QUERIESHUB_STORES_QUERYHIERARCHYSTORE_INITIALIZEQUERYHIERARCHY = "QueriesHub.Stores.QueryHierarchyStore.InitializeQueryHierarchy";
    public static QUERIESHUB_STORES_QUERYRESULTSPROVIDERSTORE_CHANGEQUERYRESULTSPROVIDER = "QueriesHub.Stores.QueryResultsProviderStore.ChangeQueryResultsProvider";
}

export class CustomerIntelligencePropertyValue {
    public static VIEWTYPE_QUERY = "Query";
}

export const SHORTCUT_KEYDOWN = "keydown";
export const BUTTON_CLICKED = "buttonClick";
