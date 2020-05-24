import VSS_Common_Contracts = require("VSS/WebApi/Contracts");

import Types = require("DistributedTask/Scripts/DT.Types");

export class LibraryItem implements Types.LibraryItem {
    public id: string;
    public name: string;
    public itemType: Types.LibraryItemType;
    public iconClassName: string;
    public modifiedBy: VSS_Common_Contracts.IdentityRef;
    public modifiedOn: Date;
    public description: string;
}