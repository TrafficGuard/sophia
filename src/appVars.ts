export const sophiaDirName = '.sophia';

export const SOPHIA_FS = 'SOPHIA_FS';

export function systemDir() {
	// When deploying Sophia on a VM with a non-boot persistent disk for storage, then set SOPHIA_SYS_DIR
	return `${process.env.SOPHIA_SYS_DIR || process.cwd()}/${sophiaDirName}`;
}
