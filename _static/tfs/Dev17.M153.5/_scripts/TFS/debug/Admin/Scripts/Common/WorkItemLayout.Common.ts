import AdminResources = require("Admin/Scripts/Resources/TFS.Resources.Admin");
import Utils_String = require("VSS/Utils/String");

export module Constants {
    export var MAX_GROUP_NAME_LENGTH = 128;
    export var MAX_PAGE_NAME_LENGTH = 128;
}

export interface ISectionData {
    id: string;
    imageId: string;
    imageFileName: string;
    ariaLabel: string;
    altText: string;
}

export module GroupSectionConstants {
    export var SECTIONS = [
        <ISectionData>{
            id: "Section1",
            imageId: "Section1ImageId",
            imageFileName: "workItemLayoutSection1.png",
            ariaLabel: Utils_String.format(AdminResources.ColumnChooserAltText, AdminResources.Section1),
            altText: Utils_String.format(AdminResources.ColumnChooserAltText, AdminResources.Section1)
        },
        <ISectionData>{
            id: "Section2",
            imageId: "Section2ImageId",
            imageFileName: "workItemLayoutSection2.png",
            ariaLabel: Utils_String.format(AdminResources.ColumnChooserAltText, AdminResources.Section2),
            altText: Utils_String.format(AdminResources.ColumnChooserAltText, AdminResources.Section2)
        },
        <ISectionData>{
            id: "Section3",
            imageId: "Section3ImageId",
            imageFileName: "workItemLayoutSection3.png",
            ariaLabel: Utils_String.format(AdminResources.ColumnChooserAltText, AdminResources.Section3),
            altText: Utils_String.format(AdminResources.ColumnChooserAltText, AdminResources.Section3)
        }];

    export var RADIO_BUTTON_NAME = "section-selection";
}