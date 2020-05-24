import { GitPullRequestStatus } from "TFS/VersionControl/Contracts";
import { Contribution } from "VSS/Contributions/Contracts";

/**
 * Encapsulates logic for mapping pull request status to particular contributions based on genre and name.
 * Contributions are used to add menu items to the ellipsis menus.
 * statusGenre is required property for status contributions, statusName is optional.
 * When only statusGenre is present contribution will apply to all statuses with specified genre.
 * When both statusGenre and statusName present contribution will apply to statuses with specified genre and name.
 */
export class PullRequestStatusContributions {
    private _contributions: IDictionaryStringTo<Contribution[]>;
    private _statusContributions: IDictionaryStringTo<string[]>;

    constructor(contributions: Contribution[]) {
        this._contributions = {};
        this._statusContributions = {};
        contributions.forEach(contribution => {
            const key = this._generateContributionKey(contribution.properties.statusGenre, contribution.properties.statusName);
            if (key) {
                if (!this._contributions[key]) {
                    this._contributions[key] = [];
                }
                this._contributions[key].push(contribution);
            }
        });
    }

    public getContributionIds(status: GitPullRequestStatus): string[] {
        const { genre, name } = status.context;
        const key = `${genre}/${name}`;

        if (this._statusContributions[key]) {
            return this._statusContributions[key];
        }

        const ids: string[] = [];

        if (genre) {
            if (this._contributions[genre]) {
                ids.push(...this._contributions[genre].map(c => c.id));
            }

            if (this._contributions[key]) {
                ids.push(...this._contributions[key].map(c => c.id));
            }
        }

        this._statusContributions[key] = ids;

        return ids;
    }

    private _generateContributionKey(genre: string, name: string): string {
        if (!genre) {
            // genre is required for the contribution key
            return null;
        }

        if (name) {
            return `${genre}/${name}`;
        }

        return genre;
    }
}