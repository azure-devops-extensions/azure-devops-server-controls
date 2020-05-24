//Auto converted from Admin/Scripts/TFS.Admin.debug.js

/// <reference types="jquery" />




import VSS = require("VSS/VSS");



export class Actions {

    public static EDIT_CLASSIFICATION: string = "VSS.Admin.AreaIterations.EditClassification";

    constructor () {
        /// <summary>Values to support admin related actions</summary>
    }
}



export class Notifications {

    public static CLASSIFICATION_CHANGED: string = "VSS.Admin.AreaIterations.ClassificationChanged";

    constructor () {
        /// <summary>Values to support admin related notifications</summary>
    }
}

export module CustomerIntelligenceConstants {

    var BASE_AREA = "WebAccess.Admin";

    export class AreaIterations {
        public static AREA = BASE_AREA + "AreaIterations";

        // Scenarios are separated for areas/iterations, rather than one scenario with data describing mode, due to
        // the current constraints of the telemetry analysis system.

        public static AREAS_CONTROL_INITIALIZATION = "AreasControlInitialization";
        public static ITERATIONS_CONTROL_INITIALIZATION = "IterationsControlInitialization";

        public static CREATE_AREA = "CreateArea";
        public static CREATE_ITERATION = "CreateIteration";

        public static EDIT_AREA = "EditArea";
        public static EDIT_ITERATION = "EditIteration";
        
        public static DELETE_AREA = "DeleteArea";
        public static DELETE_ITERATION = "DeleteIteration";
    }

    export class Process {
        public static AREA = BASE_AREA + "Process";

        public static ADMIN_EX_AREA = BASE_AREA + "AdminExp";

        // Features
        public static LAYOUT_VIEW = "AdminLayout";
        public static ADD_GROUP_DIALOG = "AddGroupDialog";
        public static ADD_FIELD_DIALOG = "AddFieldDialog";
        public static EDIT_FIELD_DIALOG = "EditFieldDialog";
        public static ADD_CONTROLCONTRIBUTION_DIALOG = "AddControlContributionDialog";
        public static EDIT_CONTROLCONTRIBUTION_DIALOG = "EditControlContributionDialog";
        public static MANAGE_IDENTITIES_VIEW = "Security.ManageIdentitiesView";
    }
}


// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Admin", exports);
