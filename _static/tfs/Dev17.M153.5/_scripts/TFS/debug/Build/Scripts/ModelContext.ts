

import ko = require("knockout");

import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");

/**
 * Context common to all models
 */
export class ModelContext {
    /**
     * The current date
     * Set the value of this observable to refresh duration calculations.
     */
    public static currentDate: KnockoutObservable<Date> = TFS_Knockout.observableDate(new Date());

    /**
     * The current repository type
     */
    public static repositoryType: KnockoutObservable<string> = ko.observable("");
}
