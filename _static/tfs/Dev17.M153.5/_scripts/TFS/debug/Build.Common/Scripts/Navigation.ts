export module BuildStateProperties {
    export const BuildId: string = "buildId";
}

export module DefinitionStateProperties {
    export const Context: string = "context";
    export const CloneId: string = "cloneId";
    export const DefinitionId: string = "definitionId";
    export const Path: string = "path";
}

export module RawStateProperties {
    export const Action: string = "_a";
}

export interface IViewState {
    /**
    * Route data will have this with key as "_a"
    */
    action: string;
}

export interface IDefinitionViewState extends IViewState {
    /**
    * Definition Id for this view, this is number but since it's coming from state this will be a string
    */
    definitionId: string;
    /**
    * Folder path of the definition
    */
    path: string;
    /**
    * Context of the view. This tells the page  from which this page was visited. Usually would be one of "DefinitionsActions" in Linking file
    */
    context?: string;
}
