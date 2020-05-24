import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");

export namespace InitialValueHelper {

    export function assignInitialValues(workItem: WITOM.WorkItem, requestParams: any) {
        /// <summary>Sets values for the fields which are specified as request parameters</summary>
        /// <param name="workItem" type="WITOM.WorkItem">Work item to be assigned fields</param>
        /// <param name="requestParams" type="Object">Request parameters</param>

        var key, requestKey, field, fieldObj;

        // Iterating through all request params to check any field exists
        for (key in requestParams) {
            if (requestParams.hasOwnProperty(key)) {

                requestKey = decodeURIComponent(key);
                field = null;

                if (requestKey.charAt(0) === '[' && requestKey.charAt(requestKey.length - 1) === ']') {
                    // Field name specified
                    field = requestKey.substring(1, requestKey.length - 1);
                }
                else if (requestKey.charAt(0) === '$') {
                    // Field id specified
                    field = requestKey.substr(1);
                }

                if (field) {
                    fieldObj = workItem.getField(field);
                    // Checking field identifier is valid and field is editable
                    if (fieldObj && fieldObj.isEditable()) {

                        // Setting field value
                        var value = (fieldObj.fieldDefinition.type === WITConstants.FieldType.Html || fieldObj.fieldDefinition.type === WITConstants.FieldType.History)
                            ? WITOM.Field.normalizeHtmlValue(requestParams[key])
                            : requestParams[key];

                        fieldObj.setValue(value || "");
                    }
                }
            }
        }
    }

    export function generateInitialValueUrl(workItem: WITOM.WorkItem) {
        /// <summary>Generates public url for creating a work item of the type of specified work item.
        /// If the work item is already initially populated, this method takes this into account
        /// by checkin work items initially set fields.</summary>
        /// <param name="workItem" type="WITOM.WorkItem">Work item which holds the work item type</param>

        var routeData;

        routeData = {};

        //http://{host}:{port}/tfs/{collection}/{project}/_workitems/create/{parameters}
        routeData.parameters = workItem.workItemType.name;

        $.each(workItem.getTemplateFieldValues(), function (fieldRef, value) {
            routeData["[" + fieldRef + "]"] = (value === undefined || value === null) ? "" : value;
        });

        return workItem.store.getTfsContext().getPublicActionUrl("create", "workItems", routeData);
    }
}