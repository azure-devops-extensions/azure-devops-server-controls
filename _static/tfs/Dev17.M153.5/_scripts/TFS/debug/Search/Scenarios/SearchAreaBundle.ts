/**
 * The following are the set of common Search modules that all get loaded when landing 
 * on Search page
 */ 
import "react";
import "react-dom";
import "Search/Scenarios/Shared/Base/Stores/ZeroDataStore";
import "Search/Scenarios/WebApi/RestClient";
import "Search/Scenarios/Shared/Components/SearchInput";
import "Search/Scenarios/Shared/Components/ZeroData";
import "Search/Scenarios/Shared/Components/SearchOverlay";
import "Search/Scenarios/Shared/Components/PivotContainer";
import "Search/Scenarios/Shared/Components/ResultsInfo";
import "Search/Scenarios/Shared/Components/SearchAccountLink";
import "Search/Scenarios/Shared/Components/SearchOrgButton";
import "Search/Scenarios/Shared/Base/ContributedSearchTab";
import "Search/Scenarios/Shared/Base/ActionsHub";
import "Search/Scenarios/Shared/Base/Stores/CompositeStoresManager";
import "Search/Scenarios/Shared/Base/Stores/FilterStore";
import "Search/Scenarios/Shared/Base/Stores/SearchStore";
import "Search/Scenarios/Shared/Base/Stores/ItemContentStore";
import "Search/Scenarios/Shared/Base/Stores/OrganizationInfoStore";
import "Search/Scenarios/Shared/Base/Stores/PreviewOrientationStore";
import "Search/Scenarios/Shared/Base/ReadWriteSettingsStorage";
import "Search/Scenarios/Shared/Base/Sources/OrgInfoDataProviderSource";
import "Search/Scenarios/Shared/Base/Sources/SearchOrgButtonEnabledSource";
import "Search/Scenarios/Shared/Base/Sources/SearchOrgButtonAvailabilityHelper";
import "Search/Scenarios/Shared/Base/Scenario";
import "Search/Scenarios/Shared/Base/Telemetry";
import "Search/Scenarios/Shared/Base/Sources/SearchSource";
import "Search/Scenarios/Shared/Utils";
import "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import "Presentation/Scripts/TFS/Components/StatefulSplitter";
import "VSS/Flux/AsyncLoadedComponent";
import "SearchUI/Utilities/Filter";
import "OfficeFabric/List";
import "OfficeFabric/FocusZone";