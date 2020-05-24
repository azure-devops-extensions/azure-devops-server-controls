/**
 * Options for a queue build dialog
 */
export interface IQueueDialogSourceOptions {
    /**
     * The name of the template to use
     */
    dialogTemplate: string;

    /**
     * Source-provider-specific options
     */
    options?: any;
}