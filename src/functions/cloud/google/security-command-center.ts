import { func, funcClass } from '#functionSchema/functionDecorators';
import { envVar } from '#utils/env-var';
import { execCommand, failOnError } from '#utils/exec';
import { cacheRetry } from '../../../cache/cacheRetry';

@funcClass(__filename)
export class GoogleCloudSecurityCommandCenter {
	/**
	 * Gets all the active, non-muted findings for the organisation from Security Command Center
	 * @returns the findings in JSON format as an object
	 */
	@func()
	@cacheRetry({ scope: 'global' })
	async getSecurityCommandCenterFindings(): Promise<SccFinding[]> {
		const orgId = envVar('GCLOUD_ORGANIZATION_ID');

		const result = await execCommand(`gcloud scc findings list ${orgId} -q --format=json --filter='state="ACTIVE" AND NOT mute="MUTED"'`);
		failOnError('Error running gcloud scc findings list', result);
		return JSON.parse(result.stdout);
	}
}

interface FindingDetails {
	canonicalName: string;
	category: string;
	createTime: string;
	eventTime: string;
	findingClass: string;
	compliances: Compliance[];
	name: string;
	parent: string;
	parentDisplayName: string;
	resourceName: string;
	securityMarks: { name: string };
	severity: string;
	sourceProperties: Record<string, any>;
}

interface Compliance {
	ids: string[];
	standard: string;
	version: string;
}

interface Resource {
	displayName: string;
	location: string;
	name: string;
	parentDisplayName: string;
	parentName: string;
	projectDisplayName: string;
	projectName: string;
	resourcePathString: string;
	service: string;
	type: string;
}

export interface SccFinding {
	finding: FindingDetails;
	resource: Resource;
}

export type GroupedFindings = {
	[category: string]: {
		[projectDisplayName: string]: SccFinding[];
	};
};

export function groupSecurityCommandCenterFindings(findings: SccFinding[]): GroupedFindings {
	return findings.reduce((acc, finding) => {
		const category = finding.finding.category;
		const projectDisplayName = finding.resource.projectDisplayName || finding.finding.resourceName;

		// Initialize category object and project array if it doesn't exist
		acc[category] ??= {};
		acc[category][projectDisplayName] ??= [];

		// Add finding to the appropriate group
		acc[category][projectDisplayName].push(finding);

		return acc;
	}, {} as GroupedFindings);
}
