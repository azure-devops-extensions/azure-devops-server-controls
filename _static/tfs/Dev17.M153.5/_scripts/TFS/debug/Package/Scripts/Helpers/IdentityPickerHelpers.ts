import * as Controls from "VSS/Controls";
import { IdentityPickerSearchControl, IIdentityPickerSearchOptions } from "VSS/Identities/Picker/Controls";
import { IEntity } from "VSS/Identities/Picker/RestClient";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Helpers/IdentityPickerHelpers";

// Appropriate count for 200% zoom accessibility
const displayedListItemCount: number = 4;

export class IdentityPickerHelpers {
    // Creates the IdentityPickerSearchControl with appropriate options
    public static createIdentityPicker(
        hostContainer: JQuery,
        cssForContainer: string,
        onItemSelectDelegate: (identity: IEntity) => any,
        consumerId: string
    ): IdentityPickerSearchControl {
        const container = $("<div/>")
            .addClass("identitypicker-container")
            .addClass(cssForContainer)
            .appendTo(hostContainer);

        container
            .on("focusin", () => {
                if (!container.hasClass("disabled")) {
                    container.addClass("focused");
                }
            })
            .on("focusout", () => {
                container.removeClass("focused");
            });

        const identityPickerSearchOptions = <IIdentityPickerSearchOptions>{
            container,
            operationScope: {
                IMS: true
            },
            identityType: {
                User: true,
                Group: true
            },
            multiIdentitySearch: true,
            showMruTriangle: true,
            showMru: true,
            showContactCard: true,
            onItemSelect: onItemSelectDelegate,
            consumerId,
            pageSize: displayedListItemCount
        };

        return Controls.create(IdentityPickerSearchControl, container, identityPickerSearchOptions);
    }
}
