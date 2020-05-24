
import { ITemplateDefinition } from "DistributedTaskControls/Common/Types";

export interface ITemplatesSource {
	updateTemplateList(forceRefresh?: boolean): IPromise<ITemplateDefinition[]>;
	deleteTemplate(templateId: string): IPromise<any>;
}