import { IContextualMenuItem } from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";

import { Action } from "VSS/Flux/Action";

export class DefinitionContextualMenuitemsActionHub {
    public itemsAdded = new Action<IContextualMenuItem[]>();
}