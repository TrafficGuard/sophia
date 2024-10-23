/**
 * Derived from Angular's version class
 */
export class Version {
    public readonly full: string;
    public readonly major: string;
    public readonly minor: string;
    public readonly patch: string;

    /**
     * Constructor
     */
    constructor(public version: string) {
        this.full = version;
        this.major = version.split('.')[0];
        this.minor = version.split('.')[1];
        this.patch = version.split('.').slice(2).join('.');
    }
}
