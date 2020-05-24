import { Action } from "VSS/Flux/Action";

export interface IDefinitionsUpdatedPayload {
    definitionIds: number[];
    searchTerm: string;
}

export class DefinitionSearchPickerActionHub {
    public definitionsUpdated = new Action<IDefinitionsUpdatedPayload>();
    public searchCleared = new Action<void>();
}

let __definitionSearchPickerActionHub: DefinitionSearchPickerActionHub = null;
export function getDefinitionSearchPickerActionHub(): DefinitionSearchPickerActionHub {
    if (!__definitionSearchPickerActionHub) {
        __definitionSearchPickerActionHub = new DefinitionSearchPickerActionHub();
    }

    return __definitionSearchPickerActionHub;
}