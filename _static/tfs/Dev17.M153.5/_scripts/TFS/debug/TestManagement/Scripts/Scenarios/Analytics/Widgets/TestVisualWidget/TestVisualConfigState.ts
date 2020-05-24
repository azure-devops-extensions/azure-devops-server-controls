import * as TCMContracts from "TFS/TestManagement/Contracts";
import { BuildDefinition } from "Widgets/Scripts/DataServices/ConfigurationQueries/BuildDefinition";

export class TestVisualConfigState{    
    public contextType: TCMContracts.TestResultsContextType;
    
    public definitionId: string;

    public loadingDefinitions: boolean;
    public buildDefinitions: BuildDefinition[];
}