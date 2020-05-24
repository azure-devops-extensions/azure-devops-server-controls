import * as TCMContracts from "TFS/TestManagement/Contracts";
import { Action } from "VSS/Flux/Action";

export class FilterActionHub {
	public initializeFilterValues = new Action<TCMContracts.FieldDetailsForTestResults[]>();

	public updateFilterValues = new Action<TCMContracts.FieldDetailsForTestResults[]>();

	public onError = new Action<string>();
}